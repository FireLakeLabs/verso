/* global React, Cover, formatHoursShort, KPI, I */
// =============================================================
// VERSO — Reports: Author Pareto, Runtime Distribution,
//                  Cover Art Wall, Subject Keyword Cloud
// =============================================================
const { useState: useStateR, useMemo: useMemoR } = React;

// ====================================================================
// AUTHOR CONCENTRATION (Pareto)
// ====================================================================
function ReportAuthors({ data, onNavigate }) {
  const [mode, setMode] = useStateR("hours"); // hours | count
  const authors = useMemoR(() => {
    return [...data.authors].sort((a, b) => mode === "hours" ? b.hours - a.hours : b.count - a.count);
  }, [data, mode]);
  const total = authors.reduce((s, a) => s + (mode === "hours" ? a.hours : a.count), 0);

  // Build pareto data: top 30 + "Other"
  const TOP = 30;
  const top = authors.slice(0, TOP);
  const otherSum = authors.slice(TOP).reduce((s, a) => s + (mode === "hours" ? a.hours : a.count), 0);

  const cumulative = [];
  let acc = 0;
  for (const a of top) {
    const v = mode === "hours" ? a.hours : a.count;
    acc += v;
    cumulative.push({ author: a.name, val: v, cum: acc / total * 100 });
  }
  const otherCum = (acc + otherSum) / total * 100;

  const maxVal = Math.max(...top.map(a => mode === "hours" ? a.hours : a.count));

  // Find author who passes 50% threshold
  const half = cumulative.findIndex(c => c.cum >= 50);
  const eighty = cumulative.findIndex(c => c.cum >= 80);

  // Gini-ish concentration
  const top5pc = (top.slice(0, 5).reduce((s, a) => s + (mode === "hours" ? a.hours : a.count), 0) / total * 100).toFixed(0);
  const top10pc = (top.slice(0, 10).reduce((s, a) => s + (mode === "hours" ? a.hours : a.count), 0) / total * 100).toFixed(0);

  // Chart geometry
  const W = 1100, H = 360, ML = 50, MR = 50, MT = 24, MB = 60;
  const innerW = W - ML - MR, innerH = H - MT - MB;
  const barW = innerW / (TOP + 1) * 0.78;
  const x = (i) => ML + (i + 0.5) * (innerW / (TOP + 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label={`Top author · by ${mode}`} value={top[0].name.split(" ")[0] + " " + top[0].name.split(" ")[1][0] + "."}
             sub={mode === "hours" ? Math.round(top[0].hours) + " h · " + top[0].count + " books" : top[0].count + " books · " + Math.round(top[0].hours) + " h"} accent />
        <KPI label="Top 5 authors" value={top5pc + " %"} sub={"of library " + mode} />
        <KPI label="Top 10 authors" value={top10pc + " %"} sub={"of library " + mode} />
        <KPI label="Long tail · authors" value={(authors.length - TOP).toLocaleString()} sub={"contribute " + Math.round(100 - (acc / total * 100)) + " %"} />
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Author concentration · Pareto</div>
            <h3 className="v-card-title">Top {TOP} authors by {mode}</h3>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "inline-flex", border: "1px solid var(--line-2)" }}>
              <button className="v-btn v-btn-sm" style={{ borderRadius: 0, background: mode === "hours" ? "var(--ink-950)" : "white", color: mode === "hours" ? "white" : "var(--fg-2)" }}
                      onClick={() => setMode("hours")}>By hours</button>
              <button className="v-btn v-btn-sm" style={{ borderRadius: 0, background: mode === "count" ? "var(--ink-950)" : "white", color: mode === "count" ? "white" : "var(--fg-2)", borderLeft: "1px solid var(--line-2)" }}
                      onClick={() => setMode("count")}>By count</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 18px 24px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }}>
            {/* Grid */}
            {[0, 25, 50, 75, 100].map(p => {
              const y = MT + innerH * (1 - p / 100);
              return <g key={p}>
                <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="var(--line-1)" strokeWidth="1" strokeDasharray={p === 50 || p === 80 ? "" : "2 3"} />
                <text x={W - MR + 6} y={y + 4} fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)" letterSpacing="0.08em">{p} %</text>
                <text x={ML - 8} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)" letterSpacing="0.08em">
                  {Math.round(maxVal * p / 100)}
                </text>
              </g>;
            })}
            {/* Bars — top three get distinct chart colors, rest fade through slate ramp */}
            {top.map((a, i) => {
              const v = mode === "hours" ? a.hours : a.count;
              const h = (v / maxVal) * innerH;
              let fill;
              if (i === 0) fill = "var(--chart-1)";        // ember — the subject
              else if (i === 1) fill = "var(--chart-2)";   // ocean
              else if (i === 2) fill = "var(--chart-3)";   // moss
              else if (i < 8) fill = "var(--ink-400)";
              else fill = "var(--ink-300)";
              return <g key={a.name}>
                <rect x={x(i) - barW / 2} y={MT + innerH - h} width={barW} height={h} fill={fill} />
              </g>;
            })}
            {/* Cumulative line — neutral graphite so it reads as a different channel */}
            <polyline points={cumulative.map((c, i) => `${x(i)},${MT + innerH * (1 - c.cum / 100)}`).join(" ")}
                      fill="none" stroke="var(--chart-10)" strokeWidth="1.5" />
            {cumulative.map((c, i) => (
              <circle key={i} cx={x(i)} cy={MT + innerH * (1 - c.cum / 100)} r="2.2" fill="var(--chart-10)" />
            ))}
            {/* 50 % / 80 % crossings */}
            {half >= 0 && (
              <g>
                <line x1={x(half)} x2={x(half)} y1={MT} y2={MT + innerH} stroke="var(--ember-500)" strokeDasharray="3 3" strokeWidth="1" />
                <text x={x(half) + 6} y={MT + 12} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ember-500)" letterSpacing="0.08em">50 % AT {half + 1}</text>
              </g>
            )}
            {eighty >= 0 && (
              <g>
                <line x1={x(eighty)} x2={x(eighty)} y1={MT} y2={MT + innerH} stroke="var(--ink-700)" strokeDasharray="3 3" strokeWidth="1" />
                <text x={x(eighty) + 6} y={MT + 24} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-700)" letterSpacing="0.08em">80 % AT {eighty + 1}</text>
              </g>
            )}
            {/* Author labels (every other) */}
            {top.map((a, i) => {
              const parts = a.name.split(" ");
              const label = parts[0][0] + ". " + parts[parts.length - 1];
              if (i % 2 === 1) return null;
              return <text key={a.name} x={x(i)} y={H - MB + 16}
                           textAnchor="start" fontFamily="var(--font-mono)" fontSize="9"
                           fill="var(--fg-3)" letterSpacing="0.04em"
                           transform={`rotate(28 ${x(i)} ${H - MB + 16})`}>
                {label}
              </text>;
            })}
          </svg>
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line-1)", background: "var(--ink-50)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="v-eyebrow">Takeaway</div>
          <div style={{ fontSize: 13, color: "var(--ink-900)" }}>
            <strong>{half + 1}</strong> authors carry half your library {mode} · <strong>{eighty + 1}</strong> carry 80 %.
          </div>
          <button className="v-btn v-btn-outline v-btn-sm">{I.download} Export this view</button>
        </div>
      </div>

      {/* Full list */}
      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">All authors</div>
            <h3 className="v-card-title">{authors.length} authors · ranked by {mode}</h3>
          </div>
        </div>
        <div className="v-card-body is-tight" style={{ maxHeight: 460, overflow: "auto" }}>
          <table className="v-table is-compact">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Author</th>
                <th className="r">Books</th>
                <th className="r">Hours</th>
                <th className="r">Share</th>
                <th>Concentration</th>
              </tr>
            </thead>
            <tbody>
              {authors.slice(0, 80).map((a, i) => {
                const v = mode === "hours" ? a.hours : a.count;
                const share = v / total * 100;
                return (
                  <tr key={a.name}>
                    <td className="v-mono v-td-mute">{(i + 1).toString().padStart(2, "0")}</td>
                    <td className="v-td-name">{a.name}</td>
                    <td className="r v-mono">{a.count}</td>
                    <td className="r v-mono">{Math.round(a.hours)}</td>
                    <td className="r v-mono">{share.toFixed(1)} %</td>
                    <td>
                      <div className="v-progress is-thin">
                        <div className="v-progress-bar" style={{
                          width: (v / maxVal * 100) + "%",
                          background: i < 10 ? `var(--chart-${(i % 10) + 1})` : "var(--ink-400)",
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// RUNTIME DISTRIBUTION
// ====================================================================
function ReportRuntime({ data }) {
  // 0 → 40 hours in 1.5h bins
  const BIN = 90;
  const MAX_MIN = 40 * 60;
  const NUM = Math.ceil(MAX_MIN / BIN);
  const bins = new Array(NUM).fill(0);
  for (const it of data.items) {
    const b = Math.min(NUM - 1, Math.floor(it.runtime_length_min / BIN));
    bins[b] += 1;
  }
  const maxBin = Math.max(...bins);
  const sorted = [...data.items].sort((a, b) => a.runtime_length_min - b.runtime_length_min);
  const median = sorted[Math.floor(sorted.length / 2)].runtime_length_min;
  const mean = data.items.reduce((s, it) => s + it.runtime_length_min, 0) / data.items.length;
  const p90 = sorted[Math.floor(sorted.length * 0.9)].runtime_length_min;
  const doorstoppers = data.items.filter(it => it.runtime_length_min >= 24 * 60);
  const novellas = data.items.filter(it => it.runtime_length_min < 4 * 60);

  // Chart geometry
  const W = 1100, H = 320, ML = 50, MR = 30, MT = 24, MB = 44;
  const innerW = W - ML - MR, innerH = H - MT - MB;
  const xb = (i) => ML + (i + 0.5) * (innerW / NUM);
  const binW = innerW / NUM * 0.85;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Median runtime" value={formatHoursShort(median)} accent sub={`mean ${formatHoursShort(Math.round(mean))}`} />
        <KPI label="P90 runtime" value={formatHoursShort(p90)} sub="long-tail boundary" />
        <KPI label="Doorstoppers · ≥ 24 h" value={doorstoppers.length} sub={`${(doorstoppers.length / data.items.length * 100).toFixed(0)} % of library`} />
        <KPI label="Novellas · < 4 h" value={novellas.length} sub={`${(novellas.length / data.items.length * 100).toFixed(0)} % of library`} />
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Runtime distribution · histogram</div>
            <h3 className="v-card-title">Length, in hours</h3>
          </div>
          <span className="v-card-meta">{NUM} BINS · {BIN / 60} H EACH</span>
        </div>
        <div style={{ padding: "8px 18px 24px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }}>
            {/* Y grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = MT + innerH * (1 - p);
              return <g key={i}>
                <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="var(--line-1)" />
                <text x={ML - 8} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)">
                  {Math.round(maxBin * p)}
                </text>
              </g>;
            })}
            {/* Bars — median bar in ember; others in a single-hue slate ramp so the histogram reads as one distribution */}
            {bins.map((v, i) => {
              const h = (v / maxBin) * innerH;
              const isMedianBin = Math.floor(median / BIN) === i;
              let fill;
              if (isMedianBin) fill = "var(--chart-1)";
              else {
                const rampIdx = Math.min(6, Math.max(1, Math.round(v / maxBin * 6)));
                fill = `var(--seq-${rampIdx})`;
              }
              return <rect key={i} x={xb(i) - binW / 2} y={MT + innerH - h} width={binW} height={h} fill={fill} />;
            })}
            {/* Median line */}
            <line x1={ML + (median / MAX_MIN) * innerW} x2={ML + (median / MAX_MIN) * innerW}
                  y1={MT} y2={MT + innerH} stroke="var(--ember-500)" strokeDasharray="3 3" />
            <text x={ML + (median / MAX_MIN) * innerW + 6} y={MT + 12} fontFamily="var(--font-mono)" fontSize="10" fill="var(--ember-500)" letterSpacing="0.08em">
              MEDIAN · {formatHoursShort(median)}
            </text>
            {/* X axis ticks */}
            {[0, 5, 10, 15, 20, 25, 30, 35, 40].map(h => {
              const xx = ML + (h * 60 / MAX_MIN) * innerW;
              return <g key={h}>
                <line x1={xx} x2={xx} y1={MT + innerH} y2={MT + innerH + 4} stroke="var(--ink-300)" />
                <text x={xx} y={MT + innerH + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)" letterSpacing="0.06em">
                  {h} H
                </text>
              </g>;
            })}
            <line x1={ML} x2={W - MR} y1={MT + innerH} y2={MT + innerH} stroke="var(--ink-700)" />
          </svg>
        </div>
      </div>

      {/* Doorstopper list */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Doorstoppers · ≥ 24 hours</div>
              <h3 className="v-card-title">Long-haul listens</h3>
            </div>
            <span className="v-card-meta">{doorstoppers.length} ITEMS</span>
          </div>
          <div className="v-card-body is-tight" style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="v-table is-compact">
              <tbody>
                {doorstoppers.sort((a, b) => b.runtime_length_min - a.runtime_length_min).slice(0, 16).map(it => (
                  <tr key={it.asin}>
                    <td className="v-td-name v-td-trunc">{it.title}</td>
                    <td className="v-td-mute" style={{ fontSize: 12 }}>{it.author}</td>
                    <td className="r v-mono">{formatHoursShort(it.runtime_length_min)}</td>
                    <td className="r v-mono">{it.percent_complete === 0 ? "—" : it.percent_complete + " %"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Novellas · &lt; 4 hours</div>
              <h3 className="v-card-title">Short stack</h3>
            </div>
            <span className="v-card-meta">{novellas.length} ITEMS</span>
          </div>
          <div className="v-card-body is-tight" style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="v-table is-compact">
              <tbody>
                {novellas.sort((a, b) => a.runtime_length_min - b.runtime_length_min).slice(0, 16).map(it => (
                  <tr key={it.asin}>
                    <td className="v-td-name v-td-trunc">{it.title}</td>
                    <td className="v-td-mute" style={{ fontSize: 12 }}>{it.author}</td>
                    <td className="r v-mono">{formatHoursShort(it.runtime_length_min)}</td>
                    <td className="r v-mono">{it.percent_complete === 0 ? "—" : it.percent_complete + " %"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// COVER WALL
// ====================================================================
function ReportCoverWall({ data, onOpenItem }) {
  const [sort, setSort] = useStateR("recent"); // recent | runtime | random | palette
  const items = useMemoR(() => {
    let list = [...data.items];
    if (sort === "recent") list.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
    if (sort === "runtime") list.sort((a, b) => b.runtime_length_min - a.runtime_length_min);
    if (sort === "palette") list.sort((a, b) => (a.product_image_seed % 13) - (b.product_image_seed % 13));
    if (sort === "random") list.sort((a, b) => (a.product_image_seed * 7 % 1001) - (b.product_image_seed * 7 % 1001));
    return list;
  }, [data, sort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">{data.items.length.toLocaleString()} covers</div>
            <h3 className="v-card-title">Cover wall</h3>
          </div>
          <div style={{ display: "inline-flex", border: "1px solid var(--line-2)" }}>
            {[["recent", "Recent"], ["runtime", "Runtime"], ["palette", "Palette"], ["random", "Random"]].map(([k, n]) => (
              <button key={k} className="v-btn v-btn-sm"
                      style={{ borderRadius: 0, background: sort === k ? "var(--ink-950)" : "white", color: sort === k ? "white" : "var(--fg-2)", borderLeft: k !== "recent" ? "1px solid var(--line-2)" : "none" }}
                      onClick={() => setSort(k)}>{n}</button>
            ))}
          </div>
        </div>
        <div className="v-wall" style={{ padding: 2 }}>
          {items.map(it => (
            <div key={it.asin} className="v-wall-tile" onClick={() => onOpenItem(it)} title={`${it.title} — ${it.author}`}>
              <Cover item={it} showMeta={false} hideSeriesNum />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// SUBJECT KEYWORD CLOUD
// ====================================================================
function ReportKeywords({ data }) {
  const [hover, setHover] = useStateR(null);
  const max = data.keywords[0].count;
  const min = data.keywords[data.keywords.length - 1].count;
  // Map count → size 13..56
  const sizeOf = (c) => 13 + (Math.log(c) - Math.log(min)) / (Math.log(max) - Math.log(min)) * 38;

  // For trend: bucket by 8 buckets across purchase_date, for top 6 keywords
  const TOP_TREND = data.keywords.slice(0, 6);
  const minDate = Math.min(...data.items.map(it => new Date(it.purchase_date).getTime()));
  const maxDate = Math.max(...data.items.map(it => new Date(it.purchase_date).getTime()));
  const BUCKETS = 8;
  const trend = TOP_TREND.map(k => {
    const buckets = new Array(BUCKETS).fill(0);
    for (const it of data.items) {
      if (it.thesaurus_subject_keywords.includes(k.keyword)) {
        const f = (new Date(it.purchase_date).getTime() - minDate) / (maxDate - minDate);
        const b = Math.min(BUCKETS - 1, Math.floor(f * BUCKETS));
        buckets[b] += 1;
      }
    }
    return { keyword: k.keyword, buckets };
  });
  const trendMax = Math.max(...trend.flatMap(t => t.buckets));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-3">
        <KPI label="Unique keywords" value={data.keywords.length} accent sub="across all items" />
        <KPI label="Most-tagged keyword" value={data.keywords[0].keyword} sub={data.keywords[0].count + " items"} />
        <KPI label="Median tags / item" value="3" sub="incl. cross-genre wander" />
      </div>
      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Weighted cloud · log-scale</div>
            <h3 className="v-card-title">Subject keywords</h3>
          </div>
          {hover && <span className="v-card-meta">{hover.keyword.toUpperCase()} · {hover.count} ITEMS</span>}
        </div>
        <div className="v-wordcloud">
          {data.keywords.map((k, i) => {
            // Top 10 each get a distinct chart color; tail fades through slate.
            let color;
            if (i < 10) color = `var(--chart-${i + 1})`;
            else if (i < 18) color = "var(--ink-800)";
            else color = "var(--ink-500)";
            return (
              <span key={k.keyword}
                    className="v-wordcloud-word"
                    style={{
                      fontSize: sizeOf(k.count) + "px",
                      fontWeight: k.count > max * 0.5 ? 500 : 400,
                      color,
                    }}
                    onMouseEnter={() => setHover(k)}
                    onMouseLeave={() => setHover(null)}>
                {k.keyword}
              </span>
            );
          })}
        </div>
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Keyword trend · top 6 · 8 buckets across purchase history</div>
            <h3 className="v-card-title">How taste drifted</h3>
          </div>
        </div>
        <div className="v-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 60px", gap: 12, alignItems: "center" }}>
            {trend.map((t, ti) => {
              const total = t.buckets.reduce((a, b) => a + b, 0);
              const color = `var(--chart-${ti + 1})`;
              return (
                <React.Fragment key={t.keyword}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 10, height: 10, background: color, flexShrink: 0 }} />
                    {t.keyword}
                  </div>
                  <svg viewBox={`0 0 ${BUCKETS * 50} 32`} width="100%" height="32" preserveAspectRatio="none">
                    {t.buckets.map((v, i) => {
                      const h = (v / trendMax) * 28;
                      return <rect key={i} x={i * 50 + 4} y={32 - h - 2} width={40} height={h} fill={color} />;
                    })}
                  </svg>
                  <div className="v-mono" style={{ textAlign: "right", fontSize: 12, color: "var(--fg-2)" }}>{total}</div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ReportAuthors, ReportRuntime, ReportCoverWall, ReportKeywords });
