namespace Verso.Api;

public sealed record InterfacePreferencesSettingsDto(
    string NavChrome,
    string DefaultOverviewVariant,
    string DefaultLibraryView);

public sealed record AudibleAuthenticationSettingsDto(
    string Status,
    string? Locale,
    DateTimeOffset? LastAuthenticatedAtUtc,
    string? LastError);

public sealed record RefreshSettingsDto(
    string Trigger,
    bool RetainNoLongerPresentItems,
    IReadOnlyList<string> SelectiveSnapshotFields);

public sealed record RefreshSettingsMutationDto(
    string Trigger,
    bool RetainNoLongerPresentItems);

public sealed record CostBasisSettingsDto(
    string DefaultBasis,
    decimal PerCreditValue,
    string CurrencyCode);

public sealed record CostBasisSettingsMutationDto(
    string DefaultBasis,
    decimal PerCreditValue,
    string CurrencyCode);

public sealed record LocalDataSettingsDto(
    string DatabaseLocation,
    long DatabaseSizeBytes,
    string SchemaVersion,
    int RawPayloadCount,
    string CoverCacheLocation,
    long CoverCacheSizeBytes,
    string CompanionPdfsStatus);

public sealed record ArchiveExportSettingsDto(
    string Format,
    bool IncludeRawPayloads,
    string CoverImages,
    bool RestoreSupported);

public sealed record ArchiveExportSettingsMutationDto(
    string Format,
    bool IncludeRawPayloads,
    string CoverImages);

public sealed record SettingsResponse(
    InterfacePreferencesSettingsDto InterfacePreferences,
    AudibleAuthenticationSettingsDto AudibleAuthentication,
    RefreshSettingsDto Refresh,
    CostBasisSettingsDto CostBasis,
    LocalDataSettingsDto LocalData,
    ArchiveExportSettingsDto ArchiveExport);

public sealed record UpdateSettingsRequest(
    InterfacePreferencesSettingsDto? InterfacePreferences = null,
    RefreshSettingsMutationDto? Refresh = null,
    CostBasisSettingsMutationDto? CostBasis = null,
    ArchiveExportSettingsMutationDto? ArchiveExport = null);
