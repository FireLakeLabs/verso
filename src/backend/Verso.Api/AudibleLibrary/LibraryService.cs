using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class LibraryService(
    IDbContextFactory<VersoDbContext> databaseFactory,
    IAudibleLibrarySource source,
  TimeProvider timeProvider,
  AudibleCoverAssetCacheService coverAssetCacheService)
{
  public async Task<StartLibraryRefreshResponse> RunRefreshAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var startedAt = timeProvider.GetUtcNow();
    var job = new LibraryRefreshJobEntity
    {
      Id = Guid.NewGuid(),
      Status = LibraryRefreshJobStatus.Running,
      PhaseSummary = "Refreshing the Audible Library.",
      StartedAtUtc = startedAt
    };

    var fetchPhase = AddPhase(job, "fetch-library", startedAt, "Fetching Audible Library pages.");
    database.LibraryRefreshJobs.Add(job);
    await database.SaveChangesAsync(cancellationToken);

    var fetchResult = await source.RefreshLibraryAsync(cancellationToken);

    fetchPhase.Status = fetchResult.Status switch
    {
      AudibleLibraryFetchStatus.Succeeded => LibraryRefreshJobPhaseStatus.Succeeded,
      AudibleLibraryFetchStatus.PartialFailure => LibraryRefreshJobPhaseStatus.Failed,
      _ => LibraryRefreshJobPhaseStatus.Failed
    };
    fetchPhase.CompletedAtUtc = timeProvider.GetUtcNow();
    fetchPhase.Summary = fetchResult.Status switch
    {
      AudibleLibraryFetchStatus.Succeeded => $"Fetched {fetchResult.Items.Count} Audible Items from Audible.",
      AudibleLibraryFetchStatus.PartialFailure => $"Refresh stopped early after observing {fetchResult.Items.Count} Audible Items.",
      _ => "Refresh failed before Audible Items could be fetched."
    };
    job.ObservedItemCount = fetchResult.Items.Count;

    foreach (var error in fetchResult.Errors)
    {
      job.Errors.Add(
          new LibraryRefreshJobErrorEntity
          {
            Code = error.Code,
            Message = error.Message,
            TechnicalDetails = error.TechnicalDetails,
            Phase = error.Phase
          });
    }

    if (fetchResult.Status == AudibleLibraryFetchStatus.Succeeded)
    {
      var persistPhase = AddPhase(job, "persist-library", timeProvider.GetUtcNow(), "Updating Current Audible Facts and snapshots.");
      var persistSummary = await ApplySuccessfulRefreshAsync(database, fetchResult.Items, startedAt, cancellationToken);

      foreach (var error in persistSummary.Errors)
      {
        job.Errors.Add(
          new LibraryRefreshJobErrorEntity
          {
            Code = error.Code,
            Message = error.Message,
            TechnicalDetails = error.TechnicalDetails,
            Phase = error.Phase
          });
      }

      persistPhase.Status = LibraryRefreshJobPhaseStatus.Succeeded;
      persistPhase.CompletedAtUtc = timeProvider.GetUtcNow();
      persistPhase.Summary =
          persistSummary.Errors.Count == 0
            ? $"Saved {persistSummary.ImportedItemCount} Audible Items, retained {persistSummary.RetainedNoLongerPresentItemCount} no-longer-present items, and recorded {persistSummary.SnapshotObservationCount} selective observations."
            : $"Saved {persistSummary.ImportedItemCount} Audible Items, retained {persistSummary.RetainedNoLongerPresentItemCount} no-longer-present items, recorded {persistSummary.SnapshotObservationCount} selective observations, and found {persistSummary.Errors.Count} cover cache issue(s).";

      job.Status = persistSummary.Errors.Count == 0
        ? LibraryRefreshJobStatus.Succeeded
        : LibraryRefreshJobStatus.PartialFailure;
      job.PhaseSummary = persistSummary.Errors.Count == 0
        ? "Refresh completed successfully."
        : "Refresh completed with cover cache warnings.";
      job.ImportedItemCount = persistSummary.ImportedItemCount;
      job.RetainedNoLongerPresentItemCount = persistSummary.RetainedNoLongerPresentItemCount;
      job.SnapshotObservationCount = persistSummary.SnapshotObservationCount;
    }
    else
    {
      var skippedPhase = AddPhase(job, "persist-library", timeProvider.GetUtcNow(), "Skipped because the Audible fetch did not complete.");
      skippedPhase.Status = LibraryRefreshJobPhaseStatus.Skipped;
      skippedPhase.CompletedAtUtc = timeProvider.GetUtcNow();

      job.Status = fetchResult.Status == AudibleLibraryFetchStatus.PartialFailure
          ? LibraryRefreshJobStatus.PartialFailure
          : LibraryRefreshJobStatus.Failed;
      job.PhaseSummary = fetchResult.Status == AudibleLibraryFetchStatus.PartialFailure
          ? "Refresh stopped early. The last successful library state was preserved."
          : "Refresh failed before a new library state could be saved.";
    }

    job.CompletedAtUtc = timeProvider.GetUtcNow();
    await database.SaveChangesAsync(cancellationToken);

    return new StartLibraryRefreshResponse(MapJob(job));
  }

  public async Task<LibraryRefreshStatusResponse> GetRefreshStatusAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var jobs = await database.LibraryRefreshJobs
        .AsNoTracking()
        .Include(job => job.Phases)
        .Include(job => job.Errors)
        .ToListAsync(cancellationToken);
    var orderedJobs = jobs
        .OrderByDescending(job => job.StartedAtUtc)
        .Take(10)
        .ToArray();

    var activeJobs = orderedJobs
        .Where(job => job.Status == LibraryRefreshJobStatus.Running)
        .Select(MapJob)
        .ToArray();
    var recentJobs = orderedJobs
        .Where(job => job.Status != LibraryRefreshJobStatus.Running)
        .Select(MapJob)
        .ToArray();

    return new LibraryRefreshStatusResponse(activeJobs, recentJobs);
  }

  public async Task<LibraryOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var items = await database.AudibleItems
        .AsNoTracking()
        .ToListAsync(cancellationToken);
    var jobs = await database.LibraryRefreshJobs
        .AsNoTracking()
        .Include(job => job.Phases)
        .Include(job => job.Errors)
        .ToListAsync(cancellationToken);
    var latestJob = jobs
        .OrderByDescending(job => job.StartedAtUtc)
        .FirstOrDefault();

    var summary = new LibraryOverviewSummaryDto(
        items.Count,
        items.Count(item => !item.IsNoLongerPresent),
        items.Count(item => item.IsNoLongerPresent),
        items.Count(item => item.PercentComplete >= 95),
        items.Count(item => item.PercentComplete > 0 && item.PercentComplete < 95));

    return new LibraryOverviewResponse(summary, latestJob is null ? null : MapJob(latestJob));
  }

  public async Task<LibraryItemsResponse> GetLibraryAsync(
      string? search,
      string? presence,
      string? completion,
      CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var items = await database.AudibleItems
        .AsNoTracking()
        .Include(item => item.Contributors)
      .Include(item => item.CoverImages)
        .Include(item => item.Snapshots)
        .ToListAsync(cancellationToken);

    var filteredItems = items
        .Where(item => MatchesSearch(item, search))
        .Where(item => MatchesPresence(item, presence))
        .Where(item => MatchesCompletion(item, completion))
        .OrderBy(item => item.Title, StringComparer.OrdinalIgnoreCase)
        .ThenBy(item => item.Asin, StringComparer.Ordinal)
        .Select(
            item => new LibraryItemDto(
                item.Asin,
                item.Title,
                GetContributorNames(item, AudibleItemContributorRole.Author),
                GetContributorNames(item, AudibleItemContributorRole.Narrator),
                item.RuntimeMinutes,
                item.PercentComplete,
                item.RawAudiblePayload,
                item.IsNoLongerPresent,
                item.Snapshots.Count > 0,
                item.CoverImages
                    .OrderBy(coverImage => coverImage.Variant, StringComparer.Ordinal)
                    .Select(
                        coverImage => new LibraryItemCoverImageDto(
                            coverImage.Variant,
                            coverImage.SourceUrl,
                            coverImage.CachedRelativePath is null
                            || coverImage.CachedContentType is null
                            || coverImage.CachedSizeBytes is null
                            || coverImage.CachedAtUtc is null
                                ? null
                                : new CachedAssetDto(
                                    coverImage.CachedContentType,
                                    coverImage.CachedSizeBytes.Value,
                                    coverImage.CachedAtUtc.Value,
                                    AudibleCoverAssetCacheService.GetCachedCoverUrl(item.Asin, coverImage.Variant))))
                    .ToArray()))
        .ToArray();

    return new LibraryItemsResponse(filteredItems);
  }

  public async Task<LibraryItemDetailResponse?> GetLibraryItemAsync(string asin, CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var item = await database.AudibleItems
        .AsNoTracking()
        .Include(audibleItem => audibleItem.Contributors)
        .Include(audibleItem => audibleItem.Series)
        .Include(audibleItem => audibleItem.Snapshots)
        .SingleOrDefaultAsync(audibleItem => audibleItem.Asin == asin, cancellationToken);

    if (item is null)
    {
      return null;
    }

    return new LibraryItemDetailResponse(
        new LibraryItemDetailDto(
            item.Asin,
            item.IsNoLongerPresent,
            new CurrentAudibleFactsDto(
                item.Title,
                GetContributorNames(item, AudibleItemContributorRole.Author),
                GetContributorNames(item, AudibleItemContributorRole.Narrator),
                item.RuntimeMinutes,
                item.PercentComplete,
                item.PublisherSummary,
                item.HasCompanionPdf,
                item.IsReturnable,
                item.RawAudiblePayload),
            item.Series
                .OrderBy(series => series.SortOrder)
                .Select(series => new ImportedAudibleSeriesEntry(series.Title, series.Sequence))
                .ToArray(),
            new VersoAnnotationsDto([], false, null),
            item.Snapshots
                .OrderByDescending(snapshot => snapshot.ObservedAtUtc)
                .ThenBy(snapshot => snapshot.Field, StringComparer.Ordinal)
                .Select(snapshot => new SelectiveSnapshotObservationDto(snapshot.Field, snapshot.Value, snapshot.ObservedAtUtc))
                .ToArray()));
  }

  public async Task<AudibleLibraryImportResponse> ImportAsync(CancellationToken cancellationToken)
  {
    var refresh = await RunRefreshAsync(cancellationToken);
    return refresh.Job.Status switch
    {
      "succeeded" => new AudibleLibraryImportResponse(refresh.Job.ImportedItemCount, 0, []),
      _ => throw new InvalidOperationException(refresh.Job.Errors.FirstOrDefault()?.Message ?? "Audible Library import failed.")
    };
  }

  private static LibraryRefreshJobPhaseEntity AddPhase(
      LibraryRefreshJobEntity job,
      string name,
      DateTimeOffset startedAtUtc,
      string summary)
  {
    var phase = new LibraryRefreshJobPhaseEntity
    {
      Name = name,
      Status = LibraryRefreshJobPhaseStatus.Running,
      Summary = summary,
      StartedAtUtc = startedAtUtc
    };

    job.Phases.Add(phase);
    return phase;
  }

  private async Task<PersistRefreshSummary> ApplySuccessfulRefreshAsync(
      VersoDbContext database,
      IReadOnlyList<ImportedAudibleItem> importedItems,
      DateTimeOffset observedAtUtc,
      CancellationToken cancellationToken)
  {
    var importedByAsin = importedItems
        .GroupBy(item => item.Asin, StringComparer.Ordinal)
        .ToDictionary(group => group.Key, group => group.Last(), StringComparer.Ordinal);
    var existingItems = await database.AudibleItems
        .Include(item => item.Contributors)
        .Include(item => item.Series)
        .Include(item => item.Snapshots)
      .Include(item => item.CoverImages)
        .ToDictionaryAsync(item => item.Asin, StringComparer.Ordinal, cancellationToken);

    var snapshotObservationCount = 0;
    var errors = new List<LibraryOperationError>();

    foreach (var (asin, importedItem) in importedByAsin)
    {
      if (!existingItems.TryGetValue(asin, out var existingItem))
      {
        existingItem = new AudibleItemEntity
        {
          Asin = asin
        };

        database.AudibleItems.Add(existingItem);
        existingItems.Add(asin, existingItem);
      }

      existingItem.Title = importedItem.Title;
      existingItem.RuntimeMinutes = importedItem.RuntimeMinutes;
      existingItem.PercentComplete = importedItem.PercentComplete;
      existingItem.RawAudiblePayload = importedItem.RawAudiblePayload;
      existingItem.PublisherSummary = importedItem.PublisherSummary;
      existingItem.HasCompanionPdf = importedItem.HasCompanionPdf;
      existingItem.IsReturnable = importedItem.IsReturnable;
      existingItem.IsNoLongerPresent = false;
      existingItem.LastSeenInSuccessfulRefreshAtUtc = observedAtUtc;

      existingItem.Contributors.Clear();
      foreach (var author in importedItem.Authors.Distinct(StringComparer.Ordinal))
      {
        existingItem.Contributors.Add(new AudibleItemContributorEntity
        {
          AudibleItemAsin = asin,
          Name = author,
          Role = AudibleItemContributorRole.Author
        });
      }

      foreach (var narrator in importedItem.Narrators.Distinct(StringComparer.Ordinal))
      {
        existingItem.Contributors.Add(new AudibleItemContributorEntity
        {
          AudibleItemAsin = asin,
          Name = narrator,
          Role = AudibleItemContributorRole.Narrator
        });
      }

      existingItem.Series.Clear();
      foreach (var (series, index) in (importedItem.Series ?? []).Select((series, index) => (series, index)))
      {
        existingItem.Series.Add(
            new AudibleItemSeriesEntity
            {
              AudibleItemAsin = asin,
              SortOrder = index,
              Title = series.Title,
              Sequence = series.Sequence
            });
      }

      snapshotObservationCount += AddSnapshot(existingItem, "percent-complete", importedItem.PercentComplete.ToString(System.Globalization.CultureInfo.InvariantCulture), observedAtUtc);
      snapshotObservationCount += AddSnapshot(existingItem, "presence", "present", observedAtUtc);
      snapshotObservationCount += AddSnapshot(existingItem, "companion-pdf-available", importedItem.HasCompanionPdf ? "true" : "false", observedAtUtc);

      if (importedItem.IsReturnable is bool isReturnable)
      {
        snapshotObservationCount += AddSnapshot(existingItem, "is-returnable", isReturnable ? "true" : "false", observedAtUtc);
      }

      var existingCoverImages = existingItem.CoverImages.ToDictionary(coverImage => coverImage.Variant, StringComparer.Ordinal);
      var importedVariants = new HashSet<string>(StringComparer.Ordinal);

      foreach (var importedCoverImage in importedItem.CoverImages ?? [])
      {
        importedVariants.Add(importedCoverImage.Variant);
        existingCoverImages.TryGetValue(importedCoverImage.Variant, out var existingCoverImage);

        try
        {
          var cacheResult = await coverAssetCacheService.CacheAsync(
              asin,
              importedCoverImage,
              existingCoverImage,
              cancellationToken);

          if (existingCoverImage is null)
          {
            existingItem.CoverImages.Add(cacheResult.CoverImage);
            continue;
          }

          CopyCoverImage(cacheResult.CoverImage, existingCoverImage);
        }
        catch (AudibleCoverCachingException exception)
        {
          UpsertFailedCoverImage(existingItem, existingCoverImage, asin, importedCoverImage);
          errors.Add(CreateCoverCachingFailure(asin, importedCoverImage, exception));
        }
      }

      var removedCoverImages = existingItem.CoverImages
          .Where(coverImage => !importedVariants.Contains(coverImage.Variant))
          .ToArray();

      foreach (var removedCoverImage in removedCoverImages)
      {
        coverAssetCacheService.DeleteIfPresent(removedCoverImage.CachedRelativePath);
        existingItem.CoverImages.Remove(removedCoverImage);
      }
    }

    foreach (var existingItem in existingItems.Values.Where(item => !importedByAsin.ContainsKey(item.Asin)))
    {
      existingItem.IsNoLongerPresent = true;
      snapshotObservationCount += AddSnapshot(existingItem, "presence", "no-longer-present", observedAtUtc);
    }

    await database.SaveChangesAsync(cancellationToken);

    return new PersistRefreshSummary(
        importedByAsin.Count,
        existingItems.Values.Count(item => item.IsNoLongerPresent),
        snapshotObservationCount,
        errors);
  }

  private static LibraryOperationError CreateCoverCachingFailure(
      string asin,
      ImportedAudibleCoverImage importedCoverImage,
      AudibleCoverCachingException exception)
  {
    return new LibraryOperationError(
        "audible-cover-cache-failed",
        "Cover art could not be cached. Verso kept the Audible Item and its source URL for a later refresh.",
        $"Audible Item {asin}, cover variant {importedCoverImage.Variant}, source URL {importedCoverImage.SourceUrl}: {exception.InnerException?.Message ?? exception.Message}",
        "cache-cover-assets");
  }

  private static void UpsertFailedCoverImage(
      AudibleItemEntity existingItem,
      AudibleItemCoverImageEntity? existingCoverImage,
      string asin,
      ImportedAudibleCoverImage importedCoverImage)
  {
    if (existingCoverImage is null)
    {
      existingItem.CoverImages.Add(new AudibleItemCoverImageEntity
      {
        AudibleItemAsin = asin,
        Variant = importedCoverImage.Variant,
        SourceUrl = importedCoverImage.SourceUrl
      });

      return;
    }

    existingCoverImage.SourceUrl = importedCoverImage.SourceUrl;
    existingCoverImage.CachedRelativePath = null;
    existingCoverImage.CachedContentType = null;
    existingCoverImage.CachedSizeBytes = null;
    existingCoverImage.CachedAtUtc = null;
  }

  private static void CopyCoverImage(AudibleItemCoverImageEntity sourceCoverImage, AudibleItemCoverImageEntity targetCoverImage)
  {
    targetCoverImage.SourceUrl = sourceCoverImage.SourceUrl;
    targetCoverImage.CachedRelativePath = sourceCoverImage.CachedRelativePath;
    targetCoverImage.CachedContentType = sourceCoverImage.CachedContentType;
    targetCoverImage.CachedSizeBytes = sourceCoverImage.CachedSizeBytes;
    targetCoverImage.CachedAtUtc = sourceCoverImage.CachedAtUtc;
  }

  private static int AddSnapshot(
      AudibleItemEntity item,
      string field,
      string value,
      DateTimeOffset observedAtUtc)
  {
    item.Snapshots.Add(
        new AudibleItemSelectiveSnapshotEntity
        {
          AudibleItemAsin = item.Asin,
          Field = field,
          Value = value,
          ObservedAtUtc = observedAtUtc
        });

    return 1;
  }

  private static bool MatchesSearch(AudibleItemEntity item, string? search)
  {
    if (string.IsNullOrWhiteSpace(search))
    {
      return true;
    }

    return search.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .All(
            term =>
                item.Asin.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.Title.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.Contributors.Any(contributor => contributor.Name.Contains(term, StringComparison.OrdinalIgnoreCase)));
  }

  private static bool MatchesPresence(AudibleItemEntity item, string? presence)
  {
    return presence?.Trim().ToLowerInvariant() switch
    {
      "present" => !item.IsNoLongerPresent,
      "no-longer-present" => item.IsNoLongerPresent,
      _ => true
    };
  }

  private static bool MatchesCompletion(AudibleItemEntity item, string? completion)
  {
    return completion?.Trim().ToLowerInvariant() switch
    {
      "completed" => item.PercentComplete >= 95,
      "in-progress" => item.PercentComplete > 0 && item.PercentComplete < 95,
      "not-started" => item.PercentComplete <= 0,
      "anomalous" => item.PercentComplete < 0 || item.PercentComplete > 100,
      _ => true
    };
  }

  private static string[] GetContributorNames(AudibleItemEntity item, AudibleItemContributorRole role)
  {
    return item.Contributors
        .Where(contributor => contributor.Role == role)
        .OrderBy(contributor => contributor.Name, StringComparer.Ordinal)
        .Select(contributor => contributor.Name)
        .ToArray();
  }

  private static LibraryRefreshJobDto MapJob(LibraryRefreshJobEntity job)
  {
    return new LibraryRefreshJobDto(
        job.Id,
        job.Status switch
        {
          LibraryRefreshJobStatus.Running => "running",
          LibraryRefreshJobStatus.Succeeded => "succeeded",
          LibraryRefreshJobStatus.PartialFailure => "partial-failure",
          _ => "failed"
        },
        job.PhaseSummary,
        job.StartedAtUtc,
        job.CompletedAtUtc,
        job.ObservedItemCount,
        job.ImportedItemCount,
        job.RetainedNoLongerPresentItemCount,
        job.SnapshotObservationCount,
        job.Phases
            .OrderBy(phase => phase.StartedAtUtc)
            .Select(
                phase => new LibraryRefreshJobPhaseDto(
                    phase.Name,
                    phase.Status switch
                    {
                      LibraryRefreshJobPhaseStatus.Running => "running",
                      LibraryRefreshJobPhaseStatus.Succeeded => "succeeded",
                      LibraryRefreshJobPhaseStatus.Skipped => "skipped",
                      _ => "failed"
                    },
                    phase.Summary,
                    phase.StartedAtUtc,
                    phase.CompletedAtUtc))
            .ToArray(),
        job.Errors
            .OrderBy(error => error.Id)
            .Select(error => new LibraryOperationErrorDto(error.Code, error.Message, error.TechnicalDetails, error.Phase))
            .ToArray());
  }

  private sealed record PersistRefreshSummary(
      int ImportedItemCount,
      int RetainedNoLongerPresentItemCount,
      int SnapshotObservationCount,
      IReadOnlyList<LibraryOperationError> Errors);
}
