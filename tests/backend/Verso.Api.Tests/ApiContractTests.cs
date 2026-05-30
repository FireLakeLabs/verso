
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
    var importResponse = await client.PostAsync("/api/audible-library/imports", content: null);

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
    Assert.False(item.ContainsKey("contributors"));
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

  private sealed class ContractApplicationFactory(IReadOnlyList<ImportedAudibleItem> items) : WebApplicationFactory<Program>
  {
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"verso-contract-tests-{Guid.NewGuid():N}.db");
    private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), $"verso-contract-data-{Guid.NewGuid():N}");
    private IAudibleLibrarySource librarySource = new MutableAudibleLibrarySource(items);
    private IAudibleLoginClient? loginClient;

    public void SetLoginClient(IAudibleLoginClient loginClient)
    {
      this.loginClient = loginClient;
    }

    public void SetLibrarySource(IAudibleLibrarySource librarySource)
    {
      this.librarySource = librarySource;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
      builder.UseEnvironment("Testing");
      builder.UseSetting("VERSO_SQLITE_CONNECTION_STRING", $"Data Source={databasePath}");
      builder.UseSetting("VERSO_DATA_DIRECTORY", dataDirectory);
      builder.ConfigureServices(services =>
      {
        services.AddSingleton(librarySource);

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
    public Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(items);
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
    public Task<IReadOnlyList<ImportedAudibleItem>> GetLibraryAsync(CancellationToken cancellationToken)
    {
      throw new InvalidOperationException("Audible authentication is required before importing the Audible Library.");
    }
  }
}
