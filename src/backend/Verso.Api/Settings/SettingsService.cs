using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class SettingsService(
  IDbContextFactory<VersoDbContext> databaseFactory,
  AudibleAuthenticationService authenticationService,
  VersoStorageOptions storageOptions)
{
  public const int CurrentSettingsId = 1;

  private static readonly string[] SelectiveSnapshotFields =
  [
  "percent-complete",
  "presence",
  "companion-pdf-available",
  "is-returnable"
  ];

  private static readonly SettingsResponse DefaultSettings = new(
      new InterfacePreferencesSettingsDto(
          NavChrome: "topnav",
          DefaultOverviewVariant: "calm",
      DefaultLibraryView: "rows"),
    new AudibleAuthenticationSettingsDto(
      Status: "not-authenticated",
      Locale: null,
      LastAuthenticatedAtUtc: null,
      LastError: null),
    new RefreshSettingsDto(
      Trigger: "manual",
      RetainNoLongerPresentItems: true,
      SelectiveSnapshotFields: SelectiveSnapshotFields),
    new CostBasisSettingsDto(
      DefaultBasis: "per-credit-value",
      PerCreditValue: 14.95m,
      CurrencyCode: "USD"),
    new LocalDataSettingsDto(
      DatabaseLocation: string.Empty,
      DatabaseSizeBytes: 0,
      SchemaVersion: string.Empty,
      RawPayloadCount: 0,
      CoverCacheLocation: Path.Combine("cached-assets", "covers"),
      CoverCacheSizeBytes: 0,
      CompanionPdfsStatus: "deferred"),
    new ArchiveExportSettingsDto(
      Format: "json-archive",
      IncludeRawPayloads: true,
      CoverImages: "sibling-folder",
      RestoreSupported: false));

  public async Task<SettingsResponse> GetAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var currentSettings = await database.Settings
        .AsNoTracking()
        .SingleOrDefaultAsync(settings => settings.Id == CurrentSettingsId, cancellationToken);

    return await MapAsync(database, currentSettings ?? new SettingsStateEntity(), cancellationToken);
  }

  public async Task<SettingsResponse> UpdateAsync(UpdateSettingsRequest request, CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var currentSettings = await database.Settings
        .SingleOrDefaultAsync(settings => settings.Id == CurrentSettingsId, cancellationToken)
        ?? new SettingsStateEntity { Id = CurrentSettingsId };

    if (request.InterfacePreferences is not null)
    {
      currentSettings.NavChrome = request.InterfacePreferences.NavChrome;
      currentSettings.DefaultOverviewVariant = request.InterfacePreferences.DefaultOverviewVariant;
      currentSettings.DefaultLibraryView = request.InterfacePreferences.DefaultLibraryView;
    }

    if (request.Refresh is not null)
    {
      currentSettings.RefreshTrigger = request.Refresh.Trigger;
      currentSettings.RetainNoLongerPresentItems = request.Refresh.RetainNoLongerPresentItems;
    }

    if (request.CostBasis is not null)
    {
      currentSettings.DefaultCostBasis = request.CostBasis.DefaultBasis;
      currentSettings.PerCreditValueInCents = decimal.ToInt32(decimal.Round(request.CostBasis.PerCreditValue * 100m, 0, MidpointRounding.AwayFromZero));
      currentSettings.CostBasisCurrencyCode = request.CostBasis.CurrencyCode;
    }

    if (request.ArchiveExport is not null)
    {
      currentSettings.ArchiveExportFormat = request.ArchiveExport.Format;
      currentSettings.IncludeRawPayloadsInArchive = request.ArchiveExport.IncludeRawPayloads;
      currentSettings.ArchiveExportCoverImages = request.ArchiveExport.CoverImages;
    }

    if (database.Entry(currentSettings).State == EntityState.Detached)
    {
      database.Settings.Add(currentSettings);
    }

    await database.SaveChangesAsync(cancellationToken);

    return await MapAsync(database, currentSettings, cancellationToken);
  }

  public static bool IsValid(UpdateSettingsRequest request)
  {
    if (request.InterfacePreferences is null
        && request.Refresh is null
        && request.CostBasis is null
        && request.ArchiveExport is null)
    {
      return false;
    }

    return IsValidInterfacePreferences(request.InterfacePreferences)
        && IsValidRefreshSettings(request.Refresh)
        && IsValidCostBasisSettings(request.CostBasis)
        && IsValidArchiveExportSettings(request.ArchiveExport);
  }

  private async Task<SettingsResponse> MapAsync(
      VersoDbContext database,
      SettingsStateEntity settings,
      CancellationToken cancellationToken)
  {
    var authentication = await authenticationService.GetCurrentAsync(cancellationToken);
    var databaseLocation = ResolveDatabaseLocation(database);
    var coverCacheLocation = Path.Combine(storageOptions.DataDirectory, "cached-assets", "covers");
    var appliedMigrations = await database.Database.GetAppliedMigrationsAsync(cancellationToken);
    var rawPayloadCount = await database.AudibleItems.CountAsync(cancellationToken);

    return new SettingsResponse(
        new InterfacePreferencesSettingsDto(
            settings.NavChrome,
            settings.DefaultOverviewVariant,
            settings.DefaultLibraryView),
        new AudibleAuthenticationSettingsDto(
            authentication.Status,
            authentication.Locale,
            authentication.AuthenticatedAtUtc,
            authentication.LastError),
        new RefreshSettingsDto(
            settings.RefreshTrigger,
            settings.RetainNoLongerPresentItems,
            SelectiveSnapshotFields),
        new CostBasisSettingsDto(
            settings.DefaultCostBasis,
            settings.PerCreditValueInCents / 100m,
            settings.CostBasisCurrencyCode),
        new LocalDataSettingsDto(
            databaseLocation,
            GetFileSize(databaseLocation),
            appliedMigrations.LastOrDefault() ?? string.Empty,
            rawPayloadCount,
            coverCacheLocation,
            GetDirectorySize(coverCacheLocation),
            "deferred"),
        new ArchiveExportSettingsDto(
            settings.ArchiveExportFormat,
            settings.IncludeRawPayloadsInArchive,
            settings.ArchiveExportCoverImages,
            RestoreSupported: false));
  }

  private static bool IsValidInterfacePreferences(InterfacePreferencesSettingsDto? interfacePreferences)
  {
    return interfacePreferences is null
        || (interfacePreferences.NavChrome is "topnav" or "sidebar"
            && interfacePreferences.DefaultOverviewVariant is "calm" or "dense"
            && interfacePreferences.DefaultLibraryView is "rows" or "cards");
  }

  private static bool IsValidRefreshSettings(RefreshSettingsMutationDto? refresh)
  {
    return refresh is null
        || refresh.Trigger is "manual" or "on-app-start" or "daily-at-idle";
  }

  private static bool IsValidCostBasisSettings(CostBasisSettingsMutationDto? costBasis)
  {
    return costBasis is null
        || (costBasis.DefaultBasis is "per-credit-value" or "list-price"
            && costBasis.PerCreditValue >= 0m
            && string.Equals(costBasis.CurrencyCode, "USD", StringComparison.OrdinalIgnoreCase));
  }

  private static bool IsValidArchiveExportSettings(ArchiveExportSettingsMutationDto? archiveExport)
  {
    return archiveExport is null
        || (archiveExport.Format is "json-archive" or "csv-projection" or "markdown-projection"
            && archiveExport.CoverImages is "sibling-folder" or "embedded-base64" or "omit");
  }

  private static string ResolveDatabaseLocation(VersoDbContext database)
  {
    var dataSource = database.Database.GetDbConnection().DataSource;

    if (string.IsNullOrWhiteSpace(dataSource))
    {
      return string.Empty;
    }

    var builder = new SqliteConnectionStringBuilder { DataSource = dataSource };
    return Path.GetFullPath(builder.DataSource);
  }

  private static long GetFileSize(string path)
  {
    return File.Exists(path) ? new FileInfo(path).Length : 0;
  }

  private static long GetDirectorySize(string path)
  {
    if (!Directory.Exists(path))
    {
      return 0;
    }

    return Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories)
        .Select(file => new FileInfo(file).Length)
        .Sum();
  }
}
