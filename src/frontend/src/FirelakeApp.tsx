import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type StartAudibleAuthenticationResponse,
  type SettingsResponse,
  type UpdateSettingsRequest,
  createLibraryApi,
  type InterfacePreferencesSettingsDto,
  type LibraryFilters,
  type LibraryItemDetailDto,
  type LibraryItemDto,
  type LibraryOverviewResponse,
  type LibraryRefreshStatusResponse,
} from "./library-api";
import { createLibraryScreenReport } from "./reports/library-screen-report";
import { FirelakeShell } from "./shell/firelake-shell";
import {
  defaultShellPreferences,
  type ShellPreferences,
} from "./shell/visual-parity";

const defaultFilters: LibraryFilters = {
  search: "",
  presence: "all",
  completion: "all",
};

export function FirelakeApp() {
  const api = useMemo(() => createLibraryApi(), []);
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const [overview, setOverview] = useState<LibraryOverviewResponse | null>(
    null,
  );
  const [refreshStatus, setRefreshStatus] =
    useState<LibraryRefreshStatusResponse | null>(null);
  const [items, setItems] = useState<readonly LibraryItemDto[]>([]);
  const [selectedAsins, setSelectedAsins] = useState<string[]>([]);
  const [activeAsin, setActiveAsin] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<LibraryItemDetailDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ShellPreferences>(
    defaultShellPreferences,
  );
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  const loadLibrary = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const [nextOverview, nextRefreshStatus, nextItems] = await Promise.all([
          api.getOverview(),
          api.getRefreshStatus(),
          api.getItems(filters),
        ]);

        setOverview(nextOverview);
        setRefreshStatus(nextRefreshStatus);
        setItems(nextItems.items);
        setSelectedAsins((currentSelection) => {
          const visibleAsins = new Set(
            nextItems.items.map((item) => item.asin),
          );
          return currentSelection.filter((asin) => visibleAsins.has(asin));
        });
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Library data could not be loaded.",
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [api, filters],
  );

  useEffect(() => {
    void loadLibrary(true);
  }, [loadLibrary]);

  const loadSettings = useCallback(async () => {
    const nextSettings = await api.getSettings();

    setSettings(nextSettings);
    setPreferences(
      mapInterfacePreferencesToShell(
        nextSettings.interfacePreferences,
        defaultShellPreferences,
      ),
    );
    setLoadError(null);

    return nextSettings;
  }, [api]);

  useEffect(() => {
    let isDisposed = false;

    void loadSettings()
      .then((loadedSettings) => {
        if (!isDisposed) {
          setSettings(loadedSettings);
        }
      })
      .catch((error) => {
        if (!isDisposed) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Settings could not be loaded.",
          );
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [loadSettings]);

  const screenReport = useMemo(
    () =>
      createLibraryScreenReport({
        activeAsin,
        items,
        selectedAsins,
      }),
    [activeAsin, items, selectedAsins],
  );

  useEffect(() => {
    const nextAsin = screenReport.activeAsin;

    if (nextAsin === null) {
      setActiveItem(null);
      setDetailError(null);
      return;
    }

    let isDisposed = false;
    setDetailError(null);

    void api
      .getItemDetail(nextAsin)
      .then((response) => {
        if (!isDisposed) {
          setActiveItem(response.item);
        }
      })
      .catch((error) => {
        if (!isDisposed) {
          setActiveItem(null);
          setDetailError(
            error instanceof Error
              ? error.message
              : "Item detail could not be loaded.",
          );
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [api, screenReport.activeAsin]);

  async function handleRefresh() {
    if (settings?.audibleAuthentication.status !== "authenticated") {
      setLoadError("Authenticate with Audible before refreshing the library.");
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await api.startRefresh();
      setOverview((currentOverview) =>
        currentOverview === null
          ? currentOverview
          : { ...currentOverview, latestRefreshJob: response.job },
      );
      await loadLibrary(false);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Library refresh could not be started.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function updateFilter<Key extends keyof LibraryFilters>(
    key: Key,
    value: LibraryFilters[Key],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function toggleSelection(asin: string) {
    setSelectedAsins((currentSelection) =>
      currentSelection.includes(asin)
        ? currentSelection.filter((selectedAsin) => selectedAsin !== asin)
        : [...currentSelection, asin],
    );
  }

  function updatePreference<Key extends keyof ShellPreferences>(
    key: Key,
    value: ShellPreferences[Key],
  ) {
    const previousPreferences = preferences;
    const nextPreferences = {
      ...preferences,
      [key]: value,
    };

    setPreferences(nextPreferences);
    setSettings((currentSettings) =>
      currentSettings === null
        ? currentSettings
        : {
            ...currentSettings,
            interfacePreferences:
              mapShellPreferencesToInterface(nextPreferences),
          },
    );

    void persistSettingsUpdate({
      interfacePreferences: mapShellPreferencesToInterface(nextPreferences),
    })
      .then((settings) => {
        setPreferences(
          mapInterfacePreferencesToShell(
            settings.interfacePreferences,
            nextPreferences,
          ),
        );
      })
      .catch((error) => {
        setPreferences(previousPreferences);
        setSettings((currentSettings) =>
          currentSettings === null
            ? currentSettings
            : {
                ...currentSettings,
                interfacePreferences:
                  mapShellPreferencesToInterface(previousPreferences),
              },
        );
        setLoadError(
          error instanceof Error
            ? error.message
            : "Settings could not be saved.",
        );
      });
  }

  async function persistSettingsUpdate(request: UpdateSettingsRequest) {
    const nextSettings = await api.updateSettings(request);
    setSettings(nextSettings);
    setLoadError(null);
    return nextSettings;
  }

  async function handleStartAuthentication(
    locale: string,
  ): Promise<StartAudibleAuthenticationResponse> {
    try {
      const prompt = await api.startAuthentication({ locale });
      setLoadError(null);
      return prompt;
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Audible authentication could not be started.",
      );

      throw error;
    }
  }

  async function handleCompleteAuthentication(
    sessionId: string,
    responseUrl: string,
  ) {
    try {
      const result = await api.completeAuthentication(sessionId, {
        responseUrl,
      });

      if (result.status === "failed") {
        throw new Error(
          result.lastError ?? "Audible authentication could not be completed.",
        );
      }

      await loadSettings();
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Audible authentication could not be completed.",
      );

      throw error;
    }
  }

  async function handleCancelAuthentication(sessionId: string) {
    try {
      await api.cancelAuthentication(sessionId);
      await loadSettings();
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Audible authentication could not be cancelled.",
      );

      throw error;
    }
  }

  async function handleSignOutAuthentication() {
    try {
      await api.signOutAuthentication();
      await loadSettings();
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Audible sign-out failed.",
      );

      throw error;
    }
  }

  return (
    <FirelakeShell
      activeAsin={activeAsin}
      activeItem={activeItem}
      detailError={detailError}
      filters={filters}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      items={items}
      loadError={loadError}
      onChangeFilter={updateFilter}
      onChangePreference={updatePreference}
      onCancelAuthentication={handleCancelAuthentication}
      onCompleteAuthentication={handleCompleteAuthentication}
      onSetActiveAsin={setActiveAsin}
      onSignOutAuthentication={handleSignOutAuthentication}
      onStartAuthentication={handleStartAuthentication}
      onStartRefresh={() => {
        void handleRefresh();
      }}
      onUpdateSettings={persistSettingsUpdate}
      onToggleSelection={toggleSelection}
      overview={overview}
      preferences={preferences}
      refreshStatus={refreshStatus}
      selectedAsins={selectedAsins}
      settings={settings}
    />
  );
}

function mapInterfacePreferencesToShell(
  preferences: InterfacePreferencesSettingsDto,
  fallback: ShellPreferences,
): ShellPreferences {
  return {
    nav:
      preferences.navChrome === "sidebar" || preferences.navChrome === "topnav"
        ? preferences.navChrome
        : fallback.nav,
    overview:
      preferences.defaultOverviewVariant === "dense" ||
      preferences.defaultOverviewVariant === "calm"
        ? preferences.defaultOverviewVariant
        : fallback.overview,
    libraryView:
      preferences.defaultLibraryView === "cards" ||
      preferences.defaultLibraryView === "rows"
        ? preferences.defaultLibraryView
        : fallback.libraryView,
  };
}

function mapShellPreferencesToInterface(
  preferences: ShellPreferences,
): InterfacePreferencesSettingsDto {
  return {
    navChrome: preferences.nav,
    defaultOverviewVariant: preferences.overview,
    defaultLibraryView: preferences.libraryView,
  };
}
