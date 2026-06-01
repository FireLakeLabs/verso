using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Verso.Api.Tests;

public sealed class HealthFindingTests
{
  [Fact]
  public async Task RefreshEvaluatesHealthFindingsWithoutMutatingAudibleItemsOrMergingDuplicateCandidates()
  {
    await using var application = new HealthFindingApplicationFactory(CreateHealthFindingFixture());
    using var client = application.CreateClient();

    var refreshResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

    var findings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings");
    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(findings);
    Assert.Equal(4, findings.Summary.CurrentCount);
    Assert.Equal(4, findings.Summary.OpenCount);
    Assert.Equal(
        ["duplicate-candidate", "missing-metadata", "near-complete", "returnable-barely-started"],
        findings.Findings.Select(finding => finding.Kind).Order(StringComparer.Ordinal).ToArray());

    var duplicateCandidate = Assert.Single(findings.Findings, finding => finding.Kind == "duplicate-candidate");
    Assert.Equal(["B00DUP001", "B00DUP002"], duplicateCandidate.ItemAsins.Order(StringComparer.Ordinal).ToArray());
    Assert.Equal("open", duplicateCandidate.Disposition.Status);

    var missingMetadata = Assert.Single(findings.Findings, finding => finding.Kind == "missing-metadata");
    Assert.Contains("authors", missingMetadata.Evidence);
    Assert.Contains("runtime", missingMetadata.Evidence);

    Assert.NotNull(library);
    Assert.Equal(5, library.Items.Count);
    Assert.Equal(["B00DUP001", "B00DUP002"], library.Items.Where(item => item.Title == "The Shared Signal").Select(item => item.Asin).Order(StringComparer.Ordinal).ToArray());
  }

  [Fact]
  public async Task FindingDispositionSurvivesRefreshWhileIdentityRemainsMeaningfullyTheSame()
  {
    await using var application = new HealthFindingApplicationFactory(
        [
            new ImportedAudibleItem(
                "B00NEAR001",
                "Almost Finished",
                ["Author One"],
                ["Narrator One"],
                500,
                94,
                "{\"asin\":\"B00NEAR001\",\"title\":\"Almost Finished\"}")
        ]);
    using var client = application.CreateClient();

    var firstRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);

    var initialFindings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings");
    Assert.NotNull(initialFindings);
    var initialFinding = Assert.Single(initialFindings.Findings);

    var dispositionResponse = await client.PostAsJsonAsync(
        $"/api/library/health-findings/{initialFinding.Id}/disposition",
        new UpdateHealthFindingDispositionRequest("acknowledged"));

    Assert.Equal(HttpStatusCode.OK, dispositionResponse.StatusCode);

    application.SetImportedItems(
        [
            new ImportedAudibleItem(
                "B00NEAR001",
                "Almost Finished: Updated Audible Title",
                ["Author One"],
                ["Narrator One"],
                500,
                94,
                "{\"asin\":\"B00NEAR001\",\"title\":\"Almost Finished: Updated Audible Title\"}")
        ]);

