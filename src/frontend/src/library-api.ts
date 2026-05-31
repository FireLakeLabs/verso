export type LibraryRefreshJobPhaseDto = {
  name: string;
  status: string;
  summary: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
};

export type LibraryOperationErrorDto = {
  code: string;
  message: string;
  technicalDetails: string | null;
  phase: string;
};

export type LibraryRefreshJobDto = {
  id: string;
  status: string;
  phaseSummary: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
  observedItemCount: number;
  importedItemCount: number;
  retainedNoLongerPresentItemCount: number;
  snapshotObservationCount: number;
  phases: LibraryRefreshJobPhaseDto[];
  errors: LibraryOperationErrorDto[];
};

export type LibraryRefreshStatusResponse = {
  activeJobs: LibraryRefreshJobDto[];
  recentJobs: LibraryRefreshJobDto[];
};

export type LibraryOverviewResponse = {
  prototypeDisplay?: {
    calmOverviewMetricDetails?: {
      completedDetail: string;
      hoursDetail: string;
      itemsDetail: string;
      openFindingsDetail: string;
    };
  };
  summary: {
    totalItems: number;
    presentItems: number;
    noLongerPresentItems: number;
    completedItems: number;
    inProgressItems: number;
    openFindingsCount?: number;
  };
  latestRefreshJob: LibraryRefreshJobDto | null;
};

export type LibraryItemDto = {
  asin: string;
  title: string;
  authors: string[];
  narrators: string[];
  runtimeMinutes: number;
  percentComplete: number;
  rawAudiblePayload: string;
  isNoLongerPresent: boolean;
  hasSnapshots: boolean;
  coverImages?: LibraryItemCoverImageDto[] | null;
  coverSeed?: number;
};

export type CachedAssetDto = {
  contentType: string;
  sizeBytes: number;
  cachedAtUtc: string;
  url: string;
};

export type LibraryItemCoverImageDto = {
  variant: string;
  sourceUrl: string;
  cachedAsset: CachedAssetDto | null;
};

export type LibraryItemsResponse = {
  items: LibraryItemDto[];
};

export type ImportedAudibleSeriesEntry = {
  title: string;
  sequence: string | null;
};

export type VersoAnnotationsDto = {
  tags: string[];
  isDropped: boolean;
  note: string | null;
};

export type SelectiveSnapshotObservationDto = {
  field: string;
  value: string;
  observedAtUtc: string;
};

export type LibraryItemDetailDto = {
  asin: string;
  isNoLongerPresent: boolean;
  currentAudibleFacts: {
    title: string;
    authors: string[];
    narrators: string[];
    runtimeMinutes: number;
    percentComplete: number;
    publisherSummary: string | null;
    hasCompanionPdf: boolean;
    isReturnable: boolean | null;
    rawAudiblePayload: string;
  };
  series: ImportedAudibleSeriesEntry[];
  versoAnnotations: VersoAnnotationsDto;
  snapshotHistory: SelectiveSnapshotObservationDto[];
};

export type LibraryItemDetailResponse = {
  item: LibraryItemDetailDto;
};

export type StartLibraryRefreshResponse = {
  job: LibraryRefreshJobDto;
};

export type InterfacePreferencesSettingsDto = {
  navChrome: string;
  defaultOverviewVariant: string;
  defaultLibraryView: string;
};

export type AudibleAuthenticationSettingsDto = {
  status: string;
  locale: string | null;
  lastAuthenticatedAtUtc: string | null;
  lastError: string | null;
};

export type RefreshSettingsDto = {
  trigger: string;
  retainNoLongerPresentItems: boolean;
  selectiveSnapshotFields: string[];
};

export type RefreshSettingsMutationDto = {
  trigger: string;
  retainNoLongerPresentItems: boolean;
};

export type CostBasisSettingsDto = {
  defaultBasis: string;
  perCreditValue: number;
  currencyCode: string;
};

export type CostBasisSettingsMutationDto = {
  defaultBasis: string;
  perCreditValue: number;
  currencyCode: string;
};

export type LocalDataSettingsDto = {
  databaseLocation: string;
  databaseSizeBytes: number;
  schemaVersion: string;
  rawPayloadCount: number;
  coverCacheLocation: string;
  coverCacheSizeBytes: number;
  companionPdfsStatus: string;
};

