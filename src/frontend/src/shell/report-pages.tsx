import { useMemo, useState } from "react";
import type { LibraryItemDto } from "../library-api";
import {
  createGenreTreemapReport,
  type GenreTreemapNode,
} from "../reports/genre-treemap-report";
import {
  createSubjectKeywordReport,
  type WeightedSubjectKeyword,
} from "../reports/subject-keyword-report";

type ReportView = "report-genre" | "report-keywords" | "reports";

export function ReportsHubPage({
  onNavigate,
}: {
  onNavigate: (view: ReportView) => void;
}) {
  return (
    <section className="v-route-grid">
      {[
        {
          title: "Genre treemap",
          label: "Live now",
          body: "Category hierarchy aggregation from imported Audible ladders with a treemap and raw ladder table.",
          view: "report-genre" as const,
        },
        {
          title: "Subject keywords",
          label: "Live now",
          body: "Weighted subject keywords across the library with a cloud-first read and purchase-history support.",
          view: "report-keywords" as const,
        },
        {
          title: "Listening cadence",
          label: "Queue",
          body: "Existing report destination remains available while cadence visuals land in its dedicated slice.",
          view: "reports" as const,
        },
        {
          title: "Author and narrator reports",
          label: "Queue",
          body: "Signed-off routes stay visible without inventing unfinished behavior beyond this issue.",
          view: "reports" as const,
        },
        {
          title: "Cost per hour",
          label: "Queue",
          body: "Cost basis settings and the final view still extend from the shared reports shell.",
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
          </button>
        </article>
      ))}
    </section>
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
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}
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
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 14px",
            padding: "18px",
            alignItems: "baseline",
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
              display: "grid",
              gridTemplateColumns: "160px 1fr 60px",
              gap: 12,
              alignItems: "center",
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
    buckets: readonly { year: number; itemCount: number }[];
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
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <span
          style={{ width: 10, height: 10, background: color, flexShrink: 0 }}
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

function layoutTreemap(
  nodes: readonly GenreTreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  vertical = true,
): Array<
  GenreTreemapNode & { x: number; y: number; width: number; height: number }
> {
  if (nodes.length === 0) {
    return [];
  }

  if (nodes.length === 1) {
    return [{ ...nodes[0], x, y, width, height }];
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
