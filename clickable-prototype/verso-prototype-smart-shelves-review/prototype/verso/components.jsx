/* global React */
// =============================================================
// VERSO — shared UI components
// =============================================================
const { useState, useMemo, useEffect, useRef } = React;

// ---------------- Icons (Lucide @ 1.5 stroke) ----------------
const Icon = ({ d, size = 14, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}
       fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    {d}
  </svg>
);
const I = {
  search:   <Icon size={14} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
  bell:     <Icon size={14} d={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />,
  refresh:  <Icon size={14} d={<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15A9 9 0 0 1 5.64 18.36L1 14"/></>} />,
  download: <Icon size={14} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />,
  upload:   <Icon size={14} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />,
  filter:   <Icon size={14} d={<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>} />,
  arrowR:   <Icon size={12} d={<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>} />,
  chevR:    <Icon size={12} d={<polyline points="9 18 15 12 9 6"/>} />,
  chevD:    <Icon size={12} d={<polyline points="6 9 12 15 18 9"/>} />,
  check:    <Icon size={12} d={<polyline points="20 6 9 17 4 12"/>} />,
  x:        <Icon size={12} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
  plus:     <Icon size={12} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  tag:      <Icon size={14} d={<><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>} />,
  book:     <Icon size={14} d={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>} />,
  headph:   <Icon size={14} d={<><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>} />,
  bars:     <Icon size={14} d={<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>} />,
  grid:     <Icon size={14} d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>} />,
  rows:     <Icon size={14} d={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>} />,
  shelves:  <Icon size={14} d={<><path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/><path d="M7 4v15"/><path d="M17 4v15"/></>} />,
  health:   <Icon size={14} d={<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>} />,
  settings: <Icon size={14} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />,
};

// ---------------- Helpers ----------------
function formatHours(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return m + " m";
  if (m === 0) return h + " h";
  return h + " h " + m.toString().padStart(2, "0") + " m";
}
function formatHoursShort(min) {
  const h = min / 60;
  return h.toFixed(h < 10 ? 1 : 0) + " h";
}
function formatPrice(p) {
  if (p == null) return "—";
  return "$ " + p.toFixed(2);
}
function relativeTime(iso) {
  const t = new Date(iso).getTime();
  const ago = Date.now() - t;
  const m = Math.floor(ago / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " h ago";
  const d = Math.floor(h / 24);
  return d + " d ago";
}

// ---------------- Cover ----------------
// Procedural typographic placeholder, in-brand
const COVER_PALETTES = [
  { bg: "#0B0E14", fg: "#FAFBFC", accent: "#C2410C" }, // ink + ember
  { bg: "#C2410C", fg: "#FEF6EF", accent: "#0B0E14" }, // ember
  { bg: "#1E2330", fg: "#FAFBFC", accent: "#E2541A" }, // ink-800
  { bg: "#3A6B8C", fg: "#FAFBFC", accent: "#FDEAD9" }, // ocean
  { bg: "#5C7A55", fg: "#FAFBFC", accent: "#F0825C" }, // moss
  { bg: "#8C4156", fg: "#FAFBFC", accent: "#F0825C" }, // wine
  { bg: "#B58A3E", fg: "#FAFBFC", accent: "#1E2330" }, // ochre
  { bg: "#4F7F7C", fg: "#FAFBFC", accent: "#FEF6EF" }, // teal
  { bg: "#6B5478", fg: "#FAFBFC", accent: "#F0825C" }, // plum
  { bg: "#2D3340", fg: "#FAFBFC", accent: "#E2541A" }, // graphite
  { bg: "#FAFBFC", fg: "#0B0E14", accent: "#C2410C" }, // paper / inverted
  { bg: "#FDEAD9", fg: "#0B0E14", accent: "#C2410C" }, // ember soft
  { bg: "#ECEFF4", fg: "#0B0E14", accent: "#3A6B8C" }, // slate soft
];

function coverStyle(seed) {
  const p = COVER_PALETTES[seed % COVER_PALETTES.length];
  return { background: p.bg, color: p.fg, "--cover-accent": p.accent };
}

function CoverMark({ seed, fg }) {
  // Different procedural marks per seed
  const variant = seed % 6;
  const op = 0.20;
  switch (variant) {
    case 0: // big lowercase letter behind
      return null;
    case 1: // dashed rules
      return (
        <svg className="v-cover-mark" style={{ left: "9%", right: "9%", bottom: "20%", top: "30%" }} preserveAspectRatio="none" viewBox="0 0 100 100">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1="0" x2="100" y1={i * 12 + 4} y2={i * 12 + 4}
                  stroke={fg} strokeOpacity={op} strokeWidth="0.6" strokeDasharray="2 3" />
          ))}
        </svg>
      );
    case 2: // grid
      return (
        <svg className="v-cover-mark" style={{ left: "9%", right: "9%", top: "32%", bottom: "32%" }} preserveAspectRatio="none" viewBox="0 0 100 100">
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={"h"+i} x1="0" x2="100" y1={i * 20} y2={i * 20} stroke={fg} strokeOpacity={op} strokeWidth="0.5" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={"v"+i} x1={i * 20} x2={i * 20} y1="0" y2="100" stroke={fg} strokeOpacity={op} strokeWidth="0.5" />
          ))}
        </svg>
      );
    case 3: // single horizontal rule
      return <div className="v-cover-rule"></div>;
    case 4: // outline square
      return (
        <svg className="v-cover-mark" style={{ left: "9%", right: "9%", top: "10%", bottom: "10%" }} preserveAspectRatio="none" viewBox="0 0 100 100">
          <rect x="0.5" y="0.5" width="99" height="99" stroke={fg} strokeOpacity={op} strokeWidth="0.8" fill="none" />
        </svg>
      );
    case 5: // diagonal half tint
      return (
        <svg className="v-cover-mark" style={{ inset: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,100 L100,100 L100,30 Z" fill="var(--cover-accent)" opacity="0.18" />
        </svg>
      );
  }
}