export type ArchiveExportSettingsDto = {
  format: string;
  includeRawPayloads: boolean;
  coverImages: string;
  restoreSupported: boolean;
};

export type ArchiveExportSettingsMutationDto = {
  format: string;
  includeRawPayloads: boolean;
  coverImages: string;
};

export type SettingsResponse = {
  interfacePreferences: InterfacePreferencesSettingsDto;
  audibleAuthentication: AudibleAuthenticationSettingsDto;
  refresh: RefreshSettingsDto;
  costBasis: CostBasisSettingsDto;
  localData: LocalDataSettingsDto;
  archiveExport: ArchiveExportSettingsDto;
};

export type UpdateSettingsRequest = {
  interfacePreferences?: InterfacePreferencesSettingsDto;
  refresh?: RefreshSettingsMutationDto;
  costBasis?: CostBasisSettingsMutationDto;
  archiveExport?: ArchiveExportSettingsMutationDto;
};

export type AudibleSignInCookieDto = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export type StartAudibleAuthenticationRequest = {
  locale: string;
};

export type StartAudibleAuthenticationResponse = {
  sessionId: string;
  status: string;
  locale: string;
  loginUrl: string;
  signInCookies: AudibleSignInCookieDto[];
};

export type CompleteAudibleAuthenticationRequest = {
  responseUrl: string;
};

export type AudibleAuthenticationStatusResponse = {
  status: string;
  locale: string | null;
  authenticatedAtUtc: string | null;
  lastError: string | null;
};

export type LibraryFilters = {
  search: string;
  presence: string;
  completion: string;
};

type ErrorPayload = {
  code?: string;
  message?: string;
  title?: string;
  technicalDetails?: string | null;
  phase?: string;
};

export function createLibraryApi(baseUrl = "") {
  return {
    getOverview: () =>
      requestJson<LibraryOverviewResponse>(`${baseUrl}/api/library/overview`),
    getRefreshStatus: () =>
      requestJson<LibraryRefreshStatusResponse>(
        `${baseUrl}/api/library/refresh-status`,
      ),
    getItems: (filters: LibraryFilters) =>
      requestJson<LibraryItemsResponse>(
        `${baseUrl}/api/library/items${buildItemsQuery(filters)}`,
      ),
    getItemDetail: (asin: string) =>
      requestJson<LibraryItemDetailResponse>(
        `${baseUrl}/api/library/items/${encodeURIComponent(asin)}`,
      ),
    getSettings: () => requestJson<SettingsResponse>(`${baseUrl}/api/settings`),
    updateSettings: (request: UpdateSettingsRequest) =>
      requestJson<SettingsResponse>(`${baseUrl}/api/settings`, {
        method: "PUT",
        body: JSON.stringify(request),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    startAuthentication: (request: StartAudibleAuthenticationRequest) =>
      requestJson<StartAudibleAuthenticationResponse>(
        `${baseUrl}/api/audible-authentication/sessions`,
        {
          method: "POST",
          body: JSON.stringify(request),
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    completeAuthentication: (
      sessionId: string,
      request: CompleteAudibleAuthenticationRequest,
    ) =>
      requestJson<AudibleAuthenticationStatusResponse>(
        `${baseUrl}/api/audible-authentication/sessions/${encodeURIComponent(sessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(request),
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    signOutAuthentication: () =>
      requestNoContent(`${baseUrl}/api/audible-authentication/session`, {
        method: "DELETE",
      }),
    startRefresh: () =>
      requestJson<StartLibraryRefreshResponse>(
        `${baseUrl}/api/library/refresh-jobs`,
        {
          method: "POST",
        },
      ),
  };
}

function buildItemsQuery(filters: LibraryFilters) {
  const params = new URLSearchParams();

  if (filters.search.trim().length > 0) {
    params.set("search", filters.search.trim());
  }

  if (filters.presence !== "all") {
    params.set("presence", filters.presence);
  }

  if (filters.completion !== "all") {
    params.set("completion", filters.completion);
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function requestNoContent(
  url: string,
  init?: RequestInit,
): Promise<void> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (body.length === 0) {
    return `Request failed with status ${response.status}.`;
  }

  try {
    const error = JSON.parse(body) as ErrorPayload;
    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }

    if (typeof error.title === "string" && error.title.length > 0) {
      return error.title;
    }
  } catch {
    return body;
  }

  return body;
}
