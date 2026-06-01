
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Verso.Api.Tests;

public sealed class ApiContractTests
{
  [Fact]
  public async Task LibraryItemsEndpointReturnsExplicitCamelCaseDtoContract()
  {
    await using var application = new ContractApplicationFactory(
        [
            new ImportedAudibleItem(
                    "B00TEST123",
                    "Project Hail Mary",
                    ["Andy Weir"],
                    ["Ray Porter"],
                    973,
                    100,
                    "{\"asin\":\"B00TEST123\"}")
        ]);

    using var client = application.CreateClient();
    var importResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var body = await client.GetStringAsync("/api/library/items");
    var json = JsonNode.Parse(body)!.AsObject();
    var items = json["items"]!.AsArray();
    var item = items.Single()!.AsObject();

    Assert.True(json.ContainsKey("items"));
    Assert.True(item.ContainsKey("asin"));
    Assert.True(item.ContainsKey("title"));
    Assert.True(item.ContainsKey("authors"));
    Assert.True(item.ContainsKey("narrators"));
    Assert.True(item.ContainsKey("runtimeMinutes"));
    Assert.True(item.ContainsKey("percentComplete"));
    Assert.True(item.ContainsKey("rawAudiblePayload"));
    Assert.True(item.ContainsKey("isNoLongerPresent"));
    Assert.True(item.ContainsKey("hasSnapshots"));
    Assert.True(item.ContainsKey("coverImages"));
    Assert.False(item.ContainsKey("contributors"));
  }

  [Fact]
  public async Task RefreshStatusEndpointReturnsExplicitCamelCaseDtoContract()
  {
    await using var application = new ContractApplicationFactory(
        [
            new ImportedAudibleItem(
                "B00TEST123",
                "Project Hail Mary",
                ["Andy Weir"],
                ["Ray Porter"],
                973,
                100,
                "{\"asin\":\"B00TEST123\"}")
        ]);

    using var client = application.CreateClient();
    var refreshResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

    var body = await client.GetStringAsync("/api/library/refresh-status");
    var json = JsonNode.Parse(body)!.AsObject();
    var recentJobs = json["recentJobs"]!.AsArray();
    var job = recentJobs.Single()!.AsObject();
    var phases = job["phases"]!.AsArray();
    var phase = phases[0]!.AsObject();

    Assert.True(json.ContainsKey("activeJobs"));
    Assert.True(json.ContainsKey("recentJobs"));
    Assert.True(job.ContainsKey("phaseSummary"));
    Assert.True(job.ContainsKey("startedAtUtc"));
    Assert.True(job.ContainsKey("completedAtUtc"));
    Assert.True(job.ContainsKey("observedItemCount"));
    Assert.True(job.ContainsKey("importedItemCount"));
    Assert.True(job.ContainsKey("retainedNoLongerPresentItemCount"));
    Assert.True(job.ContainsKey("snapshotObservationCount"));
    Assert.True(job.ContainsKey("errors"));
    Assert.True(phase.ContainsKey("name"));
    Assert.True(phase.ContainsKey("status"));
    Assert.True(phase.ContainsKey("summary"));
  }

