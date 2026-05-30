/* global React, KPI, I, formatHoursShort, formatPrice, relativeTime */
// =============================================================
// VERSO — Missing Solid v1 prototype screens
// =============================================================
const {
  useMemo: useMemoMissing,
  useState: useStateMissing,
  useEffect: useEffectMissing,
} = React;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short" });
const MONTH_YEAR_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });

function genreOf(item) {
  return item.category_ladders && item.category_ladders[0] ? item.category_ladders[0][2] : "Unknown";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function effectiveCost(item, basis, creditValue) {
  const paid = item.price == null ? creditValue : item.price;
  if (basis === "list") return paid;
  return Math.min(paid, creditValue);
}

function buildCadenceModel(data) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const heatmap = Array.from({ length: 52 }, () => Array(7).fill(0));
  for (const item of data.items) {
    const purchase = new Date(`${item.purchase_date}T12:00:00`);
    const diffWeeks = Math.floor((now - purchase) / (7 * DAY_MS));
    if (diffWeeks >= 0 && diffWeeks < 52) {
      const col = 51 - diffWeeks;
      const row = (purchase.getDay() + 6) % 7;
      heatmap[col][row] += 1;
    }
  }

  const weeklyTotals = heatmap.map((column) => column.reduce((sum, count) => sum + count, 0));
  const maxHeat = Math.max(...heatmap.flat(), 1);
  const busiestWeek = Math.max(...weeklyTotals, 0);
  const activeWeeks = weeklyTotals.filter((count) => count > 0).length;
  const deepProgress = data.items.filter((item) => item.percent_complete >= 50).length;
  const staleRecent = data.items.filter((item) => {
    const purchase = new Date(`${item.purchase_date}T12:00:00`);
    return now - purchase < 90 * DAY_MS && item.percent_complete === 0;
  }).length;

  const monthlyBuckets = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthlyBuckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: MONTH_FMT.format(date),
      month: date.getMonth(),
      year: date.getFullYear(),
      total: 0,
      completed: 0,
      inProgress: 0,
      untouched: 0,
    });
  }

  for (const item of data.items) {
    const purchase = new Date(`${item.purchase_date}T12:00:00`);
    const key = `${purchase.getFullYear()}-${purchase.getMonth()}`;
    const bucket = monthlyBuckets.find((entry) => entry.key === key);
    if (!bucket) continue;
    bucket.total += 1;
    if (item.percent_complete >= 95) bucket.completed += 1;
    else if (item.percent_complete >= 1) bucket.inProgress += 1;
    else bucket.untouched += 1;
  }

  const burstWeeks = weeklyTotals
    .map((count, index) => {
      const weeksAgo = 51 - index;
      const end = new Date(now.getTime() - weeksAgo * 7 * DAY_MS);
      const start = new Date(end.getTime() - 6 * DAY_MS);
      return {
        count,
        label: `${MONTH_FMT.format(start)} ${start.getDate()}–${MONTH_FMT.format(end)} ${end.getDate()}`,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { heatmap, maxHeat, busiestWeek, activeWeeks, deepProgress, staleRecent, monthlyBuckets, burstWeeks };
}

function ReportCadence({ data }) {
  const model = useMemoMissing(() => buildCadenceModel(data), [data]);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Active weeks" value={model.activeWeeks} accent sub="with at least one purchase" />
        <KPI label="Busiest week" value={`${model.busiestWeek} adds`} sub="in the last 52 weeks" />
        <KPI label="Deep-progress items" value={model.deepProgress} sub="50%+ complete right now" />
        <KPI label="Recent untouched" value={model.staleRecent} sub="bought in 90d, still unopened" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.85fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Listening cadence · calendar heatmap</div>
              <h3 className="v-card-title">Purchase rhythm across the last 52 weeks</h3>
            </div>
            <span className="v-card-meta">NO INVENTED LISTEN DATES</span>
          </div>
          <div className="v-card-body" style={{ paddingTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "28px repeat(52, minmax(0, 1fr))", gap: 4, alignItems: "center" }}>
              {dayLabels.map((label, row) => (
                <React.Fragment key={label + row}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                  {model.heatmap.map((column, col) => {
                    const count = column[row];
                    const ramp = count === 0 ? "var(--ink-50)" : `var(--seq-${clamp(Math.ceil((count / model.maxHeat) * 7), 1, 7)})`;
                    return (
                      <div
                        key={`${row}-${col}`}
                        title={`${label} · ${count} purchase${count === 1 ? "" : "s"}`}
                        style={{
                          height: 14,
                          border: "1px solid var(--line-1)",
                          background: ramp,
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)" }}>
                <span>Less</span>
                {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
                  <span key={idx} style={{ width: 14, height: 10, display: "inline-block", border: "1px solid var(--line-1)", background: `var(--seq-${idx})` }} />
                ))}
                <span>More</span>
              </div>
              <span className="v-card-meta">MOST RECENT →</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Interpretation boundary</div>
                <h3 className="v-card-title">Completion signal by purchase cohort</h3>
              </div>
            </div>
            <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {model.monthlyBuckets.map((bucket) => {
                const total = Math.max(bucket.total, 1);
                return (
                  <div key={bucket.key} style={{ display: "grid", gridTemplateColumns: "48px 1fr 56px", gap: 10, alignItems: "center" }}>
                    <div className="v-eyebrow" style={{ color: "var(--fg-2)" }}>{bucket.label}</div>
                    <div style={{ display: "flex", height: 12, border: "1px solid var(--line-1)" }}>
                      <div style={{ width: `${(bucket.completed / total) * 100}%`, background: "var(--positive)" }} />
                      <div style={{ width: `${(bucket.inProgress / total) * 100}%`, background: "var(--ember-500)" }} />
                      <div style={{ width: `${(bucket.untouched / total) * 100}%`, background: "var(--ink-200)" }} />
                    </div>
                    <div className="v-mono" style={{ fontSize: 11, textAlign: "right", color: "var(--fg-2)" }}>{bucket.total || "—"}</div>
                  </div>
                );
              })}
              <div className="v-callout" style={{ marginTop: 4 }}>
                <span className="v-callout-l">Current facts only</span>
                <span>Solid v1 does not infer listen-session history. This view shows purchase cadence plus current completion against each purchase cohort.</span>
              </div>
            </div>
          </div>

          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Burst weeks</div>
                <h3 className="v-card-title">Acquisition spikes</h3>
              </div>
            </div>
            <div className="v-card-body is-tight">
              <table className="v-table is-compact">
                <tbody>
                  {model.burstWeeks.map((week) => (
                    <tr key={week.label}>
                      <td className="v-td-name">{week.label}</td>
                      <td className="r v-mono">{week.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildGenreModel(data) {
  const map = {};
  for (const item of data.items) {
    const genre = genreOf(item);
    if (!map[genre]) map[genre] = { genre, count: 0, hours: 0, completed: 0, keywords: {} };
    map[genre].count += 1;
    map[genre].hours += item.runtime_length_min / 60;
    if (item.percent_complete >= 95) map[genre].completed += 1;
    for (const keyword of item.thesaurus_subject_keywords) map[genre].keywords[keyword] = (map[genre].keywords[keyword] || 0) + 1;
  }
  const genres = Object.values(map).sort((a, b) => b.hours - a.hours);
  const totalHours = genres.reduce((sum, genre) => sum + genre.hours, 0) || 1;
  const topThree = genres.slice(0, 3).reduce((sum, genre) => sum + genre.hours, 0);
  const topGenre = genres[0];
  const topTreemap = genres.map((genre, index) => ({
    ...genre,
    value: genre.hours,
    color: `var(--chart-${(index % 10) + 1})`,
  }));
  return { genres, totalHours, topThree, topGenre, treemap: layoutTreemap(topTreemap, 0, 0, 1100, 360) };
}

function layoutTreemap(nodes, x, y, w, h, vertical = true, out = []) {
  if (!nodes.length) return out;
  if (nodes.length === 1) {
    out.push({ ...nodes[0], x, y, w, h });
    return out;
  }
  const total = nodes.reduce((sum, node) => sum + node.value, 0) || 1;
  let splitTotal = 0;
  let splitIndex = 0;
  while (splitIndex < nodes.length - 1 && splitTotal < total / 2) {
    splitTotal += nodes[splitIndex].value;
    splitIndex += 1;
  }
  const first = nodes.slice(0, splitIndex);
  const second = nodes.slice(splitIndex);
  const firstShare = splitTotal / total;
  if (vertical) {
    const w1 = w * firstShare;
    layoutTreemap(first, x, y, w1, h, !vertical, out);
    layoutTreemap(second, x + w1, y, w - w1, h, !vertical, out);
  } else {
    const h1 = h * firstShare;
    layoutTreemap(first, x, y, w, h1, !vertical, out);
    layoutTreemap(second, x, y + h1, w, h - h1, !vertical, out);
  }
  return out;
}

function ReportGenre({ data }) {
  const model = useMemoMissing(() => buildGenreModel(data), [data]);
  const topGenreKeyword = Object.entries(model.topGenre.keywords).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Top genre · by hours" value={model.topGenre.genre} accent sub={`${Math.round(model.topGenre.hours)} h`} />
        <KPI label="Top 3 genres" value={`${Math.round((model.topThree / model.totalHours) * 100)} %`} sub="of library hours" />
        <KPI label="Visible genres" value={model.genres.length} sub="from Audible category ladders" />
        <KPI label="Top keyword in leader" value={topGenreKeyword ? topGenreKeyword[0] : "—"} sub={topGenreKeyword ? `${topGenreKeyword[1]} items` : "no signal"} />
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Genre treemap · category ladders only</div>
            <h3 className="v-card-title">How the library clusters by subgenre</h3>
          </div>
          <span className="v-card-meta">NO EXTERNAL ENRICHMENTS</span>
        </div>
        <div style={{ padding: "12px 18px 20px" }}>
          <svg viewBox="0 0 1100 360" width="100%" style={{ height: "auto", border: "1px solid var(--line-1)", background: "var(--white)" }}>
            {model.treemap.map((node) => (
              <g key={node.genre}>
                <rect x={node.x} y={node.y} width={Math.max(0, node.w - 2)} height={Math.max(0, node.h - 2)} fill={node.color} opacity="0.92" />
                <text x={node.x + 12} y={node.y + 22} fill="white" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.08em">
                  {node.genre.toUpperCase()}
                </text>
                {node.w > 110 && node.h > 70 && (
                  <>
                    <text x={node.x + 12} y={node.y + 52} fill="white" fontFamily="var(--font-mono)" fontSize="24" fontWeight="500">
                      {node.count}
                    </text>
                    <text x={node.x + 12} y={node.y + 72} fill="rgba(255,255,255,0.88)" fontFamily="var(--font-sans)" fontSize="13">
                      {Math.round(node.hours)} h · {Math.round((node.completed / node.count) * 100)}% complete
                    </text>
                  </>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Category ladder table</div>
              <h3 className="v-card-title">Audible paths kept intact</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <thead>
                <tr>
                  <th>Genre</th>
                  <th className="r">Items</th>
                  <th className="r">Hours</th>
                  <th className="r">Done</th>
                </tr>
              </thead>
              <tbody>
                {model.genres.map((genre) => (
                  <tr key={genre.genre}>
                    <td>
                      <div className="v-cell-title">
                        <span className="v-cell-title-main">{genre.genre}</span>
                        <span className="v-cell-title-sub">Fiction › Science fiction › {genre.genre}</span>
                      </div>
                    </td>
                    <td className="r v-mono">{genre.count}</td>
                    <td className="r v-mono">{Math.round(genre.hours)}</td>
                    <td className="r v-mono">{Math.round((genre.completed / genre.count) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Takeaway</div>
              <h3 className="v-card-title">Why this prototype matters</h3>
            </div>
          </div>
          <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="v-callout">
              <span className="v-callout-l">Backend fit</span>
              <span>This screen can be powered directly from imported category ladders. It does not need enrichment or taxonomy cleanup to exist in Solid v1.</span>
            </div>
            <div className="v-callout" style={{ borderLeftColor: "var(--ink-300)" }}>
              <span className="v-callout-l" style={{ color: "var(--ink-700)" }}>Design choice</span>
              <span>The treemap carries hierarchy visually. The ladder table keeps the rawish API story visible for users who want exact source paths.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildNarratorModel(data) {
  const map = {};
  for (const item of data.items) {
    for (const narrator of item.narrators) {
      if (!map[narrator]) map[narrator] = { name: narrator, count: 0, hours: 0, authors: new Set(), dualVoice: 0 };
      map[narrator].count += 1;
      map[narrator].hours += item.runtime_length_min / 60;
      map[narrator].authors.add(item.author);
      if (item.narrators.length > 1) map[narrator].dualVoice += 1;
    }
  }
  const narrators = Object.values(map)
    .map((entry) => ({ ...entry, authorSpread: entry.authors.size }))
    .sort((a, b) => b.hours - a.hours);

  const totalHours = narrators.reduce((sum, narrator) => sum + narrator.hours, 0) || 1;
  const topFive = narrators.slice(0, 5).reduce((sum, narrator) => sum + narrator.hours, 0);
  const multiAuthor = narrators.filter((narrator) => narrator.authorSpread >= 4).length;
  const dualVoiceTitles = data.items.filter((item) => item.narrators.length > 1).slice(0, 10);
  const topNarrators = narrators.slice(0, 6);
  const topAuthors = data.authors.slice(0, 6);

  const matrix = topNarrators.map((narrator) => ({
    narrator,
    cells: topAuthors.map((author) => {
      const count = data.items.filter((item) => item.author === author.name && item.narrators.includes(narrator.name)).length;
      return { author: author.name, count };
    }),
  }));
  const maxCell = Math.max(...matrix.flatMap((row) => row.cells.map((cell) => cell.count)), 1);
  return { narrators, totalHours, topFive, multiAuthor, dualVoiceTitles, matrix, maxCell };
}

function ReportNarrators({ data }) {
  const model = useMemoMissing(() => buildNarratorModel(data), [data]);
  const maxHours = model.narrators[0].hours;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Top narrator" value={model.narrators[0].name} accent sub={`${Math.round(model.narrators[0].hours)} h across ${model.narrators[0].count} books`} />
        <KPI label="Top 5 share" value={`${Math.round((model.topFive / model.totalHours) * 100)} %`} sub="of narrated hours" />
        <KPI label="Multi-author voices" value={model.multiAuthor} sub="narrators spanning 4+ authors" />
        <KPI label="Dual-voice titles" value={model.dualVoiceTitles.length} sub="sample shown below" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Narrator affinity</div>
              <h3 className="v-card-title">Voices you keep following</h3>
            </div>
          </div>
          <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {model.narrators.slice(0, 12).map((narrator, index) => (
              <div key={narrator.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr 70px 64px", gap: 12, alignItems: "center" }}>
                <div className="v-mono v-td-mute">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, fontWeight: 500 }}>{narrator.name}</strong>
                    <span className="v-mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>{narrator.authorSpread} authors</span>
                  </div>
                  <div className="v-progress is-thin">
                    <div className="v-progress-bar" style={{ width: `${(narrator.hours / maxHours) * 100}%`, background: index < 3 ? `var(--chart-${index + 1})` : "var(--ink-400)" }} />
                  </div>
                </div>
                <div className="r v-mono">{Math.round(narrator.hours)} h</div>
                <div className="r v-mono v-td-mute">{narrator.count} books</div>
              </div>
            ))}
          </div>
        </div>

        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Author overlap matrix</div>
              <h3 className="v-card-title">Cross-author narrator patterns</h3>
            </div>
          </div>
          <div className="v-card-body" style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px repeat(6, 1fr)", gap: 6, alignItems: "stretch" }}>
              <div />
              {data.authors.slice(0, 6).map((author) => (
                <div key={author.name} className="v-eyebrow" style={{ textAlign: "center", color: "var(--fg-2)" }}>{author.name.split(" ").slice(-1)[0]}</div>
              ))}
              {model.matrix.map((row) => (
                <React.Fragment key={row.narrator.name}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center" }}>{row.narrator.name}</div>
                  {row.cells.map((cell) => (
                    <div
                      key={`${row.narrator.name}-${cell.author}`}
                      title={`${row.narrator.name} × ${cell.author} · ${cell.count}`}
                      style={{
                        minHeight: 42,
                        border: "1px solid var(--line-1)",
                        background: cell.count === 0 ? "var(--ink-50)" : `rgba(194, 65, 12, ${0.18 + (cell.count / model.maxCell) * 0.6})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: cell.count === 0 ? "var(--fg-3)" : "var(--ink-950)",
                      }}
                    >
                      {cell.count || "—"}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Dual-voice sample</div>
            <h3 className="v-card-title">Books with multiple narrators</h3>
          </div>
        </div>
        <div className="v-card-body is-tight">
          <table className="v-table is-compact">
            <thead>
              <tr>
                <th>Title</th>
                <th>Narrators</th>
                <th className="r">Runtime</th>
                <th className="r">Pc</th>
              </tr>
            </thead>
            <tbody>
              {model.dualVoiceTitles.map((item) => (
                <tr key={item.asin}>
                  <td className="v-td-name">{item.title}</td>
                  <td className="v-td-mute">{item.narrators.join(", ")}</td>
                  <td className="r v-mono">{formatHoursShort(item.runtime_length_min)}</td>
                  <td className="r v-mono">{item.percent_complete === 0 ? "—" : `${item.percent_complete}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildCostModel(data, basis) {
  const items = data.items.map((item) => {
    const cost = effectiveCost(item, basis, data.creditValueDefault);
    const runtimeHours = item.runtime_length_min / 60;
    return {
      item,
      cost,
      runtimeHours,
      costPerHour: runtimeHours === 0 ? 0 : cost / runtimeHours,
    };
  });

  const values = items.map((entry) => entry.costPerHour).sort((a, b) => a - b);
  const median = percentile(values, 0.5);
  const p90 = percentile(values, 0.9);
  const bestValue = items.filter((entry) => entry.runtimeHours >= 16).sort((a, b) => a.costPerHour - b.costPerHour)[0];
  const priceyShort = items.filter((entry) => entry.runtimeHours < 8 && entry.costPerHour >= p90).length;
  const yMax = Math.max(2, Math.ceil(percentile(values, 0.95)));
  const bargain = items.filter((entry) => entry.runtimeHours >= 10).sort((a, b) => a.costPerHour - b.costPerHour).slice(0, 8);
  const expensive = items.filter((entry) => entry.runtimeHours < 8).sort((a, b) => b.costPerHour - a.costPerHour).slice(0, 8);
  return { items, median, p90, bestValue, priceyShort, yMax, bargain, expensive };
}

function ReportCost({ data }) {
  const [basis, setBasis] = useStateMissing("credit");
  const model = useMemoMissing(() => buildCostModel(data, basis), [data, basis]);
  const W = 1100;
  const H = 320;
  const ML = 50;
  const MR = 20;
  const MT = 24;
  const MB = 40;
  const innerW = W - ML - MR;
  const innerH = H - MT - MB;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Median cost / hour" value={`$ ${model.median.toFixed(2)}`} accent sub={`${basis === "credit" ? "credit-capped" : "list-price"} basis`} />
        <KPI label="P90 cost / hour" value={`$ ${model.p90.toFixed(2)}`} sub="expensive tail" />
        <KPI label="Best long-value title" value={model.bestValue ? model.bestValue.item.title.slice(0, 18) : "—"} sub={model.bestValue ? `$ ${model.bestValue.costPerHour.toFixed(2)} / h` : "no data"} />
        <KPI label="Pricey short listens" value={model.priceyShort} sub="under 8 h at the high end" />
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Cost per hour</div>
            <h3 className="v-card-title">Interpretation layer over price and runtime</h3>
          </div>
          <div style={{ display: "inline-flex", border: "1px solid var(--line-2)" }}>
            <button className="v-btn v-btn-sm" style={{ borderRadius: 0, background: basis === "credit" ? "var(--ink-950)" : "white", color: basis === "credit" ? "white" : "var(--fg-2)" }} onClick={() => setBasis("credit")}>Per-credit basis</button>
            <button className="v-btn v-btn-sm" style={{ borderRadius: 0, borderLeft: "1px solid var(--line-2)", background: basis === "list" ? "var(--ink-950)" : "white", color: basis === "list" ? "white" : "var(--fg-2)" }} onClick={() => setBasis("list")}>List price</button>
          </div>
        </div>
        <div style={{ padding: "8px 18px 24px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((p, index) => {
              const y = MT + innerH * (1 - p);
              return (
                <g key={index}>
                  <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="var(--line-1)" />
                  <text x={ML - 8} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)">$ {(model.yMax * p).toFixed(0)}</text>
                </g>
              );
            })}
            {[0, 5, 10, 15, 20, 25, 30, 35, 40].map((hours) => {
              const x = ML + (hours / 40) * innerW;
              return (
                <g key={hours}>
                  <line x1={x} x2={x} y1={MT + innerH} y2={MT + innerH + 4} stroke="var(--ink-300)" />
                  <text x={x} y={MT + innerH + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)">{hours} h</text>
                </g>
              );
            })}
            {model.items.map((entry, index) => {
              const cx = ML + (clamp(entry.runtimeHours, 0, 40) / 40) * innerW;
              const cy = MT + innerH - (clamp(entry.costPerHour, 0, model.yMax) / model.yMax) * innerH;
              const emphasis = entry.costPerHour >= model.p90 && entry.runtimeHours < 8;
              return (
                <circle key={entry.item.asin} cx={cx} cy={cy} r={emphasis ? 3.4 : 2.4} fill={emphasis ? "var(--chart-1)" : "var(--ink-400)"} opacity={emphasis ? 0.95 : 0.5} />
              );
            })}
            <line x1={ML} x2={W - MR} y1={MT + innerH} y2={MT + innerH} stroke="var(--ink-700)" />
            <line x1={ML} x2={W - MR} y1={MT + innerH - (model.median / model.yMax) * innerH} y2={MT + innerH - (model.median / model.yMax) * innerH} stroke="var(--ember-500)" strokeDasharray="4 4" />
            <text x={W - MR - 4} y={MT + innerH - (model.median / model.yMax) * innerH - 6} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--ember-500)">MEDIAN · $ {model.median.toFixed(2)} / H</text>
          </svg>
          <div className="v-callout" style={{ marginTop: 10 }}>
            <span className="v-callout-l">Prototype assumption</span>
            <span>Per-credit basis caps effective cost at the configured credit value. This prototype does not attempt to infer subscription freebies beyond the explicit interpretation toggle.</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Bargain stack</div>
              <h3 className="v-card-title">Best runtime value</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <tbody>
                {model.bargain.map((entry) => (
                  <tr key={entry.item.asin}>
                    <td className="v-td-name">{entry.item.title}</td>
                    <td className="v-td-mute">{entry.item.author}</td>
                    <td className="r v-mono">{formatHoursShort(entry.item.runtime_length_min)}</td>
                    <td className="r v-mono">$ {entry.costPerHour.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Pricey short listens</div>
              <h3 className="v-card-title">High cost, low runtime</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <tbody>
                {model.expensive.map((entry) => (
                  <tr key={entry.item.asin}>
                    <td className="v-td-name">{entry.item.title}</td>
                    <td className="v-td-mute">{entry.item.author}</td>
                    <td className="r v-mono">{formatHoursShort(entry.item.runtime_length_min)}</td>
                    <td className="r v-mono">$ {entry.costPerHour.toFixed(2)}</td>
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

const EXPORT_STEPS = [
  { id: "facts", name: "Collect current facts", detail: "Current Audible facts + selective snapshots", durEst: 8 },
  { id: "ann", name: "Bundle annotations", detail: "Tags, dropped state, shelf definitions, findings", durEst: 5 },
  { id: "raw", name: "Stage raw payloads", detail: "Optional fidelity layer per ADR 0036", durEst: 11 },
  { id: "covers", name: "Stage cached covers", detail: "Cover bundle strategy from export settings", durEst: 14 },
  { id: "archive", name: "Write JSON archive", detail: "Archive of record · ADR 0010", durEst: 6 },
  { id: "proj", name: "Write projections", detail: "CSV + Markdown where requested", durEst: 4 },
  { id: "sum", name: "Checksum + manifest", detail: "Versioned manifest and result summary", durEst: 2 },
];

function ExportStatus({ data }) {
  const [running, setRunning] = useStateMissing(false);
  const [step, setStep] = useStateMissing(EXPORT_STEPS.length);
  const [elapsed, setElapsed] = useStateMissing(0);
  const [stepProgress, setStepProgress] = useStateMissing(1);

  useEffectMissing(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setStepProgress((current) => {
        const next = current + 0.05 + Math.random() * 0.05;
        if (next >= 1) {
          setStep((value) => {
            const following = value + 1;
            if (following >= EXPORT_STEPS.length) {
              setRunning(false);
              return EXPORT_STEPS.length;
            }
            return following;
          });
          return 0;
        }
        return next;
      });
      setElapsed((current) => current + 0.4);
    }, 400);
    return () => clearInterval(timer);
  }, [running]);

  function startExport() {
    setRunning(true);
    setStep(0);
    setElapsed(0);
    setStepProgress(0);
  }

  const complete = !running && step >= EXPORT_STEPS.length;
  const archiveSize = `${(184.2 + 96.7).toFixed(1)} MB`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Archive size" value={archiveSize} accent sub="JSON + raw payloads + covers" />
        <KPI label="Projection files" value="3" sub="JSON, CSV, Markdown bundle" />
        <KPI label="Last export" value="2 d ago" sub="job EXP-442901" />
        <KPI label="Restore" value="Deferred" sub="ADR 0026" />
      </div>

      <div className="v-card is-accent">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow v-eyebrow-accent">Export · local job</div>
            <h3 className="v-card-title">{running ? "Exporting now…" : complete ? "Last export · OK · 2 d ago" : "Ready to export"}</h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!running ? <button className="v-btn v-btn-primary" onClick={startExport}>{I.download} Start export</button> : <button className="v-btn v-btn-outline" onClick={() => setRunning(false)}>Pause</button>}
            <button className="v-btn v-btn-outline" disabled={running}>Open destination</button>
          </div>
        </div>
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line-1)", background: running ? "var(--ember-50)" : "var(--ink-50)", display: "flex", gap: 24, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)" }}>
          {running && <span className="v-spinner" />}
          <span>JOB · {running ? "EXP-" + Date.now().toString().slice(-6) : "EXP-442901"}</span>
          <span>FORMAT · JSON + CSV + MD</span>
          <span>RAW · INCLUDED</span>
          <span>COVERS · SIBLING FOLDER</span>
          {complete && <span style={{ color: "var(--positive)" }}>OUTCOME · OK</span>}
        </div>
        <div>
          {EXPORT_STEPS.map((exportStep, index) => {
            const isDone = index < step;
            const isRunning = index === step && running;
            const isPending = index > step && running;
            const stateClass = isDone ? "is-done" : isRunning ? "is-running" : "";
            return (
              <div className="v-job-step" key={exportStep.id}>
                <div className={`v-job-dot ${stateClass}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="v-job-name">{exportStep.name}</div>
                  <div className="v-job-detail">{exportStep.detail}</div>
                  {isRunning && (
                    <div className="v-progress is-thin" style={{ marginTop: 8, width: 280 }}>
                      <div className="v-progress-bar" style={{ width: `${stepProgress * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="v-job-time">
                  {isRunning && <span className="v-job-progress">{(stepProgress * exportStep.durEst).toFixed(1)} / {exportStep.durEst} S</span>}
                  {isDone && <span style={{ color: "var(--positive)" }}>✓ {exportStep.durEst} S</span>}
                  {isPending && <span>—</span>}
                  {!running && !isDone && index >= step && <span>✓ {exportStep.durEst} S</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid var(--line-1)", background: "var(--ink-50)" }}>
          <div className="v-callout">
            <span className="v-callout-l">Fidelity first</span>
            <span>The archive is the source of record. Projection exports stay explicitly secondary so they can flatten structure without pretending to be restorable.</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Export outputs</div>
              <h3 className="v-card-title">Artifacts from the last run</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <thead>
                <tr>
                  <th>File</th>
                  <th className="r">Size</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="v-td-name">verso-2026-05-29.archive.json</td>
                  <td className="r v-mono">184.2 MB</td>
                  <td className="v-td-mute">Facts, raw payloads, annotations, snapshots</td>
                </tr>
                <tr>
                  <td className="v-td-name">verso-2026-05-29.projection.csv</td>
                  <td className="r v-mono">4.7 MB</td>
                  <td className="v-td-mute">Flat projection for spreadsheet use</td>
                </tr>
                <tr>
                  <td className="v-td-name">verso-2026-05-29.markdown.zip</td>
                  <td className="r v-mono">8.3 MB</td>
                  <td className="v-td-mute">Per-item Markdown bundle</td>
                </tr>
                <tr>
                  <td className="v-td-name">covers/</td>
                  <td className="r v-mono">96.7 MB</td>
                  <td className="v-td-mute">Sibling folder referenced by the manifest</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Export history</div>
              <h3 className="v-card-title">Recent runs</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Started</th>
                  <th className="r">Duration</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["EXP-442901", "2 d ago", 51, "OK", "pos"],
                  ["EXP-442455", "8 d ago", 49, "OK", "pos"],
                  ["EXP-441990", "15 d ago", 53, "OK", "pos"],
                  ["EXP-441612", "26 d ago", 17, "Canceled", "cau"],
                ].map(([id, when, dur, outcome, klass]) => (
                  <tr key={id}>
                    <td className="v-mono" style={{ color: "var(--ember-500)" }}>{id}</td>
                    <td className="v-mono v-td-mute">{when}</td>
                    <td className="r v-mono">{dur} s</td>
                    <td><span className={`v-pill is-${klass}`}>{outcome}</span></td>
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

Object.assign(window, {
  ReportCadence,
  ReportGenre,
  ReportNarrators,
  ReportCost,
  ExportStatus,
});
