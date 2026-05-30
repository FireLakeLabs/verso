namespace Verso.Api;

public interface IAudibleLibrarySource
{
    Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken);
}

public sealed record ImportedAudibleItem(
    string Asin,
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Narrators,
    int RuntimeMinutes,
    int PercentComplete,
    string RawAudiblePayload);

public sealed record AudibleLibraryImportResponse(int ImportedItemCount);

public sealed record LibraryItemsResponse(IReadOnlyList<LibraryItemDto> Items);

public sealed record LibraryItemDto(
    string Asin,
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Narrators,
    int RuntimeMinutes,
    int PercentComplete,
    string RawAudiblePayload);