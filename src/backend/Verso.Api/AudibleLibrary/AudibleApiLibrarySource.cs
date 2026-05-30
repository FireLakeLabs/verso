
using AudibleApi;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;

namespace Verso.Api;

public sealed class AudibleApiLibrarySource(VersoDbContext database) : IAudibleLibrarySource
{
  public async Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
  {
    var authenticatedSession = await database.AudibleAuthenticationStates
        .AsNoTracking()
        .SingleOrDefaultAsync(session => session.Id == AudibleAuthenticationService.CurrentSessionId, cancellationToken);

    if (authenticatedSession is null || !File.Exists(authenticatedSession.IdentityFilePath))
    {
      return AudibleLibraryFetchResult.Failed(
          [
              new LibraryOperationError(
                  "audible-library-authentication-required",
                  "Authenticate with Audible before refreshing the library.",
                  "The local Audible identity file is missing or no longer valid.",
                  "authenticate")
          ]);
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
      JObject rawPage;
      try
      {
        rawPage = await api.GetLibraryAsync(libraryOptions);
      }
      catch (HttpRequestException exception)
      {
        return CreateFetchFailure(importedItems, pageNumber, exception);
      }
      catch (IOException exception)
      {
        return CreateFetchFailure(importedItems, pageNumber, exception);
      }
      catch (InvalidOperationException exception)
      {
        return CreateFetchFailure(importedItems, pageNumber, exception);
      }
      var rawItems = rawPage["items"] as JArray;

      if (rawItems is null || rawItems.Count == 0)
      {
        break;
      }

      try
      {
        importedItems.AddRange(rawItems.OfType<JObject>().Select(AudibleApiItemMapper.Map));
      }
      catch (InvalidOperationException exception)
      {
        return importedItems.Count > 0
            ? AudibleLibraryFetchResult.PartialFailure(
                importedItems,
                [
                    new LibraryOperationError(
                        "audible-library-map-failed",
                        "Audible Library refresh stopped early. The last successful library state was preserved.",
                        $"A fetched Audible item on page {pageNumber} could not be mapped: {exception.Message}",
                        "fetch-library")
                ])
            : AudibleLibraryFetchResult.Failed(
                [
                    new LibraryOperationError(
                        "audible-library-map-failed",
                        "Audible Library refresh failed before a new library state could be saved.",
                        $"A fetched Audible item on page {pageNumber} could not be mapped: {exception.Message}",
                        "fetch-library")
                ]);
      }

      if (rawItems.Count < libraryOptions.NumberOfResultPerPage)
      {
        break;
      }
    }

    return AudibleLibraryFetchResult.Succeeded(importedItems);
  }

  private static AudibleLibraryFetchResult CreateFetchFailure(
      List<ImportedAudibleItem> importedItems,
      int pageNumber,
      Exception exception)
  {
    return importedItems.Count > 0
        ? AudibleLibraryFetchResult.PartialFailure(
            importedItems,
            [
                new LibraryOperationError(
                    "audible-library-fetch-failed",
                    "Audible Library refresh stopped early. The last successful library state was preserved.",
                    $"Audible page {pageNumber} failed with {exception.GetType().Name}.",
                    "fetch-library")
            ])
        : AudibleLibraryFetchResult.Failed(
            [
                new LibraryOperationError(
                    "audible-library-fetch-failed",
                    "Audible Library refresh failed before a new library state could be saved.",
                    $"Audible page {pageNumber} failed with {exception.GetType().Name}.",
                    "fetch-library")
            ]);
  }
}
