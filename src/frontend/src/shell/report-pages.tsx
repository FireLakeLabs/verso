import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LibraryItemDto, LibraryRefreshJobDto } from "../library-api";
import {
  createGenreTreemapReport,
  type GenreTreemapNode,
} from "../reports/genre-treemap-report";
import {
  createListeningCadenceReport,
  type ListeningCadenceCell,
} from "../reports/listening-cadence-report";
import { formatRuntimeMinutes } from "../reports/library-screen-report";
import { createRuntimeDistributionReport } from "../reports/runtime-distribution-report";
import {
  createSubjectKeywordReport,
  type WeightedSubjectKeyword,
} from "../reports/subject-keyword-report";

type ReportNavigationView =
  | "findings"
  | "report-cadence"
  | "report-genre"
  | "report-keywords"
  | "report-runtime"
  | "reports";

type ReportsHubPageProps = {
  onNavigate: (view: ReportNavigationView) => void;
};

type ListeningCadencePageProps = {
  items: readonly LibraryItemDto[];
  latestRefreshJob: LibraryRefreshJobDto | null;
  onNavigate: (view: ReportNavigationView) => void;
};

type RuntimeDistributionPageProps = {
  items: readonly LibraryItemDto[];
  onNavigate: (view: ReportNavigationView) => void;
};

