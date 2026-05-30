namespace Verso.Api;

using Microsoft.EntityFrameworkCore;

public sealed class AudibleLibraryImportService(IDbContextFactory<VersoDbContext> databaseFactory, IAudibleLibrarySource source)
{
    public async Task<AudibleLibraryImportResponse> ImportAsync(CancellationToken cancellationToken)
    {
        await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
        var importedItems = await source.GetLibraryAsync(cancellationToken);

        foreach (var importedItem in importedItems)
        {
            var existingItem = await database.AudibleItems
                .Include(item => item.Contributors)
                .SingleOrDefaultAsync(item => item.Asin == importedItem.Asin, cancellationToken);

            if (existingItem is null)
            {
                existingItem = new AudibleItemEntity
                {
                    Asin = importedItem.Asin
                };

                database.AudibleItems.Add(existingItem);
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
        }

        await database.SaveChangesAsync(cancellationToken);

        return new AudibleLibraryImportResponse(importedItems.Count);
    }

    public async Task<LibraryItemsResponse> GetLibraryAsync(CancellationToken cancellationToken)
    {
        await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
        var items = await database.AudibleItems
            .AsNoTracking()
            .Include(item => item.Contributors)
            .OrderBy(item => item.Title)
            .Select(item => new LibraryItemDto(
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
                item.RawAudiblePayload))
            .ToListAsync(cancellationToken);

        return new LibraryItemsResponse(items);
    }
}