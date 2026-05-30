import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookCopy,
  BookOpen,
  Clock3,
  FileSearch,
  Library,
  RefreshCcw,
  Tag,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  createLibraryApi,
  type LibraryFilters,
  type LibraryItemDto,
  type LibraryItemDetailDto,
  type LibraryOverviewResponse,
  type LibraryRefreshStatusResponse,
} from "./library-api";
import {
  createLibraryScreenReport,
  formatRuntimeMinutes,
} from "./reports/library-screen-report";

const defaultFilters: LibraryFilters = {
  search: "",
  presence: "all",
  completion: "all",
};

const presenceOptions = [
  { value: "all", label: "All presence states" },
  { value: "present", label: "Present now" },
  { value: "no-longer-present", label: "No longer present" },
];

const completionOptions = [
  { value: "all", label: "All completion states" },
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In progress" },
  { value: "not-started", label: "Not started" },
  { value: "anomalous", label: "Needs review" },
];

export function App() {
  const api = useMemo(() => createLibraryApi(), []);
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const [overview, setOverview] = useState<LibraryOverviewResponse | null>(null);
  const [refreshStatus, setRefreshStatus] =
    useState<LibraryRefreshStatusResponse | null>(null);
  const [items, setItems] = useState<readonly LibraryItemDto[]>([]);
  const [selectedAsins, setSelectedAsins] = useState<string[]>([]);
  const [activeAsin, setActiveAsin] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<LibraryItemDetailDto | null>(null);
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
          const visibleAsins = new Set(nextItems.items.map((item) => item.asin));
          return currentSelection.filter((asin) => visibleAsins.has(asin));
        });
        setLoadError(null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Library data could not be loaded.");
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
        items,
        selectedAsins,
        activeAsin,
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

  const latestRefreshJob = useMemo(
    () => getLatestRefreshJob(refreshStatus, overview),
    [overview, refreshStatus],
  );

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
        error instanceof Error ? error.message : "Library refresh could not be started.",
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
    <main className="app-shell space-y-6">
      <section
        className="hero-panel border-b border-border pb-8"
        aria-labelledby="page-title"
      >
        <div className="space-y-4">
          <p className="eyebrow">Personal Library Companion</p>
          <div className="space-y-3">
            <h1 id="page-title">Verso Library</h1>
            <p className="lede">
              A local workspace for inspecting, refreshing, and curating one
              Audible Library.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="min-w-44"
        >
          <RefreshCcw aria-hidden="true" className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing library" : "Start refresh"}
        </Button>
      </section>

      {loadError ? (
        <Card className="border-accent/40 bg-accent/10">
          <CardHeader>
            <Activity aria-hidden="true" />
            <CardTitle>Library status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="library-overview-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen aria-hidden="true" className="size-5 text-primary" />
          <h2 id="library-overview-title" className="m-0 text-2xl text-foreground">
            Library overview
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            title="Total items"
            value={overview?.summary.totalItems ?? 0}
            detail="Tracked Audible Items"
          />
          <OverviewCard
            title="Present now"
            value={overview?.summary.presentItems ?? 0}
            detail="Still visible in Audible"
          />
          <OverviewCard
            title="No longer present"
            value={overview?.summary.noLongerPresentItems ?? 0}
            detail="Retained for reflection"
          />
          <OverviewCard
            title="Completed"
            value={overview?.summary.completedItems ?? 0}
            detail={`${overview?.summary.inProgressItems ?? 0} in progress`}
          />
        </div>
      </section>

      <section aria-labelledby="refresh-status-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCcw aria-hidden="true" className="size-5 text-primary" />
          <h2 id="refresh-status-title" className="m-0 text-2xl text-foreground">
            Refresh status
          </h2>
        </div>
        <Card>
          <CardHeader className="justify-between">
            <div className="flex items-center gap-2">
              <Activity aria-hidden="true" />
              <CardTitle>Latest refresh job</CardTitle>
            </div>
            {latestRefreshJob ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold capitalize text-primary">
                {latestRefreshJob.status}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {latestRefreshJob ? (
              <>
                <p>{latestRefreshJob.phaseSummary}</p>
                <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatusFact
                    label="Observed"
                    value={String(latestRefreshJob.observedItemCount)}
                  />
                  <StatusFact
                    label="Imported"
                    value={String(latestRefreshJob.importedItemCount)}
                  />
                  <StatusFact
                    label="Retained"
                    value={String(
                      latestRefreshJob.retainedNoLongerPresentItemCount,
                    )}
                  />
                  <StatusFact
                    label="Snapshots"
                    value={String(latestRefreshJob.snapshotObservationCount)}
                  />
                </dl>
                <div className="space-y-2">
                  <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Refresh phases
                  </h3>
                  <ul className="m-0 space-y-2 p-0">
                    {latestRefreshJob.phases.map((phase) => (
                      <li
                        key={`${latestRefreshJob.id}-${phase.name}`}
                        className="list-none rounded-md border border-border bg-background px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {phase.name}
                          </span>
                          <span className="text-sm capitalize text-muted-foreground">
                            {phase.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{phase.summary}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                {latestRefreshJob.errors.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Errors
                    </h3>
                    <ul className="m-0 space-y-2 p-0">
                      {latestRefreshJob.errors.map((error) => (
                        <li
                          key={`${latestRefreshJob.id}-${error.code}-${error.phase}`}
                          className="list-none rounded-md border border-accent/30 bg-accent/10 px-3 py-2"
                        >
                          <p className="font-semibold text-foreground">
                            {error.message}
                          </p>
                          <p className="text-sm">
                            {error.code} · {error.phase}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p>
                No refresh jobs yet. Authenticate with Audible, then start a local
                refresh from this screen.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="library-table-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <Library aria-hidden="true" className="size-5 text-primary" />
          <h2 id="library-table-title" className="m-0 text-2xl text-foreground">
            Library table
          </h2>
        </div>
        <Card>
          <CardHeader className="items-start justify-between gap-4 lg:flex-row">
            <div className="flex items-center gap-2">
              <FileSearch aria-hidden="true" />
              <CardTitle>Search and filter the library</CardTitle>
            </div>
            <div className="grid w-full gap-3 md:grid-cols-3 lg:max-w-3xl">
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>Search</span>
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Title, contributor, or ASIN"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>Presence</span>
                <select
                  value={filters.presence}
                  onChange={(event) => updateFilter("presence", event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {presenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>Completion</span>
                <select
                  value={filters.completion}
                  onChange={(event) => updateFilter("completion", event.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {completionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3">
              <p className="text-sm">
                {screenReport.rows.length} visible items · {screenReport.presentItemCount} present ·{" "}
                {screenReport.retainedItemCount} retained
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {screenReport.selectedCount} selected
                </span>
                <Button type="button" disabled={screenReport.selectedCount === 0}>
                  <Tag aria-hidden="true" />
                  Tag selected items in issue #6
                </Button>
              </div>
            </div>
            {isLoading ? (
              <p>Loading library items...</p>
            ) : screenReport.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border text-sm text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Select</th>
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Authors</th>
                      <th className="px-3 py-2 font-semibold">Narrators</th>
                      <th className="px-3 py-2 font-semibold">Runtime</th>
                      <th className="px-3 py-2 font-semibold">Completion</th>
                      <th className="px-3 py-2 font-semibold">Presence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenReport.rows.map((row) => (
                      <tr
                        key={row.asin}
                        className={
                          row.asin === screenReport.activeAsin
                            ? "border-b border-border bg-primary/5"
                            : "border-b border-border"
                        }
                      >
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            aria-label={`Select ${row.title}`}
                            onChange={() => toggleSelection(row.asin)}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => setActiveAsin(row.asin)}
                            className="text-left font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {row.title}
                          </button>
                          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {row.asin}
                          </div>
                          {row.hasSnapshots ? (
                            <div className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                              Has snapshots
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top text-sm">{row.authorsLabel}</td>
                        <td className="px-3 py-2 align-top text-sm">{row.narratorsLabel}</td>
                        <td className="px-3 py-2 align-top text-sm">{row.runtimeLabel}</td>
                        <td className="px-3 py-2 align-top text-sm">{row.completionLabel}</td>
                        <td className="px-3 py-2 align-top text-sm">
                          <span
                            className={
                              row.isRetained
                                ? "rounded-full bg-accent/15 px-2 py-1 font-semibold text-accent"
                                : "rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary"
                            }
                          >
                            {row.presenceLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                No library items match the current filters yet. Start a refresh after
                authenticating with Audible to populate the table.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="item-detail-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookCopy aria-hidden="true" className="size-5 text-primary" />
          <h2 id="item-detail-title" className="m-0 text-2xl text-foreground">
            Item detail
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <BookOpen aria-hidden="true" />
              <CardTitle>Current Audible facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailError ? (
                <p>{detailError}</p>
              ) : activeItem ? (
                <>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="m-0 text-xl text-foreground">
                        {activeItem.currentAudibleFacts.title}
                      </h3>
                      <span
                        className={
                          activeItem.isNoLongerPresent
                            ? "rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent"
                            : "rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
                        }
                      >
                        {activeItem.isNoLongerPresent
                          ? "No longer present"
                          : "Present"}
                      </span>
                    </div>
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                      {activeItem.asin}
                    </p>
                  </div>
                  <dl className="grid gap-3 md:grid-cols-2">
                    <StatusFact
                      label="Authors"
                      value={activeItem.currentAudibleFacts.authors.join(", ") || "Unknown"}
                    />
                    <StatusFact
                      label="Narrators"
                      value={
                        activeItem.currentAudibleFacts.narrators.join(", ") || "Unknown"
                      }
                    />
                    <StatusFact
                      label="Runtime"
                      value={formatRuntimeMinutes(
                        activeItem.currentAudibleFacts.runtimeMinutes,
                      )}
                    />
                    <StatusFact
                      label="Completion"
                      value={`${activeItem.currentAudibleFacts.percentComplete}%`}
                    />
                    <StatusFact
                      label="Companion PDF"
                      value={
                        activeItem.currentAudibleFacts.hasCompanionPdf ? "Available" : "None"
                      }
                    />
                    <StatusFact
                      label="Returnable"
                      value={formatReturnable(activeItem.currentAudibleFacts.isReturnable)}
                    />
                  </dl>
                  <div className="space-y-2">
                    <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Publisher summary
                    </h3>
                    <p>
                      {activeItem.currentAudibleFacts.publisherSummary ??
                        "No publisher summary arrived from Audible for this item yet."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Series
                    </h3>
                    {activeItem.series.length > 0 ? (
                      <ul className="m-0 space-y-2 p-0">
                        {activeItem.series.map((series) => (
                          <li
                            key={`${activeItem.asin}-${series.title}-${series.sequence ?? "none"}`}
                            className="list-none rounded-md border border-border bg-background px-3 py-2"
                          >
                            <span className="font-semibold text-foreground">
                              {series.title}
                            </span>
                            {series.sequence ? (
                              <span className="ml-2 text-sm text-muted-foreground">
                                #{series.sequence}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No series metadata is available for this item.</p>
                    )}
                  </div>
                  <details className="rounded-md border border-border bg-background px-3 py-3">
                    <summary className="cursor-pointer font-semibold text-foreground">
                      Raw Audible payload
                    </summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {activeItem.currentAudibleFacts.rawAudiblePayload}
                    </pre>
                  </details>
                </>
              ) : (
                <p>
                  Choose an item from the table to inspect Current Audible Facts,
                  retained history, and future Verso annotations.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Tag aria-hidden="true" />
                <CardTitle>Verso annotations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnnotationPlaceholder
                  label="Tags"
                  value={
                    activeItem?.versoAnnotations.tags.length
                      ? activeItem.versoAnnotations.tags.join(", ")
                      : "No Verso tags yet. Issue #6 will add tag editing."
                  }
                />
                <AnnotationPlaceholder
                  label="Dropped"
                  value={
                    activeItem?.versoAnnotations.isDropped
                      ? "Marked as dropped."
                      : "No drop decision recorded yet."
                  }
                />
                <AnnotationPlaceholder
                  label="Note"
                  value={
                    activeItem?.versoAnnotations.note ??
                    "No Verso note yet. Issue #6 will add note capture."
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock3 aria-hidden="true" />
                <CardTitle>Selective snapshot history</CardTitle>
              </CardHeader>
              <CardContent>
                {activeItem?.snapshotHistory.length ? (
                  <ul className="m-0 space-y-2 p-0">
                    {activeItem.snapshotHistory.map((snapshot) => (
                      <li
                        key={`${activeItem.asin}-${snapshot.field}-${snapshot.observedAtUtc}-${snapshot.value}`}
                        className="list-none rounded-md border border-border bg-background px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {snapshot.field}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatUtc(snapshot.observedAtUtc)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{snapshot.value}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No selective snapshots are available yet. Refreshes record safe
                    observations like completion and presence here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function OverviewCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-4xl font-semibold text-foreground">{value}</p>
        <p className="text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function AnnotationPlaceholder({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function getLatestRefreshJob(
  refreshStatus: LibraryRefreshStatusResponse | null,
  overview: LibraryOverviewResponse | null,
) {
  return (
    refreshStatus?.activeJobs[0] ??
    refreshStatus?.recentJobs[0] ??
    overview?.latestRefreshJob ??
    null
  );
}

function formatUtc(value: string) {
  return new Date(value).toLocaleString();
}

function formatReturnable(value: boolean | null) {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}
