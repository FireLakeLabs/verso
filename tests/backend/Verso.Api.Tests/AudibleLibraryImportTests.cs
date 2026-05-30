
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
  public async Task RefreshCreatesExplicitJobAndReturnsLibraryOverviewTableAndDetail()
  {
    await using var application = new VersoApplicationFactory(
        AudibleApiFixtureLibrary.LoadImportedItems("current-audible-facts/asin-identity"));

    using var client = application.CreateClient();

    var refreshResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

    var startedRefresh = await refreshResponse.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();
    Assert.NotNull(startedRefresh);
    Assert.Equal("succeeded", startedRefresh.Job.Status);
    Assert.Equal(2, startedRefresh.Job.ImportedItemCount);
    Assert.True(startedRefresh.Job.CompletedAtUtc.HasValue);
    Assert.Equal(["fetch-library", "persist-library"], startedRefresh.Job.Phases.Select(phase => phase.Name).ToArray());

    var overview = await client.GetFromJsonAsync<LibraryOverviewResponse>("/api/library/overview");
    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items?search=Project");
    var detail = await client.GetFromJsonAsync<LibraryItemDetailResponse>("/api/library/items/B00TEST124");
    var refreshStatus = await client.GetFromJsonAsync<LibraryRefreshStatusResponse>("/api/library/refresh-status");

    Assert.NotNull(overview);
    Assert.Equal(2, overview.Summary.TotalItems);
    Assert.Equal(2, overview.Summary.PresentItems);
    Assert.Equal(1, overview.Summary.CompletedItems);
    Assert.NotNull(overview.LatestRefreshJob);

    Assert.NotNull(library);
    Assert.Equal(2, library.Items.Count);

    var original = Assert.Single(library.Items, item => item.Asin == "B00TEST123");
    Assert.Equal("Project Hail Mary", original.Title);
    Assert.Equal(["Andy Weir"], original.Authors);
    Assert.Equal(["Ray Porter"], original.Narrators);
    Assert.Equal(973, original.RuntimeMinutes);
    Assert.Equal(100, original.PercentComplete);
    Assert.Contains("unexpected_field", original.RawAudiblePayload);
    Assert.False(original.IsNoLongerPresent);
    Assert.True(original.HasSnapshots);

    var edition = Assert.Single(library.Items, item => item.Asin == "B00TEST124");
    Assert.Equal("Project Hail Mary", edition.Title);
    Assert.Equal(["Andy Weir", "Guest Essayist"], edition.Authors);
    Assert.Equal(["Guest Narrator", "Ray Porter"], edition.Narrators.OrderBy(name => name, StringComparer.Ordinal).ToArray());
    Assert.Equal(985, edition.RuntimeMinutes);
    Assert.Equal(42, edition.PercentComplete);
    Assert.Contains("current_audible_facts", edition.RawAudiblePayload);
    Assert.False(edition.IsNoLongerPresent);

    Assert.NotNull(detail);
    Assert.Equal("B00TEST124", detail.Item.Asin);
    Assert.Equal("Project Hail Mary", detail.Item.CurrentAudibleFacts.Title);
    Assert.Empty(detail.Item.VersoAnnotations.Tags);
    Assert.Contains(detail.Item.SnapshotHistory, snapshot => snapshot.Field == "percent-complete");
    Assert.Contains(detail.Item.SnapshotHistory, snapshot => snapshot.Field == "presence");

    Assert.NotNull(refreshStatus);
    Assert.Empty(refreshStatus.ActiveJobs);
    Assert.Equal(startedRefresh.Job.Id, Assert.Single(refreshStatus.RecentJobs).Id);
  }

  [Fact]
  public async Task PartialRefreshFailurePreservesLastSuccessfulLibraryState()
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

    var firstRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);

    application.SetRefreshResult(
        AudibleLibraryFetchResult.PartialFailure(
            [
                new ImportedAudibleItem(
                    "B00TEST123",
                    "Updated Title",
                    ["Author One", "Author Two"],
                    ["Narrator Two"],
                    650,
                    25,
                    "{\"asin\":\"B00TEST123\",\"title\":\"Updated Title\",\"new_field\":true}")
            ],
            [
                new LibraryOperationError(
                    "audible-library-fetch-failed",
                    "Audible Library refresh stopped early. The last successful library state was preserved.",
                    "Synthetic partial failure after the first page.",
                    "fetch-library")
            ]));

    var failedRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, failedRefresh.StatusCode);

    var failedJob = await failedRefresh.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();
    Assert.NotNull(failedJob);
    Assert.Equal("partial-failure", failedJob.Job.Status);
    Assert.Single(failedJob.Job.Errors);
    Assert.Equal("audible-library-fetch-failed", failedJob.Job.Errors[0].Code);
    Assert.Equal("fetch-library", failedJob.Job.Errors[0].Phase);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.Equal("Original Title", item.Title);
    Assert.Equal(["Author One"], item.Authors);
    Assert.Equal(["Narrator One"], item.Narrators);
    Assert.Equal(600, item.RuntimeMinutes);
    Assert.Equal(10, item.PercentComplete);
    Assert.DoesNotContain("new_field", item.RawAudiblePayload);
  }

  [Fact]
  public async Task SuccessfulRefreshRetainsAbsentAudibleItemsAsNoLongerPresent()
  {
    await using var application = new VersoApplicationFactory(
        AudibleApiFixtureLibrary.LoadImportedItems("current-audible-facts/asin-identity"));

    using var client = application.CreateClient();

    var firstRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);

    application.SetImportedItems(
        [
            new ImportedAudibleItem(
                "B00TEST123",
                "Project Hail Mary",
                ["Andy Weir"],
                ["Ray Porter"],
                973,
                100,
                "{\"asin\":\"B00TEST123\",\"title\":\"Project Hail Mary\"}")
        ]);

    var secondRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, secondRefresh.StatusCode);

    var refresh = await secondRefresh.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();
    Assert.NotNull(refresh);
    Assert.Equal("succeeded", refresh.Job.Status);
    Assert.Equal(1, refresh.Job.RetainedNoLongerPresentItemCount);

    var allItems = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");
    var missingItems = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items?presence=no-longer-present");
    var detail = await client.GetFromJsonAsync<LibraryItemDetailResponse>("/api/library/items/B00TEST124");

    Assert.NotNull(allItems);
    Assert.Equal(2, allItems.Items.Count);

    var retainedItem = Assert.Single(allItems.Items, item => item.Asin == "B00TEST124");
    Assert.True(retainedItem.IsNoLongerPresent);

    Assert.NotNull(missingItems);
    Assert.Equal(["B00TEST124"], missingItems.Items.Select(item => item.Asin).ToArray());

    Assert.NotNull(detail);
    Assert.True(detail.Item.IsNoLongerPresent);
    Assert.Contains(detail.Item.SnapshotHistory, snapshot => snapshot.Field == "presence" && snapshot.Value == "no-longer-present");
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
    private readonly MutableAudibleLibrarySource source = new(AudibleLibraryFetchResult.Succeeded(items));
    private IAudibleLoginClient? loginClient;

    public void SetImportedItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      source.SetResult(AudibleLibraryFetchResult.Succeeded(items));
    }

    public void SetRefreshResult(AudibleLibraryFetchResult result)
    {
      source.SetResult(result);
    }

    public void SetLoginClient(IAudibleLoginClient loginClient)
    {
      this.loginClient = loginClient;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
      builder.UseEnvironment("Testing");
      builder.UseSetting("VERSO_SQLITE_CONNECTION_STRING", $"Data Source={databasePath}");
      builder.UseSetting("VERSO_DATA_DIRECTORY", dataDirectory);

      builder.ConfigureServices(services =>
      {
        services.AddSingleton<IAudibleLibrarySource>(source);

        if (loginClient is not null)
        {
          services.RemoveAll<IAudibleLoginClient>();
          services.AddSingleton(loginClient);
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

  private sealed class MutableAudibleLibrarySource(AudibleLibraryFetchResult result) : IAudibleLibrarySource
  {
    private AudibleLibraryFetchResult currentResult = result;

    public void SetResult(AudibleLibraryFetchResult result)
    {
      currentResult = result;
    }

    public Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(currentResult);
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
}
