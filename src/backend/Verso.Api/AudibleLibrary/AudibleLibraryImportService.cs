
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class AudibleLibraryImportService(
    IDbContextFactory<VersoDbContext> databaseFactory,
    IAudibleLibrarySource source,
    AudibleCoverAssetCacheService coverAssetCacheService)
{
  public async Task<AudibleLibraryImportResponse> ImportAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var importedItems = await source.GetLibraryAsync(cancellationToken);
    var statuses = new List<AudibleLibraryImportStatusDto>();
    var cachedCoverImageCount = 0;
    var importedAsins = importedItems
        .Select(item => item.Asin)
        .Distinct(StringComparer.Ordinal)
        .ToArray();

    var existingItems = await database.AudibleItems
        .AsSplitQuery()
        .Include(item => item.Contributors)
        .Include(item => item.CoverImages)
        .Where(item => importedAsins.Contains(item.Asin))
        .ToDictionaryAsync(item => item.Asin, StringComparer.Ordinal, cancellationToken);

    foreach (var importedItem in importedItems)
    {
      if (!existingItems.TryGetValue(importedItem.Asin, out var existingItem))
      {
        existingItem = new AudibleItemEntity
        {
          Asin = importedItem.Asin
        };

        database.AudibleItems.Add(existingItem);
        existingItems.Add(importedItem.Asin, existingItem);
      }

      existingItem.Title = importedItem.Title;
      existingItem.RuntimeMinutes = importedItem.RuntimeMinutes;
      existingItem.PercentComplete = importedItem.PercentComplete;
      existingItem.RawAudiblePayload = importedItem.RawAudiblePayload;

      existingItem.Contributors.Clear();

      foreach (var author in importedItem.Authors.Distinct(StringComparer.Ordinal))
      {
        existingItem.Contributors.Add(new AudibleItemContributorEntity
        {
          AudibleItemAsin = importedItem.Asin,
          Name = author,
          Role = AudibleItemContributorRole.Author
        });
      }

      foreach (var narrator in importedItem.Narrators.Distinct(StringComparer.Ordinal))
      {
        existingItem.Contributors.Add(new AudibleItemContributorEntity
        {
          AudibleItemAsin = importedItem.Asin,
          Name = narrator,
          Role = AudibleItemContributorRole.Narrator
        });
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
              importedItem.Asin,
              importedCoverImage,
              existingCoverImage,
              cancellationToken);

          if (cacheResult.Downloaded)
          {
            cachedCoverImageCount++;
          }

          if (existingCoverImage is null)
          {
            existingItem.CoverImages.Add(cacheResult.CoverImage);
            continue;
          }

          CopyCoverImage(cacheResult.CoverImage, existingCoverImage);
        }
        catch (AudibleCoverCachingException)
        {
          UpsertFailedCoverImage(existingItem, existingCoverImage, importedItem.Asin, importedCoverImage);
          statuses.Add(CreateCoverCachingFailure(importedItem.Asin, importedCoverImage));
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

    await database.SaveChangesAsync(cancellationToken);

    return new AudibleLibraryImportResponse(importedItems.Count, cachedCoverImageCount, statuses);
  }

  public async Task<LibraryItemsResponse> GetLibraryAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var items = await database.AudibleItems
        .AsNoTracking()
        .AsSplitQuery()
        .Include(item => item.Contributors)
        .Include(item => item.CoverImages)
        .OrderBy(item => item.Title)
        .ToListAsync(cancellationToken);

    return new LibraryItemsResponse(
        items.Select(item => new LibraryItemDto(
                item.Asin,
                item.Title,
                item.Contributors
                    .Where(contributor => contributor.Role == AudibleItemContributorRole.Author)
                    .OrderBy(contributor => contributor.Name)
                    .Select(contributor => contributor.Name)
                    .ToArray(),
                item.Contributors
                    .Where(contributor => contributor.Role == AudibleItemContributorRole.Narrator)
                    .OrderBy(contributor => contributor.Name)
                    .Select(contributor => contributor.Name)
                    .ToArray(),
                item.RuntimeMinutes,
                item.PercentComplete,
                item.RawAudiblePayload,
                item.CoverImages
                    .OrderBy(coverImage => coverImage.Variant)
                    .Select(coverImage => new LibraryItemCoverImageDto(
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
            .ToArray());
  }

  public async Task<IReadOnlyList<CachedCoverAssetReference>> GetCachedCoverAssetReferencesAsync(
      CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    return await database.AudibleItemCoverImages
        .AsNoTracking()
        .Where(coverImage =>
            coverImage.CachedRelativePath != null
            && coverImage.CachedContentType != null
            && coverImage.CachedSizeBytes != null
            && coverImage.CachedAtUtc != null)
        .OrderBy(coverImage => coverImage.AudibleItemAsin)
        .ThenBy(coverImage => coverImage.Variant)
        .Select(coverImage => new CachedCoverAssetReference(
            coverImage.AudibleItemAsin,
            coverImage.Variant,
            coverImage.SourceUrl,
            coverImage.CachedRelativePath!,
            coverImage.CachedContentType!,
            coverImage.CachedSizeBytes!.Value,
            coverImage.CachedAtUtc!.Value))
        .ToListAsync(cancellationToken);
  }

  public async Task<CachedCoverImageFileResponse?> GetCachedCoverImageAsync(
      string asin,
      string variant,
      CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var coverImage = await database.AudibleItemCoverImages
        .AsNoTracking()
        .SingleOrDefaultAsync(
            item => item.AudibleItemAsin == asin
                && item.Variant == variant
                && item.CachedRelativePath != null
                && item.CachedContentType != null,
            cancellationToken);

    if (coverImage?.CachedRelativePath is null || coverImage.CachedContentType is null)
    {
      return null;
    }

    var absolutePath = coverAssetCacheService.GetAbsolutePath(coverImage.CachedRelativePath);
    if (!File.Exists(absolutePath))
    {
      return null;
    }

    return new CachedCoverImageFileResponse(
        await File.ReadAllBytesAsync(absolutePath, cancellationToken),
        coverImage.CachedContentType);
  }

  private static AudibleLibraryImportStatusDto CreateCoverCachingFailure(
      string asin,
      ImportedAudibleCoverImage importedCoverImage)
  {
    return new AudibleLibraryImportStatusDto(
        "audible-cover-cache-failed",
        "Cover art could not be cached. Verso kept the Audible Item and its source URL for a later refresh.",
        asin,
        importedCoverImage.Variant,
        importedCoverImage.SourceUrl);
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
}