export function ReportsHubPage({ onNavigate }: ReportsHubPageProps) {
  return (
    <section className="v-route-grid">
      {[
        {
          body: "Purchase heatmap and cohort completion use current facts only.",
          label: "Live now",
          title: "Listening cadence",
          view: "report-cadence" as const,
        },
        {
          body: "Runtime bins, summary markers, and outlier tables are live in this slice.",
          label: "Live now",
          title: "Runtime distribution",
          view: "report-runtime" as const,
        },
        {
          body: "Category hierarchy aggregation from imported Audible ladders with a treemap and raw ladder table.",
          label: "Live now",
          title: "Genre treemap",
          view: "report-genre" as const,
        },
        {
          body: "Weighted subject keywords across the library with a cloud-first read and purchase-history support.",
          label: "Live now",
          title: "Subject keywords",
          view: "report-keywords" as const,
        },
        {
          body: "Signed-off routes stay visible without inventing unfinished behavior beyond this issue.",
          label: "Queue",
          title: "Author and narrator reports",
          view: "reports" as const,
        },
        {
          body: "Cost basis settings and the final view still extend from the shared reports shell.",
          label: "Queue",
          title: "Cost per hour",
          view: "reports" as const,
        },
      ].map((entry) => (
        <article key={entry.title} className="v-route-tile">
          <div className="v-eyebrow">{entry.label}</div>
          <h2 className="v-card-title">{entry.title}</h2>
          <p className="v-body-copy">{entry.body}</p>
          <button
            type="button"
            className="v-inline-link"
            onClick={() => onNavigate(entry.view)}
          >
            {entry.view === "reports" ? "Stay in reports hub" : "Open report"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </article>
      ))}
    </section>
  );
}

export function ListeningCadencePage({
  items,
  latestRefreshJob,
  onNavigate,
}: ListeningCadencePageProps) {
  const cadenceReferenceDate = useMemo(
    () =>
      resolveCadenceReferenceDate(
        latestRefreshJob?.completedAtUtc ?? null,
        items,
      ),
    [items, latestRefreshJob?.completedAtUtc],
  );
  const report = useMemo(
    () =>
      createListeningCadenceReport({
        items,
        now: cadenceReferenceDate,
      }),
    [cadenceReferenceDate, items],
  );
  const visibleCohorts = report.cohorts.filter(
    (cohort) => cohort.totalCount > 0,
  );

  return (
    <div className="v-stack-md">
      <div className="v-metric-grid v-metric-grid-4">
        <ReportStatCard
          accent
          detail="weeks with at least one purchase"
          label="Active weeks"
          value={String(report.activeWeeks)}
        />
        <ReportStatCard
          detail="adds in the busiest recent week"
          label="Busiest week"
          value={String(report.busiestWeekPurchases)}
        />
        <ReportStatCard
          detail="dated purchases inside the 52-week view"
          label="Purchases in range"
          value={String(report.totalPurchasesInRange)}
        />
        <ReportStatCard
          detail="current completion rolled up by purchase month"
          label="Current facts only"
          value={String(visibleCohorts.length)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "1.25fr 0.85fr",
        }}
      >
        <article className="v-card">
          <div className="v-card-head">
            <div>
              <div className="v-eyebrow">
                Listening cadence · calendar heatmap
              </div>
              <h2 className="v-card-title">
                Purchase rhythm across the last 52 weeks
              </h2>
            </div>
            <span className="v-pill is-info">No invented listen dates</span>
          </div>
          <div className="v-card-body">
            {report.totalPurchasesInRange > 0 ? (
              <>
                <div
                  style={{
                    alignItems: "center",
                    display: "grid",
                    gap: 4,
                    gridTemplateColumns: "28px repeat(52, minmax(0, 1fr))",
                  }}
                >
                  {(["M", "T", "W", "T", "F", "S", "S"] as const).map(
                    (label, rowIndex) => (
                      <HeatmapRow
                        key={`${label}-${rowIndex}`}
                        cells={report.heatmap.map(
                          (week) => week[rowIndex] as ListeningCadenceCell,
                        )}
                        label={label}
                        maxCellPurchases={report.maxCellPurchases}
                      />
                    ),
                  )}
                </div>

                <div
                  className="v-meta-row"
                  style={{ justifyContent: "space-between", marginTop: 14 }}
                >
                  <span className="v-user-meta">52 weeks ago</span>
                  <span className="v-user-meta">Most recent</span>
                </div>
                <p
                  className="v-body-copy"
                  style={{ marginBottom: 0, marginTop: 16 }}
                >
                  This heatmap uses purchase timestamps only. Verso does not
                  infer missing listen-session history in Solid v1.
                </p>
              </>
            ) : (
              <p className="v-empty-inline">
                Refresh the library with purchase timestamps to populate this
                cadence view.
              </p>
            )}
          </div>
        </article>

        <div className="v-stack-sm">
          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Derived presentation</div>
                <h2 className="v-card-title">Completion by purchase cohort</h2>
              </div>
            </div>
            <div className="v-card-body v-stack-sm">
              {visibleCohorts.length > 0 ? (
                visibleCohorts.map((cohort) => {
                  const total = Math.max(cohort.totalCount, 1);

                  return (
                    <div
                      key={cohort.key}
                      style={{
                        alignItems: "center",
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "48px minmax(0, 1fr) 56px",
                      }}
                    >
                      <div className="v-eyebrow">{cohort.label}</div>
                      <div
                        style={{
                          background: "var(--bg-2)",
                          border: "1px solid var(--line-1)",
                          display: "flex",
                          height: 12,
                        }}
                      >
                        <div
                          style={{
                            background: "var(--positive)",
                            width: `${(cohort.completedCount / total) * 100}%`,
                          }}
                        />
                        <div
                          style={{
                            background: "var(--accent)",
                            width: `${(cohort.inProgressCount / total) * 100}%`,
                          }}
                        />
                        <div
                          style={{
                            background: "var(--line-2)",
                            width: `${(cohort.untouchedCount / total) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="v-mono" style={{ textAlign: "right" }}>
                        {cohort.totalCount}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="v-empty-inline">
                  No dated purchase cohorts are available yet.
                </p>
              )}

              <div className="v-column-note" style={{ padding: 16 }}>
                <div className="v-eyebrow">Interpretation boundary</div>
                <p className="v-body-copy" style={{ margin: 0 }}>
                  We show purchase cadence plus each cohort&apos;s current
                  completion state. Missing listen-session history remains
                  unknown.
                </p>
              </div>
            </div>
          </article>

          <article className="v-card">
            <div className="v-card-head">
              <div>
                <div className="v-eyebrow">Next report</div>
                <h2 className="v-card-title">Continue through reports</h2>
              </div>
            </div>
            <div className="v-card-body v-stack-sm">
              <button
                type="button"
                className="v-link-row"
                onClick={() => onNavigate("report-runtime")}
              >
                <span>Runtime distribution</span>
                <span className="v-link-tag">Open</span>
              </button>
              <button
                type="button"
                className="v-link-row"
                onClick={() => onNavigate("reports")}
              >
                <span>Back to report queue</span>
                <span className="v-link-tag">Reports</span>
              </button>
              <button
                type="button"
                className="v-btn v-btn-outline v-btn-sm"
                onClick={() => onNavigate("findings")}
              >
                Open health check
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export function RuntimeDistributionPage({
  items,
  onNavigate,
}: RuntimeDistributionPageProps) {
  const report = useMemo(
    () => createRuntimeDistributionReport({ items }),
    [items],
  );
  const chartData = report.bins.map((bin) => ({
    binLabel: `${(bin.startMinutes / 60).toFixed(1)}-${(bin.endMinutes / 60).toFixed(1)} h`,
    endMinutes: bin.endMinutes,
    itemCount: bin.itemCount,
    startMinutes: bin.startMinutes,
  }));

  return (
    <div className="v-stack-md">
      <div className="v-metric-grid v-metric-grid-4">
        <ReportStatCard
          accent
          detail={formatMarkerDetail("Median", report.markers.medianMinutes)}
          label="Median runtime"
          value={formatMarkerValue(report.markers.medianMinutes)}
        />
        <ReportStatCard
          detail="long-tail boundary"
          label="P90 runtime"
          value={formatMarkerValue(report.markers.p90Minutes)}
        />
        <ReportStatCard
          detail="titles at or above 24 hours"
          label="Long outliers"
          value={String(report.longOutliers.length)}
        />
        <ReportStatCard
          detail="titles below 4 hours"
          label="Short outliers"
          value={String(report.shortOutliers.length)}
        />
      </div>

      <article className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">Runtime distribution · histogram</div>
            <h2 className="v-card-title">Length across the current library</h2>
          </div>
          <span className="v-pill is-info">Derived presentation</span>
        </div>
        <div className="v-card-body" style={{ height: 360 }}>
          {items.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ bottom: 8, left: 8, right: 24, top: 12 }}
              >
                <CartesianGrid stroke="var(--line-1)" vertical={false} />
                <XAxis
                  dataKey="binLabel"
                  interval={1}
                  stroke="var(--fg-3)"
                  tick={{ fill: "var(--fg-3)", fontSize: 10 }}
                  tickFormatter={(value: string, index) =>
                    index % 2 === 0 ? value.replace(".0", "") : ""
                  }
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--fg-3)"
                  tick={{ fill: "var(--fg-3)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-1)",
                    border: "1px solid var(--line-1)",
                    borderRadius: 2,
                    color: "var(--fg-1)",
                  }}
                  formatter={(value) => [
                    `${formatTooltipCount(value)} items`,
                    "Count",
                  ]}
                />
                <Bar
                  dataKey="itemCount"
                  fill="var(--seq-5)"
                  stroke="var(--line-2)"
                />
                {renderMarkerLine(
                  chartData,
                  report.markers.meanMinutes,
                  "Mean",
                  "var(--chart-2)",
                )}
                {renderMarkerLine(
                  chartData,
                  report.markers.medianMinutes,
                  "Median",
                  "var(--accent)",
                )}
                {renderMarkerLine(
                  chartData,
                  report.markers.p90Minutes,
                  "P90",
                  "var(--chart-4)",
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="v-empty-inline">
              Refresh the library to populate runtime datapoints.
            </p>
          )}
        </div>
      </article>

      <div className="v-two-column-grid">
        <ReportTableCard
          emptyMessage="No long-runtime outliers yet."
          entries={report.longOutliers}
          eyebrow="Long outliers · ≥ 24 hours"
          title="Long-haul listens"
        />
        <ReportTableCard
          emptyMessage="No short-runtime outliers yet."
          entries={report.shortOutliers}
          eyebrow="Short outliers · < 4 hours"
          title="Short stack"
        />
      </div>

      <article className="v-card">
        <div className="v-card-body v-stack-sm">
          <p className="v-body-copy" style={{ margin: 0 }}>
            Summary markers and outlier tables are derived from the current
            runtime datapoints only. Missing markers stay empty until the source
            data exists.
          </p>
          <div
            className="v-card-toolbar"
            style={{ justifyContent: "flex-start" }}
          >
            <button
              type="button"
              className="v-btn v-btn-outline v-btn-sm"
              onClick={() => onNavigate("report-cadence")}
            >
              Listening cadence
            </button>
            <button
              type="button"
              className="v-btn v-btn-outline v-btn-sm"
              onClick={() => onNavigate("reports")}
            >
              Report queue
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

export function GenreTreemapPage({
  items,
}: {
  items: readonly LibraryItemDto[];
}) {
  const report = useMemo(() => createGenreTreemapReport({ items }), [items]);
  const topGenre = report.treemapNodes[0] ?? null;
  const topThreeRuntimeMinutes = report.treemapNodes
    .slice(0, 3)
    .reduce((sum, node) => sum + node.runtimeMinutes, 0);

  if (report.treemapNodes.length === 0) {
    return (
      <ReportEmptyState message="No imported Audible category ladders yet." />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-grid v-metric-grid-4 is-dense">
        <MetricCard
          accent
          label="Top genre · by hours"
          value={topGenre?.label ?? "—"}
          sub={formatHours(topGenre?.runtimeMinutes ?? 0)}
        />
        <MetricCard
          label="Top 3 genres"
          value={`${Math.round((topThreeRuntimeMinutes / Math.max(report.totalRuntimeMinutes, 1)) * 100)} %`}
          sub="of library hours"
        />
        <MetricCard
          label="Visible genres"
          value={String(report.ladderRows.length)}
          sub="from Audible category ladders"
        />
        <MetricCard
          label="Top keyword in leader"
          value={report.topLeaderKeyword?.keyword ?? "—"}
          sub={
            report.topLeaderKeyword
              ? `${report.topLeaderKeyword.itemCount} items`
              : "no signal"
          }
        />
      </div>

      <section className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">
              Genre treemap · category ladders only
            </div>
            <h2 className="v-card-title">
              How the library clusters by subgenre
            </h2>
          </div>
          <span className="v-nav-meta">No external enrichments</span>
        </div>
        <div style={{ padding: "12px 18px 20px" }}>
          <GenreTreemapGraphic nodes={report.treemapNodes} />
        </div>
      </section>

      <div className="v-two-column-grid">
        <section className="v-card">
          <div className="v-card-head">
            <div>
              <div className="v-eyebrow">Category ladder table</div>
              <h2 className="v-card-title">Audible paths kept intact</h2>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <thead>
                <tr>
                  <th>Path</th>
                  <th className="r">Items</th>
                  <th className="r">Hours</th>
                  <th className="r">Done</th>
                </tr>
              </thead>
              <tbody>
                {report.ladderRows.map((row) => (
                  <tr key={row.pathLabel}>
                    <td>
                      <div className="v-cell-title">
                        <span className="v-cell-title-main">
                          {row.path[row.path.length - 1] ?? row.pathLabel}
                        </span>
                        <span className="v-cell-title-sub">
                          {row.path.join(" › ")}
                        </span>
                      </div>
                    </td>
                    <td className="r v-mono">{row.itemCount}</td>
                    <td className="r v-mono">
                      {formatHours(row.runtimeMinutes)}
                    </td>
                    <td className="r v-mono">
                      {Math.round(
                        (row.completedItems / Math.max(row.itemCount, 1)) * 100,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="v-card">
          <div className="v-card-head">
            <div>
              <div className="v-eyebrow">Takeaway</div>
              <h2 className="v-card-title">Why this prototype matters</h2>
            </div>
          </div>
          <div
            className="v-card-body"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div className="v-list-row is-static">
              <div className="v-list-copy">
                <div className="v-eyebrow" style={{ color: "var(--accent)" }}>
                  Backend fit
                </div>
                <p className="v-body-copy">
                  This screen can be powered directly from imported category
                  ladders. It does not need enrichment or taxonomy cleanup to
                  exist in Solid v1.
                </p>
              </div>
            </div>
            <div className="v-list-row is-static">
              <div className="v-list-copy">
                <div className="v-eyebrow">Design choice</div>
                <p className="v-body-copy">
                  The treemap carries hierarchy visually. The ladder table keeps
                  the raw-ish API story visible for Library Owners who want
                  exact source paths.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SubjectKeywordPage({
  items,
}: {
  items: readonly LibraryItemDto[];
}) {
  const report = useMemo(() => createSubjectKeywordReport({ items }), [items]);
  const [hoveredKeyword, setHoveredKeyword] =
    useState<WeightedSubjectKeyword | null>(null);
  const topTrends = report.purchaseYearSeries.slice(0, 6);

  if (report.keywords.length === 0) {
    return (
      <ReportEmptyState message="No imported Audible subject keywords yet." />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        className="v-kpi-grid v-three-column-grid is-dense"
        style={{ gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        <MetricCard
          accent
          label="Unique keywords"
          value={String(report.uniqueKeywordCount)}
          sub="across all items"
        />
        <MetricCard
          label="Most-tagged keyword"
          value={report.keywords[0]?.keyword ?? "—"}
          sub={`${report.keywords[0]?.itemCount ?? 0} items`}
        />
        <MetricCard
          label="Median tags / item"
          value={formatNumber(report.medianKeywordsPerItem)}
          sub="Current Audible Facts only"
        />
      </div>

      <section className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">Weighted cloud · log-scale</div>
            <h2 className="v-card-title">Subject keywords</h2>
          </div>
          <span className="v-nav-meta">
            {hoveredKeyword
              ? `${hoveredKeyword.keyword.toUpperCase()} · ${hoveredKeyword.itemCount} items`
              : "Hover to inspect"}
          </span>
        </div>
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 14px",
            padding: "18px",
          }}
        >
          {report.keywords.map((keyword, index) => (
            <button
              key={keyword.keyword}
              type="button"
              onMouseEnter={() => setHoveredKeyword(keyword)}
              onMouseLeave={() => setHoveredKeyword(null)}
              style={{
                background: "transparent",
                border: 0,
                color: getKeywordColor(index),
                cursor: "default",
                fontFamily: "var(--font-sans)",
                fontSize: `${formatKeywordFontSize(keyword.itemCount, report.keywords)}px`,
                fontWeight: keyword.weight >= 0.67 ? 500 : 400,
                lineHeight: 1,
                padding: 0,
              }}
            >
              {keyword.keyword}
            </button>
          ))}
        </div>
      </section>

      <section className="v-card">
        <div className="v-card-head">
          <div>
            <div className="v-eyebrow">Keyword trend · purchase years</div>
            <h2 className="v-card-title">How taste drifted</h2>
          </div>
        </div>
        <div className="v-card-body">
          <div
            style={{
              alignItems: "center",
              display: "grid",
              gap: 12,
              gridTemplateColumns: "160px 1fr 60px",
            }}
          >
            {topTrends.map((series, index) => (
              <PurchaseTrendRow
                key={series.keyword}
                color={`var(--chart-${(index % 10) + 1})`}
                itemCount={
                  report.keywords.find(
                    (entry) => entry.keyword === series.keyword,
                  )?.itemCount ?? 0
                }
                series={series}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeatmapRow({
  cells,
  label,
  maxCellPurchases,
}: {
  cells: readonly ListeningCadenceCell[];
  label: string;
  maxCellPurchases: number;
}) {
  return (
    <>
      <div className="v-user-meta">{label}</div>
      {cells.map((cell, index) => (
        <div
          key={`${label}-${index}`}
          title={`${label} · ${cell.purchaseCount} purchase${cell.purchaseCount === 1 ? "" : "s"}`}
          style={{
            background: getHeatmapColor(cell.purchaseCount, maxCellPurchases),
            border: "1px solid var(--line-1)",
            height: 14,
          }}
        />
      ))}
    </>
  );
}

function MetricCard({
  accent = false,
  label,
  sub,
  value,
}: {
  accent?: boolean;
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <article className={`v-kpi ${accent ? "is-accent" : ""}`}>
      <div className="v-kpi-label">{label}</div>
      <div className="v-kpi-value">{value}</div>
      <div className="v-kpi-sub">{sub}</div>
    </article>
  );
}

function ReportStatCard({
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
    <article className={`v-kpi ${accent ? "is-accent" : ""}`}>
      <div className="v-eyebrow">{label}</div>
      <div className="v-card-title">{value}</div>
      <div className="v-kpi-detail">{detail}</div>
    </article>
  );
}

function ReportTableCard({
  emptyMessage,
  entries,
  eyebrow,
  title,
}: {
  emptyMessage: string;
  entries: readonly {
    asin: string;
    authors: readonly string[];
    percentComplete: number;
    runtimeMinutes: number;
    title: string;
  }[];
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="v-card">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">{eyebrow}</div>
          <h2 className="v-card-title">{title}</h2>
        </div>
        <span className="v-card-meta">{entries.length} items</span>
      </div>
      <div className="v-card-body is-tight">
        {entries.length > 0 ? (
          <table className="v-table v-table-compact">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th className="r">Runtime</th>
                <th className="r">Completion</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 16).map((entry) => (
                <tr key={entry.asin}>
                  <td>{entry.title}</td>
                  <td>{entry.authors[0] ?? "Unknown"}</td>
                  <td className="r v-mono">
                    {formatRuntimeMinutes(Math.round(entry.runtimeMinutes))}
                  </td>
                  <td className="r v-mono">
                    {entry.percentComplete > 0
                      ? `${entry.percentComplete}%`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="v-card-body">
            <p className="v-empty-inline">{emptyMessage}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function ReportEmptyState({ message }: { message: string }) {
  return (
    <section className="v-card">
      <div className="v-card-head">
        <div>
          <div className="v-eyebrow">Reports</div>
          <h2 className="v-card-title">Waiting on imported facts</h2>
        </div>
      </div>
      <div className="v-card-body">
        <p className="v-body-copy">{message}</p>
      </div>
    </section>
  );
}

function GenreTreemapGraphic({
  nodes,
}: {
  nodes: readonly GenreTreemapNode[];
}) {
  const layout = layoutTreemap(nodes, 0, 0, 1100, 360);

  return (
    <svg
      viewBox="0 0 1100 360"
      width="100%"
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line-1)",
        height: "auto",
      }}
    >
      {layout.map((node, index) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={Math.max(0, node.width - 2)}
            height={Math.max(0, node.height - 2)}
            fill={`var(--chart-${(index % 10) + 1})`}
            opacity="0.92"
            rx="4"
          />
          <text
            x={node.x + 12}
            y={node.y + 22}
            fill="white"
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.08em"
          >
            {node.label.toUpperCase()}
          </text>
          {node.width > 120 && node.height > 76 ? (
            <>
              <text
                x={node.x + 12}
                y={node.y + 52}
                fill="white"
                fontFamily="var(--font-mono)"
                fontSize="24"
                fontWeight="500"
              >
                {node.itemCount}
              </text>
              <text
                x={node.x + 12}
                y={node.y + 72}
                fill="rgba(255,255,255,0.88)"
                fontSize="13"
              >
                {formatHours(node.runtimeMinutes)} ·{" "}
                {Math.round(
                  (node.completedItems / Math.max(node.itemCount, 1)) * 100,
                )}
                % complete
              </text>
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function PurchaseTrendRow({
  color,
  itemCount,
  series,
}: {
  color: string;
  itemCount: number;
  series: {
    keyword: string;
    buckets: readonly { itemCount: number; year: number }[];
  };
}) {
  const maxBucketCount = Math.max(
    1,
    ...series.buckets.map((bucket) => bucket.itemCount),
  );
  const width = Math.max(series.buckets.length, 1) * 50;

  return (
    <>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          fontSize: 13,
          fontWeight: 500,
          gap: 8,
        }}
      >
        <span
          style={{ background: color, flexShrink: 0, height: 10, width: 10 }}
        />
        {series.keyword}
      </div>
      <svg
        viewBox={`0 0 ${width} 36`}
        width="100%"
        height="36"
        preserveAspectRatio="none"
      >
        {series.buckets.map((bucket, index) => {
          const height = (bucket.itemCount / maxBucketCount) * 28;

          return (
            <g key={`${series.keyword}-${bucket.year}`}>
              <rect
                x={index * 50 + 4}
                y={32 - height}
                width={40}
                height={height}
                fill={color}
                rx="2"
              />
              <text
                x={index * 50 + 24}
                y={35}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--fg-3)"
              >
                {String(bucket.year).slice(-2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        className="v-mono"
        style={{ color: "var(--fg-2)", fontSize: 12, textAlign: "right" }}
      >
        {itemCount}
      </div>
    </>
  );
}

function formatMarkerDetail(label: string, minutes: number | null): string {
  return minutes === null
    ? `${label.toLowerCase()} pending source data`
    : `${label} ${formatRuntimeMinutes(Math.round(minutes))}`;
}

function formatMarkerValue(minutes: number | null): string {
  return minutes === null ? "-" : formatRuntimeMinutes(Math.round(minutes));
}

function formatTooltipCount(
  value: number | string | readonly (number | string)[] | undefined,
): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? 0);
  }

  return String(value ?? 0);
}

function getHeatmapColor(
  purchaseCount: number,
  maxCellPurchases: number,
): string {
  if (purchaseCount <= 0 || maxCellPurchases <= 0) {
    return "var(--bg-2)";
  }

  const rampIndex = Math.min(
    7,
    Math.max(1, Math.ceil((purchaseCount / maxCellPurchases) * 7)),
  );

  return `var(--seq-${rampIndex})`;
}

function renderMarkerLine(
  bins: readonly {
    binLabel: string;
    endMinutes: number;
    startMinutes: number;
  }[],
  minutes: number | null,
  label: string,
  color: string,
) {
  if (minutes === null) {
    return null;
  }

  const markerBin =
    bins.find(
      (bin) => minutes >= bin.startMinutes && minutes < bin.endMinutes,
    ) ?? bins.at(-1);

  if (!markerBin) {
    return null;
  }

  return (
    <ReferenceLine
      key={label}
      x={markerBin.binLabel}
      stroke={color}
      strokeDasharray="4 4"
      label={{
        fill: color,
        fontSize: 10,
        position: "top",
        value: `${label} · ${formatRuntimeMinutes(Math.round(minutes))}`,
      }}
    />
  );
}

function layoutTreemap(
  nodes: readonly GenreTreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  vertical = true,
): Array<
  GenreTreemapNode & { height: number; width: number; x: number; y: number }
> {
  if (nodes.length === 0) {
    return [];
  }

  if (nodes.length === 1) {
    return [{ ...nodes[0], height, width, x, y }];
  }

  const totalValue = nodes.reduce((sum, node) => sum + node.value, 0) || 1;
  let splitValue = 0;
  let splitIndex = 0;

  while (splitIndex < nodes.length - 1 && splitValue < totalValue / 2) {
    splitValue += nodes[splitIndex]?.value ?? 0;
    splitIndex += 1;
  }

  const first = nodes.slice(0, splitIndex);
  const second = nodes.slice(splitIndex);
  const firstShare = splitValue / totalValue;

  if (vertical) {
    const firstWidth = width * firstShare;

    return [
      ...layoutTreemap(first, x, y, firstWidth, height, !vertical),
      ...layoutTreemap(
        second,
        x + firstWidth,
        y,
        width - firstWidth,
        height,
        !vertical,
      ),
    ];
  }

  const firstHeight = height * firstShare;

  return [
    ...layoutTreemap(first, x, y, width, firstHeight, !vertical),
    ...layoutTreemap(
      second,
      x,
      y + firstHeight,
      width,
      height - firstHeight,
      !vertical,
    ),
  ];
}

function formatHours(runtimeMinutes: number): string {
  return `${Math.round(runtimeMinutes / 60)} h`;
}

function formatKeywordFontSize(
  count: number,
  keywords: readonly WeightedSubjectKeyword[],
): number {
  const maxCount = keywords[0]?.itemCount ?? count;
  const minCount = keywords[keywords.length - 1]?.itemCount ?? count;

  if (maxCount <= minCount) {
    return 32;
  }

  const scaled =
    (Math.log(count) - Math.log(minCount)) /
    (Math.log(maxCount) - Math.log(minCount));

  return 13 + scaled * 43;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getKeywordColor(index: number): string {
  if (index < 10) {
    return `var(--chart-${index + 1})`;
  }

  if (index < 18) {
    return "var(--ink-800)";
  }

  return "var(--ink-500)";
}

function resolveCadenceReferenceDate(
  completedAtUtc: string | null,
  items: readonly LibraryItemDto[],
): Date {
  if (completedAtUtc) {
    return new Date(completedAtUtc);
  }

  let latestPurchaseDate: Date | null = null;

  for (const item of items) {
    const purchaseDate = readPurchaseDateFromRawPayload(item);

    if (
      purchaseDate !== null &&
      (latestPurchaseDate === null || purchaseDate > latestPurchaseDate)
    ) {
      latestPurchaseDate = purchaseDate;
    }
  }

  return latestPurchaseDate ?? new Date("2000-01-01T12:00:00.000Z");
}

function readPurchaseDateFromRawPayload(item: LibraryItemDto): Date | null {
  try {
    const raw = JSON.parse(item.rawAudiblePayload) as {
      purchase_date?: string;
    };
    const purchaseDate = raw.purchase_date;

    if (!purchaseDate) {
      return null;
    }

    const parsedDate = new Date(`${purchaseDate}T12:00:00.000Z`);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch {
    return null;
  }
}
