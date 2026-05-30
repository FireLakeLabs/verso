
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Verso.Api.Tests;

public sealed class AudibleLibraryImportTests
{
  [Fact]
  public async Task ImportPersistsAudibleItemsAndReturnsCurrentAudibleFacts()
  {
    await using var application = new VersoApplicationFactory(
        AudibleApiFixtureLibrary.LoadImportedItems("current-audible-facts/asin-identity"));

    using var client = application.CreateClient();

    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    Assert.Equal(2, library.Items.Count);

    var original = Assert.Single(library.Items, item => item.Asin == "B00TEST123");
    Assert.Equal("Project Hail Mary", original.Title);
    Assert.Equal(["Andy Weir"], original.Authors);
    Assert.Equal(["Ray Porter"], original.Narrators);
    Assert.Equal(973, original.RuntimeMinutes);
    Assert.Equal(100, original.PercentComplete);
    Assert.Contains("unexpected_field", original.RawAudiblePayload);

    var edition = Assert.Single(library.Items, item => item.Asin == "B00TEST124");
    Assert.Equal("Project Hail Mary", edition.Title);
    Assert.Equal(["Andy Weir", "Guest Essayist"], edition.Authors);
    Assert.Equal(["Guest Narrator", "Ray Porter"], edition.Narrators.OrderBy(name => name, StringComparer.Ordinal).ToArray());
    Assert.Equal(985, edition.RuntimeMinutes);
    Assert.Equal(42, edition.PercentComplete);
    Assert.Contains("current_audible_facts", edition.RawAudiblePayload);
  }

  [Fact]
  public async Task ReimportUpdatesExistingAudibleItemByAsin()
  {
    await using var application = new VersoApplicationFactory(
        [
            new ImportedAudibleItem(
                    "B00TEST123",
                    "Original Title",
                    ["Author One"],
                    ["Narrator One"],
                    600,
                    10,
                    "{\"asin\":\"B00TEST123\",\"title\":\"Original Title\"}")
        ]);

    using var client = application.CreateClient();

    var firstImport = await client.PostAsync("/api/audible-library/imports", content: null);
    Assert.Equal(HttpStatusCode.OK, firstImport.StatusCode);

    application.SetImportedItems(
        [
            new ImportedAudibleItem(
                    "B00TEST123",
                    "Updated Title",
                    ["Author One", "Author Two"],
                    ["Narrator Two"],
                    650,
                    25,
                    "{\"asin\":\"B00TEST123\",\"title\":\"Updated Title\",\"new_field\":true}")
        ]);

    var secondImport = await client.PostAsync("/api/audible-library/imports", content: null);
    Assert.Equal(HttpStatusCode.OK, secondImport.StatusCode);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.Equal("Updated Title", item.Title);
    Assert.Equal(["Author One", "Author Two"], item.Authors);
    Assert.Equal(["Narrator Two"], item.Narrators);
    Assert.Equal(650, item.RuntimeMinutes);
    Assert.Equal(25, item.PercentComplete);
    Assert.Contains("new_field", item.RawAudiblePayload);
  }

  [Fact]
  public async Task ImportCachesCoverImagesAndExposesCachedAssetMetadata()
  {
    var assetDownloader = new FakeAudibleAssetDownloader(
        new Dictionary<string, DownloadedAudibleAsset>(StringComparer.Ordinal)
        {
          ["https://images.audible.test/B0EDGE0001-500.jpg"] = new("image/jpeg", [1, 2, 3], ".jpg")
        });

    await using var application = new VersoApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(assetDownloader);

    using var client = application.CreateClient();

    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var importResult = await importResponse.Content.ReadFromJsonAsync<AudibleLibraryImportResponse>();

    Assert.NotNull(importResult);
    Assert.Equal(1, importResult.CachedCoverImageCount);
    Assert.Empty(importResult.Statuses);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    var coverImage = Assert.Single(item.CoverImages);

    Assert.Equal("500", coverImage.Variant);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage.SourceUrl);
    Assert.NotNull(coverImage.CachedAsset);
    Assert.Equal("image/jpeg", coverImage.CachedAsset.ContentType);
    Assert.Equal($"/api/library/items/{item.Asin}/cover-images/500", coverImage.CachedAsset.Url);
    Assert.Equal(["https://images.audible.test/B0EDGE0001-500.jpg"], assetDownloader.RequestedUrls);

    var cachedBytes = await client.GetByteArrayAsync(coverImage.CachedAsset.Url);

    Assert.Equal([1, 2, 3], cachedBytes);

