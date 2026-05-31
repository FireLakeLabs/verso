import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLibraryApi,
  type LibraryFilters,
  type LibraryItemDetailDto,
  type LibraryItemDto,
  type LibraryOverviewResponse,
  type LibraryRefreshStatusResponse,
} from "./library-api";
import { createLibraryScreenReport } from "./reports/library-screen-report";
import { FirelakeShell } from "./shell/firelake-shell";

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
      onSetActiveAsin={setActiveAsin}
      onStartRefresh={() => {
        void handleRefresh();
      }}
      onToggleSelection={toggleSelection}
      overview={overview}
      refreshStatus={refreshStatus}
      selectedAsins={selectedAsins}
    />
  );
}
