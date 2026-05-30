
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
        [
            new ImportedAudibleItem(
                    "B00TEST123",
                    "Project Hail Mary",
                    ["Andy Weir"],
                    ["Ray Porter"],
                    973,
                    100,
                    "{" +
                    "\"asin\":\"B00TEST123\"," +
                    "\"title\":\"Project Hail Mary\"," +
                    "\"unexpected_field\":\"preserved\"" +
                    "}")
        ]);

    using var client = application.CreateClient();

    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

    Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.Equal("B00TEST123", item.Asin);
    Assert.Equal("Project Hail Mary", item.Title);
    Assert.Equal(["Andy Weir"], item.Authors);
    Assert.Equal(["Ray Porter"], item.Narrators);
    Assert.Equal(973, item.RuntimeMinutes);
    Assert.Equal(100, item.PercentComplete);
    Assert.Contains("unexpected_field", item.RawAudiblePayload);
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

    public void SetImportedItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      source.SetItems(items);
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
}