    await using var scope = application.Services.CreateAsyncScope();
    var service = scope.ServiceProvider.GetRequiredService<AudibleLibraryImportService>();
    var exportReferences = await service.GetCachedCoverAssetReferencesAsync(CancellationToken.None);
    var exportReference = Assert.Single(exportReferences);

    Assert.Equal(item.Asin, exportReference.Asin);
    Assert.Equal("500", exportReference.Variant);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", exportReference.SourceUrl);
    Assert.EndsWith(".jpg", exportReference.RelativePath, StringComparison.OrdinalIgnoreCase);
    Assert.Equal("image/jpeg", exportReference.ContentType);
    Assert.Equal(3, exportReference.SizeBytes);
  }

  [Fact]
  public async Task ImportReturnsTypedStatusWhenCoverCachingFailsButStillPersistsAudibleItem()
  {
    var assetDownloader = new FailingAudibleAssetDownloader();

    await using var application = new VersoApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(assetDownloader);

    using var client = application.CreateClient();

    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var importResult = await importResponse.Content.ReadFromJsonAsync<AudibleLibraryImportResponse>();

    Assert.NotNull(importResult);
    Assert.Equal(0, importResult.CachedCoverImageCount);
    var status = Assert.Single(importResult.Statuses);
    Assert.Equal("audible-cover-cache-failed", status.Code);
    Assert.Equal("B0EDGE0001", status.Asin);
    Assert.Equal("500", status.CoverVariant);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", status.SourceUrl);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    var coverImage = Assert.Single(item.CoverImages);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage.SourceUrl);
    Assert.Null(coverImage.CachedAsset);
    Assert.Equal(["https://images.audible.test/B0EDGE0001-500.jpg"], assetDownloader.RequestedUrls);
  }

  [Fact]
  public async Task ImportReturnsTypedStatusWhenCoverUrlReturnsNonImageContent()
  {
    var assetDownloader = new FakeAudibleAssetDownloader(
        new Dictionary<string, DownloadedAudibleAsset>(StringComparer.Ordinal)
        {
          ["https://images.audible.test/B0EDGE0001-500.jpg"] = new("application/pdf", [1, 2, 3], ".pdf")
        });

    await using var application = new VersoApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(assetDownloader);

    using var client = application.CreateClient();

    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var importResult = await importResponse.Content.ReadFromJsonAsync<AudibleLibraryImportResponse>();

    Assert.NotNull(importResult);
    Assert.Equal(0, importResult.CachedCoverImageCount);
    var status = Assert.Single(importResult.Statuses);
    Assert.Equal("audible-cover-cache-failed", status.Code);
    Assert.Equal("500", status.CoverVariant);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", status.SourceUrl);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    var coverImage = Assert.Single(item.CoverImages);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage.SourceUrl);
    Assert.Null(coverImage.CachedAsset);
    Assert.Equal(["https://images.audible.test/B0EDGE0001-500.jpg"], assetDownloader.RequestedUrls);
  }

  [Fact]
  public async Task StartupAppliesEntityFrameworkMigrationsToCleanDatabase()
  {
    await using var application = new VersoApplicationFactory([]);
    using var client = application.CreateClient();

    var response = await client.GetAsync("/health");

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    await using var scope = application.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<VersoDbContext>();
    var appliedMigrations = await database.Database.GetAppliedMigrationsAsync();
    var itemCount = await database.AudibleItems.CountAsync();

    Assert.NotEmpty(appliedMigrations);
    Assert.Equal(0, itemCount);
  }

  [Fact]
  public async Task StartAndCompleteAuthenticationPersistsCurrentAudibleSession()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FakeAudibleLoginClient());

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));

    Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);
    Assert.Equal("awaiting-browser-completion", prompt.Status);
    Assert.Equal("us", prompt.Locale);
    Assert.NotEqual(Guid.Empty, prompt.SessionId);
    Assert.StartsWith("https://www.audible.", prompt.LoginUrl);
    Assert.NotEmpty(prompt.SignInCookies);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    var completed = await completeResponse.Content.ReadFromJsonAsync<AudibleAuthenticationStatusResponse>();

    Assert.NotNull(completed);
    Assert.Equal("authenticated", completed.Status);
    Assert.Equal("us", completed.Locale);

    var currentSession = await client.GetFromJsonAsync<AudibleAuthenticationStatusResponse>("/api/audible-authentication/session");

    Assert.NotNull(currentSession);
    Assert.Equal("authenticated", currentSession.Status);
    Assert.Equal("us", currentSession.Locale);
  }

  [Fact]
  public async Task StartAuthenticationReturnsServerErrorWhenLoginClientFailsBeforePrompt()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FailingAudibleLoginClient());

    using var client = application.CreateClient();

    var response = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));

    Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

    var error = await response.Content.ReadFromJsonAsync<OperationErrorResponse>();

    Assert.NotNull(error);
    Assert.Equal("audible-authentication-start-failed", error.Code);
    Assert.Equal("Audible authentication could not be started. Try again.", error.Message);
  }

  private sealed class VersoApplicationFactory(IReadOnlyList<ImportedAudibleItem> items) : WebApplicationFactory<Program>
  {
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"verso-tests-{Guid.NewGuid():N}.db");
    private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), $"verso-tests-data-{Guid.NewGuid():N}");
    private readonly MutableAudibleLibrarySource source = new(items);
    private IAudibleLoginClient? loginClient;
    private IAudibleAssetDownloader? assetDownloader;

    public void SetImportedItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      source.SetItems(items);
    }

    public void SetLoginClient(IAudibleLoginClient loginClient)
    {
      this.loginClient = loginClient;
    }

    public void SetAssetDownloader(IAudibleAssetDownloader assetDownloader)
    {
      this.assetDownloader = assetDownloader;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
      builder.UseEnvironment("Testing");
      builder.UseSetting("VERSO_SQLITE_CONNECTION_STRING", $"Data Source={databasePath};Pooling=False");
      builder.UseSetting("VERSO_DATA_DIRECTORY", dataDirectory);

      builder.ConfigureServices(services =>
      {
        services.AddSingleton<IAudibleLibrarySource>(source);

        if (loginClient is not null)
        {
          services.RemoveAll<IAudibleLoginClient>();
          services.AddSingleton(loginClient);
        }

        if (assetDownloader is not null)
        {
          services.RemoveAll<IAudibleAssetDownloader>();
          services.AddSingleton(assetDownloader);
        }
      });
    }

    protected override void Dispose(bool disposing)
    {
      base.Dispose(disposing);

      if (disposing && File.Exists(databasePath))
      {
        File.Delete(databasePath);
      }

      if (disposing && Directory.Exists(dataDirectory))
      {
        Directory.Delete(dataDirectory, recursive: true);
      }
    }
  }

  private sealed class MutableAudibleLibrarySource(IReadOnlyList<ImportedAudibleItem> items) : IAudibleLibrarySource
  {
    private IReadOnlyList<ImportedAudibleItem> currentItems = items;

    public void SetItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      currentItems = items;
    }

    public Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(currentItems);
    }
  }

  private sealed class FakeAudibleLoginClient : IAudibleLoginClient
  {
    public async Task EnsureAuthenticatedAsync(
        string locale,
        string identityFilePath,
        Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync,
        CancellationToken cancellationToken)
    {
      var responseUrl = await externalLoginAsync(
          new ExternalAudibleLoginPrompt(
              "https://www.audible.test/signin",
              [new AudibleSignInCookieDto("x-main", "cookie-value", ".audible.test", "/")]));

      Directory.CreateDirectory(Path.GetDirectoryName(identityFilePath)!);
      await File.WriteAllTextAsync(identityFilePath, responseUrl, cancellationToken);
    }
  }

  private sealed class FailingAudibleLoginClient : IAudibleLoginClient
  {
    public Task EnsureAuthenticatedAsync(
        string locale,
        string identityFilePath,
        Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync,
        CancellationToken cancellationToken)
    {
      throw new InvalidOperationException("Synthetic login failure before prompt.");
    }
  }

  private sealed class FakeAudibleAssetDownloader(
      IReadOnlyDictionary<string, DownloadedAudibleAsset> assets) : IAudibleAssetDownloader
  {
    public List<string> RequestedUrls { get; } = [];

    public Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken)
    {
      RequestedUrls.Add(sourceUrl);

      return assets.TryGetValue(sourceUrl, out var asset)
          ? Task.FromResult(asset)
          : Task.FromException<DownloadedAudibleAsset>(
              new InvalidOperationException($"Synthetic asset was not configured for {sourceUrl}."));
    }
  }

  private sealed class FailingAudibleAssetDownloader : IAudibleAssetDownloader
  {
    public List<string> RequestedUrls { get; } = [];

    public Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken)
    {
      RequestedUrls.Add(sourceUrl);
      throw new IOException("Synthetic cover download failure.");
    }
  }
}