function Cover({ item, showMeta = true, hideSeriesNum = false }) {
  const style = coverStyle(item.product_image_seed);
  const fg = style.color;
  const title = item.title;
  return (
    <div className="v-cover" style={{ ...style, containerType: "inline-size" }}>
      <CoverMark seed={item.product_image_seed} fg={fg} />
      {item.series && !hideSeriesNum && (
        <div className="v-cover-num">№ {item.series.position.toString().padStart(2, "0")}</div>
      )}
      <div className="v-cover-author">{item.author}</div>
      <div className="v-cover-title">{title}</div>
      {showMeta && (
        <div className="v-cover-meta">
          {formatHoursShort(item.runtime_length_min)}
          {item.series && " · " + item.series.name.split(" ").slice(0, 2).join(" ")}
        </div>
      )}
    </div>
  );
}

// ---------------- Sidebar ----------------
const NAV_SECTIONS = [
  {
    label: "Library",
    items: [
      { id: "overview", name: "Overview" },
      { id: "library", name: "All items" },
      { id: "wall", name: "Cover wall" },
    ],
  },
  {
    label: "Reports",
    items: [
      { id: "report-cadence", name: "Listening cadence" },
      { id: "report-genre", name: "Genre treemap" },
      { id: "report-authors", name: "Author concentration" },
      { id: "report-narrators", name: "Narrator affinity" },
      { id: "report-runtime", name: "Runtime distribution" },
      { id: "report-keywords", name: "Subject keywords" },
      { id: "report-cost", name: "Cost per hour" },
    ],
  },
  {
    label: "Curation",
    items: [
      { id: "shelves", name: "Smart shelves" },
      { id: "health", name: "Health check" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "refresh", name: "Refresh status" },
      { id: "export", name: "Export status" },
      { id: "settings", name: "Settings" },
    ],
  },
];

function navCount(id, data) {
  switch (id) {
    case "overview": return null;
    case "library":  return data.totals.items;
    case "shelves":  return 6;
    case "wall":     return null;
    case "report-cadence": return null;
    case "report-genre": return new Set(data.items.map((item) => item.category_ladders && item.category_ladders[0] ? item.category_ladders[0][2] : "Unknown")).size;
    case "report-authors": return data.authors.length;
    case "report-narrators": return data.narrators.length;
    case "report-runtime": return null;
    case "report-keywords": return data.keywords.length;
    case "report-cost": return null;
    case "health":   return data.findings.length;
    case "refresh":  return null;
    case "export":   return null;
    case "settings": return null;
  }
  return null;
}

