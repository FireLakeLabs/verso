import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  LayoutGrid,
  RefreshCcw,
  Rows3,
  Search,
  Settings2,
  Tag,
} from "lucide-react";
import { cn } from "../lib/utils";
import type {
  SettingsResponse,
  StartAudibleAuthenticationResponse,
  UpdateSettingsRequest,
  LibraryFilters,
  LibraryItemDetailDto,
  LibraryItemDto,
  LibraryOverviewResponse,
  LibraryRefreshJobDto,
  LibraryRefreshStatusResponse,
} from "../library-api";
import {
  createCoverArtWallReport,
  type CoverArtWallEntry,
  type CoverArtWallOrder,
} from "../reports/cover-art-wall-report";
import { summarizeLibraryReport } from "../reports/library-summary-report";
import {
  createLibraryScreenReport,
  formatRuntimeMinutes,
} from "../reports/library-screen-report";
import {
  buildVisualParitySearch,
  getVisualParityState,
  readVisualParityStateId,
  visualParityStates,
  type ShellPreferences,
  type VisualParityView,
} from "./visual-parity";
import {
  AuthorConcentrationPage,
  CostPerHourPage,
  NarratorAffinityPage,
  ListeningCadencePage,
  ReportsHubPage,
  RuntimeDistributionPage,
  GenreTreemapPage,
  SubjectKeywordPage,
} from "./report-pages";

type AppView =
  | VisualParityView
  | "export"
  | "findings"
  | "report-authors"
  | "report-cadence"
  | "report-cost"
  | "refresh"
  | "report-genre"
  | "report-keywords"
  | "report-narrators"
  | "report-runtime"
  | "reports"
  | "shelves"
  | "wall";
type SettingsSection =
  | "authentication"
  | "refresh"
  | "cost-basis"
  | "local-data"
  | "archive-export"
  | "interface";

type FirelakeShellProps = {
  activeAsin: string | null;
  activeItem: LibraryItemDetailDto | null;
  detailError: string | null;
  filters: LibraryFilters;
  isLoading: boolean;
  isRefreshing: boolean;
  items: readonly LibraryItemDto[];
  loadError: string | null;
  onChangeFilter: <Key extends keyof LibraryFilters>(
    key: Key,
    value: LibraryFilters[Key],
  ) => void;
  onChangePreference: <Key extends keyof ShellPreferences>(
    key: Key,
    value: ShellPreferences[Key],
  ) => void;
  onCompleteAuthentication: (
    sessionId: string,
    responseUrl: string,
  ) => Promise<void>;
  onSetActiveAsin: (asin: string) => void;
  onSignOutAuthentication: () => Promise<void>;
  onStartAuthentication: (
    locale: string,
  ) => Promise<StartAudibleAuthenticationResponse>;
  onStartRefresh: () => void;
  onUpdateSettings: (request: UpdateSettingsRequest) => Promise<unknown>;
  onToggleSelection: (asin: string) => void;
  overview: LibraryOverviewResponse | null;
  preferences: ShellPreferences;
  refreshStatus: LibraryRefreshStatusResponse | null;
  selectedAsins: readonly string[];
  settings: SettingsResponse | null;
};

type InitialShellState = {
  parityStateId: string | null;
  preferences: ShellPreferences;
  settingsSection: SettingsSection;
  view: AppView;
};

type PageMeta = {
  crumbs: readonly string[];
  eyebrow: string;
  title: string;
};

type LeaderboardEntry = {
  count: number;
  name: string;
  runtimeMinutes: number;
};

const pageMetaByView: Record<AppView, PageMeta> = {
  findings: {
    crumbs: ["Curation", "Health"],
    eyebrow: "Curation",
    title: "Library health check",
  },
  export: {
    crumbs: ["Operations", "Export"],
    eyebrow: "Operations",
    title: "Export status",
  },
  library: {
    crumbs: ["Library", "All items"],
    eyebrow: "Library",
    title: "Library inventory",
  },
  overview: {
    crumbs: ["Library", "Overview"],
    eyebrow: "Library",
    title: "Library overview",
  },
  refresh: {
    crumbs: ["Operations", "Refresh"],
    eyebrow: "Operations",
    title: "Refresh status",
  },
  "report-cadence": {
    crumbs: ["Reports", "Listening cadence"],
    eyebrow: "Reports",
    title: "Listening cadence",
  },
  "report-cost": {
    crumbs: ["Reports", "Cost per hour"],
    eyebrow: "Reports",
    title: "Cost per hour",
  },
  "report-authors": {
    crumbs: ["Reports", "Author concentration"],
    eyebrow: "Reports",
    title: "Author concentration",
  },
  "report-runtime": {
    crumbs: ["Reports", "Runtime distribution"],
    eyebrow: "Reports",
    title: "Runtime distribution",
  },
  "report-genre": {
    crumbs: ["Reports", "Genre treemap"],
    eyebrow: "Reports",
    title: "Genre treemap",
  },
  "report-keywords": {
    crumbs: ["Reports", "Subject keywords"],
    eyebrow: "Reports",
    title: "Subject keywords",
  },
  "report-narrators": {
    crumbs: ["Reports", "Narrator affinity"],
    eyebrow: "Reports",
    title: "Narrator affinity",
  },
  reports: {
    crumbs: ["Reports", "Queue"],
    eyebrow: "Reports",
    title: "Reports queue",
  },
  shelves: {
    crumbs: ["Curation", "Smart shelves"],
    eyebrow: "Curation",
    title: "Smart shelves",
  },
  settings: {
    crumbs: ["Operations", "Settings"],
    eyebrow: "Operations",
    title: "Settings",
  },
  wall: {
    crumbs: ["Library", "Cover wall"],
    eyebrow: "Library",
    title: "Cover wall",
  },
};

const libraryCardGenreOptions = [
  "All",
  "Space Opera",
  "Hard SF",
  "Cyberpunk",
  "Post-Cyberpunk",
  "Military SF",
  "Climate Fiction",
  "Generation Ship",
  "First Contact",
  "AI & Singularity",
  "Solarpunk",
] as const;

const libraryCardProgressOptions = [
  "All",
  "Unstarted",
  "In progress",
  "Completed",
  "Near-finished",
] as const;

const libraryCardPageSize = 60;

const topNavigationItems: readonly {
  label: string;
  showChevron?: boolean;
  view: AppView;
}[] = [
  { label: "Overview", view: "overview" },
  { label: "Library", view: "library" },
  { label: "Shelves", view: "shelves" },
  { label: "Covers", view: "wall" },
  { label: "Reports", showChevron: true, view: "reports" },
  { label: "Health", view: "findings" },
  { label: "Export", view: "export" },
  { label: "Settings", view: "settings" },
];