  [Fact]
  public async Task SettingsEndpointReturnsExplicitSolidV1DtoContract()
  {
    await using var application = new ContractApplicationFactory([]);

    using var client = application.CreateClient();

    var body = await client.GetStringAsync("/api/settings");
    var json = JsonNode.Parse(body)!.AsObject();

    Assert.True(json.ContainsKey("interfacePreferences"));
    Assert.True(json.ContainsKey("audibleAuthentication"));
    Assert.True(json.ContainsKey("refresh"));
    Assert.True(json.ContainsKey("costBasis"));
    Assert.True(json.ContainsKey("localData"));
    Assert.True(json.ContainsKey("archiveExport"));
    Assert.False(json.ContainsKey("aiProviders"));
    Assert.False(json.ContainsKey("externalApiKeys"));
    Assert.False(json.ContainsKey("alerts"));
    Assert.False(json.ContainsKey("publicProfile"));
    Assert.False(json.ContainsKey("notifications"));
    Assert.False(json.ContainsKey("mobileCapture"));

    var interfacePreferences = json["interfacePreferences"]!.AsObject();
    Assert.True(interfacePreferences.ContainsKey("navChrome"));
    Assert.True(interfacePreferences.ContainsKey("defaultOverviewVariant"));
    Assert.True(interfacePreferences.ContainsKey("defaultLibraryView"));

    var audibleAuthentication = json["audibleAuthentication"]!.AsObject();
    Assert.True(audibleAuthentication.ContainsKey("status"));
    Assert.True(audibleAuthentication.ContainsKey("locale"));
    Assert.True(audibleAuthentication.ContainsKey("lastAuthenticatedAtUtc"));
    Assert.True(audibleAuthentication.ContainsKey("lastError"));

    var refresh = json["refresh"]!.AsObject();
    Assert.True(refresh.ContainsKey("trigger"));
    Assert.True(refresh.ContainsKey("retainNoLongerPresentItems"));
    Assert.True(refresh.ContainsKey("selectiveSnapshotFields"));
    Assert.Equal("manual", refresh["trigger"]!.GetValue<string>());

    var costBasis = json["costBasis"]!.AsObject();
    Assert.True(costBasis.ContainsKey("defaultBasis"));
    Assert.True(costBasis.ContainsKey("perCreditValue"));
    Assert.True(costBasis.ContainsKey("currencyCode"));

    var localData = json["localData"]!.AsObject();
    Assert.True(localData.ContainsKey("databaseLocation"));
    Assert.True(localData.ContainsKey("databaseSizeBytes"));
    Assert.True(localData.ContainsKey("schemaVersion"));
    Assert.True(localData.ContainsKey("rawPayloadCount"));
    Assert.True(localData.ContainsKey("coverCacheLocation"));
    Assert.True(localData.ContainsKey("coverCacheSizeBytes"));
    Assert.True(localData.ContainsKey("companionPdfsStatus"));

    var archiveExport = json["archiveExport"]!.AsObject();
    Assert.True(archiveExport.ContainsKey("format"));
    Assert.True(archiveExport.ContainsKey("includeRawPayloads"));
    Assert.True(archiveExport.ContainsKey("coverImages"));
    Assert.True(archiveExport.ContainsKey("restoreSupported"));
  }

