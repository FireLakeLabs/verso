/* global React, VERSO_DATA, Cover, formatHours, formatHoursShort, formatPrice, relativeTime, KPI, Progress, I, Empty */
// =============================================================
// VERSO — Library Overview + Library Table + Item Detail
// =============================================================
const { useState: useStateLib, useMemo: useMemoLib } = React;

// ====================================================================
// LIBRARY OVERVIEW — dense variant
// ====================================================================
function OverviewDense({ data, onNavigate, onOpenItem }) {
  const t = data.totals;
  const inProgressItems = data.items
    .filter(it => it.percent_complete >= 1 && it.percent_complete < 95)
    .sort((a, b) => b.percent_complete - a.percent_complete)
    .slice(0, 6);
  const recentItems = [...data.items]
    .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
    .slice(0, 6);
  const topAuthors = data.authors.slice(0, 6);
  const topNarrators = data.narrators.slice(0, 5);

  // Cadence sparkline data: items per week, last 52
  const weekly = useMemoLib(() => {
    const buckets = new Array(52).fill(0);
    const now = Date.now();
    for (const it of data.items) {
      const ago = Math.floor((now - new Date(it.purchase_date).getTime()) / (7 * 86400 * 1000));
      if (ago >= 0 && ago < 52) buckets[51 - ago] += 1;
    }
    return buckets;
  }, [data]);
  const wMax = Math.max(...weekly, 1);

  return (
    <>
      {/* Inverse hero */}
      <div className="v-hero-inv">
        <div>
          <div className="v-eyebrow">Library · current state</div>
          <h2 className="v-hero-inv-headline">
            {t.items.toLocaleString()} items · {Math.round(t.hours).toLocaleString()} h ·
            {" "}
            {Math.round((t.completed / t.items) * 100)} % completed.
          </h2>
          <p className="v-hero-inv-sub">
            Last refresh {relativeTime(data.lastRefresh)} · {data.findings.length} health findings open ·
            {" "}
            {data.items.filter(it => it.percent_complete > 0 && it.percent_complete < 95).length} in progress.
          </p>
        </div>
        <div className="v-hero-inv-stats">
          <div className="v-hero-inv-stat">
            <span className="v-hero-inv-stat-l">Authors</span>
            <span className="v-hero-inv-stat-v">{t.authors}</span>
          </div>
          <div className="v-hero-inv-stat">
            <span className="v-hero-inv-stat-l">Narrators</span>
            <span className="v-hero-inv-stat-v">{t.narrators}</span>
          </div>
          <div className="v-hero-inv-stat">
            <span className="v-hero-inv-stat-l">Series</span>
            <span className="v-hero-inv-stat-v">{t.series}</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="v-kpi-row">
        <KPI label="Items · total" value={t.items.toLocaleString()} accent sub="incl. 8 no-longer-present" />
        <KPI label="Hours · total" value={Math.round(t.hours).toLocaleString()} sub="median 11.4 h / book" />
        <KPI label="Completed" value={t.completed.toLocaleString()} delta="3 this month" deltaPos sub={`${Math.round(t.completed / t.items * 100)} % of library`} />
        <KPI label="In progress" value={t.inProgress.toLocaleString()} sub="across 4 sessions today" />
        <KPI label="Findings · open" value={data.findings.length.toLocaleString()} sub="advisory · review when ready" />
      </div>

      {/* Two-column work area */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        {/* In progress (large) */}
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">In progress · sorted by recency</div>
              <h3 className="v-card-title">Pick back up</h3>
            </div>
            <button className="v-btn v-btn-ghost v-btn-sm" onClick={() => onNavigate("library")}>
              All in-progress {I.arrowR}
            </button>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
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
                {inProgressItems.map((it) => (
                  <tr key={it.asin} onClick={() => onOpenItem(it)} style={{ cursor: "pointer" }}>
                    <td><div className="v-table-cover"><Cover item={it} showMeta={false} hideSeriesNum /></div></td>
                    <td>
                      <div className="v-cell-title">
                        <span className="v-cell-title-main">{it.title}</span>
                        <span className="v-cell-title-sub">{it.author}</span>
                      </div>
                    </td>
                    <td className="v-td-mute" style={{ fontSize: 12 }}>{it.narrators[0]}</td>
                    <td className="r v-mono">{it.percent_complete} %</td>
                    <td className="r v-mono v-td-mute">
                      {formatHoursShort(it.runtime_length_min * (100 - it.percent_complete) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cadence sparkline + recent */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Cadence · 52 weeks</div>
                <h3 className="v-card-title">Purchase rhythm</h3>
              </div>
              <span className="v-card-meta">{weekly.reduce((a, b) => a + b, 0)} adds</span>
            </div>
            <div className="v-card-body" style={{ padding: "18px 18px 16px" }}>
              <svg viewBox="0 0 520 80" width="100%" height="80" preserveAspectRatio="none">
                {weekly.map((v, i) => {
                  const h = (v / wMax) * 64;
                  // Slate ramp by recency (recent = chart-2 ocean, older = lighter slate)
                  const fill = v === 0 ? "var(--ink-100)" : "var(--chart-2)";
                  return <rect key={i} x={i * 10} y={72 - h} width={8} height={h} fill={fill} opacity={0.4 + (i / 52) * 0.6} />;
                })}
                <line x1="0" x2="520" y1="72" y2="72" stroke="var(--line-2)" strokeWidth="1" />
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em" }}>
                <span>52 W AGO</span>
                <span>NOW</span>
              </div>
            </div>
          </div>

          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Recently added</div>
                <h3 className="v-card-title">Latest purchases</h3>
              </div>
            </div>
            <div className="v-row-list">
              {recentItems.map((it) => (
                <div className="v-row" key={it.asin} onClick={() => onOpenItem(it)}>
                  <div className="v-row-cover"><Cover item={it} showMeta={false} hideSeriesNum /></div>
                  <div className="v-row-text">
                    <span className="v-row-name">{it.title}</span>
                    <span className="v-row-meta">{it.author} · {formatHoursShort(it.runtime_length_min)}</span>
                  </div>
                  <span className="v-row-trail">{new Date(it.purchase_date).toISOString().slice(5, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Author concentration mini + narrators */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Top authors · by hours</div>
              <h3 className="v-card-title">Author concentration</h3>
            </div>
            <button className="v-btn v-btn-ghost v-btn-sm" onClick={() => onNavigate("report-authors")}>
              Pareto view {I.arrowR}
            </button>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <tbody>
                {topAuthors.map((a, i) => (
                  <tr key={a.name}>
                    <td style={{ width: 28 }} className="v-td-mute v-mono" >{(i + 1).toString().padStart(2, "0")}</td>
                    <td className="v-td-name">{a.name}</td>
                    <td className="r v-mono v-td-mute">{a.count} books</td>
                    <td className="r v-mono">{Math.round(a.hours)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="v-card">
          <div className="v-card-head">
            <div className="v-card-head-left">
              <div className="v-eyebrow">Top narrators · by hours</div>
              <h3 className="v-card-title">Narrator affinity</h3>
            </div>
          </div>
          <div className="v-card-body is-tight">
            <table className="v-table is-compact">
              <tbody>
                {topNarrators.map((a, i) => (
                  <tr key={a.name}>
                    <td style={{ width: 28 }} className="v-td-mute v-mono" >{(i + 1).toString().padStart(2, "0")}</td>
                    <td className="v-td-name">{a.name}</td>
                    <td className="r v-mono v-td-mute">{a.count} books</td>
                    <td className="r v-mono">{Math.round(a.hours)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ====================================================================
// LIBRARY OVERVIEW — calm variant
// ====================================================================
function OverviewCalm({ data, onNavigate, onOpenItem }) {
  const t = data.totals;
  const inProg = data.items
    .filter(it => it.percent_complete >= 1 && it.percent_complete < 95)
    .sort((a, b) => b.percent_complete - a.percent_complete)
    .slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 56, padding: "32px 8px" }}>
      <section>
        <div className="v-eyebrow" style={{ marginBottom: 14 }}>Library · {new Date().toISOString().slice(0, 10)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 48, alignItems: "baseline" }}>
          <div>
            <div className="v-eyebrow" style={{ color: "var(--ember-500)" }}>Items</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6 }}>{t.items.toLocaleString()}</div>
            <div className="v-eyebrow" style={{ marginTop: 6, color: "var(--fg-2)" }}>incl. 8 no-longer-present</div>
          </div>
          <div>
            <div className="v-eyebrow">Hours</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6 }}>{Math.round(t.hours).toLocaleString()}</div>
            <div className="v-eyebrow" style={{ marginTop: 6, color: "var(--fg-2)" }}>median 11.4 h / book</div>
          </div>
          <div>
            <div className="v-eyebrow">Completed</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6 }}>{t.completed}</div>
            <div className="v-eyebrow" style={{ marginTop: 6, color: "var(--fg-2)" }}>{Math.round(t.completed / t.items * 100)} % of library</div>
          </div>
          <div>
            <div className="v-eyebrow">Open findings</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1, marginTop: 6 }}>{data.findings.length}</div>
            <div className="v-eyebrow" style={{ marginTop: 6, color: "var(--fg-2)" }}>advisory only</div>
          </div>
        </div>
      </section>

      <hr className="v-hr" />

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <div>
            <div className="v-eyebrow">Pick back up</div>
            <h2 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 8 }}>
              Four books mid-listen.
            </h2>
          </div>
          <button className="v-btn v-btn-ghost v-btn-sm" onClick={() => onNavigate("library")}>All in-progress {I.arrowR}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {inProg.map((it) => (
            <div key={it.asin} onClick={() => onOpenItem(it)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}>
              <Cover item={it} showMeta={false} hideSeriesNum />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{it.title}</div>
                <div className="v-eyebrow" style={{ color: "var(--fg-3)" }}>{it.author}</div>
              </div>
              <Progress pc={it.percent_complete} />
              <div className="v-meta-row" style={{ justifyContent: "space-between" }}>
                <span>{it.percent_complete} % · {formatHoursShort(it.runtime_length_min * (100 - it.percent_complete) / 100)} left</span>
                <span>{it.narrators[0].split(" ").slice(-1)[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="v-hr" />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 48 }}>
        <div>
          <div className="v-eyebrow">Where to look</div>
          <h3 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 8, marginBottom: 16 }}>Reports</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a onClick={(e) => { e.preventDefault(); onNavigate("report-authors"); }} style={{ borderBottom: "1px solid var(--line-2)", color: "var(--ink-900)", paddingBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>Author concentration</span><span className="v-eyebrow">PARETO</span>
            </a>
            <a onClick={(e) => { e.preventDefault(); onNavigate("report-runtime"); }} style={{ borderBottom: "1px solid var(--line-2)", color: "var(--ink-900)", paddingBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>Runtime distribution</span><span className="v-eyebrow">HIST</span>
            </a>
            <a onClick={(e) => { e.preventDefault(); onNavigate("report-keywords"); }} style={{ borderBottom: "1px solid var(--line-2)", color: "var(--ink-900)", paddingBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>Subject keywords</span><span className="v-eyebrow">CLOUD</span>
            </a>
            <a onClick={(e) => { e.preventDefault(); onNavigate("wall"); }} style={{ borderBottom: "1px solid var(--line-2)", color: "var(--ink-900)", paddingBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>Cover art wall</span><span className="v-eyebrow">GALLERY</span>
            </a>
          </div>
        </div>
        <div>
          <div className="v-eyebrow">Needs attention</div>
          <h3 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 8, marginBottom: 16 }}>Findings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.findings.slice(0, 4).map(f => (
              <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{f.item.title} · {f.note}</div>
              </div>
            ))}
          </div>
          <button className="v-btn v-btn-outline v-btn-sm" style={{ marginTop: 16 }} onClick={() => onNavigate("health")}>
            All {data.findings.length} findings {I.arrowR}
          </button>
        </div>
        <div>
          <div className="v-eyebrow">Last refresh</div>
          <h3 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 8, marginBottom: 16 }}>System</h3>
          <div className="v-fact-grid" style={{ gridTemplateColumns: "120px 1fr" }}>
            <dt>Refreshed</dt><dd className="v-fact-mono">{relativeTime(data.lastRefresh)}</dd>
            <dt>Duration</dt><dd className="v-fact-mono">{data.refreshDuration} s</dd>
            <dt>Items synced</dt><dd className="v-fact-mono">{data.totals.items} · 100 %</dd>
            <dt>Outcome</dt><dd><span className="v-pill is-pos">OK</span></dd>
          </div>
          <button className="v-btn v-btn-outline v-btn-sm" style={{ marginTop: 16 }} onClick={() => onNavigate("refresh")}>
            Job detail {I.arrowR}
          </button>
        </div>
      </section>
    </div>
  );
}

// ====================================================================
// LIBRARY TABLE
// ====================================================================
const GENRE_OPTIONS = [
  "All", "Space Opera", "Hard SF", "Cyberpunk", "Post-Cyberpunk", "Military SF",
  "Climate Fiction", "Generation Ship", "First Contact", "AI & Singularity", "Solarpunk"
];
const PROGRESS_OPTIONS = ["All", "Unstarted", "In progress", "Completed", "Near-finished"];

function genreOf(it) { return it.category_ladders[0][2]; }
function progressBucket(it) {
  if (it.percent_complete === 0) return "Unstarted";
  if (it.percent_complete >= 95 && it.percent_complete < 99) return "Near-finished";
  if (it.percent_complete >= 99) return "Completed";
  return "In progress";
}

function LibraryTable({ data, view, onOpenItem }) {
  const [search, setSearch] = useStateLib("");
  const [genre, setGenre] = useStateLib("All");
  const [prog, setProg] = useStateLib("All");
  const [sortBy, setSortBy] = useStateLib({ key: "purchase_date", dir: "desc" });
  const [selected, setSelected] = useStateLib(new Set());
  const [showDropped, setShowDropped] = useStateLib(false);

  const filtered = useMemoLib(() => {
    let out = data.items;
    if (!showDropped) out = out.filter(it => !it.is_dropped);
    if (genre !== "All") out = out.filter(it => genreOf(it) === genre);
    if (prog !== "All") out = out.filter(it => progressBucket(it) === prog);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(it =>
        it.title.toLowerCase().includes(q) ||
        it.author.toLowerCase().includes(q) ||
        (it.narrators[0] || "").toLowerCase().includes(q)
      );
    }
    const k = sortBy.key, d = sortBy.dir === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => {
      let av = a[k], bv = b[k];
      if (k === "purchase_date" || k === "release_date") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (k === "author") { av = a.author; bv = b.author; }
      if (av < bv) return -1 * d;
      if (av > bv) return 1 * d;
      return 0;
    });
    return out;
  }, [data, search, genre, prog, sortBy, showDropped]);

  const PAGE = 60;
  const [page, setPage] = useStateLib(0);
  const pageItems = useMemoLib(() => filtered.slice(page * PAGE, (page + 1) * PAGE), [filtered, page]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));

  function toggle(asin) {
    const n = new Set(selected);
    if (n.has(asin)) n.delete(asin); else n.add(asin);
    setSelected(n);
  }
  function setSort(key) {
    if (sortBy.key === key) setSortBy({ key, dir: sortBy.dir === "desc" ? "asc" : "desc" });
    else setSortBy({ key, dir: "desc" });
  }
  function sortIcon(key) { if (sortBy.key !== key) return null; return <span className="v-sort">{sortBy.dir === "desc" ? "▼" : "▲"}</span>; }

  return (
    <div className="v-card" style={{ display: "flex", flexDirection: "column" }}>
      {/* Controls */}
      <div className="v-lib-controls">
        <div className="v-lib-controls-left" style={{ flexWrap: "wrap" }}>
          <div className="v-search-wrap">
            <span className="v-search-icon">{I.search}</span>
            <input className="v-search-input" placeholder="Title, author, narrator…"
                   value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <div className="v-filters">
            {GENRE_OPTIONS.map(g => (
              <button key={g} className={`v-tag ${genre === g ? "is-on" : ""}`}
                      onClick={() => { setGenre(g); setPage(0); }}>{g}</button>
            ))}
          </div>
        </div>
        <div className="v-lib-controls-right">
          <div className="v-filters">
            {PROGRESS_OPTIONS.map(p => (
              <button key={p} className={`v-tag ${prog === p ? "is-on" : ""}`}
                      onClick={() => { setProg(p); setPage(0); }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 18px", borderBottom: "1px solid var(--line-1)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.08em" }}>
        <div>
          {filtered.length.toLocaleString()} ITEMS · PAGE {page + 1} / {pageCount}
          {!showDropped && " · DROPPED HIDDEN"}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>
            <span onClick={() => setShowDropped(!showDropped)} className={`v-check ${showDropped ? "is-on" : ""}`} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-800)" }}>Show dropped</span>
          </label>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--line-2)" }}>
            <button className={`v-btn v-btn-sm ${view === "rows" ? "v-btn-primary" : "v-btn-ghost"}`}
                    style={{ borderRadius: 0, padding: "4px 8px" }}
                    title="Compact rows">{I.rows}</button>
            <button className={`v-btn v-btn-sm ${view === "cards" ? "v-btn-primary" : "v-btn-ghost"}`}
                    style={{ borderRadius: 0, padding: "4px 8px", borderLeft: "1px solid var(--line-2)" }}
                    title="Card grid">{I.grid}</button>
          </div>
        </div>
      </div>

      {view === "rows" ? (
        <div style={{ overflowX: "auto" }}>
          <table className="v-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th style={{ width: 48 }}></th>
                <th onClick={() => setSort("title")}>Title{sortIcon("title")}</th>
                <th onClick={() => setSort("author")}>Author{sortIcon("author")}</th>
                <th>Narrator</th>
                <th className="r" onClick={() => setSort("runtime_length_min")}>Runtime{sortIcon("runtime_length_min")}</th>
                <th className="r" onClick={() => setSort("percent_complete")}>Pc{sortIcon("percent_complete")}</th>
                <th className="r" onClick={() => setSort("purchase_date")}>Purchased{sortIcon("purchase_date")}</th>
                <th className="r" onClick={() => setSort("price")}>Price{sortIcon("price")}</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it) => (
                <tr key={it.asin} className={selected.has(it.asin) ? "is-selected" : ""}>
                  <td onClick={(e) => { e.stopPropagation(); toggle(it.asin); }} style={{ cursor: "pointer" }}>
                    <span className={`v-check ${selected.has(it.asin) ? "is-on" : ""}`} />
                  </td>
                  <td onClick={() => onOpenItem(it)} style={{ cursor: "pointer" }}>
                    <div className="v-table-cover"><Cover item={it} showMeta={false} hideSeriesNum /></div>
                  </td>
                  <td onClick={() => onOpenItem(it)} style={{ cursor: "pointer" }}>
                    <div className="v-cell-title">
                      <span className="v-cell-title-main">{it.title}</span>
                      {it.series && <span className="v-cell-title-sub">{it.series.name} · {it.series.position}/{it.series.total}</span>}
                    </div>
                  </td>
                  <td className="v-td-mute" style={{ fontSize: 12.5 }}>{it.author}</td>
                  <td className="v-td-mute" style={{ fontSize: 12.5 }}>{it.narrators[0]}</td>
                  <td className="r v-mono">{formatHoursShort(it.runtime_length_min)}</td>
                  <td className="r v-mono">
                    {it.percent_complete === 0 ? <span style={{ color: "var(--fg-3)" }}>—</span> :
                      <span style={{ color: it.percent_complete >= 95 ? "var(--positive)" : "var(--ink-900)" }}>{it.percent_complete}%</span>}
                  </td>
                  <td className="r v-mono v-td-mute">{it.purchase_date}</td>
                  <td className="r v-mono">{formatPrice(it.price)}</td>
                  <td>
                    {it.is_dropped && <span className="v-pill is-mut" style={{ marginRight: 4 }}>dropped</span>}
                    {it.tags.slice(0, 2).map(t => <span key={t} className="v-pill is-accent" style={{ marginRight: 4 }}>{t}</span>)}
                    {it.has_pdf && <span className="v-pill is-info">PDF</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="v-card-grid">
          {pageItems.map((it) => (
            <div key={it.asin} className="v-card-grid-item" onClick={() => onOpenItem(it)}>
              <div className="v-card-grid-cover"><Cover item={it} showMeta={false} /></div>
              <div className="v-card-grid-text">
                <div className="v-card-grid-title">{it.title}</div>
                <div className="v-card-grid-author">{it.author}</div>
              </div>
              <Progress pc={it.percent_complete} />
              <div className="v-card-grid-foot">
                <span>{formatHoursShort(it.runtime_length_min)}</span>
                <span className="v-card-grid-foot-pc">
                  {it.percent_complete === 0 ? "—" : it.percent_complete + " %"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderTop: "1px solid var(--line-1)" }}>
        <div className="v-eyebrow">{filtered.length.toLocaleString()} ITEMS · {pageCount} PAGES</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="v-btn v-btn-outline v-btn-sm" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>← Prev</button>
          <span className="v-mono" style={{ fontSize: 12, padding: "6px 4px", color: "var(--fg-2)" }}>
            {page + 1} / {pageCount}
          </span>
          <button className="v-btn v-btn-outline v-btn-sm" disabled={page === pageCount - 1} onClick={() => setPage(Math.min(pageCount - 1, page + 1))}>Next →</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="v-bulk-bar">
          <div className="v-bulk-bar-left">
            <span>{selected.size} SELECTED</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Bulk tag operations only · per ADR 0029</span>
          </div>
          <div className="v-bulk-bar-actions">
            <button>+ Add tag…</button>
            <button>− Remove tag…</button>
            <button onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// ITEM DETAIL
// ====================================================================
function ItemDetail({ item, data, onBack }) {
  if (!item) return null;
  const series = item.series;
  const seriesPeers = series ? data.items.filter(it => it.series && it.series.id === series.id).sort((a, b) => a.series.position - b.series.position) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="v-btn v-btn-ghost v-btn-sm" onClick={onBack}>← All items</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="v-btn v-btn-outline">{I.tag} Tags</button>
          <button className="v-btn v-btn-outline">{I.refresh} Refresh this item</button>
          <button className="v-btn v-btn-outline" style={{ color: "var(--negative)" }}>Mark dropped</button>
        </div>
      </div>

      <div className="v-detail">
        <div className="v-detail-left">
          <div className="v-detail-cover"><Cover item={item} showMeta /></div>
          <div className="v-eyebrow" style={{ textAlign: "center" }}>ASIN · <span style={{ fontFamily: "var(--font-mono)", textTransform: "none" }}>{item.asin}</span></div>
        </div>
        <div className="v-detail-right">
          <div>
            {series && <div className="v-eyebrow v-eyebrow-accent" style={{ marginBottom: 6 }}>{series.name} · Book {series.position} of {series.total}</div>}
            <h2 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 8 }}>{item.title}</h2>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15 }}>{item.author}</span>
              <span style={{ color: "var(--fg-3)" }}>·</span>
              <span style={{ fontSize: 13, color: "var(--fg-2)" }}>Narrated by {item.narrators.join(", ")}</span>
              {item.is_dropped && <span className="v-pill is-dark">Dropped</span>}
            </div>
          </div>

          {/* Progress */}
          <div className="v-card">
            <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="v-eyebrow">Listening progress</div>
                <span className="v-mono" style={{ fontSize: 13, color: item.percent_complete >= 95 ? "var(--positive)" : "var(--ink-900)" }}>
                  {item.percent_complete} %
                </span>
              </div>
              <Progress pc={item.percent_complete} />
              <div className="v-meta-row" style={{ justifyContent: "space-between" }}>
                <span>{formatHoursShort(item.runtime_length_min * item.percent_complete / 100)} of {formatHoursShort(item.runtime_length_min)} heard</span>
                <span>{item.is_returnable ? "Returnable window open" : "Returnable window closed"}</span>
              </div>
            </div>
          </div>

          {/* Facts grid */}
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Audible facts · current</div>
                <h3 className="v-card-title">Source of truth</h3>
              </div>
              <span className="v-card-meta">last seen {relativeTime(data.lastRefresh)}</span>
            </div>
            <div className="v-card-body">
              <dl className="v-fact-grid">
                <dt>Publisher</dt><dd>{item.publisher_name}</dd>
                <dt>Format</dt><dd>{item.format_type}</dd>
                <dt>Released</dt><dd className="v-fact-mono">{item.release_date}</dd>
                <dt>Purchased</dt><dd className="v-fact-mono">{item.purchase_date}</dd>
                <dt>Runtime</dt><dd className="v-fact-mono">{formatHours(item.runtime_length_min)} ({item.runtime_length_min.toLocaleString()} min)</dd>
                <dt>Price · paid</dt><dd className="v-fact-mono">{formatPrice(item.price)}</dd>
                <dt>Plans</dt><dd>{item.plans.length ? item.plans.map(p => <span key={p} className="v-pill is-info" style={{ marginRight: 4 }}>{p}</span>) : <span className="v-td-mute">none</span>}</dd>
                <dt>Companion PDF</dt><dd>{item.has_pdf ? <span className="v-pill is-info">Available · cache deferred (ADR 0025)</span> : <span className="v-td-mute">none</span>}</dd>
                <dt>Returnable</dt><dd>{item.is_returnable ? <span className="v-pill is-cau">Yes</span> : <span className="v-td-mute">No</span>}</dd>
                <dt>Categories</dt><dd className="v-fact-mono">{item.category_ladders[0].join(" › ")}</dd>
                <dt>Keywords</dt><dd>{item.thesaurus_subject_keywords.map(k => <span key={k} className="v-pill" style={{ marginRight: 4 }}>{k}</span>)}</dd>
              </dl>
            </div>
          </div>

          {/* Verso annotations */}
          <div className="v-card is-accent">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow v-eyebrow-accent">Verso annotations</div>
                <h3 className="v-card-title">Your layer</h3>
              </div>
            </div>
            <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="v-eyebrow" style={{ marginBottom: 6 }}>Tags</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {item.tags.length === 0 && <span className="v-td-mute" style={{ fontSize: 12.5 }}>None yet — add one to start grouping.</span>}
                  {item.tags.map(t => <span key={t} className="v-pill is-accent">{t}</span>)}
                  <button className="v-btn v-btn-ghost v-btn-sm" style={{ padding: "2px 8px" }}>{I.plus} Add tag</button>
                </div>
              </div>
              <hr className="v-hr" />
              <div>
                <div className="v-eyebrow" style={{ marginBottom: 6 }}>Notes</div>
                <p style={{ fontSize: 13, color: "var(--fg-2)", fontStyle: "italic" }}>Reading journal arrives in Phase 2 — see ADR 0031.</p>
              </div>
            </div>
          </div>

          {/* Publisher summary */}
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Publisher summary</div>
                <h3 className="v-card-title">From Audible</h3>
              </div>
            </div>
            <div className="v-card-body">
              <p style={{ fontSize: 14, lineHeight: 1.55, textWrap: "pretty" }}>{item.publisher_summary}</p>
            </div>
          </div>

          {series && (
            <div className="v-card">
              <div className="v-card-head">
                <div className="v-card-head-left">
                  <div className="v-eyebrow">{series.name}</div>
                  <h3 className="v-card-title">Series · {series.total} books</h3>
                </div>
                <span className="v-card-meta">{seriesPeers.filter(p => p.percent_complete >= 95).length} / {series.total} completed</span>
              </div>
              <div className="v-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                  {seriesPeers.map(p => (
                    <div key={p.asin} style={{
                      display: "flex", flexDirection: "column", gap: 6, cursor: "pointer",
                      opacity: p.asin === item.asin ? 1 : 0.85,
                    }}>
                      <div style={{ outline: p.asin === item.asin ? "2px solid var(--ember-500)" : "none", outlineOffset: 2 }}>
                        <Cover item={p} showMeta={false} />
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--fg-3)", textAlign: "center" }}>
                        №{p.series.position.toString().padStart(2, "0")} · {p.percent_complete >= 95 ? "✓" : p.percent_complete + "%"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Snapshots stub */}
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Snapshots · selective history</div>
                <h3 className="v-card-title">Tracked over time</h3>
              </div>
              <span className="v-card-meta">per ADR 0037</span>
            </div>
            <div className="v-card-body is-tight">
              <table className="v-table is-compact">
                <thead>
                  <tr><th>Date</th><th>% complete</th><th>Price</th><th>Returnable</th><th>Plans</th></tr>
                </thead>
                <tbody>
                  <tr><td className="v-mono v-td-mute">{item.purchase_date}</td><td className="v-mono">0 %</td><td className="v-mono">{formatPrice(item.price)}</td><td className="v-mono">yes</td><td className="v-mono v-td-mute">{item.plans.join(", ") || "—"}</td></tr>
                  <tr><td className="v-mono v-td-mute">2025-09-01</td><td className="v-mono">{Math.max(0, item.percent_complete - 18)} %</td><td className="v-mono">{formatPrice(item.price)}</td><td className="v-mono v-td-mute">no</td><td className="v-mono v-td-mute">{item.plans.join(", ") || "—"}</td></tr>
                  <tr><td className="v-mono v-td-mute">2026-04-12</td><td className="v-mono">{Math.max(0, item.percent_complete - 4)} %</td><td className="v-mono">{formatPrice(item.price)}</td><td className="v-mono v-td-mute">no</td><td className="v-mono v-td-mute">{item.plans.join(", ") || "—"}</td></tr>
                  <tr style={{ background: "var(--ember-50)" }}><td className="v-mono">today</td><td className="v-mono">{item.percent_complete} %</td><td className="v-mono">{formatPrice(item.price)}</td><td className="v-mono v-td-mute">{item.is_returnable ? "yes" : "no"}</td><td className="v-mono v-td-mute">{item.plans.join(", ") || "—"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewDense, OverviewCalm, LibraryTable, ItemDetail });