const sidebarSections: readonly {
  items: readonly {
    countKind?: "findings" | "library";
    label: string;
    view: AppView;
  }[];
  label: string;
}[] = [
  {
    label: "Library",
    items: [
      { label: "Overview", view: "overview" },
      { countKind: "library", label: "All items", view: "library" },
      { label: "Cover wall", view: "wall" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Listening cadence", view: "report-cadence" },
      { label: "Genre treemap", view: "report-genre" },
      { label: "Author concentration", view: "report-authors" },
      { label: "Narrator affinity", view: "report-narrators" },
      { label: "Runtime distribution", view: "report-runtime" },
      { label: "Subject keywords", view: "report-keywords" },
      { label: "Cost per hour", view: "report-cost" },
    ],
  },
  {
    label: "Curation",
    items: [
      { label: "Smart shelves", view: "shelves" },
      { countKind: "findings", label: "Health check", view: "findings" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Refresh status", view: "refresh" },
      { label: "Export status", view: "export" },
      { label: "Settings", view: "settings" },
    ],
  },
] as const;

export function FirelakeShell({
  activeAsin,
  activeItem,
  detailError,
  filters,
  isLoading,
  isRefreshing,
  items,
  loadError,
  onChangeFilter,
  onChangePreference,
  onCompleteAuthentication,
  onSetActiveAsin,
  onSignOutAuthentication,
  onStartAuthentication,
  onStartRefresh,
  onUpdateSettings,
  onToggleSelection,
  overview,
  preferences,
  refreshStatus,
  selectedAsins,
  settings,
}: FirelakeShellProps) {
  const initialShellState = useMemo(
    () => getInitialShellState(preferences),
    [preferences],
  );
  const [currentView, setCurrentView] = useState<AppView>(
    initialShellState.view,
  );
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(
    initialShellState.settingsSection,
  );
  const [coverWallOrder, setCoverWallOrder] =
    useState<CoverArtWallOrder>("recent");
  const effectivePreferences =
    initialShellState.parityStateId === null
      ? preferences
      : initialShellState.preferences;

  const screenReport = useMemo(
    () =>
      createLibraryScreenReport({
        activeAsin,
        items,
        selectedAsins,
      }),
    [activeAsin, items, selectedAsins],
  );

  const summaryReport = useMemo(
    () =>
      summarizeLibraryReport({
        items: items.map((item) => ({
          asin: item.asin,
          authors: item.authors,
          narrators: item.narrators,
          percentComplete: item.percentComplete,
          runtimeMinutes: item.runtimeMinutes,
          title: item.title,
        })),
      }),
    [items],
  );

  const latestRefreshJob = useMemo(
    () => getLatestRefreshJob(refreshStatus, overview),
    [overview, refreshStatus],
  );
  const inProgressItems = useMemo(
    () =>
      [...items]
        .filter((item) => item.percentComplete > 0 && item.percentComplete < 95)
        .sort((left, right) => right.percentComplete - left.percentComplete)
        .slice(0, effectivePreferences.overview === "dense" ? 6 : 4),
    [effectivePreferences.overview, items],
  );
  const topAuthors = useMemo(() => rankContributors(items, "authors"), [items]);
  const topNarrators = useMemo(
    () => rankContributors(items, "narrators"),
    [items],
  );
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(new Date()),
    [],
  );

  const pageMeta =
    currentView === "library" && effectivePreferences.libraryView === "cards"
      ? {
          ...pageMetaByView.library,
          title: "Library · all items",
        }
      : pageMetaByView[currentView];

  function navigate(view: AppView) {
    setCurrentView(view);

    if (view === "settings") {
      setSettingsSection("interface");
    }
  }

  function openItem(asin: string) {
    onSetActiveAsin(asin);
    setCurrentView("library");
  }

  function updatePreference<Key extends keyof ShellPreferences>(
    key: Key,
    value: ShellPreferences[Key],
  ) {
    if (initialShellState.parityStateId !== null) {
      return;
    }

    onChangePreference(key, value);
  }

  return (
    <div
      className={`v-shell ${effectivePreferences.nav === "sidebar" ? "is-sidebar" : "is-topnav"}`}
      data-current-view={currentView}
      data-library-view={effectivePreferences.libraryView}
      data-overview-variant={effectivePreferences.overview}
      data-parity-state={initialShellState.parityStateId ?? ""}
      data-shell-nav={effectivePreferences.nav}
    >
      {effectivePreferences.nav === "topnav" ? (
        <TopNavigation
          currentView={currentView}
          itemCount={items.length}
          onNavigate={navigate}
        />
      ) : null}
      <div
        className={`v-app ${effectivePreferences.nav === "topnav" ? "is-topnav" : ""}`}
      >
        {effectivePreferences.nav === "sidebar" ? (
          <SidebarNavigation
            currentView={currentView}
            itemCount={items.length}
            findingsCount={overview?.summary.noLongerPresentItems ?? 0}
            latestRefreshJob={latestRefreshJob}
            onNavigate={navigate}
          />
        ) : null}
        <div className="v-main">
          <TopBar
            currentView={currentView}
            onNavigate={navigate}
            onRefresh={onStartRefresh}
            title={pageMeta.title}
            crumbs={pageMeta.crumbs}
            isRefreshing={isRefreshing}
          />
          <main className="v-content">
            {loadError ? (
              <StatusBanner title="Library status">{loadError}</StatusBanner>
            ) : null}

            {currentView === "overview" ? (
              effectivePreferences.overview === "dense" ? (
                <OverviewDensePage
                  inProgressItems={inProgressItems}
                  items={items}
                  onNavigate={navigate}
                  onOpenItem={openItem}
                  overview={overview}
                  summaryReport={summaryReport}
                  topAuthors={topAuthors}
                  topNarrators={topNarrators}
                />
              ) : (
                <OverviewCalmPage
                  inProgressItems={inProgressItems}
                  items={items}
                  latestRefreshJob={latestRefreshJob}
                  onNavigate={navigate}
                  onOpenItem={openItem}
                  overview={overview}
                  summaryReport={summaryReport}
                  todayLabel={todayLabel}
                  topAuthors={topAuthors}
                  topNarrators={topNarrators}
                />
              )
            ) : null}

            {currentView === "library" ? (
              <LibraryPage
                activeItem={activeItem}
                detailError={detailError}
                filters={filters}
                isLoading={isLoading}
                items={items}
                libraryView={effectivePreferences.libraryView}
                onChangeFilter={onChangeFilter}
                onChangeLibraryView={(value) =>
                  updatePreference("libraryView", value)
                }
                onOpenItem={openItem}
                onToggleSelection={onToggleSelection}
                screenReport={screenReport}
              />
            ) : null}

            {currentView === "reports" ? (
              <ReportsHubPage onNavigate={navigate} />
            ) : null}

            {currentView === "report-cadence" ? (
              <ListeningCadencePage
                items={items}
                latestRefreshJob={latestRefreshJob}
                onNavigate={navigate}
              />
            ) : null}

            {currentView === "report-authors" ? (
              <AuthorConcentrationPage items={items} onNavigate={navigate} />
            ) : null}

            {currentView === "report-runtime" ? (
              <RuntimeDistributionPage items={items} onNavigate={navigate} />
            ) : null}

            {currentView === "report-cost" ? (
              <CostPerHourPage
                costBasis={
                  settings?.costBasis ??
                  createFallbackSettings(effectivePreferences).costBasis
                }
                items={items}
                onNavigate={navigate}
              />
            ) : null}

            {currentView === "report-genre" ? (
              <GenreTreemapPage items={items} />
            ) : null}

            {currentView === "report-keywords" ? (
              <SubjectKeywordPage items={items} />
            ) : null}

            {currentView === "report-narrators" ? (
              <NarratorAffinityPage items={items} onNavigate={navigate} />
            ) : null}

            {currentView === "shelves" ? (
              <PlaceholderPage
                detail="Issue #8 owns the signed-off smart-shelf evaluation workflows. This shell keeps the route visible while the operational surface catches up to the prototype."
                eyebrow="Curation"
                title="Smart shelves"
              />
            ) : null}

            {currentView === "wall" ? (
              <CoverArtWallPage
                items={items}
                onChangeOrder={setCoverWallOrder}
                onOpenItem={openItem}
                order={coverWallOrder}
              />
            ) : null}

            {currentView === "findings" ? (
              <FindingsPage
                findingsCount={overview?.summary.noLongerPresentItems ?? 0}
                onNavigate={navigate}
              />
            ) : null}

            {currentView === "refresh" ? (
              <RefreshPage
                latestRefreshJob={latestRefreshJob}
                onStartRefresh={onStartRefresh}
                refreshStatus={refreshStatus}
                isRefreshing={isRefreshing}
              />
            ) : null}

            {currentView === "export" ? (
              <PlaceholderPage
                detail="Export workflow fidelity is still owned by the dedicated export issue. This shell keeps the prototype route and framing visible without inventing unsupported behavior."
                eyebrow="Operations"
                title="Export status"
              />
            ) : null}

            {currentView === "settings" ? (
              <SettingsPage
                onChangePreference={updatePreference}
                onCompleteAuthentication={onCompleteAuthentication}
                onOpenRefreshStatus={() => navigate("refresh")}
                onSignOutAuthentication={onSignOutAuthentication}
                onStartAuthentication={onStartAuthentication}
                onStartRefresh={onStartRefresh}
                onUpdateSettings={onUpdateSettings}
                preferences={effectivePreferences}
                settingsSection={settingsSection}
                settings={settings}
                setSettingsSection={setSettingsSection}
                isRefreshing={isRefreshing}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function TopNavigation({
  currentView,
  itemCount,
  onNavigate,
}: {
  currentView: AppView;
  itemCount: number;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <header className="v-topnav">
      <div className="v-topnav-inner">
        <Brand />
        <nav className="v-topnav-items" aria-label="Primary">
          {topNavigationItems.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`v-topnav-item ${isTopNavigationItemActive(item.view, currentView) ? "is-active" : ""}`}
              onClick={() => onNavigate(item.view)}
            >
              {item.label}
              {item.showChevron ? (
                <span className="v-topnav-chevron">▾</span>
              ) : null}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="v-command"
          aria-label="Search command palette placeholder"
        >
          <Search aria-hidden="true" className="size-4" />
          <span>{`Search ${itemCount.toLocaleString()} items, authors, narrators...`}</span>
          <span className="v-kbd">Ctrl K</span>
        </button>
        <button
          type="button"
          className="v-icon-btn"
          aria-label="Refresh status shortcut"
        >
          <RefreshCcw aria-hidden="true" className="size-4" />
        </button>
        <span className="v-avatar v-avatar-sm">JD</span>
      </div>
    </header>
  );
}

function SidebarNavigation({
  currentView,
  findingsCount,
  itemCount,
  latestRefreshJob,
  onNavigate,
}: {
  currentView: AppView;
  findingsCount: number;
  itemCount: number;
  latestRefreshJob: LibraryRefreshJobDto | null;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <aside className="v-sidebar">
      <div className="v-sidebar-brand">
        <Brand />
      </div>
      <nav className="v-sidebar-nav" aria-label="Sections">
        {sidebarSections.map((section) => (
          <div key={section.label} className="v-nav-section">
            <div className="v-nav-label">{section.label}</div>
            {section.items.map((item) => {
              const count =
                item.countKind === "library"
                  ? itemCount
                  : item.countKind === "findings"
                    ? findingsCount
                    : null;

              return (
                <button
                  key={item.view}
                  type="button"
                  className={`v-nav-item ${isSidebarNavigationItemActive(currentView, item.view) ? "is-active" : ""}`}
                  onClick={() => onNavigate(item.view)}
                >
                  <span>{item.label}</span>
                  {count !== null ? (
                    <span className="v-nav-meta">{count.toLocaleString()}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="v-sidebar-foot">
        <div className="v-refresh-chip">
          <span className="v-refresh-label">Latest refresh</span>
          <span className="v-refresh-value" data-volatile="timestamp">
            {latestRefreshJob?.completedAtUtc
              ? formatUtc(latestRefreshJob.completedAtUtc)
              : latestRefreshJob?.startedAtUtc
                ? formatUtc(latestRefreshJob.startedAtUtc)
                : "No refresh yet"}
          </span>
        </div>
        <div className="v-user-chip">
          <span className="v-avatar">JD</span>
          <div>
            <div className="v-user-name">Library owner</div>
            <div className="v-user-meta">Local only</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  crumbs,
  currentView,
  isRefreshing,
  onNavigate,
  onRefresh,
  title,
}: {
  crumbs: readonly string[];
  currentView: AppView;
  isRefreshing: boolean;
  onNavigate: (view: AppView) => void;
  onRefresh: () => void;
  title: string;
}) {
  return (
    <header className="v-topbar">
      <div className="v-topbar-left">
        <div className="v-crumbs">
          {crumbs.map((crumb, index) => (
            <span
              key={`${crumb}-${index}`}
              className={index === crumbs.length - 1 ? "v-crumb-current" : ""}
            >
              {crumb}
            </span>
          ))}
        </div>
        <h1 className="v-page-title">{title}</h1>
      </div>
      <div className="v-topbar-actions">
        <button type="button" className="v-command v-command-secondary">
          <Search aria-hidden="true" className="size-4" />
          <span>Search items, authors, narrators...</span>
          <span className="v-kbd">Ctrl K</span>
        </button>
        {currentView === "overview" ? (
          <>
            <button
              type="button"
              className="v-btn v-btn-outline"
              onClick={onRefresh}
            >
              <RefreshCcw
                aria-hidden="true"
                className={`size-4 ${isRefreshing ? "is-spinning" : ""}`}
              />
              {isRefreshing ? "Refreshing" : "Refresh library"}
            </button>
            <button type="button" className="v-btn v-btn-outline">
              Export
            </button>
          </>
        ) : null}
        {currentView === "library" ? (
          <>
            <button type="button" className="v-btn v-btn-outline">
              <Tag aria-hidden="true" className="size-4" />
              Manage tags
            </button>
            <button type="button" className="v-btn v-btn-outline">
              Export filtered
            </button>
          </>
        ) : null}
        {currentView === "wall" ? (
          <button type="button" className="v-btn v-btn-outline">
            Export wallpaper
          </button>
        ) : null}
        {isReportView(currentView) ? (
          <button type="button" className="v-btn v-btn-outline">
            Export view
          </button>
        ) : null}
        {currentView === "findings" ? (
          <button
            type="button"
            className="v-btn v-btn-outline"
            onClick={() => onNavigate("settings")}
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Interface defaults
          </button>
        ) : null}
      </div>
    </header>
  );
}

function OverviewCalmPage({
  inProgressItems,
  items,
  latestRefreshJob,
  onNavigate,
  onOpenItem,
  overview,
  summaryReport,
  todayLabel,
  topAuthors,
  topNarrators,
}: {
  inProgressItems: readonly LibraryItemDto[];
  items: readonly LibraryItemDto[];
  latestRefreshJob: LibraryRefreshJobDto | null;
  onNavigate: (view: AppView) => void;
  onOpenItem: (asin: string) => void;
  overview: LibraryOverviewResponse | null;
  summaryReport: ReturnType<typeof summarizeLibraryReport>;
  todayLabel: string;
  topAuthors: readonly LeaderboardEntry[];
  topNarrators: readonly LeaderboardEntry[];
}) {
  const totalHours = Math.round(summaryReport.totalRuntimeMinutes / 60);
  const totalItems = overview?.summary.totalItems ?? 0;
  const completedItems = overview?.summary.completedItems ?? 0;
  const noLongerPresentItems = overview?.summary.noLongerPresentItems ?? 0;
  const openFindingsCount =
    overview?.summary.openFindingsCount ??
    overview?.summary.noLongerPresentItems ??
    0;
  const completedPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const medianRuntimeHours = formatMedianRuntimeHours(items);
  const calmOverviewMetricDetails =
    overview?.prototypeDisplay?.calmOverviewMetricDetails;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 56,
        padding: "32px 8px",
      }}
    >
      <section>
        <div className="v-calm-date" data-volatile="date">
          Library · {todayLabel}
        </div>
        <div
          style={{
            alignItems: "baseline",
            display: "grid",
            gap: 48,
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
        >
          <OverviewSummaryMetric
            accent
            detail={
              calmOverviewMetricDetails?.itemsDetail ??
              `incl. ${noLongerPresentItems} no-longer-present`
            }
            label="Items"
            value={totalItems.toLocaleString()}
          />
          <OverviewSummaryMetric
            detail={
              calmOverviewMetricDetails?.hoursDetail ??
              `median ${medianRuntimeHours} h / book`
            }
            label="Hours"
            value={totalHours.toLocaleString()}
          />
          <OverviewSummaryMetric
            detail={
              calmOverviewMetricDetails?.completedDetail ??
              `${completedPercent} % of library`
            }
            label="Completed"
            value={completedItems.toLocaleString()}
          />
          <OverviewSummaryMetric
            detail={
              calmOverviewMetricDetails?.openFindingsDetail ?? "advisory only"
            }
            label="Open findings"
            value={openFindingsCount.toLocaleString()}
          />
        </div>
      </section>

      <div className="v-divider" />

      <section>
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div className="v-eyebrow">Pick back up</div>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                margin: "8px 0 0",
              }}
            >
              Four books mid-listen.
            </h2>
          </div>
          <button
            type="button"
            className="v-inline-link"
            onClick={() => onNavigate("library")}
          >
            All in-progress
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="v-book-grid">
          {inProgressItems.length > 0 ? (
            inProgressItems.map((item) => (
              <button
                key={item.asin}
                type="button"
                className="v-book-card"
                onClick={() => onOpenItem(item.asin)}
                style={{
                  background: "transparent",
                  border: 0,
                  gap: 12,
                  padding: 0,
                }}
              >
                <PrototypeCoverPreview item={item} />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span className="v-book-title">{item.title}</span>
                  <span className="v-book-subtitle">
                    {item.authors.join(", ") || "Unknown author"}
                  </span>
                </div>
                <div
                  style={{
                    background: "var(--line-1)",
                    height: 1,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      background: "var(--accent)",
                      display: "block",
                      height: "100%",
                      width: `${Math.max(0, Math.min(item.percentComplete, 100))}%`,
                    }}
                  />
                </div>
                <div className="v-meta-row">
                  <span>{item.percentComplete} % complete</span>
                  <span>
                    {formatRuntimeMinutes(
                      Math.max(
                        0,
                        Math.round(
                          (item.runtimeMinutes * (100 - item.percentComplete)) /
                            100,
                        ),
                      ),
                    )}{" "}
                    left
                  </span>
                </div>
              </button>
            ))
          ) : (
            <EmptyCard message="No in-progress titles yet. Start a refresh to populate the operational queue." />
          )}
        </div>
      </section>

      <div className="v-divider" />

      <section
        style={{
          display: "grid",
          gap: 48,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <article className="v-column-note">
          <div className="v-eyebrow">Where to look</div>
          <h3 className="v-column-title">Reports</h3>
          <div className="v-link-list">
            {[
              {
                label: "Listening cadence",
                view: "report-cadence" as const,
                tag: "Open",
              },
              {
                label: "Runtime distribution",
                view: "report-runtime" as const,
                tag: "Open",
              },
              {
                label: "Genre treemap",
                tag: "Map",
                view: "report-genre" as const,
              },
              {
                label: "Author concentration",
                tag: "Pareto",
                view: "report-authors" as const,
              },
              {
                label: "Narrator affinity",
                tag: "Voice",
                view: "report-narrators" as const,
              },
              {
                label: "Subject keywords",
                tag: "Cloud",
                view: "report-keywords" as const,
              },
              {
                label: "Cover wall",
                tag: "Browse",
                view: "wall" as const,
              },
              {
                label: "Cost per hour",
                tag: "Queued",
                view: "reports" as const,
              },
            ].map((entry) => (
              <button
                key={entry.label}
                type="button"
                className="v-link-row"
                onClick={() => onNavigate(entry.view)}
              >
                <span>{entry.label}</span>
                <span className="v-link-tag">{entry.tag}</span>
              </button>
            ))}
          </div>
        </article>
        <article className="v-column-note">
          <div className="v-eyebrow">Needs attention</div>
          <h3 className="v-column-title">Contributor signals</h3>
          <dl className="v-compact-list">
            <CompactFact
              label={topAuthors[0]?.name ?? "No author data"}
              value={`${topAuthors[0]?.count ?? 0} items`}
            />
            <CompactFact
              label={topNarrators[0]?.name ?? "No narrator data"}
              value={`${topNarrators[0]?.count ?? 0} items`}
            />
            <CompactFact
              label="Completion anomalies"
              value={`${summaryReport.anomalousCompletionItems} flagged`}
            />
          </dl>
          <button
            type="button"
            className="v-btn v-btn-outline v-btn-sm"
            onClick={() => onNavigate("findings")}
          >
            Open health check
          </button>
        </article>
        <article className="v-column-note">
          <div className="v-eyebrow">System</div>
          <h3 className="v-column-title">Current shell defaults</h3>
          <dl className="v-compact-list">
            <CompactFact
              label="Latest refresh"
              value={
                latestRefreshJob?.completedAtUtc
                  ? formatUtc(latestRefreshJob.completedAtUtc)
                  : "Not started"
              }
              volatile
            />
            <CompactFact label="Default chrome" value="Top navigation" />
            <CompactFact label="Overview mode" value="Calm" />
          </dl>
          <button
            type="button"
            className="v-btn v-btn-outline v-btn-sm"
            onClick={() => onNavigate("settings")}
          >
            Interface defaults
          </button>
        </article>
      </section>
    </div>
  );
}

function OverviewDensePage({
  inProgressItems,
  items,
  onNavigate,
  onOpenItem,
  overview,
  summaryReport,
  topAuthors,
  topNarrators,
}: {
  inProgressItems: readonly LibraryItemDto[];
  items: readonly LibraryItemDto[];
  onNavigate: (view: AppView) => void;
  onOpenItem: (asin: string) => void;
  overview: LibraryOverviewResponse | null;
  summaryReport: ReturnType<typeof summarizeLibraryReport>;
  topAuthors: readonly LeaderboardEntry[];
  topNarrators: readonly LeaderboardEntry[];
}) {
  const totalHours = Math.round(summaryReport.totalRuntimeMinutes / 60);
  const totalItems = overview?.summary.totalItems ?? 0;
  const completedItems = overview?.summary.completedItems ?? 0;
  const completedPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const denseSeriesCount = countDistinctSeries(items);
  const weeklyPurchases = buildWeeklyPurchaseBuckets(items);
  const weeklyPurchasePeak = Math.max(...weeklyPurchases, 1);
  const recentPurchases = [...items]
    .sort((left, right) => {
      const leftDate = readPurchaseDate(left)?.getTime() ?? 0;
      const rightDate = readPurchaseDate(right)?.getTime() ?? 0;

      return rightDate - leftDate;
    })
    .slice(0, 6);
  const calmOverviewMetricDetails =
    overview?.prototypeDisplay?.calmOverviewMetricDetails;

  return (
    <div className="v-stack-md">
      <section className="v-hero-inverse">
        <div>
          <div className="v-eyebrow">Library · current state</div>
          <h2 className="v-hero-headline" style={{ marginTop: 12 }}>
            {totalItems.toLocaleString()} items · {totalHours.toLocaleString()}{" "}
            h · {completedPercent} % completed.
          </h2>
          <div
            aria-hidden="true"
            style={{
              background: "#ff00ff",
              height: 20,
              marginTop: 5,
              width: 560,
            }}
          />
        </div>
        <div className="v-hero-stats">
          <HeroStat
            label="Authors"
            value={String(summaryReport.distinctAuthors)}
          />
          <HeroStat
            label="Narrators"
            value={String(summaryReport.distinctNarrators)}
          />
          <HeroStat label="Series" value={String(denseSeriesCount)} />
        </div>
      </section>

      <div className="v-kpi-grid v-kpi-grid-5 is-dense" style={{ gap: 12 }}>
        <KpiCard
          accent
          label="Items · total"
          value={totalItems.toLocaleString()}
          detail={
            calmOverviewMetricDetails?.itemsDetail ??
            `incl. ${overview?.summary.noLongerPresentItems ?? 0} no-longer-present`
          }
        />
        <KpiCard
          label="Hours · total"
          value={totalHours.toLocaleString()}
          detail={
            calmOverviewMetricDetails?.hoursDetail ??
            `median ${formatMedianRuntimeHours(items)} h / book`
          }
        />
        <KpiCard
          label="Completed"
          delta="3 this month"
          value={completedItems.toLocaleString()}
          detail={`${completedPercent} % of library`}
        />
        <KpiCard
          label="In progress"
          value={String(overview?.summary.inProgressItems ?? 0)}
          detail="across 4 sessions today"
        />
        <KpiCard
          label="Findings · open"
          value={String(overview?.summary.openFindingsCount ?? 0)}
          detail="advisory · review when ready"
        />
      </div>

      <div
        style={{ display: "grid", gap: 24, gridTemplateColumns: "1.4fr 1fr" }}
      >
        <article className="v-card">
          <div className="v-card-head">
            <div>
              <div className="v-eyebrow">In progress · sorted by recency</div>
              <h3 className="v-card-title">Pick back up</h3>
            </div>
            <button
              type="button"
              className="v-inline-link"
              onClick={() => onNavigate("library")}
            >
              All in-progress
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table v-table-compact">
              <thead>
                <tr>
                  <th style={{ width: 48 }}></th>
                  <th>Title</th>
                  <th>Narrator</th>
                  <th className="r">Progress</th>
                  <th className="r">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {inProgressItems.length > 0 ? (
                  inProgressItems.map((item) => (
                    <tr key={item.asin}>
                      <td>
                        <div
                          style={{ height: 36, overflow: "hidden", width: 28 }}
                        >
                          <CompactCoverThumb item={item} />
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="v-row-link"
                          onClick={() => onOpenItem(item.asin)}
                        >
                          {item.title}
                        </button>
                        <div className="v-row-meta">
                          {item.authors.join(", ") || "Unknown"}
                        </div>
                      </td>
                      <td>{item.narrators[0] ?? "Unknown"}</td>
                      <td className="r v-mono">{item.percentComplete}%</td>
                      <td className="r v-mono">
                        {formatRuntimeHoursShort(
                          (item.runtimeMinutes * (100 - item.percentComplete)) /
                            100,
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <EmptyInline message="No active listening sessions yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Cadence · 52 weeks</div>
                <h3 className="v-card-title">Purchase rhythm</h3>
              </div>
              <span className="v-card-meta">
                {weeklyPurchases.reduce((sum, value) => sum + value, 0)} adds
              </span>
            </div>
            <div className="v-card-body" style={{ padding: "18px 18px 16px" }}>
              <svg
                viewBox="0 0 520 80"
                width="100%"
                height="80"
                preserveAspectRatio="none"
              >
                {weeklyPurchases.map((value, index) => {
                  const height = (value / weeklyPurchasePeak) * 64;

                  return (
                    <rect
                      key={`${index}-${value}`}
                      x={index * 10}
                      y={72 - height}
                      width={8}
                      height={height}
                      fill="var(--chart-2)"
                      opacity={value === 0 ? 0.18 : 0.4 + (index / 52) * 0.6}
                    />
                  );
                })}
                <line
                  x1="0"
                  x2="520"
                  y1="72"
                  y2="72"
                  stroke="var(--line-2)"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="v-meta-row"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                <span className="v-user-meta">52 W AGO</span>
                <span className="v-user-meta">NOW</span>
              </div>
            </div>
          </article>

          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Recently added</div>
                <h3 className="v-card-title">Latest purchases</h3>
              </div>
            </div>
            <div className="v-list-panel">
              {recentPurchases.length > 0 ? (
                recentPurchases.map((item) => (
                  <button
                    key={item.asin}
                    type="button"
                    className="v-list-row"
                    onClick={() => onOpenItem(item.asin)}
                  >
                    <span style={{ height: 36, overflow: "hidden", width: 28 }}>
                      <CompactCoverThumb item={item} />
                    </span>
                    <span className="v-list-copy">
                      <span className="v-list-title">{item.title}</span>
                      <span className="v-list-subtitle">
                        {item.authors[0] ?? "Unknown"} ·{" "}
                        {formatRuntimeHoursShort(item.runtimeMinutes)}
                      </span>
                    </span>
                    <span className="v-list-trail">
                      {formatMonthDay(readPurchaseDate(item))}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyInline message="Refresh the library to populate this purchase list." />
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="v-two-column-grid">
        <LeaderboardCard title="Author concentration" entries={topAuthors} />
        <LeaderboardCard title="Narrator affinity" entries={topNarrators} />
      </div>
    </div>
  );
}

function LibraryPage({
  activeItem,
  detailError,
  filters,
  isLoading,
  items,
  libraryView,
  onChangeFilter,
  onChangeLibraryView,
  onOpenItem,
  onToggleSelection,
  screenReport,
}: {
  activeItem: LibraryItemDetailDto | null;
  detailError: string | null;
  filters: LibraryFilters;
  isLoading: boolean;
  items: readonly LibraryItemDto[];
  libraryView: ShellPreferences["libraryView"];
  onChangeFilter: <Key extends keyof LibraryFilters>(
    key: Key,
    value: LibraryFilters[Key],
  ) => void;
  onChangeLibraryView: (value: ShellPreferences["libraryView"]) => void;
  onOpenItem: (asin: string) => void;
  onToggleSelection: (asin: string) => void;
  screenReport: ReturnType<typeof createLibraryScreenReport>;
}) {
  if (libraryView === "cards") {
    return (
      <LibraryCardsPrototypeView
        filters={filters}
        isLoading={isLoading}
        items={items}
        onChangeFilter={onChangeFilter}
        onChangeLibraryView={onChangeLibraryView}
        onOpenItem={onOpenItem}
      />
    );
  }

  return (
    <div className="v-stack-md">
      <section className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">Inventory controls</div>
            <h2 className="v-card-title">Search and filter the library</h2>
          </div>
          <div
            className="v-segmented"
            role="tablist"
            aria-label="Library density"
          >
            <button
              type="button"
              className={`v-segmented-btn ${libraryView === "rows" ? "is-active" : ""}`}
              onClick={() => onChangeLibraryView("rows")}
            >
              <Rows3 aria-hidden="true" className="size-4" />
              Compact rows
            </button>
            <button
              type="button"
              className="v-segmented-btn"
              onClick={() => onChangeLibraryView("cards")}
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
              Card grid
            </button>
          </div>
        </div>
        <div className="v-card-body">
          <div className="v-toolbar-grid">
            <label className="v-field-wrap">
              <span className="v-field-label">Search</span>
              <span className="v-search-field">
                <Search aria-hidden="true" className="size-4" />
                <input
                  value={filters.search}
                  onChange={(event) =>
                    onChangeFilter("search", event.target.value)
                  }
                  placeholder="Title, contributor, or ASIN"
                  className="v-field"
                />
              </span>
            </label>
            <label className="v-field-wrap">
              <span className="v-field-label">Presence</span>
              <select
                value={filters.presence}
                onChange={(event) =>
                  onChangeFilter("presence", event.target.value)
                }
                className="v-select"
              >
                <option value="all">All presence states</option>
                <option value="present">Present now</option>
                <option value="no-longer-present">No longer present</option>
              </select>
            </label>
            <label className="v-field-wrap">
              <span className="v-field-label">Completion</span>
              <select
                value={filters.completion}
                onChange={(event) =>
                  onChangeFilter("completion", event.target.value)
                }
                className="v-select"
              >
                <option value="all">All completion states</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In progress</option>
                <option value="not-started">Not started</option>
                <option value="anomalous">Needs review</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="v-library-layout">
        <section className="v-card">
          <div className="v-card-head">
            <div>
              <div className="v-eyebrow">Current Audible Facts</div>
              <h2 className="v-card-title">
                {screenReport.rows.length} visible items
              </h2>
            </div>
            <div className="v-card-toolbar">
              <span className="v-selection-meta">
                {screenReport.selectedCount} selected
              </span>
              <button
                type="button"
                className="v-btn v-btn-outline"
                disabled={screenReport.selectedCount === 0}
              >
                <Tag aria-hidden="true" className="size-4" />
                Tag selected
              </button>
            </div>
          </div>
          <div className="v-card-body is-tight">
            {isLoading ? (
              <EmptyInline message="Loading library items..." />
            ) : libraryView === "rows" ? (
              <div className="v-table-wrap">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Title</th>
                      <th>Authors</th>
                      <th>Narrators</th>
                      <th className="r">Runtime</th>
                      <th className="r">Completion</th>
                      <th>Presence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenReport.rows.map((row) => (
                      <tr
                        key={row.asin}
                        className={
                          row.asin === screenReport.activeAsin
                            ? "is-selected"
                            : ""
                        }
                      >
                        <td>
                          <label className="v-check-wrap">
                            <input
                              type="checkbox"
                              checked={row.isSelected}
                              onChange={() => onToggleSelection(row.asin)}
                            />
                          </label>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="v-row-link"
                            onClick={() => onOpenItem(row.asin)}
                          >
                            {row.title}
                          </button>
                          <div className="v-row-meta">{row.asin}</div>
                        </td>
                        <td>{row.authorsLabel}</td>
                        <td>{row.narratorsLabel}</td>
                        <td className="r v-mono">{row.runtimeLabel}</td>
                        <td className="r v-mono">{row.completionLabel}</td>
                        <td>
                          <span
                            className={`v-pill ${row.isNoLongerPresent ? "is-accent" : "is-dark"}`}
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
              <div className="v-card-grid">
                {screenReport.rows.map((row) => (
                  <button
                    key={row.asin}
                    type="button"
                    className={`v-item-card ${row.asin === screenReport.activeAsin ? "is-active" : ""}`}
                    onClick={() => onOpenItem(row.asin)}
                  >
                    <div className="v-item-card-head">
                      <div className="v-cover-mark">
                        {getItemInitials(row.title)}
                      </div>
                      <label
                        className="v-check-wrap"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={() => onToggleSelection(row.asin)}
                        />
                      </label>
                    </div>
                    <div className="v-book-meta">
                      <span className="v-book-title">{row.title}</span>
                      <span className="v-book-subtitle">
                        {row.authorsLabel}
                      </span>
                    </div>
                    <div className="v-meta-row">
                      <span>{row.runtimeLabel}</span>
                      <span>{row.completionLabel}</span>
                    </div>
                    <div className="v-pill-row">
                      <span
                        className={`v-pill ${row.isNoLongerPresent ? "is-accent" : "is-dark"}`}
                      >
                        {row.presenceLabel}
                      </span>
                      {row.hasSnapshots ? (
                        <span className="v-pill is-info">Snapshots</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="v-stack-sm">
          <section className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Selected item</div>
                <h2 className="v-card-title">Current Audible facts</h2>
              </div>
            </div>
            <div className="v-card-body">
              {detailError ? (
                <EmptyInline message={detailError} />
              ) : activeItem ? (
                <div className="v-stack-sm">
                  <div className="v-stack-xs">
                    <div className="v-detail-title-row">
                      <h3 className="v-detail-title">
                        {activeItem.currentAudibleFacts.title}
                      </h3>
                      <span
                        className={`v-pill ${activeItem.isNoLongerPresent ? "is-accent" : "is-dark"}`}
                      >
                        {activeItem.isNoLongerPresent
                          ? "No longer present"
                          : "Present"}
                      </span>
                    </div>
                    <div className="v-row-meta">{activeItem.asin}</div>
                  </div>
                  <dl className="v-definition-grid">
                    <DetailFact
                      label="Authors"
                      value={
                        activeItem.currentAudibleFacts.authors.join(", ") ||
                        "Unknown"
                      }
                    />
                    <DetailFact
                      label="Narrators"
                      value={
                        activeItem.currentAudibleFacts.narrators.join(", ") ||
                        "Unknown"
                      }
                    />
                    <DetailFact
                      label="Runtime"
                      value={formatRuntimeMinutes(
                        activeItem.currentAudibleFacts.runtimeMinutes,
                      )}
                    />
                    <DetailFact
                      label="Completion"
                      value={`${activeItem.currentAudibleFacts.percentComplete}%`}
                    />
                    <DetailFact
                      label="Companion PDF"
                      value={
                        activeItem.currentAudibleFacts.hasCompanionPdf
                          ? "Available"
                          : "None"
                      }
                    />
                    <DetailFact
                      label="Returnable"
                      value={formatReturnable(
                        activeItem.currentAudibleFacts.isReturnable,
                      )}
                    />
                  </dl>
                  <div className="v-stack-xs">
                    <div className="v-eyebrow">Publisher summary</div>
                    <p className="v-body-copy">
                      {activeItem.currentAudibleFacts.publisherSummary ??
                        "No publisher summary arrived from Audible for this item yet."}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyInline message="Choose an item from the library to inspect its Current Audible Facts." />
              )}
            </div>
          </section>

          <section className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Verso annotations</div>
                <h2 className="v-card-title">Reserved for issue #6</h2>
              </div>
            </div>
            <div className="v-card-body">
              <dl className="v-definition-grid">
                <DetailFact
                  label="Tags"
                  value={
                    activeItem?.versoAnnotations.tags.length
                      ? activeItem.versoAnnotations.tags.join(", ")
                      : "No Verso tags yet."
                  }
                />
                <DetailFact
                  label="Dropped"
                  value={
                    activeItem?.versoAnnotations.isDropped
                      ? "Marked as dropped."
                      : "No drop decision recorded."
                  }
                />
                <DetailFact
                  label="Note"
                  value={
                    activeItem?.versoAnnotations.note ?? "No note captured yet."
                  }
                />
              </dl>
            </div>
          </section>

          <section className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Selective snapshots</div>
                <h2 className="v-card-title">History</h2>
              </div>
            </div>
            <div className="v-card-body">
              {activeItem?.snapshotHistory.length ? (
                <ul className="v-list-panel">
                  {activeItem.snapshotHistory.map((snapshot) => (
                    <li
                      key={`${snapshot.field}-${snapshot.observedAtUtc}-${snapshot.value}`}
                      className="v-list-row is-static"
                    >
                      <span className="v-list-copy">
                        <span className="v-list-title">{snapshot.field}</span>
                        <span className="v-list-subtitle">
                          {snapshot.value}
                        </span>
                      </span>
                      <span className="v-list-trail" data-volatile="timestamp">
                        {formatUtc(snapshot.observedAtUtc)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyInline message="No selective snapshots are available yet." />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LibraryCardsPrototypeView({
  filters,
  isLoading,
  items,
  onChangeFilter,
  onChangeLibraryView,
  onOpenItem,
}: {
  filters: LibraryFilters;
  isLoading: boolean;
  items: readonly LibraryItemDto[];
  onChangeFilter: <Key extends keyof LibraryFilters>(
    key: Key,
    value: LibraryFilters[Key],
  ) => void;
  onChangeLibraryView: (value: ShellPreferences["libraryView"]) => void;
  onOpenItem: (asin: string) => void;
}) {
  const droppedItemCount = useMemo(
    () =>
      items.filter(
        (item) => readRawPrototypeMetadata(item)?.is_dropped === true,
      ).length,
    [items],
  );
  const filteredItems = useMemo(() => {
    const searchQuery = filters.search.trim().toLowerCase();

    return [...items]
      .filter((item) => readRawPrototypeMetadata(item)?.is_dropped !== true)
      .filter((item) => {
        if (filters.presence === "present") {
          return !item.isNoLongerPresent;
        }

        if (filters.presence === "no-longer-present") {
          return item.isNoLongerPresent;
        }

        return true;
      })
      .filter((item) => {
        if (filters.completion === "completed") {
          return item.percentComplete >= 99;
        }

        if (filters.completion === "in-progress") {
          return item.percentComplete > 0 && item.percentComplete < 95;
        }

        if (filters.completion === "not-started") {
          return item.percentComplete <= 0;
        }

        if (filters.completion === "anomalous") {
          return item.percentComplete >= 95 && item.percentComplete < 99;
        }

        return true;
      })
      .filter((item) => {
        if (searchQuery.length === 0) {
          return true;
        }

        return [
          item.title,
          item.authors[0] ?? "",
          item.narrators[0] ?? "",
        ].some((value) => value.toLowerCase().includes(searchQuery));
      })
      .sort((left, right) => {
        const leftPurchaseDate =
          readRawPrototypeMetadata(left)?.purchase_date ?? "";
        const rightPurchaseDate =
          readRawPrototypeMetadata(right)?.purchase_date ?? "";

        return rightPurchaseDate.localeCompare(leftPurchaseDate);
      });
  }, [filters.completion, filters.presence, filters.search, items]);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredItems.length / libraryCardPageSize),
  );
  const pageItems = filteredItems.slice(0, libraryCardPageSize);
  const activeProgressLabel = mapCompletionFilterToCardLabel(
    filters.completion,
  );

  return (
    <section className="v-card">
      <div className="v-lib-controls v-lib-controls-card">
        <div className="v-lib-controls-left">
          <span className="v-search-field v-library-card-search">
            <Search aria-hidden="true" className="size-4" />
            <input
              value={filters.search}
              onChange={(event) => onChangeFilter("search", event.target.value)}
              placeholder="Title, author, narrator..."
              className="v-field"
            />
          </span>
          <div className="v-filters">
            {libraryCardGenreOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`v-tag ${option === "All" ? "is-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="v-lib-controls-right">
          <div className="v-filters">
            {libraryCardProgressOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`v-tag ${option === activeProgressLabel ? "is-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="v-library-card-toolbar">
        <div>
          {filteredItems.length.toLocaleString()} ITEMS · PAGE 1 / {pageCount}
          {droppedItemCount > 0 ? " · DROPPED HIDDEN" : ""}
        </div>
        <div className="v-library-card-toolbar-right">
          <label className="v-library-card-checkbox">
            <span className="v-check" />
            <span>Show dropped</span>
          </label>
          <div className="v-view-toggle">
            <button
              type="button"
              className="v-view-toggle-btn"
              title="Compact rows"
              onClick={() => onChangeLibraryView("rows")}
            >
              <Rows3 aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              className="v-view-toggle-btn is-active"
              title="Card grid"
              onClick={() => onChangeLibraryView("cards")}
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="v-library-card-grid-empty">
          <EmptyInline message="Loading library items..." />
        </div>
      ) : (
        <div className="v-prototype-card-grid">
          {pageItems.map((item) => (
            <button
              key={item.asin}
              type="button"
              className="v-prototype-card-item"
              onClick={() => onOpenItem(item.asin)}
            >
              <div className="v-prototype-card-cover">
                <LibraryCardCoverPreview item={item} />
              </div>
              <div className="v-prototype-card-text">
                <div className="v-prototype-card-title">{item.title}</div>
                <div className="v-prototype-card-author">
                  {item.authors[0] ?? "Unknown"}
                </div>
              </div>
              <div
                className={`v-progress is-thin ${item.percentComplete >= 99 ? "is-complete" : ""}`}
              >
                <div
                  className="v-progress-bar"
                  style={{
                    width: `${Math.max(0, Math.min(item.percentComplete, 100))}%`,
                  }}
                />
              </div>
              <div className="v-prototype-card-foot">
                <span>{formatRoundedRuntimeHours(item.runtimeMinutes)}</span>
                <span className="v-prototype-card-foot-pc">
                  {item.percentComplete <= 0
                    ? "—"
                    : `${item.percentComplete} %`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CoverArtWallPage({
  items,
  onChangeOrder,
  onOpenItem,
  order,
}: {
  items: readonly LibraryItemDto[];
  onChangeOrder: (order: CoverArtWallOrder) => void;
  onOpenItem: (asin: string) => void;
  order: CoverArtWallOrder;
}) {
  const report = useMemo(
    () => createCoverArtWallReport({ items, order }),
    [items, order],
  );
  const orderOptions: readonly { label: string; value: CoverArtWallOrder }[] = [
    { label: "Recent", value: "recent" },
    { label: "Runtime", value: "runtime" },
    { label: "Palette", value: "palette" },
    { label: "Random", value: "random" },
  ];

  return (
    <section className="v-card">
      <div className="v-card-head v-cover-wall-head">
        <div>
          <div className="v-eyebrow">
            {report.totalCount.toLocaleString()} covers
          </div>
          <h2 className="v-card-title">Cover wall</h2>
        </div>
        <div
          className="v-segmented"
          role="tablist"
          aria-label="Cover wall ordering"
        >
          {orderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "v-segmented-btn",
                order === option.value && "is-active",
              )}
              onClick={() => onChangeOrder(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="v-card-body is-tight">
        {report.entries.length > 0 ? (
          <div className="v-cover-wall-grid">
            {report.entries.map((entry) => (
              <button
                key={entry.asin}
                type="button"
                className="v-cover-wall-tile"
                onClick={() => onOpenItem(entry.asin)}
                aria-label={`Open ${entry.title}`}
                title={`${entry.title} - ${entry.authors[0] ?? "Unknown author"}`}
              >
                <CoverWallTile entry={entry} />
              </button>
            ))}
          </div>
        ) : (
          <div className="v-cover-wall-empty">
            <EmptyInline message="Refresh the Audible Library to populate cached cover art." />
          </div>
        )}
      </div>
    </section>
  );
}

function CoverWallTile({ entry }: { entry: CoverArtWallEntry }) {
  if (entry.cover.kind === "cached") {
    return (
      <span className="v-cover-wall-media">
        <img
          src={entry.cover.url}
          alt={entry.cover.alt}
          className="v-cover-wall-image"
          loading="lazy"
        />
      </span>
    );
  }

  const seed = hashString(`${entry.asin}${entry.title}`);
  const palette = getPrototypeCoverPalette(seed);
  const style = {
    "--library-cover-accent": palette.accent,
    background: palette.background,
    color: palette.foreground,
  } as CSSProperties;

  return (
    <span className="v-cover-wall-media v-cover-wall-placeholder" style={style}>
      <LibraryCardCoverMark foreground={palette.foreground} seed={seed} />
      <span className="v-library-cover-author">
        {(entry.authors[0] ?? "Unknown").toUpperCase()}
      </span>
      <span className="v-library-cover-title">{entry.title}</span>
      <span className="v-cover-wall-missing">Cover not cached</span>
    </span>
  );
}

function FindingsPage({
  findingsCount,
  onNavigate,
}: {
  findingsCount: number;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <section className="v-card v-card-accent">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">Health findings</div>
          <h2 className="v-card-title">Workflow placeholder</h2>
        </div>
        <span className="v-pill is-info">
          {findingsCount.toLocaleString()} retained items
        </span>
      </div>
      <div className="v-card-body v-stack-sm">
        <p className="v-body-copy">
          Issue #7 owns finding identity and disposition behavior. This shell
          baseline keeps the destination visible so signed-off navigation does
          not drift while the workflow catches up.
        </p>
        <button
          type="button"
          className="v-btn v-btn-outline"
          onClick={() => onNavigate("reports")}
        >
          Open report queue
        </button>
      </div>
    </section>
  );
}

function RefreshPage({
  isRefreshing,
  latestRefreshJob,
  onStartRefresh,
  refreshStatus,
}: {
  isRefreshing: boolean;
  latestRefreshJob: LibraryRefreshJobDto | null;
  onStartRefresh: () => void;
  refreshStatus: LibraryRefreshStatusResponse | null;
}) {
  return (
    <div className="v-stack-md">
      <section className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">Refresh jobs</div>
            <h2 className="v-card-title">Latest refresh job</h2>
          </div>
          <button
            type="button"
            className="v-btn v-btn-outline"
            onClick={onStartRefresh}
          >
            <RefreshCcw
              aria-hidden="true"
              className={`size-4 ${isRefreshing ? "is-spinning" : ""}`}
            />
            {isRefreshing ? "Refreshing" : "Start refresh"}
          </button>
        </div>
        <div className="v-card-body">
          {latestRefreshJob ? (
            <div className="v-stack-md">
              <div className="v-detail-title-row">
                <div className="v-stack-xs">
                  <div className="v-detail-title">
                    {latestRefreshJob.status}
                  </div>
                  <p className="v-body-copy">{latestRefreshJob.phaseSummary}</p>
                </div>
                <span className="v-pill is-info">
                  {latestRefreshJob.status}
                </span>
              </div>
              <dl className="v-definition-grid">
                <DetailFact
                  label="Phase summary"
                  value={latestRefreshJob.phaseSummary}
                />
                <DetailFact
                  label="Observed"
                  value={String(latestRefreshJob.observedItemCount)}
                />
                <DetailFact
                  label="Imported"
                  value={String(latestRefreshJob.importedItemCount)}
                />
                <DetailFact
                  label="Retained"
                  value={String(
                    latestRefreshJob.retainedNoLongerPresentItemCount,
                  )}
                />
                <DetailFact
                  label="Snapshots"
                  value={String(latestRefreshJob.snapshotObservationCount)}
                />
              </dl>
              <div className="v-stack-sm">
                <div className="v-eyebrow">Refresh phases</div>
                <ul className="v-list-panel">
                  {latestRefreshJob.phases.map((phase) => (
                    <li
                      key={`${phase.name}-${phase.startedAtUtc}`}
                      className="v-list-row is-static"
                    >
                      <span className="v-list-copy">
                        <span className="v-list-title">{phase.name}</span>
                        <span className="v-list-subtitle">{phase.summary}</span>
                      </span>
                      <span className="v-list-trail" data-volatile="timestamp">
                        {phase.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {latestRefreshJob.errors.length > 0 ? (
                <StatusBanner title="Job errors">
                  {latestRefreshJob.errors
                    .map((error) => error.message)
                    .join(" ")}
                </StatusBanner>
              ) : null}
            </div>
          ) : (
            <EmptyInline message="No refresh jobs yet. Authenticate with Audible, then start a local refresh from this screen." />
          )}
        </div>
      </section>

      <div className="v-two-column-grid">
        <RefreshJobList
          title="Active jobs"
          jobs={refreshStatus?.activeJobs ?? []}
          emptyMessage="No refresh jobs are currently running."
        />
        <RefreshJobList
          title="Recent jobs"
          jobs={refreshStatus?.recentJobs ?? []}
          emptyMessage="No completed refresh jobs yet."
        />
      </div>
    </div>
  );
}

function SettingsPage({
  onChangePreference,
  onCompleteAuthentication,
  onOpenRefreshStatus,
  onSignOutAuthentication,
  onStartAuthentication,
  onStartRefresh,
  onUpdateSettings,
  preferences,
  settingsSection,
  settings,
  setSettingsSection,
  isRefreshing,
}: {
  onChangePreference: <Key extends keyof ShellPreferences>(
    key: Key,
    value: ShellPreferences[Key],
  ) => void;
  onCompleteAuthentication: (
    sessionId: string,
    responseUrl: string,
  ) => Promise<void>;
  onOpenRefreshStatus: () => void;
  onSignOutAuthentication: () => Promise<void>;
  onStartAuthentication: (
    locale: string,
  ) => Promise<StartAudibleAuthenticationResponse>;
  onStartRefresh: () => void;
  onUpdateSettings: (request: UpdateSettingsRequest) => Promise<unknown>;
  preferences: ShellPreferences;
  settingsSection: SettingsSection;
  settings: SettingsResponse | null;
  setSettingsSection: (value: SettingsSection) => void;
  isRefreshing: boolean;
}) {
  const currentSettings = settings ?? createFallbackSettings(preferences);
  const [authLocale, setAuthLocale] = useState(
    (currentSettings.audibleAuthentication.locale ?? "us").toUpperCase(),
  );
  const [authPrompt, setAuthPrompt] =
    useState<StartAudibleAuthenticationResponse | null>(null);
  const [authResponseUrl, setAuthResponseUrl] = useState("");
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isAuthWorking, setIsAuthWorking] = useState(false);
  const [perCreditValueDraft, setPerCreditValueDraft] = useState(
    currentSettings.costBasis.perCreditValue.toFixed(2),
  );

  useEffect(() => {
    setAuthLocale(
      (currentSettings.audibleAuthentication.locale ?? "us").toUpperCase(),
    );
  }, [currentSettings.audibleAuthentication.locale]);

  useEffect(() => {
    setPerCreditValueDraft(currentSettings.costBasis.perCreditValue.toFixed(2));
  }, [currentSettings.costBasis.perCreditValue]);

  useEffect(() => {
    if (currentSettings.audibleAuthentication.status === "authenticated") {
      setAuthPrompt(null);
      setAuthResponseUrl("");
      setAuthActionError(null);
    }
  }, [currentSettings.audibleAuthentication.status]);

  async function applySettingsUpdate(request: UpdateSettingsRequest) {
    try {
      await onUpdateSettings(request);
      setAuthActionError(null);
    } catch (error) {
      setAuthActionError(
        error instanceof Error ? error.message : "Settings update failed.",
      );
    }
  }

  async function handleStartAuth() {
    setIsAuthWorking(true);

    try {
      const prompt = await onStartAuthentication(authLocale.toLowerCase());
      setAuthPrompt(prompt);
      setAuthActionError(null);
    } catch (error) {
      setAuthActionError(
        error instanceof Error
          ? error.message
          : "Audible authentication could not be started.",
      );
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleCompleteAuth() {
    if (authPrompt === null || authResponseUrl.trim().length === 0) {
      setAuthActionError(
        "Paste the final Audible response URL to complete sign-in.",
      );
      return;
    }

    setIsAuthWorking(true);

    try {
      await onCompleteAuthentication(
        authPrompt.sessionId,
        authResponseUrl.trim(),
      );
      setAuthPrompt(null);
      setAuthResponseUrl("");
      setAuthActionError(null);
    } catch (error) {
      setAuthActionError(
        error instanceof Error
          ? error.message
          : "Audible authentication could not be completed.",
      );
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleSignOut() {
    setIsAuthWorking(true);

    try {
      await onSignOutAuthentication();
      setAuthPrompt(null);
      setAuthResponseUrl("");
      setAuthActionError(null);
    } catch (error) {
      setAuthActionError(
        error instanceof Error ? error.message : "Audible sign-out failed.",
      );
    } finally {
      setIsAuthWorking(false);
    }
  }

  const settingsNavItems: readonly {
    id: SettingsSection;
    label: string;
  }[] = [
    { id: "authentication", label: "Audible authentication" },
    { id: "refresh", label: "Refresh" },
    { id: "cost-basis", label: "Cost basis" },
    { id: "local-data", label: "Local data" },
    { id: "archive-export", label: "Archive export" },
    { id: "interface", label: "Interface defaults" },
  ];

  return (
    <div className="v-settings-layout">
      <aside className="v-settings-nav">
        <div className="v-stack-xs">
          <div className="v-eyebrow">Settings · Solid v1</div>
          {settingsNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`v-nav-item ${settingsSection === item.id ? "is-active" : ""}`}
              onClick={() => setSettingsSection(item.id)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="v-card v-card-body">
          <p className="v-body-copy">
            Solid v1 settings cover only local operation and interpretation per
            ADR 0045.
          </p>
        </div>
      </aside>
      <section className="v-stack-md">
        {settingsSection === "authentication" ? (
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Audible authentication</div>
                <h2 className="v-card-title">External-browser session</h2>
              </div>
              <span
                className={`v-pill ${currentSettings.audibleAuthentication.status === "authenticated" ? "is-accent" : "is-info"}`}
              >
                {currentSettings.audibleAuthentication.status ===
                "authenticated"
                  ? "Active"
                  : "Needs sign-in"}
              </span>
            </div>
            <div className="v-card-body v-stack-md">
              <PreferenceGroup
                help="Verso delegates login to AudibleApi's supported external-browser flow. Passwords never enter Verso."
                label="Marketplace"
              >
                <select
                  className="v-select"
                  value={authLocale}
                  onChange={(event) => setAuthLocale(event.target.value)}
                >
                  <option value="US">US</option>
                  <option value="UK">UK</option>
                  <option value="CA">CA</option>
                  <option value="AU">AU</option>
                </select>
              </PreferenceGroup>
              <PreferenceGroup
                help="The active local session is stored on this machine only."
                label="Current session"
              >
                <div className="v-stack-sm">
                  <div className="v-select">
                    <input
                      className="v-field"
                      disabled={true}
                      value={formatAuthenticationIdentity(currentSettings)}
                    />
                  </div>
                  <div className="v-pill-row">
                    <span className="v-pill is-info">
                      Locale:{" "}
                      {(
                        currentSettings.audibleAuthentication.locale ??
                        authLocale.toLowerCase()
                      ).toUpperCase()}
                    </span>
                    <span className="v-pill is-dark">
                      Last auth:{" "}
                      {formatOptionalUtc(
                        currentSettings.audibleAuthentication
                          .lastAuthenticatedAtUtc,
                      )}
                    </span>
                  </div>
                </div>
              </PreferenceGroup>
              {authPrompt ? (
                <PreferenceGroup
                  help="Open Audible in your browser, finish the login, then paste the final redirected URL here to complete the handoff."
                  label="Browser handoff"
                >
                  <div className="v-stack-sm">
                    <a
                      className="v-reference-link"
                      href={authPrompt.loginUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>Open Audible sign-in</span>
                      <span className="v-link-tag">external</span>
                    </a>
                    <div className="v-select">
                      <input
                        className="v-field"
                        value={authResponseUrl}
                        onChange={(event) =>
                          setAuthResponseUrl(event.target.value)
                        }
                        placeholder="Paste the final Audible redirect URL"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="v-btn v-btn-primary"
                        disabled={isAuthWorking}
                        onClick={() => {
                          void handleCompleteAuth();
                        }}
                      >
                        Complete authentication
                      </button>
                    </div>
                  </div>
                </PreferenceGroup>
              ) : null}
              {authActionError ||
              currentSettings.audibleAuthentication.lastError ? (
                <StatusBanner title="Authentication status">
                  {authActionError ??
                    currentSettings.audibleAuthentication.lastError ??
                    "Authentication failed."}
                </StatusBanner>
              ) : null}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="v-btn v-btn-primary"
                  disabled={isAuthWorking}
                  onClick={() => {
                    void handleStartAuth();
                  }}
                >
                  {currentSettings.audibleAuthentication.status ===
                  "authenticated"
                    ? "Re-authenticate via AudibleApi"
                    : "Authenticate via AudibleApi"}
                </button>
                <button
                  type="button"
                  className="v-btn v-btn-outline"
                  disabled={
                    isAuthWorking ||
                    currentSettings.audibleAuthentication.status !==
                      "authenticated"
                  }
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {settingsSection === "refresh" ? (
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Refresh</div>
                <h2 className="v-card-title">Local app-initiated imports</h2>
              </div>
              <button
                type="button"
                className="v-btn v-btn-outline v-btn-sm"
                onClick={onOpenRefreshStatus}
              >
                Open refresh status
              </button>
            </div>
            <div className="v-card-body v-stack-md">
              <PreferenceGroup
                help="`Daily at idle` means Verso can trigger one local refresh when the app is open and idle; it is not a background daemon."
                label="Refresh trigger"
              >
                <RadioGrid>
                  <RadioCard
                    checked={currentSettings.refresh.trigger === "manual"}
                    description="Refresh only when you explicitly start one."
                    label="Manual"
                    onClick={() => {
                      void applySettingsUpdate({
                        refresh: {
                          ...currentSettings.refresh,
                          trigger: "manual",
                        },
                      });
                    }}
                  />
                  <RadioCard
                    checked={currentSettings.refresh.trigger === "on-app-start"}
                    description="Kick off a refresh when Verso opens."
                    label="On app start"
                    onClick={() => {
                      void applySettingsUpdate({
                        refresh: {
                          ...currentSettings.refresh,
                          trigger: "on-app-start",
                        },
                      });
                    }}
                  />
                  <RadioCard
                    checked={
                      currentSettings.refresh.trigger === "daily-at-idle"
                    }
                    description="Allow one daily refresh when the local app is idle."
                    label="Daily at idle"
                    onClick={() => {
                      void applySettingsUpdate({
                        refresh: {
                          ...currentSettings.refresh,
                          trigger: "daily-at-idle",
                        },
                      });
                    }}
                  />
                </RadioGrid>
              </PreferenceGroup>
              <PreferenceGroup
                help="Retain titles that disappear from a later successful Audible refresh as no-longer-present items."
                label="Retention"
              >
                <label className="v-library-card-checkbox">
                  <input
                    checked={currentSettings.refresh.retainNoLongerPresentItems}
                    type="checkbox"
                    onChange={(event) => {
                      void applySettingsUpdate({
                        refresh: {
                          ...currentSettings.refresh,
                          retainNoLongerPresentItems: event.target.checked,
                        },
                      });
                    }}
                  />
                  <span>Retain no-longer-present items</span>
                </label>
              </PreferenceGroup>
              <PreferenceGroup
                help="These snapshot fields are fixed in Solid v1 and shown here for visibility only."
                label="Selective snapshot fields"
              >
                <div className="v-pill-row">
                  {currentSettings.refresh.selectiveSnapshotFields.map(
                    (field) => (
                      <span key={field} className="v-pill is-dark">
                        {field}
                      </span>
                    ),
                  )}
                </div>
              </PreferenceGroup>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="v-btn v-btn-primary"
                  disabled={isRefreshing}
                  onClick={onStartRefresh}
                >
                  {isRefreshing ? "Refreshing library" : "Start refresh"}
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {settingsSection === "cost-basis" ? (
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Cost basis</div>
                <h2 className="v-card-title">Credit value interpretation</h2>
              </div>
              <span className="v-pill is-info">
                {currentSettings.costBasis.currencyCode}
              </span>
            </div>
            <div className="v-card-body v-stack-md">
              <PreferenceGroup
                help="Cost reports can default to either the configured credit value or the imported list price."
                label="Default basis"
              >
                <RadioGrid>
                  <RadioCard
                    checked={
                      currentSettings.costBasis.defaultBasis ===
                      "per-credit-value"
                    }
                    description="Use your configured per-credit value by default."
                    label="Per-credit value"
                    onClick={() => {
                      void applySettingsUpdate({
                        costBasis: {
                          ...currentSettings.costBasis,
                          defaultBasis: "per-credit-value",
                        },
                      });
                    }}
                  />
                  <RadioCard
                    checked={
                      currentSettings.costBasis.defaultBasis === "list-price"
                    }
                    description="Use imported list price where Audible provides it."
                    label="List price"
                    onClick={() => {
                      void applySettingsUpdate({
                        costBasis: {
                          ...currentSettings.costBasis,
                          defaultBasis: "list-price",
                        },
                      });
                    }}
                  />
                </RadioGrid>
              </PreferenceGroup>
              <PreferenceGroup
                help="This value is used whenever the default basis is per-credit value."
                label="Per-credit value"
              >
                <div className="v-stack-sm">
                  <div className="v-select">
                    <input
                      className="v-field"
                      inputMode="decimal"
                      value={perCreditValueDraft}
                      onBlur={() => {
                        const parsedValue =
                          Number.parseFloat(perCreditValueDraft);

                        if (!Number.isFinite(parsedValue) || parsedValue < 0) {
                          setPerCreditValueDraft(
                            currentSettings.costBasis.perCreditValue.toFixed(2),
                          );
                          return;
                        }

                        void applySettingsUpdate({
                          costBasis: {
                            ...currentSettings.costBasis,
                            perCreditValue: parsedValue,
                          },
                        });
                      }}
                      onChange={(event) =>
                        setPerCreditValueDraft(event.target.value)
                      }
                    />
                  </div>
                  <div className="v-pill-row">
                    <span className="v-pill is-info">
                      EFFECTIVE COST · {currentSettings.costBasis.currencyCode}{" "}
                      {currentSettings.costBasis.perCreditValue.toFixed(2)} /
                      CREDIT
                    </span>
                  </div>
                </div>
              </PreferenceGroup>
            </div>
          </article>
        ) : null}

        {settingsSection === "local-data" ? (
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Local data</div>
                <h2 className="v-card-title">Storage visibility</h2>
              </div>
              <span className="v-pill is-info">SQLite · ADR 0005</span>
            </div>
            <div className="v-card-body v-stack-md">
              <PreferenceGroup
                help="Verso keeps the local database, raw payloads, and cached assets on this machine."
                label="Database"
              >
                <div className="v-stack-sm">
                  <div className="v-select">
                    <input
                      className="v-field"
                      disabled={true}
                      value={currentSettings.localData.databaseLocation}
                    />
                  </div>
                  <div className="v-pill-row">
                    <span className="v-pill is-dark">
                      Size:{" "}
                      {formatBytes(currentSettings.localData.databaseSizeBytes)}
                    </span>
                    <span className="v-pill is-dark">
                      Schema:{" "}
                      {currentSettings.localData.schemaVersion || "pending"}
                    </span>
                    <span className="v-pill is-dark">
                      Raw payloads: {currentSettings.localData.rawPayloadCount}
                    </span>
                  </div>
                </div>
              </PreferenceGroup>
              <PreferenceGroup
                help="Cover images are cached locally for fast render and export fidelity."
                label="Cover cache"
              >
                <div className="v-stack-sm">
                  <div className="v-select">
                    <input
                      className="v-field"
                      disabled={true}
                      value={currentSettings.localData.coverCacheLocation}
                    />
                  </div>
                  <div className="v-pill-row">
                    <span className="v-pill is-dark">
                      Size:{" "}
                      {formatBytes(
                        currentSettings.localData.coverCacheSizeBytes,
                      )}
                    </span>
                  </div>
                </div>
              </PreferenceGroup>
              <PreferenceGroup
                help="Companion PDF caching stays deferred in Solid v1."
                label="Companion PDFs"
              >
                <span className="v-pill is-info">
                  {currentSettings.localData.companionPdfsStatus}
                </span>
              </PreferenceGroup>
            </div>
          </article>
        ) : null}

        {settingsSection === "archive-export" ? (
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Archive export</div>
                <h2 className="v-card-title">Fidelity-first defaults</h2>
              </div>
              <button
                type="button"
                className="v-btn v-btn-primary"
                disabled={true}
              >
                Export now
              </button>
            </div>
            <div className="v-card-body v-stack-md">
              <PreferenceGroup
                help="JSON remains the archive of record; projection formats are available as convenience outputs."
                label="Format"
              >
                <RadioGrid>
                  <RadioCard
                    checked={
                      currentSettings.archiveExport.format === "json-archive"
                    }
                    description="Fidelity-first archive payload."
                    label="JSON archive"
                    onClick={() => {
                      void applySettingsUpdate({
                        archiveExport: {
                          ...currentSettings.archiveExport,
                          format: "json-archive",
                        },
                      });
                    }}
                  />
                  <RadioCard
                    checked={
                      currentSettings.archiveExport.format === "csv-projection"
                    }
                    description="Tabular projection for ad hoc inspection."
                    label="CSV projection"
                    onClick={() => {
                      void applySettingsUpdate({
                        archiveExport: {
                          ...currentSettings.archiveExport,
                          format: "csv-projection",
                        },
                      });
                    }}
                  />
                  <RadioCard
                    checked={
                      currentSettings.archiveExport.format ===
                      "markdown-projection"
                    }
                    description="Human-readable projection output."
                    label="Markdown projection"
                    onClick={() => {
                      void applySettingsUpdate({
                        archiveExport: {
                          ...currentSettings.archiveExport,
                          format: "markdown-projection",
                        },
                      });
                    }}
                  />
                </RadioGrid>
              </PreferenceGroup>
              <PreferenceGroup
                help="Raw Audible payloads stay included by default for archive fidelity."
                label="Payload fidelity"
              >
                <label className="v-library-card-checkbox">
                  <input
                    checked={currentSettings.archiveExport.includeRawPayloads}
                    type="checkbox"
                    onChange={(event) => {
                      void applySettingsUpdate({
                        archiveExport: {
                          ...currentSettings.archiveExport,
                          includeRawPayloads: event.target.checked,
                        },
                      });
                    }}
                  />
                  <span>Include raw payloads</span>
                </label>
              </PreferenceGroup>
              <PreferenceGroup
                help="Choose how cover images should be packaged alongside the archive."
                label="Cover images"
              >
                <select
                  className="v-select"
                  value={currentSettings.archiveExport.coverImages}
                  onChange={(event) => {
                    void applySettingsUpdate({
                      archiveExport: {
                        ...currentSettings.archiveExport,
                        coverImages: event.target.value,
                      },
                    });
                  }}
                >
                  <option value="sibling-folder">Sibling folder</option>
                  <option value="embedded-base64">Embedded base64</option>
                  <option value="omit">Omit</option>
                </select>
              </PreferenceGroup>
              <button
                type="button"
                className="v-btn v-btn-outline"
                disabled={true}
              >
                Restore… · deferred
              </button>
            </div>
          </article>
        ) : null}

        {settingsSection === "interface" ? (
          <>
            <article className="v-card">
              <div className="v-card-head">
                <div>
                  <div className="v-eyebrow">Interface defaults</div>
                  <h2 className="v-card-title">
                    Prototype-visible display preferences
                  </h2>
                </div>
                <span className="v-pill is-info">Persisted</span>
              </div>
              <div className="v-card-body v-stack-md">
                <PreferenceGroup
                  help="Choose whether the shell opens in the signed-off top navigation or the optional operational sidebar."
                  label="Navigation chrome"
                >
                  <RadioGrid>
                    <RadioCard
                      checked={preferences.nav === "topnav"}
                      description="Best when the app is used primarily as a dashboard and review surface."
                      label="Top navigation"
                      onClick={() => onChangePreference("nav", "topnav")}
                    />
                    <RadioCard
                      checked={preferences.nav === "sidebar"}
                      description="Best when the app is used as a denser operational workspace."
                      label="Sidebar"
                      onClick={() => onChangePreference("nav", "sidebar")}
                    />
                  </RadioGrid>
                </PreferenceGroup>
                <PreferenceGroup
                  help="Choose whether overview opens as a calm briefing or a denser operations dashboard."
                  label="Overview default"
                >
                  <RadioGrid>
                    <RadioCard
                      checked={preferences.overview === "calm"}
                      description="Narrative scan with fewer competing surfaces."
                      label="Calm"
                      onClick={() => onChangePreference("overview", "calm")}
                    />
                    <RadioCard
                      checked={preferences.overview === "dense"}
                      description="Maximum telemetry on first load."
                      label="Data-dense"
                      onClick={() => onChangePreference("overview", "dense")}
                    />
                  </RadioGrid>
                </PreferenceGroup>
                <PreferenceGroup
                  help="Persist either compact inventory browsing or a cover-forward visual scan for the library view."
                  label="Library default view"
                >
                  <RadioGrid>
                    <RadioCard
                      checked={preferences.libraryView === "rows"}
                      description="Fastest path for search, sort, and dense review."
                      label="Compact rows"
                      onClick={() => onChangePreference("libraryView", "rows")}
                    />
                    <RadioCard
                      checked={preferences.libraryView === "cards"}
                      description="More cover-forward browsing with visual scanning."
                      label="Card grid"
                      onClick={() => onChangePreference("libraryView", "cards")}
                    />
                  </RadioGrid>
                </PreferenceGroup>
              </div>
            </article>

            <article className="v-card">
              <div className="v-card-head">
                <div>
                  <div className="v-eyebrow">Visual parity references</div>
                  <h2 className="v-card-title">
                    Stable prototype-derived states
                  </h2>
                </div>
              </div>
              <div className="v-card-body v-stack-sm">
                <p className="v-body-copy">
                  These links mirror the approved prototype state IDs that the
                  screenshot sensor uses. Intentional UI changes should update
                  the handoff and these baselines together.
                </p>
                <ul className="v-reference-list">
                  {visualParityStates.map((state) => (
                    <li key={state.id}>
                      <a
                        className="v-reference-link"
                        href={buildVisualParitySearch(state.id)}
                      >
                        <span>{state.id}</span>
                        <span className="v-link-tag">{state.view}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </>
        ) : null}
      </section>
    </div>
  );
}

function createFallbackSettings(
  preferences: ShellPreferences,
): SettingsResponse {
  return {
    interfacePreferences: {
      navChrome: preferences.nav,
      defaultOverviewVariant: preferences.overview,
      defaultLibraryView: preferences.libraryView,
    },
    audibleAuthentication: {
      status: "not-authenticated",
      locale: null,
      lastAuthenticatedAtUtc: null,
      lastError: null,
    },
    refresh: {
      trigger: "manual",
      retainNoLongerPresentItems: true,
      selectiveSnapshotFields: [
        "percent-complete",
        "presence",
        "companion-pdf-available",
        "is-returnable",
      ],
    },
    costBasis: {
      defaultBasis: "per-credit-value",
      perCreditValue: 14.95,
      currencyCode: "USD",
    },
    localData: {
      databaseLocation: "",
      databaseSizeBytes: 0,
      schemaVersion: "",
      rawPayloadCount: 0,
      coverCacheLocation: "",
      coverCacheSizeBytes: 0,
      companionPdfsStatus: "deferred",
    },
    archiveExport: {
      format: "json-archive",
      includeRawPayloads: true,
      coverImages: "sibling-folder",
      restoreSupported: false,
    },
  };
}

function formatAuthenticationIdentity(settings: SettingsResponse): string {
  return settings.audibleAuthentication.status === "authenticated"
    ? `Audible ${settings.audibleAuthentication.locale?.toUpperCase() ?? ""} session active`
    : "No active Audible session";
}

function formatOptionalUtc(value: string | null): string {
  return value ? formatUtc(value) : "Never";
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes <= 0) {
    return "0 B";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${sizeBytes} B`;
}

function Brand() {
  return (
    <div className="v-brand">
      <span className="v-brand-mark" aria-hidden="true" />
      <span className="v-brand-name">Verso</span>
      <span className="v-brand-sub">v0.4</span>
    </div>
  );
}

function StatusBanner({
  children,
  title,
}: {
  children: string;
  title: string;
}) {
  return (
    <section className="v-status-banner" role="status">
      <div className="v-status-title-row">
        <Activity aria-hidden="true" className="size-4" />
        <h2 className="v-card-title">{title}</h2>
      </div>
      <p className="v-body-copy">{children}</p>
    </section>
  );
}

function OverviewSummaryMetric({
  accent = false,
  detail,
  label,
  value,
}: {
  accent?: boolean;
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        className="v-eyebrow"
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {label}
      </div>
      <div
        style={{
          color: "var(--fg)",
          fontFamily: "var(--font-mono)",
          fontSize: 56,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div className="v-eyebrow" style={{ color: "var(--fg-2)", marginTop: 6 }}>
        {detail}
      </div>
    </div>
  );
}

function KpiCard({
  accent = false,
  delta,
  detail,
  label,
  value,
}: {
  accent?: boolean;
  delta?: string;
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`v-kpi ${accent ? "is-accent" : ""}`}>
      <div className="v-kpi-label">{label}</div>
      <div className="v-kpi-value">{value}</div>
      <div className="v-kpi-foot">
        {delta ? <span className="v-kpi-delta">+ {delta}</span> : null}
        <span className="v-kpi-sub">{detail}</span>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="v-hero-stat">
      <span className="v-hero-stat-label">{label}</span>
      <span className="v-hero-stat-value">{value}</span>
    </div>
  );
}

function LeaderboardCard({
  entries,
  title,
}: {
  entries: readonly LeaderboardEntry[];
  title: string;
}) {
  return (
    <article className="v-card">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">Top contributors</div>
          <h3 className="v-card-title">{title}</h3>
        </div>
      </div>
      <div className="v-card-body is-tight">
        <table className="v-table v-table-compact">
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry, index) => (
                <tr key={entry.name}>
                  <td className="v-rank-cell">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td>{entry.name}</td>
                  <td className="r v-mono">{entry.count} items</td>
                  <td className="r v-mono">
                    {Math.round(entry.runtimeMinutes / 60)} h
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <EmptyInline message="No contributor data is available yet." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="v-detail-fact">
      <dt className="v-detail-label">{label}</dt>
      <dd className="v-detail-value">{value}</dd>
    </div>
  );
}

function CompactFact({
  label,
  value,
  volatile = false,
}: {
  label: string;
  value: string;
  volatile?: boolean;
}) {
  return (
    <div className="v-compact-fact">
      <dt className="v-detail-label">{label}</dt>
      <dd
        className="v-detail-value"
        data-volatile={volatile ? "timestamp" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function PreferenceGroup({
  children,
  help,
  label,
}: {
  children: React.ReactNode;
  help: string;
  label: string;
}) {
  return (
    <section className="v-stack-sm">
      <div className="v-stack-xs">
        <div className="v-group-title">{label}</div>
        <p className="v-group-help">{help}</p>
      </div>
      {children}
    </section>
  );
}

function RadioGrid({ children }: { children: React.ReactNode }) {
  return <div className="v-radio-grid">{children}</div>;
}

function RadioCard({
  checked,
  description,
  label,
  onClick,
}: {
  checked: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`v-radio-card ${checked ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <span className="v-radio-label">{label}</span>
      <span className="v-radio-help">{description}</span>
    </button>
  );
}

function RefreshJobList({
  emptyMessage,
  jobs,
  title,
}: {
  emptyMessage: string;
  jobs: readonly LibraryRefreshJobDto[];
  title: string;
}) {
  return (
    <section className="v-card">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">Refresh jobs</div>
          <h3 className="v-card-title">{title}</h3>
        </div>
      </div>
      <div className="v-card-body">
        {jobs.length > 0 ? (
          <ul className="v-list-panel">
            {jobs.map((job) => (
              <li key={job.id} className="v-list-row is-static">
                <span className="v-list-copy">
                  <span className="v-list-title">{job.status}</span>
                  <span className="v-list-subtitle">{job.phaseSummary}</span>
                </span>
                <span className="v-list-trail" data-volatile="timestamp">
                  {formatUtc(job.startedAtUtc)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyInline message={emptyMessage} />
        )}
      </div>
    </section>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="v-card v-empty-card">
      <p className="v-body-copy">{message}</p>
    </div>
  );
}

function EmptyInline({ message }: { message: string }) {
  return <p className="v-empty-inline">{message}</p>;
}

function PlaceholderPage({
  detail,
  eyebrow,
  title,
}: {
  detail: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="v-card">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">{eyebrow}</div>
          <h2 className="v-card-title">{title}</h2>
        </div>
      </div>
      <div className="v-card-body">
        <p className="v-body-copy">{detail}</p>
      </div>
    </section>
  );
}

function getInitialShellState(
  preferences: ShellPreferences,
): InitialShellState {
  const parityStateId = readVisualParityStateId(window.location.search);
  const parityState = parityStateId
    ? getVisualParityState(parityStateId)
    : null;

  if (parityState) {
    return {
      parityStateId: parityState.id,
      preferences: parityState.preferences,
      settingsSection: parityState.prototype.settingsSection ?? "interface",
      view: parityState.view,
    };
  }

  return {
    parityStateId: null,
    preferences,
    settingsSection: "interface",
    view: "overview",
  };
}

function isSidebarNavigationItemActive(
  currentView: AppView,
  itemView: AppView,
): boolean {
  return currentView === itemView;
}

function isReportView(view: AppView): boolean {
  return (
    view === "reports" ||
    view === "report-cadence" ||
    view === "report-authors" ||
    view === "report-runtime" ||
    view === "report-genre" ||
    view === "report-keywords" ||
    view === "report-narrators"
  );
}

function isTopNavigationItemActive(itemView: AppView, currentView: AppView) {
  if (itemView === "reports") {
    return isReportView(currentView);
  }

  return currentView === itemView;
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

function rankContributors(
  items: readonly LibraryItemDto[],
  key: "authors" | "narrators",
): readonly LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>();

  for (const item of items) {
    for (const contributor of item[key]) {
      if (!contributor) {
        continue;
      }

      const existingEntry = entries.get(contributor);

      if (existingEntry) {
        existingEntry.count += 1;
        existingEntry.runtimeMinutes += Math.max(item.runtimeMinutes, 0);
      } else {
        entries.set(contributor, {
          count: 1,
          name: contributor,
          runtimeMinutes: Math.max(item.runtimeMinutes, 0),
        });
      }
    }
  }

  return [...entries.values()]
    .sort(
      (left, right) =>
        right.runtimeMinutes - left.runtimeMinutes ||
        right.count - left.count ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 6);
}

function PrototypeCoverPreview({ item }: { item: LibraryItemDto }) {
  const palette = getPrototypeCoverPalette(
    item.coverSeed ?? hashString(item.asin),
  );
  const primaryAuthor = item.authors[0] ?? "Unknown author";
  const markVariant = (item.coverSeed ?? hashString(item.asin)) % 6;

  return (
    <div
      style={{
        aspectRatio: "0.78",
        background: palette.background,
        color: palette.foreground,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "18px 20px",
        position: "relative",
      }}
    >
      {markVariant === 1 ? (
        <span
          aria-hidden="true"
          style={{
            inset: "30% 9% 20% 9%",
            opacity: 0.22,
            position: "absolute",
            backgroundImage:
              "repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 13px)",
          }}
        />
      ) : null}
      {markVariant === 2 ? (
        <span
          aria-hidden="true"
          style={{
            inset: "32% 9% 32% 9%",
            opacity: 0.18,
            position: "absolute",
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      ) : null}
      {markVariant === 3 ? (
        <span
          aria-hidden="true"
          style={{
            background: "currentColor",
            height: 2,
            inset: "62% 12% auto 12%",
            opacity: 0.18,
            position: "absolute",
          }}
        />
      ) : null}
      {markVariant === 4 ? (
        <span
          aria-hidden="true"
          style={{
            border: "1px solid currentColor",
            inset: "10%",
            opacity: 0.18,
            position: "absolute",
          }}
        />
      ) : null}
      {markVariant === 5 ? (
        <span
          aria-hidden="true"
          style={{
            background: palette.accent,
            bottom: 0,
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            height: "42%",
            opacity: 0.18,
            position: "absolute",
            right: 0,
            width: "58%",
          }}
        />
      ) : null}
      <span
        className="v-eyebrow"
        style={{
          color: palette.foreground,
          opacity: 0.74,
          position: "relative",
          zIndex: 1,
        }}
      >
        {primaryAuthor.toUpperCase()}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1.02,
          maxWidth: "85%",
          position: "relative",
          zIndex: 1,
        }}
      >
        {truncateCoverTitle(item.title)}
      </span>
    </div>
  );
}

function LibraryCardCoverPreview({ item }: { item: LibraryItemDto }) {
  const palette = getPrototypeCoverPalette(
    item.coverSeed ?? hashString(item.asin),
  );
  const seed = item.coverSeed ?? hashString(item.asin);
  const coverStyle = {
    "--library-cover-accent": palette.accent,
    background: palette.background,
    color: palette.foreground,
  } as CSSProperties;

  return (
    <div className="v-library-cover" style={coverStyle}>
      <LibraryCardCoverMark foreground={palette.foreground} seed={seed} />
      <div className="v-library-cover-author">
        {(item.authors[0] ?? "Unknown").toUpperCase()}
      </div>
      <div className="v-library-cover-title">{item.title}</div>
    </div>
  );
}

function LibraryCardCoverMark({
  foreground,
  seed,
}: {
  foreground: string;
  seed: number;
}) {
  const opacity = 0.2;
  const variant = seed % 6;

  if (variant === 1) {
    return (
      <svg
        className="v-library-cover-mark"
        style={{ left: "9%", right: "9%", bottom: "20%", top: "30%" }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <line
            key={index}
            x1="0"
            x2="100"
            y1={index * 12 + 4}
            y2={index * 12 + 4}
            stroke={foreground}
            strokeOpacity={opacity}
            strokeWidth="0.6"
            strokeDasharray="2 3"
          />
        ))}
      </svg>
    );
  }

  if (variant === 2) {
    return (
      <svg
        className="v-library-cover-mark"
        style={{ left: "9%", right: "9%", top: "32%", bottom: "32%" }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <line
            key={`h-${index}`}
            x1="0"
            x2="100"
            y1={index * 20}
            y2={index * 20}
            stroke={foreground}
            strokeOpacity={opacity}
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <line
            key={`v-${index}`}
            x1={index * 20}
            x2={index * 20}
            y1="0"
            y2="100"
            stroke={foreground}
            strokeOpacity={opacity}
            strokeWidth="0.5"
          />
        ))}
      </svg>
    );
  }

  if (variant === 3) {
    return <div className="v-library-cover-rule" />;
  }

  if (variant === 4) {
    return (
      <svg
        className="v-library-cover-mark"
        style={{ left: "9%", right: "9%", top: "10%", bottom: "10%" }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="99"
          stroke={foreground}
          strokeOpacity={opacity}
          strokeWidth="0.8"
          fill="none"
        />
      </svg>
    );
  }

  if (variant === 5) {
    return (
      <svg
        className="v-library-cover-mark"
        style={{ inset: 0 }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M0,100 L100,100 L100,30 Z"
          fill="var(--library-cover-accent)"
          opacity="0.18"
        />
      </svg>
    );
  }

  return null;
}

function CompactCoverThumb({ item }: { item: LibraryItemDto }) {
  return (
    <div style={{ height: 56, overflow: "hidden", width: 40 }}>
      <PrototypeCoverPreview item={item} />
    </div>
  );
}

function formatMedianRuntimeHours(items: readonly LibraryItemDto[]): string {
  const runtimes = items
    .map((item) => Math.max(item.runtimeMinutes, 0))
    .sort((left, right) => left - right);

  if (runtimes.length === 0) {
    return "0.0";
  }

  const midpoint = Math.floor(runtimes.length / 2);
  const medianMinutes =
    runtimes.length % 2 === 0
      ? (runtimes[midpoint - 1] + runtimes[midpoint]) / 2
      : runtimes[midpoint];

  return (medianMinutes / 60).toFixed(1);
}

function buildWeeklyPurchaseBuckets(
  items: readonly LibraryItemDto[],
): number[] {
  const buckets = Array.from({ length: 52 }, () => 0);
  const now = Date.now();

  for (const item of items) {
    const purchaseDate = readPurchaseDate(item);

    if (!purchaseDate) {
      continue;
    }

    const weeksAgo = Math.floor(
      (now - purchaseDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    if (weeksAgo >= 0 && weeksAgo < 52) {
      buckets[51 - weeksAgo] += 1;
    }
  }

  return buckets;
}

function countDistinctSeries(items: readonly LibraryItemDto[]): number {
  const seriesNames = new Set<string>();

  for (const item of items) {
    const rawItem = readRawPrototypeMetadata(item);
    const seriesName = rawItem?.series?.name;

    if (seriesName) {
      seriesNames.add(seriesName);
    }
  }

  return seriesNames.size;
}

function formatMonthDay(value: Date | null): string {
  if (!value) {
    return "--.--";
  }

  return value.toISOString().slice(5, 10);
}

function formatRuntimeHoursShort(minutes: number): string {
  return `${(Math.max(minutes, 0) / 60).toFixed(1)} h`;
}

function formatRoundedRuntimeHours(minutes: number): string {
  return `${Math.max(0, Math.round(minutes / 60))} h`;
}

function mapCompletionFilterToCardLabel(
  value: LibraryFilters["completion"],
): string {
  switch (value) {
    case "completed":
      return "Completed";
    case "in-progress":
      return "In progress";
    case "not-started":
      return "Unstarted";
    case "anomalous":
      return "Near-finished";
    default:
      return "All";
  }
}

function getItemInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getPrototypeCoverPalette(seed: number): {
  accent: string;
  background: string;
  foreground: string;
} {
  const palettes = [
    {
      accent: "#c2410c",
      background: "#0b0e14",
      foreground: "#fafbfc",
    },
    {
      accent: "#0b0e14",
      background: "#c2410c",
      foreground: "#fef6ef",
    },
    {
      accent: "#f0825c",
      background: "#1e2330",
      foreground: "#fafbfc",
    },
    {
      accent: "#3a6b8c",
      background: "#3a6b8c",
      foreground: "#fafbfc",
    },
    {
      accent: "#f0825c",
      background: "#5c7a55",
      foreground: "#fef6ef",
    },
    {
      accent: "#f0825c",
      background: "#8c4156",
      foreground: "#fafbfc",
    },
    {
      accent: "#1e2330",
      background: "#b58a3e",
      foreground: "#fafbfc",
    },
    {
      accent: "#fef6ef",
      background: "#4f7f7c",
      foreground: "#fafbfc",
    },
    {
      accent: "#f0825c",
      background: "#6b5478",
      foreground: "#fafbfc",
    },
    {
      accent: "#e2541a",
      background: "#2d3340",
      foreground: "#fafbfc",
    },
    {
      accent: "#c2410c",
      background: "#fafbfc",
      foreground: "#0b0e14",
    },
    {
      accent: "#c2410c",
      background: "#fdead9",
      foreground: "#0b0e14",
    },
    {
      accent: "#3a6b8c",
      background: "#eceff4",
      foreground: "#0b0e14",
    },
  ] as const;

  return palettes[Math.abs(seed) % palettes.length];
}

function truncateCoverTitle(title: string): string {
  if (title.length <= 22) {
    return title;
  }

  return `${title.slice(0, 21).trimEnd()}…`;
}

function hashString(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function readPurchaseDate(item: LibraryItemDto): Date | null {
  const rawItem = readRawPrototypeMetadata(item);
  const purchaseDate = rawItem?.purchase_date;

  if (!purchaseDate) {
    return null;
  }

  return new Date(purchaseDate);
}

function readRawPrototypeMetadata(item: LibraryItemDto): {
  category_ladders?: readonly (readonly string[])[];
  is_dropped?: boolean;
  purchase_date?: string;
  series?: {
    name?: string;
  } | null;
} | null {
  try {
    return JSON.parse(item.rawAudiblePayload) as {
      category_ladders?: readonly (readonly string[])[];
      is_dropped?: boolean;
      purchase_date?: string;
      series?: {
        name?: string;
      } | null;
    };
  } catch {
    return null;
  }
}

function formatUtc(value: string): string {
  return new Date(value).toLocaleString();
}

function formatReturnable(value: boolean | null): string {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}
