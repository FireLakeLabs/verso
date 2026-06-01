
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
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
  public async Task RefreshJobCachesCoverImagesAndExposesCachedAssetMetadata()
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

    var refreshResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

    var refresh = await refreshResponse.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();

    Assert.NotNull(refresh);
    Assert.Equal("succeeded", refresh.Job.Status);
    Assert.Empty(refresh.Job.Errors);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.NotNull(item.CoverImages);
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
  public async Task RefreshJobRecordsTypedStatusWhenCoverCachingFailsButStillPersistsAudibleItem()
  {
    var assetDownloader = new FailingAudibleAssetDownloader();

    await using var application = new VersoApplicationFactory(
        [
            AudibleApiFixtureLibrary.LoadImportedItem("single-item/sparse-rich-edge-cases")
        ]);
    application.SetAssetDownloader(assetDownloader);

    using var client = application.CreateClient();

    var refreshResponse = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

    var refresh = await refreshResponse.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();

    Assert.NotNull(refresh);
    Assert.Equal("partial-failure", refresh.Job.Status);
    var error = Assert.Single(refresh.Job.Errors);
    Assert.Equal("audible-cover-cache-failed", error.Code);
    Assert.Equal("cache-cover-assets", error.Phase);
    Assert.Contains("B0EDGE0001", error.TechnicalDetails, StringComparison.Ordinal);
    Assert.Contains("500", error.TechnicalDetails, StringComparison.Ordinal);
    Assert.Contains("https://images.audible.test/B0EDGE0001-500.jpg", error.TechnicalDetails, StringComparison.Ordinal);
    Assert.Contains("IOException", error.TechnicalDetails, StringComparison.Ordinal);
    Assert.DoesNotContain("Synthetic cover download failure", error.TechnicalDetails, StringComparison.Ordinal);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.Equal("B0EDGE0001", item.Asin);
    Assert.NotNull(item.CoverImages);
    var coverImage = Assert.Single(item.CoverImages);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage.SourceUrl);
    Assert.Null(coverImage.CachedAsset);
    Assert.Equal(["https://images.audible.test/B0EDGE0001-500.jpg"], assetDownloader.RequestedUrls);
  }

  [Fact]
  public async Task RefreshJobPreservesExistingCoverImagesWhenCoverFactsAreNotProvided()
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

    var firstRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, firstRefresh.StatusCode);

    application.SetImportedItems(
        [
            new ImportedAudibleItem(
                "B0EDGE0001",
                "The Long Way Home",
                ["Author One", "Author Two"],
                ["Narrator One", "Narrator Two"],
                0,
                135,
                "{\"asin\":\"B0EDGE0001\",\"title\":\"The Long Way Home\"}")
        ]);

    var secondRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);
    Assert.Equal(HttpStatusCode.OK, secondRefresh.StatusCode);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.NotNull(item.CoverImages);
    var coverImage = Assert.Single(item.CoverImages);
    Assert.Equal("500", coverImage.Variant);
    Assert.Equal("https://images.audible.test/B0EDGE0001-500.jpg", coverImage.SourceUrl);
    Assert.NotNull(coverImage.CachedAsset);
    Assert.Equal(["https://images.audible.test/B0EDGE0001-500.jpg"], assetDownloader.RequestedUrls);
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
    Assert.NotNull(item.CoverImages);
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
    Assert.NotNull(item.CoverImages);
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
    Assert.NotNull(item.CoverImages);
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
  public async Task SignOutClearsCurrentAudibleSessionAndSettingsState()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FakeAudibleLoginClient());

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    var signOutResponse = await client.DeleteAsync("/api/audible-authentication/session");

    Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);

    var currentSession = await client.GetFromJsonAsync<AudibleAuthenticationStatusResponse>(
        "/api/audible-authentication/session");
    var settings = await client.GetFromJsonAsync<SettingsResponse>("/api/settings");

    Assert.NotNull(currentSession);
    Assert.Equal("not-authenticated", currentSession.Status);
    Assert.Null(currentSession.Locale);

    Assert.NotNull(settings);
    Assert.Equal("not-authenticated", settings.AudibleAuthentication.Status);
    Assert.Null(settings.AudibleAuthentication.Locale);
    Assert.Null(settings.AudibleAuthentication.LastAuthenticatedAtUtc);
  }

  [Fact]
  public async Task RefreshRequiresAuthenticationUntilSessionExistsAndThenPersistsLibraryData()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FakeAudibleLoginClient());
    application.UseIdentityFileGatedLibrarySource(
        [
            new ImportedAudibleItem(
                "B00AUTH001",
                "Authenticated Refresh Title",
                ["Author Authenticated"],
                ["Narrator Authenticated"],
                720,
                50,
                "{\"asin\":\"B00AUTH001\",\"title\":\"Authenticated Refresh Title\"}")
        ]);

    using var client = application.CreateClient();

    var unauthenticatedRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, unauthenticatedRefresh.StatusCode);

    var failedRefresh = await unauthenticatedRefresh.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();

    Assert.NotNull(failedRefresh);
    Assert.Equal("failed", failedRefresh.Job.Status);
    Assert.Equal(
        "audible-library-authentication-required",
        Assert.Single(failedRefresh.Job.Errors).Code);

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    var authenticatedRefresh = await client.PostAsync("/api/library/refresh-jobs", content: null);

    Assert.Equal(HttpStatusCode.OK, authenticatedRefresh.StatusCode);

    var successfulRefresh = await authenticatedRefresh.Content.ReadFromJsonAsync<StartLibraryRefreshResponse>();

    Assert.NotNull(successfulRefresh);
    Assert.Equal("succeeded", successfulRefresh.Job.Status);
    Assert.Equal(1, successfulRefresh.Job.ImportedItemCount);

    var library = await client.GetFromJsonAsync<LibraryItemsResponse>("/api/library/items");

    Assert.NotNull(library);
    var item = Assert.Single(library.Items);
    Assert.Equal("B00AUTH001", item.Asin);
    Assert.Equal("Authenticated Refresh Title", item.Title);
  }

  [Fact]
  public async Task SettingsEndpointPersistsInterfacePreferencesAcrossRequests()
  {
    await using var application = new VersoApplicationFactory([]);

    using var client = application.CreateClient();

    var initialSettings = await client.GetFromJsonAsync<SettingsResponse>("/api/settings");

    Assert.NotNull(initialSettings);
    Assert.Equal("topnav", initialSettings.InterfacePreferences.NavChrome);
    Assert.Equal("calm", initialSettings.InterfacePreferences.DefaultOverviewVariant);
    Assert.Equal("rows", initialSettings.InterfacePreferences.DefaultLibraryView);

    var updateResponse = await client.PutAsJsonAsync(
        "/api/settings",
        new UpdateSettingsRequest(
            new InterfacePreferencesSettingsDto(
                "sidebar",
                "dense",
                "cards")));

    Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

    var updatedSettings = await updateResponse.Content.ReadFromJsonAsync<SettingsResponse>();

    Assert.NotNull(updatedSettings);
    Assert.Equal("sidebar", updatedSettings.InterfacePreferences.NavChrome);
    Assert.Equal("dense", updatedSettings.InterfacePreferences.DefaultOverviewVariant);
    Assert.Equal("cards", updatedSettings.InterfacePreferences.DefaultLibraryView);

    var reloadedSettings = await client.GetFromJsonAsync<SettingsResponse>("/api/settings");

    Assert.NotNull(reloadedSettings);
    Assert.Equal("sidebar", reloadedSettings.InterfacePreferences.NavChrome);
    Assert.Equal("dense", reloadedSettings.InterfacePreferences.DefaultOverviewVariant);
    Assert.Equal("cards", reloadedSettings.InterfacePreferences.DefaultLibraryView);
  }

  [Fact]
  public async Task SettingsEndpointIncludesAuthenticationAndLocalDataDetails()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FakeAudibleLoginClient());

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    var settings = await client.GetFromJsonAsync<SettingsResponse>("/api/settings");

    Assert.NotNull(settings);
    Assert.Equal("authenticated", settings.AudibleAuthentication.Status);
    Assert.Equal("us", settings.AudibleAuthentication.Locale);
    Assert.True(settings.AudibleAuthentication.LastAuthenticatedAtUtc.HasValue);
    Assert.Contains("verso-tests", settings.LocalData.DatabaseLocation, StringComparison.OrdinalIgnoreCase);
    Assert.Contains("cached-assets", settings.LocalData.CoverCacheLocation.Replace('\\', '/'));
    Assert.True(settings.LocalData.SchemaVersion.Length > 0);
    Assert.Equal(0, settings.LocalData.RawPayloadCount);
    Assert.Equal("manual", settings.Refresh.Trigger);
    Assert.Contains("presence", settings.Refresh.SelectiveSnapshotFields);
    Assert.Equal("per-credit-value", settings.CostBasis.DefaultBasis);
    Assert.Equal(14.95m, settings.CostBasis.PerCreditValue);
    Assert.Equal("json-archive", settings.ArchiveExport.Format);
    Assert.Equal("sibling-folder", settings.ArchiveExport.CoverImages);
  }

  [Fact]
  public async Task SettingsEndpointPersistsRefreshCostBasisAndArchiveExportMutations()
  {
    await using var application = new VersoApplicationFactory([]);

    using var client = application.CreateClient();

    var updateResponse = await client.PutAsJsonAsync(
        "/api/settings",
        new UpdateSettingsRequest(
          Refresh: new RefreshSettingsMutationDto("daily-at-idle", false),
            CostBasis: new CostBasisSettingsMutationDto("list-price", 21.50m, "USD"),
          ArchiveExport: new ArchiveExportSettingsMutationDto("markdown-projection", false, "omit")));

    Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

    var updatedSettings = await updateResponse.Content.ReadFromJsonAsync<SettingsResponse>();

    Assert.NotNull(updatedSettings);
    Assert.Equal("daily-at-idle", updatedSettings.Refresh.Trigger);
    Assert.False(updatedSettings.Refresh.RetainNoLongerPresentItems);
    Assert.Equal("list-price", updatedSettings.CostBasis.DefaultBasis);
    Assert.Equal(21.50m, updatedSettings.CostBasis.PerCreditValue);
    Assert.Equal("USD", updatedSettings.CostBasis.CurrencyCode);
    Assert.Equal("markdown-projection", updatedSettings.ArchiveExport.Format);
    Assert.False(updatedSettings.ArchiveExport.IncludeRawPayloads);
    Assert.Equal("omit", updatedSettings.ArchiveExport.CoverImages);

    var reloadedSettings = await client.GetFromJsonAsync<SettingsResponse>("/api/settings");

    Assert.NotNull(reloadedSettings);
    Assert.Equal("daily-at-idle", reloadedSettings.Refresh.Trigger);
    Assert.False(reloadedSettings.Refresh.RetainNoLongerPresentItems);
    Assert.Equal("list-price", reloadedSettings.CostBasis.DefaultBasis);
    Assert.Equal(21.50m, reloadedSettings.CostBasis.PerCreditValue);
    Assert.Equal("markdown-projection", reloadedSettings.ArchiveExport.Format);
    Assert.False(reloadedSettings.ArchiveExport.IncludeRawPayloads);
    Assert.Equal("omit", reloadedSettings.ArchiveExport.CoverImages);
  }

  [Fact]
  public async Task SettingsEndpointRejectsCostBasisValuesThatOverflowStoredCents()
  {
    await using var application = new VersoApplicationFactory([]);

    using var client = application.CreateClient();

    var response = await client.PutAsJsonAsync(
        "/api/settings",
        new UpdateSettingsRequest(
            CostBasis: new CostBasisSettingsMutationDto("per-credit-value", 21474836.48m, "USD")));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

    var body = await response.Content.ReadAsStringAsync();
    var json = JsonNode.Parse(body)!.AsObject();

    Assert.Equal("Invalid settings update.", json["title"]!.GetValue<string>());
    Assert.Equal(400, json["status"]!.GetValue<int>());
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

  [Fact]
  public async Task FailedReauthenticationPreservesExistingAudibleSession()
  {
    await using var application = new VersoApplicationFactory([]);
    var loginClient = new MutableAudibleLoginClient();
    application.SetLoginClient(loginClient);

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    loginClient.ShouldFailBeforePrompt = true;

    var failedStartResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("uk"));

    Assert.Equal(HttpStatusCode.InternalServerError, failedStartResponse.StatusCode);

    var currentSession = await client.GetFromJsonAsync<AudibleAuthenticationStatusResponse>(
        "/api/audible-authentication/session");

    Assert.NotNull(currentSession);
    Assert.Equal("authenticated", currentSession.Status);
    Assert.Equal("us", currentSession.Locale);
  }

  [Fact]
  public async Task FailedReauthenticationAfterBrowserCompletionPreservesExistingAudibleSession()
  {
    await using var application = new VersoApplicationFactory([]);
    var loginClient = new MutableAudibleLoginClient();
    application.SetLoginClient(loginClient);

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    loginClient.DeletePendingIdentityBeforeReturn = true;

    var reauthenticationStartResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("uk"));
    var reauthenticationPrompt = await reauthenticationStartResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(reauthenticationPrompt);

    var reauthenticationCompleteResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{reauthenticationPrompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code-2"));

    Assert.Equal(HttpStatusCode.OK, reauthenticationCompleteResponse.StatusCode);

    var reauthenticationStatus = await reauthenticationCompleteResponse.Content.ReadFromJsonAsync<AudibleAuthenticationStatusResponse>();

    Assert.NotNull(reauthenticationStatus);
    Assert.Equal("failed", reauthenticationStatus.Status);
    Assert.Equal(
      "Audible authentication could not be completed. Start a new authentication session and try again.",
      reauthenticationStatus.LastError);

    var currentSession = await client.GetFromJsonAsync<AudibleAuthenticationStatusResponse>(
        "/api/audible-authentication/session");

    Assert.NotNull(currentSession);
    Assert.Equal("authenticated", currentSession.Status);
    Assert.Equal("us", currentSession.Locale);
  }

  [Fact]
  public async Task CancelledReauthenticationPreservesExistingAudibleSession()
  {
    await using var application = new VersoApplicationFactory([]);
    application.SetLoginClient(new FakeAudibleLoginClient());

    using var client = application.CreateClient();

    var startResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("us"));
    var prompt = await startResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(prompt);

    var completeResponse = await client.PostAsJsonAsync(
        $"/api/audible-authentication/sessions/{prompt.SessionId}/complete",
        new CompleteAudibleAuthenticationRequest("https://www.audible.test/ap/maplanding?openid.oa2.authorization_code=fake-code"));

    Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

    var reauthenticationStartResponse = await client.PostAsJsonAsync(
        "/api/audible-authentication/sessions",
        new StartAudibleAuthenticationRequest("uk"));
    var reauthenticationPrompt = await reauthenticationStartResponse.Content.ReadFromJsonAsync<StartAudibleAuthenticationResponse>();

    Assert.NotNull(reauthenticationPrompt);

    var cancelResponse = await client.DeleteAsync($"/api/audible-authentication/sessions/{reauthenticationPrompt.SessionId}");

    Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

    var cancelledStatus = await cancelResponse.Content.ReadFromJsonAsync<AudibleAuthenticationStatusResponse>();

    Assert.NotNull(cancelledStatus);
    Assert.Equal("failed", cancelledStatus.Status);
    Assert.Contains("cancelled", cancelledStatus.LastError, StringComparison.OrdinalIgnoreCase);

    var currentSession = await client.GetFromJsonAsync<AudibleAuthenticationStatusResponse>(
        "/api/audible-authentication/session");

    Assert.NotNull(currentSession);
    Assert.Equal("authenticated", currentSession.Status);
    Assert.Equal("us", currentSession.Locale);
  }

  private sealed class VersoApplicationFactory : WebApplicationFactory<Program>
  {
    private readonly string databasePath = Path.Combine(Path.GetTempPath(), $"verso-tests-{Guid.NewGuid():N}.db");
    private readonly string dataDirectory = Path.Combine(Path.GetTempPath(), $"verso-tests-data-{Guid.NewGuid():N}");
    private readonly MutableAudibleLibrarySource source;
    private IAudibleLibrarySource librarySource;
    private IAudibleLoginClient? loginClient;
    private IAudibleAssetDownloader? assetDownloader;

    public VersoApplicationFactory(IReadOnlyList<ImportedAudibleItem> items)
    {
      source = new MutableAudibleLibrarySource(AudibleLibraryFetchResult.Succeeded(items));
      librarySource = source;
    }

    public void SetImportedItems(IReadOnlyList<ImportedAudibleItem> items)
    {
      source.SetResult(AudibleLibraryFetchResult.Succeeded(items));
    }

    public void SetRefreshResult(AudibleLibraryFetchResult result)
    {
      source.SetResult(result);
    }

    public void UseIdentityFileGatedLibrarySource(IReadOnlyList<ImportedAudibleItem> items)
    {
      librarySource = new IdentityFileGatedLibrarySource(
          Path.Combine(dataDirectory, "audible", "identity.json"),
          items);
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
        services.RemoveAll<IAudibleLibrarySource>();
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

  private sealed class IdentityFileGatedLibrarySource(
      string identityFilePath,
      IReadOnlyList<ImportedAudibleItem> items) : IAudibleLibrarySource
  {
    public Task<AudibleLibraryFetchResult> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
      return Task.FromResult(
          File.Exists(identityFilePath)
              ? AudibleLibraryFetchResult.Succeeded(items)
              : AudibleLibraryFetchResult.Failed(
                  new LibraryOperationError(
                      "audible-library-authentication-required",
                      "Authenticate with Audible before refreshing the library.",
                      "The local Audible identity file is missing or no longer valid.",
                      "authenticate")));
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

  private sealed class MutableAudibleLoginClient : IAudibleLoginClient
  {
    public bool ShouldFailBeforePrompt { get; set; }
    public bool DeletePendingIdentityBeforeReturn { get; set; }

    public async Task EnsureAuthenticatedAsync(
        string locale,
        string identityFilePath,
        Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync,
        CancellationToken cancellationToken)
    {
      if (ShouldFailBeforePrompt)
      {
        throw new InvalidOperationException("Synthetic login failure before prompt.");
      }

      var responseUrl = await externalLoginAsync(
          new ExternalAudibleLoginPrompt(
              "https://www.audible.test/signin",
              [new AudibleSignInCookieDto("x-main", "cookie-value", ".audible.test", "/")]));

      Directory.CreateDirectory(Path.GetDirectoryName(identityFilePath)!);
      await File.WriteAllTextAsync(identityFilePath, responseUrl, cancellationToken);

      if (DeletePendingIdentityBeforeReturn && File.Exists(identityFilePath))
      {
        File.Delete(identityFilePath);
      }
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
