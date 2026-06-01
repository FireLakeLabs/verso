namespace Verso.Api;

public interface IAudibleLibrarySource
{
  Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken);
}

public sealed record ImportedAudibleCoverImage(string Variant, string SourceUrl);

public sealed record ImportedAudibleItem(
    string Asin,
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Narrators,
    int RuntimeMinutes,
    int PercentComplete,
    string RawAudiblePayload,
    string? PublisherSummary = null,
    bool HasCompanionPdf = false,
    bool? IsReturnable = null,
    IReadOnlyList<ImportedAudibleSeriesEntry>? Series = null,
    IReadOnlyList<ImportedAudibleCoverImage>? CoverImages = null);

public sealed record ImportedAudibleSeriesEntry(string Title, string? Sequence);

public enum AudibleLibraryFetchStatus
{
  Succeeded,
  PartialFailure,
  Failed
}

public sealed record AudibleLibraryFetchResult(
    AudibleLibraryFetchStatus Status,
    IReadOnlyList<ImportedAudibleItem> Items,
    IReadOnlyList<LibraryOperationError> Errors)
{
  public static AudibleLibraryFetchResult Succeeded(IReadOnlyList<ImportedAudibleItem> items)
  {
    return new(AudibleLibraryFetchStatus.Succeeded, items, []);
  }

  public static AudibleLibraryFetchResult PartialFailure(
      IReadOnlyList<ImportedAudibleItem> items,
      IReadOnlyList<LibraryOperationError> errors)
  {
    return new(AudibleLibraryFetchStatus.PartialFailure, items, errors);
  }

  public static AudibleLibraryFetchResult Failed(params LibraryOperationError[] errors)
  {
    return new(AudibleLibraryFetchStatus.Failed, [], errors);
  }
}

public sealed record LibraryOperationError(
    string Code,
    string Message,
    string? TechnicalDetails,
    string Phase);

public sealed record AudibleLibraryImportResponse(
    int ImportedItemCount,
    int CachedCoverImageCount,
    IReadOnlyList<AudibleLibraryImportStatusDto> Statuses);

public sealed record AudibleLibraryImportStatusDto(
    string Code,
    string Message,
    string Asin,
    string? CoverVariant,
    string? SourceUrl);

public sealed record StartLibraryRefreshResponse(LibraryRefreshJobDto Job);

public sealed record LibraryRefreshStatusResponse(
    IReadOnlyList<LibraryRefreshJobDto> ActiveJobs,
    IReadOnlyList<LibraryRefreshJobDto> RecentJobs);

public sealed record LibraryRefreshJobDto(
    Guid Id,
    string Status,
    string PhaseSummary,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    int ObservedItemCount,
    int ImportedItemCount,
    int RetainedNoLongerPresentItemCount,
    int SnapshotObservationCount,
    IReadOnlyList<LibraryRefreshJobPhaseDto> Phases,
    IReadOnlyList<LibraryOperationErrorDto> Errors);

public sealed record LibraryRefreshJobPhaseDto(
    string Name,
    string Status,
    string Summary,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record LibraryOperationErrorDto(
    string Code,
    string Message,
    string? TechnicalDetails,
    string Phase);

public sealed record LibraryOverviewResponse(
    LibraryOverviewSummaryDto Summary,
    LibraryRefreshJobDto? LatestRefreshJob);

public sealed record LibraryOverviewSummaryDto(
    int TotalItems,
    int PresentItems,
    int NoLongerPresentItems,
    int CompletedItems,
    int InProgressItems,
    int OpenFindingsCount);

public sealed record HealthFindingsResponse(
    HealthFindingsSummaryDto Summary,
    IReadOnlyList<HealthFindingDto> Findings);

public sealed record HealthFindingsSummaryDto(
    int CurrentCount,
    int OpenCount,
    int AcknowledgedCount,
    int DismissedCount,
    int HistoricalCount);

public sealed record HealthFindingDto(
    string Id,
    string Kind,
    string Title,
    string Message,
    IReadOnlyList<string> ItemAsins,
    IReadOnlyList<string> Evidence,
    bool IsCurrent,
    HealthFindingDispositionDto Disposition);

public sealed record HealthFindingDispositionDto(
    string Status,
    DateTimeOffset? UpdatedAtUtc);

public sealed record UpdateHealthFindingDispositionRequest(string Status);

public sealed record HealthFindingDispositionResponse(
    HealthFindingDispositionDto? Disposition,
    bool Updated);

public sealed record LibraryItemsResponse(IReadOnlyList<LibraryItemDto> Items);

public sealed record CachedAssetDto(
    string ContentType,
    long SizeBytes,
    DateTimeOffset CachedAtUtc,
    string Url);

public sealed record CachedCoverAssetReference(
    string Asin,
    string Variant,
    string SourceUrl,
    string RelativePath,
    string ContentType,
    long SizeBytes,
    DateTimeOffset CachedAtUtc);

public sealed record LibraryItemCoverImageDto(
    string Variant,
    string SourceUrl,
    CachedAssetDto? CachedAsset);

public sealed record LibraryItemDto(
    string Asin,
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Narrators,
    int RuntimeMinutes,
    int PercentComplete,
    string RawAudiblePayload,
    bool IsNoLongerPresent,
    bool HasSnapshots,
    IReadOnlyList<LibraryItemCoverImageDto>? CoverImages = null);

public sealed record LibraryItemDetailResponse(LibraryItemDetailDto Item);

public sealed record LibraryItemDetailDto(
    string Asin,
    bool IsNoLongerPresent,
    CurrentAudibleFactsDto CurrentAudibleFacts,
    IReadOnlyList<ImportedAudibleSeriesEntry> Series,
    VersoAnnotationsDto VersoAnnotations,
    IReadOnlyList<SelectiveSnapshotObservationDto> SnapshotHistory);

public sealed record CurrentAudibleFactsDto(
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Narrators,
    int RuntimeMinutes,
    int PercentComplete,
    string? PublisherSummary,
    bool HasCompanionPdf,
    bool? IsReturnable,
    string RawAudiblePayload);

public sealed record VersoAnnotationsDto(
    IReadOnlyList<string> Tags,
    bool IsDropped,
    string? Note);

public sealed record SelectiveSnapshotObservationDto(
    string Field,
    string Value,
    DateTimeOffset ObservedAtUtc);