  [Fact]
  public async Task AuthenticationFailureReturnsTypedOperationErrorContract()
  {
    await using var application = new ContractApplicationFactory([]);
    application.SetLoginClient(new FailingAudibleLoginClient());

    using var client = application.CreateClient();
    var response = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));

    Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();

    Assert.True(json.ContainsKey("code"));
    Assert.True(json.ContainsKey("message"));
    Assert.Equal("audible-authentication-start-failed", json["code"]!.GetValue<string>());
    Assert.Equal("Audible authentication could not be started. Try again.", json["message"]!.GetValue<string>());
  }

  [Fact]
  public async Task LibraryImportWithoutAuthenticationReturnsTypedOperationErrorContract()
  {
    await using var application = new ContractApplicationFactory([]);
    application.SetLibrarySource(new MissingAuthenticationLibrarySource());

    using var client = application.CreateClient();
    var response = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();

    Assert.Equal("audible-library-import-failed", json["code"]!.GetValue<string>());
    Assert.Equal("Audible Library import failed. Re-authenticate and try again.", json["message"]!.GetValue<string>());
  }

  [Fact]
  public async Task RefreshJobRecordsTypedOperationErrorsWithTechnicalDetails()
  {
    await using var application = new ContractApplicationFactory([]);
    application.SetLibrarySource(new MissingAuthenticationLibrarySource());

    using var client = application.CreateClient();
    var response = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();
    var job = json["job"]!.AsObject();
    var error = job["errors"]!.AsArray().Single()!.AsObject();

    Assert.Equal("failed", job["status"]!.GetValue<string>());
    Assert.Equal("audible-library-authentication-required", error["code"]!.GetValue<string>());
    Assert.Equal("Authenticate with Audible before refreshing the library.", error["message"]!.GetValue<string>());
    Assert.Equal("authenticate", error["phase"]!.GetValue<string>());
    Assert.True(error.ContainsKey("technicalDetails"));
  }

  [Fact]
  public async Task LibraryImportReturnsTypedCoverCachingStatusContract()
  {
    await using var application = new ContractApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(new FailingAudibleAssetDownloader());

    using var client = application.CreateClient();
    var response = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();
    var status = json["statuses"]!.AsArray().Single()!.AsObject();

    Assert.Equal(1, json["importedItemCount"]!.GetValue<int>());
    Assert.Equal(0, json["cachedCoverImageCount"]!.GetValue<int>());
    Assert.Equal("audible-cover-cache-failed", status["code"]!.GetValue<string>());
    Assert.True(status.ContainsKey("message"));
    Assert.Equal("B0EDGE0001", status["asin"]!.GetValue<string>());
    Assert.Equal("500", status["coverVariant"]!.GetValue<string>());
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", status["sourceUrl"]!.GetValue<string>());
  }

  [Fact]
  public async Task LibraryItemsEndpointReturnsCachedCoverMetadataForExportReference()
  {
    await using var application = new ContractApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(
        new SuccessfulAudibleAssetDownloader(
            new("image/jpeg", [1, 2, 3], ".jpg")));

    using var client = application.CreateClient();
    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var body = await client.GetStringAsync("/api/library/items");
    var json = JsonNode.Parse(body)!.AsObject();
    var item = json["items"]!.AsArray().Single()!.AsObject();
    var coverImage = item["coverImages"]!.AsArray().Single()!.AsObject();
    var cachedAsset = coverImage["cachedAsset"]!.AsObject();

    Assert.Equal("500", coverImage["variant"]!.GetValue<string>());
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage["sourceUrl"]!.GetValue<string>());
    Assert.False(cachedAsset.ContainsKey("relativePath"));
    Assert.True(cachedAsset.ContainsKey("contentType"));
    Assert.True(cachedAsset.ContainsKey("sizeBytes"));
    Assert.True(cachedAsset.ContainsKey("cachedAtUtc"));
    Assert.True(cachedAsset.ContainsKey("url"));
  }

  [Fact]
  public async Task CachedCoverEndpointReturnsProblemDetailsWhenAssetIsMissing()
  {
    await using var application = new ContractApplicationFactory([]);

    using var client = application.CreateClient();
    var response = await client.GetAsync("/api/library/items/B00TEST123/cover-images/500");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();

    Assert.Equal("Cached cover image not found.", json["title"]!.GetValue<string>());
    Assert.Equal(404, json["status"]!.GetValue<int>());
  }

  private sealed class ContractApplicationFactory(IReadOnlyList<ImportedAudibleItem> items) : WebApplicationFactory<Program>
  {
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"verso-contract-tests-{Guid.NewGuid():N}.db");
    private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), $"verso-contract-data-{Guid.NewGuid():N}");
    private IAudibleLibrarySource librarySource = new MutableAudibleLibrarySource(items);
    private IAudibleLoginClient? loginClient;
    private IAudibleAssetDownloader? assetDownloader;

    public void SetLoginClient(IAudibleLoginClient loginClient)
    {
      this.loginClient = loginClient;
    }

    public void SetLibrarySource(IAudibleLibrarySource librarySource)
    {
      this.librarySource = librarySource;
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
        services.AddSingleton(librarySource);

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

      if (disposing)
      {
        TryDeleteSqliteArtifacts(databasePath);
        TryDeleteDirectory(dataDirectory);
      }
    }
  }

  private sealed class MutableAudibleLibrarySource(IReadOnlyList<ImportedAudibleItem> items) : IAudibleLibrarySource
  {
    public Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(AudibleLibraryFetchResult.Succeeded(items));
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

  private sealed class MissingAuthenticationLibrarySource : IAudibleLibrarySource
  {
    public Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(
          AudibleLibraryFetchResult.Failed(
              [
                  new LibraryOperationError(
                      "audible-library-authentication-required",
                      "Authenticate with Audible before refreshing the library.",
                      "The local Audible identity file is missing or no longer valid.",
                      "authenticate")
              ]));
    }
  }

  private static void TryDeleteSqliteArtifacts(string databasePath)
  {
    foreach (var path in new[] { databasePath, $"{databasePath}-wal", $"{databasePath}-shm" })
    {
      TryDeleteFile(path);
    }
  }

  private static void TryDeleteDirectory(string path)
  {
    if (!Directory.Exists(path))
    {
      return;
    }

    for (var attempt = 0; attempt < 5; attempt++)
    {
      try
      {
        Directory.Delete(path, recursive: true);
        return;
      }
      catch (IOException) when (attempt < 4)
      {
        Thread.Sleep(100);
      }
      catch (UnauthorizedAccessException) when (attempt < 4)
      {
        Thread.Sleep(100);
      }
      catch (IOException)
      {
        return;
      }
      catch (UnauthorizedAccessException)
      {
        return;
      }
    }
  }

  private static void TryDeleteFile(string path)
  {
    if (!File.Exists(path))
    {
      return;
    }

    for (var attempt = 0; attempt < 5; attempt++)
    {
      try
      {
        File.Delete(path);
        return;
      }
      catch (IOException) when (attempt < 4)
      {
        Thread.Sleep(100);
      }
      catch (UnauthorizedAccessException) when (attempt < 4)
      {
        Thread.Sleep(100);
      }
      catch (IOException)
      {
        return;
      }
      catch (UnauthorizedAccessException)
      {
        return;
      }
    }
  }

  private sealed class FailingAudibleAssetDownloader : IAudibleAssetDownloader
  {
    public Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken)
    {
      throw new InvalidOperationException("Synthetic cover download failure.");
    }
  }

  private sealed class SuccessfulAudibleAssetDownloader(DownloadedAudibleAsset asset) : IAudibleAssetDownloader
  {
    public Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken)
    {
      return Task.FromResult(asset);
    }
  }
}
