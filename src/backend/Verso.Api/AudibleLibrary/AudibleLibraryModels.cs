namespace Verso.Api;

public interface IAudibleLibrarySource
{
  Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken);
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
    IReadOnlyList<ImportedAudibleCoverImage>? CoverImages = null);

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
    IReadOnlyList<LibraryItemCoverImageDto> CoverImages);