    var secondRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, secondRefresh.StatusCode);

    var refreshedFindings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings?view=all");
    var detail = await client.GetFromJsonAsync<LibraryItemDetailResponse>("/api/library/items/B00NEAR001");

    Assert.NotNull(refreshedFindings);
    var refreshedFinding = Assert.Single(refreshedFindings.Findings);
    Assert.Equal(initialFinding.Id, refreshedFinding.Id);
    Assert.True(refreshedFinding.IsCurrent);
    Assert.Equal("acknowledged", refreshedFinding.Disposition.Status);

    Assert.NotNull(detail);
    Assert.Equal("Almost Finished: Updated Audible Title", detail.Item.CurrentAudibleFacts.Title);
    Assert.Equal(94, detail.Item.CurrentAudibleFacts.PercentComplete);
  }

  [Fact]
  public async Task DismissedDispositionAppearsInHistoryAfterFindingStopsAppearing()
  {
    await using var application = new HealthFindingApplicationFactory(
        [
            new ImportedAudibleItem(
                "B00RETURN001",
                "Return Window Listen",
                ["Author One"],
                ["Narrator One"],
                300,
                3,
                "{\"asin\":\"B00RETURN001\",\"title\":\"Return Window Listen\"}",
                IsReturnable: true)
        ]);
    using var client = application.CreateClient();

    var firstRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);

    var initialFindings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings");
    Assert.NotNull(initialFindings);
    var initialFinding = Assert.Single(initialFindings.Findings);

    var dispositionResponse = await client.PostAsJsonAsync(
        $"/api/library/health-findings/{initialFinding.Id}/disposition",
        new UpdateHealthFindingDispositionRequest("dismissed"));
    Assert.Equal(HttpStatusCode.OK, dispositionResponse.StatusCode);

    application.SetImportedItems(
        [
            new ImportedAudibleItem(
                "B00RETURN001",
                "Return Window Listen",
                ["Author One"],
                ["Narrator One"],
                300,
                24,
                "{\"asin\":\"B00RETURN001\",\"title\":\"Return Window Listen\"}",
                IsReturnable: true)
        ]);

    var secondRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, secondRefresh.StatusCode);

    var activeFindings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings");
    var dispositionedFindings = await client.GetFromJsonAsync<HealthFindingsResponse>("/api/library/health-findings?view=dispositioned");

    Assert.NotNull(activeFindings);
    Assert.Empty(activeFindings.Findings);
    Assert.Equal(0, activeFindings.Summary.CurrentCount);

    Assert.NotNull(dispositionedFindings);
    var historicalFinding = Assert.Single(dispositionedFindings.Findings);
    Assert.Equal(initialFinding.Id, historicalFinding.Id);
    Assert.False(historicalFinding.IsCurrent);
    Assert.Equal("dismissed", historicalFinding.Disposition.Status);
    Assert.Equal(["B00RETURN001"], historicalFinding.ItemAsins);
  }

  private static ImportedAudibleItem[] CreateHealthFindingFixture()
  {
    return
    [
        new ImportedAudibleItem(
            "B00NEAR001",
            "Nearly There",
            ["Author One"],
            ["Narrator One"],
            500,
            94,
            "{\"asin\":\"B00NEAR001\",\"title\":\"Nearly There\"}"),
        new ImportedAudibleItem(
            "B00DUP001",
            "The Shared Signal",
            ["Author Two"],
            ["Narrator A"],
            610,
            0,
            "{\"asin\":\"B00DUP001\",\"title\":\"The Shared Signal\"}"),
        new ImportedAudibleItem(
            "B00DUP002",
            "The Shared Signal",
            ["Author Two"],
            ["Narrator B"],
            615,
            0,
            "{\"asin\":\"B00DUP002\",\"title\":\"The Shared Signal\"}"),
        new ImportedAudibleItem(
            "B00RETURN001",
            "Barely Started Return",
            ["Author Three"],
            ["Narrator Three"],
            420,
            4,
            "{\"asin\":\"B00RETURN001\",\"title\":\"Barely Started Return\"}",
            IsReturnable: true),
        new ImportedAudibleItem(
            "B00META001",
            "Sparse Arrival",
            [],
            ["Narrator Four"],
            0,
            0,
            "{\"asin\":\"B00META001\",\"title\":\"Sparse Arrival\"}")
    ];
  }

  private sealed class HealthFindingApplicationFactory(IReadOnlyList<ImportedAudibleItem> items) : WebApplicationFactory<Program>
  {
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"verso-health-tests-{Guid.NewGuid():N}.db");
    private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), $"verso-health-data-{Guid.NewGuid():N}");
    private readonly MutableAudibleLibrarySource source = new(items);

    public void SetImportedItems(IReadOnlyList<ImportedAudibleItem> nextItems)
    {
      source.SetItems(nextItems);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
      builder.UseEnvironment("Testing");
      builder.UseSetting("VERSO_SQLITE_CONNECTION_STRING", $"Data Source={databasePath};Pooling=False");
      builder.UseSetting("VERSO_DATA_DIRECTORY", dataDirectory);

      builder.ConfigureServices(services =>
      {
        services.RemoveAll<IAudibleLibrarySource>();
        services.AddSingleton<IAudibleLibrarySource>(source);
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
    private IReadOnlyList<ImportedAudibleItem> currentItems = items;

    public void SetItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      currentItems = items;
    }

    public Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(AudibleLibraryFetchResult.Succeeded(currentItems));
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

    try
    {
      Directory.Delete(path, recursive: true);
    }
    catch (IOException)
    {
    }
    catch (UnauthorizedAccessException)
    {
    }
  }

  private static void TryDeleteFile(string path)
  {
    if (!File.Exists(path))
    {
      return;
    }

    try
    {
      File.Delete(path);
    }
    catch (IOException)
    {
    }
    catch (UnauthorizedAccessException)
    {
    }
  }
}
