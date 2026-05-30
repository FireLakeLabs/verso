namespace Verso.Api;

using AudibleApi;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;

public sealed class AudibleApiLibrarySource(VersoDbContext database) : IAudibleLibrarySource
{
    public async Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken)
    {
        var authenticatedSession = await database.AudibleAuthenticationStates
            .AsNoTracking()
            .SingleOrDefaultAsync(session => session.Id == AudibleAuthenticationService.CurrentSessionId, cancellationToken);

        if (authenticatedSession is null || !File.Exists(authenticatedSession.IdentityFilePath))
        {
            throw new InvalidOperationException("Audible authentication is required before importing the Audible Library.");
        }

        var api = await EzApiCreator.GetApiAsync(Localization.Get(authenticatedSession.Locale), authenticatedSession.IdentityFilePath);
        var importedItems = new List<ImportedAudibleItem>();
        var libraryOptions = new LibraryOptions
        {
            ResponseGroups = LibraryOptions.ResponseGroupOptions.ALL_OPTIONS,
            NumberOfResultPerPage = 50
        };

        for (var pageNumber = 1; ; pageNumber++)
        {
            libraryOptions.PageNumber = pageNumber;
            var rawPage = await api.GetLibraryAsync(libraryOptions);
            var rawItems = rawPage["items"] as JArray;

            if (rawItems is null || rawItems.Count == 0)
            {
                break;
            }

            importedItems.AddRange(rawItems.OfType<JObject>().Select(AudibleApiItemMapper.Map));

            if (rawItems.Count < libraryOptions.NumberOfResultPerPage)
            {
                break;
            }
        }

        return importedItems;
    }
}