function Sidebar({ active, onNavigate, data }) {
  const last = relativeTime(data.lastRefresh);
  return (
    <aside className="v-sidebar">
      <div className="v-brand">
        <span className="v-brand-sq" />
        <span className="v-brand-name">Verso</span>
        <span className="v-brand-sub">v0.4</span>
      </div>
      <nav className="v-nav">
        {NAV_SECTIONS.map((sec) => (
          <div className="v-nav-section" key={sec.label}>
            <div className="v-nav-label">{sec.label}</div>
            {sec.items.map((item) => {
              const c = navCount(item.id, data);
              return (
                <button
                  key={item.id}
                  className={`v-nav-item ${active === item.id ? "is-active" : ""}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <span>{item.name}</span>
                  {c != null && <span className="v-nav-count">{c.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="v-sidebar-foot">
        <div className="v-refresh-chip">
          <span className="v-refresh-lbl">Last refresh · OK</span>
          <span className="v-refresh-val">{last} · {data.totals.items} items</span>
        </div>
        <div className="v-user">
          <div className="v-avatar">JD</div>
          <div>
            <div className="v-user-name">Library owner</div>
            <div className="v-user-meta">Local · single-user</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------- Top nav (alternate chrome) ----------------
const TOP_NAV_PRIMARY = [
  { id: "overview", name: "Overview" },
  { id: "library", name: "Library" },
  { id: "shelves", name: "Shelves" },
  { id: "wall", name: "Covers" },
  { id: "reports", name: "Reports", children: ["report-cadence", "report-genre", "report-authors", "report-narrators", "report-runtime", "report-keywords", "report-cost"] },
  { id: "health", name: "Health" },
  { id: "export", name: "Export" },
  { id: "settings", name: "Settings" },
];

function TopNav({ active, onNavigate, data }) {
  // Reports parent is active if any child is
  const isActive = (id, children) => active === id || (children && children.includes(active));
  const [reportsOpen, setReportsOpen] = useState(false);
  return (
    <header className="v-topnav">
      <div className="v-topnav-inner">
        <div className="v-topnav-brand">
          <span className="v-brand-sq" />
          <span className="v-brand-name">Verso</span>
          <span className="v-brand-sub">v0.4</span>
        </div>
        <div className="v-topnav-items">
          {TOP_NAV_PRIMARY.map((it) => (
            <div key={it.id} style={{ position: "relative" }}
                 onMouseEnter={() => it.children && setReportsOpen(true)}
                 onMouseLeave={() => it.children && setReportsOpen(false)}>
              <button className={`v-topnav-item ${isActive(it.id, it.children) ? "is-active" : ""}`}
                      onClick={() => {
                        if (it.id === "reports") onNavigate(it.children[0]);
                        else onNavigate(it.id);
                      }}>
                {it.name}
                {it.children && <span style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 9 }}>▾</span>}
              </button>
              {it.children && reportsOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 2,
                  background: "white", border: "1px solid var(--line-1)",
                  boxShadow: "var(--shadow-2)", minWidth: 220, zIndex: 100,
                }}>
                  {it.children.map((cid) => {
                    const lbl = NAV_SECTIONS.flatMap(s => s.items).find(x => x.id === cid)?.name;
                    return (
                      <button key={cid}
                              onClick={() => { setReportsOpen(false); onNavigate(cid); }}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "8px 14px", fontSize: 13, background: "transparent",
                                border: 0, color: active === cid ? "var(--ember-500)" : "var(--ink-800)",
                                cursor: "pointer",
                              }}
                              onMouseDown={(e) => e.preventDefault()}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="v-cmd">
          {I.search}
          <span>Search 812 items, authors, narrators…</span>
          <span className="v-kbd">⌘K</span>
        </button>
        <button className="v-icon-btn"><span>{I.refresh}</span></button>
        <div className="v-avatar" style={{ width: 26, height: 26 }}>JD</div>
      </div>
    </header>
  );
}

// ---------------- TopBar (per-page) ----------------
function TopBar({ title, breadcrumbs, actions, search = true }) {
  return (
    <header className="v-topbar">
      <div className="v-topbar-left">
        <div className="v-crumbs">
          {breadcrumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="v-crumb-sep">/</span>}
              <span className={i === breadcrumbs.length - 1 ? "v-crumb-cur" : "v-crumb"}>{c}</span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="v-page-title">{title}</h1>
      </div>
      <div className="v-topbar-right">
        {search && (
          <button className="v-cmd">
            {I.search}
            <span>Search items, authors, narrators…</span>
            <span className="v-kbd">⌘K</span>
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}

// ---------------- KPI ----------------
function KPI({ label, value, delta, deltaPos, sub, accent, large }) {
  return (
    <div className={`v-kpi ${accent ? "is-accent" : ""}`}>
      <div className="v-kpi-label">{label}</div>
      <div className={`v-kpi-value ${large ? "is-large" : ""}`}>{value}</div>
      <div className="v-kpi-foot">
        {delta != null && (
          <span className={`v-delta ${deltaPos ? "is-pos" : "is-neg"}`}>
            {deltaPos ? "+ " : "− "}{delta}
          </span>
        )}
        {sub && <span className="v-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ---------------- Progress ----------------
function Progress({ pc }) {
  const done = pc >= 95;
  return (
    <div className={`v-progress is-thin ${done ? "is-complete" : ""}`}>
      <div className="v-progress-bar" style={{ width: pc + "%" }} />
    </div>
  );
}

// ---------------- Empty ----------------
function Empty({ children }) { return <div className="v-empty">{children || "Nothing here."}</div>; }

// Export
Object.assign(window, {
  Icon, I, Cover, coverStyle, formatHours, formatHoursShort, formatPrice, relativeTime,
  Sidebar, TopNav, TopBar, KPI, Progress, Empty, NAV_SECTIONS,
});
