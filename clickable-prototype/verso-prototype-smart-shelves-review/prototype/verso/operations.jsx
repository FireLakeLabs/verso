/* global React, KPI, I, formatHoursShort, formatPrice, relativeTime, Cover */
// =============================================================
// VERSO — Health Check, Refresh status, Settings
// =============================================================
const { useState: useStateOps, useEffect: useEffectOps, useMemo: useMemoOps } = React;

// ====================================================================
// HEALTH CHECK
// ====================================================================
const KIND_LABELS = {
  "near-finished": { label: "Stuck near 100 %", desc: "Items at 95–99 % that never crossed the line." },
  "bounced-early": { label: "Bounced early", desc: "Under 22 % a year on, still in your library." },
  "still-returnable": { label: "Still returnable", desc: "Returnable window still open, barely heard." },
  "duplicate": { label: "Possible duplicate", desc: "Fuzzy title/author match against another item." },
  "sparse-meta": { label: "Sparse metadata", desc: "Missing category ladder or summary." },
};

function ReportHealth({ data, onOpenItem }) {
  const [kind, setKind] = useStateOps("all");
  const [resolved, setResolved] = useStateOps(new Set());

  const groups = useMemoOps(() => {
    const g = {};
    for (const f of data.findings) (g[f.kind] = g[f.kind] || []).push(f);
    return g;
  }, [data]);

  const list = kind === "all" ? data.findings : (groups[kind] || []);
  const visible = list.filter(f => !resolved.has(f.id));

  function resolve(f) {
    const n = new Set(resolved); n.add(f.id); setResolved(n);
  }
  function reopen(f) {
    const n = new Set(resolved); n.delete(f.id); setResolved(n);
  }

  const totalOpen = data.findings.length - resolved.size;
  const cautionCount = data.findings.filter(f => f.severity === "caution" && !resolved.has(f.id)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Open findings" value={totalOpen} accent sub={`${resolved.size} dispositioned`} />
        <KPI label="Caution" value={cautionCount} sub="returnable, duplicate" />
        <KPI label="Info" value={totalOpen - cautionCount} sub="advisory only" />
        <KPI label="Last check" value={relativeTime(data.lastRefresh)} sub="re-runs on refresh" />
      </div>

      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Library health · advisory only (ADR 0021)</div>
            <h3 className="v-card-title">Findings · backend-evaluated</h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="v-btn v-btn-outline v-btn-sm">{I.refresh} Re-evaluate</button>
            <button className="v-btn v-btn-outline v-btn-sm">{I.download} Export findings</button>
          </div>
        </div>
        {/* Tabs by kind */}
        <div style={{ borderBottom: "1px solid var(--line-1)", display: "flex" }}>
          <button className={`v-tab ${kind === "all" ? "is-on" : ""}`} onClick={() => setKind("all")}>
            All<span className="v-tab-count">{totalOpen}</span>
          </button>
          {Object.entries(KIND_LABELS).map(([k, def]) => {
            const c = (groups[k] || []).filter(f => !resolved.has(f.id)).length;
            return (
              <button key={k} className={`v-tab ${kind === k ? "is-on" : ""}`} onClick={() => setKind(k)}>
                {def.label}<span className="v-tab-count">{c}</span>
              </button>
            );
          })}
        </div>

        {kind !== "all" && KIND_LABELS[kind] && (
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-1)", background: "var(--ink-50)", fontSize: 12.5, color: "var(--fg-2)" }}>
            {KIND_LABELS[kind].desc}
          </div>
        )}

        <div>
          {visible.length === 0 ? (
            <div className="v-empty">All clear in this bucket.</div>
          ) : visible.slice(0, 30).map(f => (
            <div className="v-finding" key={f.id}>
              <div className={`v-finding-icon ${f.severity === "caution" ? "is-cau" : "is-info"}`} />
              <div className="v-finding-text">
                <div className="v-finding-title">{f.title}</div>
                <div className="v-finding-note">
                  <span style={{ fontWeight: 500, color: "var(--ink-900)" }}>{f.item.title}</span>
                  {" "}· {f.item.author} · {f.note}
                  {f.dup && <> Likely match: <span style={{ fontStyle: "italic" }}>{f.dup.title}</span></>}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button className="v-finding-link" onClick={() => onOpenItem(f.item)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                    OPEN ITEM →
                  </button>
                  <span className="v-eyebrow" style={{ color: "var(--fg-3)" }}>FINDING · {f.id}</span>
                </div>
              </div>
              <div className="v-finding-actions">
                <button className="v-btn v-btn-outline v-btn-sm" onClick={() => resolve(f)}>Dismiss</button>
                <button className="v-btn v-btn-ghost v-btn-sm">Snooze</button>
              </div>
            </div>
          ))}
        </div>
        {visible.length > 30 && (
          <div style={{ padding: 14, textAlign: "center", borderTop: "1px solid var(--line-1)" }}>
            <button className="v-btn v-btn-outline v-btn-sm">Show {visible.length - 30} more</button>
          </div>
        )}

        {resolved.size > 0 && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-1)", background: "var(--ink-50)", fontSize: 12, color: "var(--fg-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{resolved.size} dispositioned this session · backend-authoritative for stable dispositions.</span>
            <button className="v-btn v-btn-ghost v-btn-sm" onClick={() => setResolved(new Set())}>Undo all</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================================
// REFRESH STATUS
// ====================================================================
const REFRESH_STEPS_DEF = [
  { id: "auth",      name: "Audible auth session",     detail: "Reuse stored session · ADR 0012", durEst: 6 },
  { id: "fetch",     name: "Fetch library pages",       detail: "Pagination over response groups", durEst: 78 },
  { id: "covers",    name: "Cache cover images",        detail: "ADR 0024 · local file store",     durEst: 42 },
  { id: "normalize", name: "Normalize + persist",       detail: "EF Core · upsert by ASIN",        durEst: 18 },
  { id: "snapshot",  name: "Selective snapshots",       detail: "ADR 0037 · diff vs last snapshot",durEst: 9 },
  { id: "shelves",   name: "Re-evaluate Smart Shelves", detail: "Backend evaluation · ADR 0020",   durEst: 4 },
  { id: "health",    name: "Re-evaluate Health Findings", detail: "ADR 0021",                       durEst: 3 },
];

function RefreshStatus({ data }) {
  // Simulate a running refresh: cycles through steps
  const [running, setRunning] = useStateOps(false);
  const [step, setStep] = useStateOps(REFRESH_STEPS_DEF.length); // start = "completed last run"
  const [elapsed, setElapsed] = useStateOps(0);
  const [stepProgress, setStepProgress] = useStateOps(1);

  useEffectOps(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setStepProgress(p => {
        const np = p + 0.04 + Math.random() * 0.04;
        if (np >= 1) {
          setStep(s => {
            const next = s + 1;
            if (next >= REFRESH_STEPS_DEF.length) {
              setRunning(false);
              return REFRESH_STEPS_DEF.length;
            }
            return next;
          });
          return 0;
        }
        return np;
      });
      setElapsed(e => e + 0.4);
    }, 400);
    return () => clearInterval(timer);
  }, [running]);

  function startRefresh() {
    setRunning(true);
    setStep(0);
    setElapsed(0);
    setStepProgress(0);
  }

  const isComplete = !running && step >= REFRESH_STEPS_DEF.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Current job */}
      <div className="v-card is-accent">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow v-eyebrow-accent">Refresh · local job</div>
            <h3 className="v-card-title">
              {running ? "Refreshing now…" : isComplete ? `Last refresh · OK · ${relativeTime(data.lastRefresh)}` : "Ready"}
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!running ? (
              <button className="v-btn v-btn-primary" onClick={startRefresh}>{I.refresh} Refresh now</button>
            ) : (
              <button className="v-btn v-btn-outline" onClick={() => { setRunning(false); }}>Pause</button>
            )}
            <button className="v-btn v-btn-outline" disabled={running}>Schedule…</button>
          </div>
        </div>
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line-1)", background: running ? "var(--ember-50)" : "var(--ink-50)", display: "flex", gap: 24, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-3)" }}>
            {running && <span className="v-spinner" />}
            <span>JOB · {running ? "VRS-" + Date.now().toString().slice(-6) : "VRS-928413"}</span>
            <span>STARTED · {running ? (elapsed.toFixed(1) + " S AGO") : new Date(data.lastRefresh).toISOString().slice(11, 19) + "Z"}</span>
            <span>ELAPSED · {running ? elapsed.toFixed(1) : data.refreshDuration} S</span>
            <span>ITEMS · {running ? Math.floor((step / REFRESH_STEPS_DEF.length) * data.totals.items) : data.totals.items}</span>
            {isComplete && <span style={{ color: "var(--positive)" }}>OUTCOME · OK</span>}
        </div>
        <div>
          {REFRESH_STEPS_DEF.map((s, i) => {
            const isDone = i < step;
            const isRunning = i === step && running;
            const isPending = i > step && running;
            const isPast = i < step && isComplete;
            const stateClass = isDone || isPast ? "is-done" : isRunning ? "is-running" : "";
            return (
              <div className="v-job-step" key={s.id}>
                <div className={`v-job-dot ${stateClass}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="v-job-name">{s.name}</div>
                  <div className="v-job-detail">{s.detail}</div>
                  {isRunning && (
                    <div className="v-progress is-thin" style={{ marginTop: 8, width: 280 }}>
                      <div className="v-progress-bar" style={{ width: (stepProgress * 100) + "%" }} />
                    </div>
                  )}
                </div>
                <div className="v-job-time">
                  {isRunning && <span className="v-job-progress">{(stepProgress * s.durEst).toFixed(1)} / {s.durEst} S</span>}
                  {(isDone || isPast) && <span style={{ color: "var(--positive)" }}>✓ {s.durEst} S</span>}
                  {isPending && <span>—</span>}
                  {!running && !isPast && i < step && <span style={{ color: "var(--positive)" }}>✓ {s.durEst} S</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid var(--line-1)", background: "var(--ink-50)" }}>
          <div className="v-callout">
            <span className="v-callout-l">Partial-failure policy</span>
            <span>If any step fails, current Audible Facts stay untouched. Items missing from a later successful refresh are retained as no-longer-present (ADR 0033, 0034).</span>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="v-card">
        <div className="v-card-head">
          <div className="v-card-head-left">
            <div className="v-eyebrow">Job history · last 8 runs</div>
            <h3 className="v-card-title">Refresh log</h3>
          </div>
        </div>
        <div className="v-card-body is-tight">
          <table className="v-table is-compact">
            <thead>
              <tr>
                <th>Job</th>
                <th>Started</th>
                <th className="r">Duration</th>
                <th className="r">Items</th>
                <th className="r">Added</th>
                <th className="r">Updated</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["VRS-928413", "47 min ago", 142, 812, 0, 14, "OK", "pos"],
                ["VRS-928211", "1 d ago",   136, 812, 1, 6, "OK", "pos"],
                ["VRS-928009", "2 d ago",   141, 811, 0, 11, "OK", "pos"],
                ["VRS-927807", "4 d ago",   168, 811, 2, 8, "OK", "pos"],
                ["VRS-927605", "6 d ago",   289, 809, 0, 3, "Partial · retained", "cau"],
                ["VRS-927403", "8 d ago",   132, 809, 0, 5, "OK", "pos"],
                ["VRS-927201", "10 d ago",  138, 809, 4, 9, "OK", "pos"],
                ["VRS-926999", "12 d ago",  130, 805, 0, 2, "OK", "pos"],
              ].map(([id, when, dur, items, added, updated, out, klass]) => (
                <tr key={id}>
                  <td className="v-mono" style={{ color: "var(--ember-500)" }}>{id}</td>
                  <td className="v-mono v-td-mute">{when}</td>
                  <td className="r v-mono">{dur} s</td>
                  <td className="r v-mono">{items}</td>
                  <td className="r v-mono">{added > 0 ? "+ " + added : <span className="v-td-mute">—</span>}</td>
                  <td className="r v-mono">{updated > 0 ? "Δ " + updated : <span className="v-td-mute">—</span>}</td>
                  <td><span className={`v-pill is-${klass}`}>{out}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// SETTINGS
// ====================================================================
const SETTINGS_SECTIONS = [
  { id: "auth",     name: "Audible authentication" },
  { id: "refresh",  name: "Refresh" },
  { id: "interface", name: "Interface" },
  { id: "cost",     name: "Cost basis" },
  { id: "storage",  name: "Local data" },
  { id: "export",   name: "Archive export" },
];

function Settings({ data, preferences = {}, onSetPreference, onNavigate }) {
  const [section, setSection] = useStateOps("auth");
  const [costBasis, setCostBasis] = useStateOps("credit");
  const [creditVal, setCreditVal] = useStateOps(data.creditValueDefault);
  const [refreshMode, setRefreshMode] = useStateOps("manual");
  const [retainMissing, setRetainMissing] = useStateOps(true);
  const [includeRaw, setIncludeRaw] = useStateOps(true);
  const [format, setFormat] = useStateOps("json");
  const currentPrefs = {
    nav: preferences.nav || "topnav",
    overview: preferences.overview || "calm",
    libraryView: preferences.libraryView || "rows",
  };
  const setPreference = onSetPreference || (() => {});

  return (
    <div className="v-settings-grid">
      <aside className="v-settings-nav">
        <div className="v-eyebrow" style={{ padding: "6px 10px 8px", color: "var(--fg-3)" }}>Settings · Solid v1</div>
        {SETTINGS_SECTIONS.map(s => (
          <button key={s.id} className={section === s.id ? "is-on" : ""} onClick={() => setSection(s.id)}>{s.name}</button>
        ))}
        <hr className="v-hr" style={{ margin: "12px 0" }} />
        <div className="v-callout" style={{ marginTop: 4 }}>
          <span className="v-callout-l">Solid v1 scope</span>
          <span>Only interpretation + local operation are configurable here. Per ADR 0045.</span>
        </div>
      </aside>

      <div className="v-card">
        {section === "auth" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Audible authentication</div>
                <h3 className="v-card-title">Session · delegated to AudibleApi (ADR 0012)</h3>
              </div>
              <span className="v-pill is-pos">Active</span>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Marketplace</span>
                  <span className="v-form-label-h">Origin marketplace currently bound to this session.</span>
                </div>
                <div className="v-form-control">
                  <select className="v-input">
                    <option>US — audible.com</option>
                    <option>UK — audible.co.uk</option>
                    <option>CA — audible.ca</option>
                    <option>AU — audible.com.au</option>
                  </select>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Account</span>
                  <span className="v-form-label-h">We store only the minimum local session material per ADR 0012.</span>
                </div>
                <div className="v-form-control">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input className="v-input" defaultValue="library-owner@anonymized.local" disabled />
                    <div className="v-meta-row">
                      <span>SESSION · CREATED 2025-08-14</span>
                      <span>EXPIRES · 2026-08-14</span>
                      <span>ROTATIONS · 4</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="v-btn v-btn-outline">Re-authenticate via AudibleApi</button>
                    <button className="v-btn v-btn-ghost" style={{ color: "var(--negative)" }}>Sign out</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "refresh" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Refresh controls</div>
                <h3 className="v-card-title">When and how Verso pulls from Audible</h3>
              </div>
              <span className="v-card-meta">last: {relativeTime(data.lastRefresh)} · OK</span>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Trigger</span>
                  <span className="v-form-label-h">Solid v1 is local-on-demand (ADR 0006). Auto-refresh is opt-in only.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    {[
                      ["manual", "Manual only", "I'll click refresh when I want it."],
                      ["startup", "On app start", "Run a refresh whenever Verso opens."],
                      ["daily", "Daily at idle", "Background daily, respects rate limits."],
                    ].map(([id, l, h]) => (
                      <div key={id} className={`v-radio ${refreshMode === id ? "is-on" : ""}`} onClick={() => setRefreshMode(id)}>
                        <div className="v-radio-mark" />
                        <div className="v-radio-text">
                          <span className="v-radio-l">{l}</span>
                          <span className="v-radio-h">{h}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Retain no-longer-present items</span>
                  <span className="v-form-label-h">Per ADR 0034 — items missing from a later successful refresh stay in the library with their history.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-switch-row" onClick={() => setRetainMissing(!retainMissing)}>
                    <span className={`v-switch ${retainMissing ? "is-on" : ""}`}><span className="v-switch-knob" /></span>
                    <span>{retainMissing ? "Retain · recommended" : "Drop (not recommended)"}</span>
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Selective snapshot fields</span>
                  <span className="v-form-label-h">Per ADR 0037 — only analysis-relevant fields are versioned.</span>
                </div>
                <div className="v-form-control">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13 }}>
                    {["percent_complete", "price", "plans", "is_returnable", "rating", "pdf_link", "_present"].map(k => (
                      <label key={k} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        <span className="v-check is-on" />
                        <span>{k}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "interface" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Interface defaults</div>
                <h3 className="v-card-title">Prototype-visible display preferences</h3>
              </div>
              <span className="v-pill is-info">Local only</span>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Navigation chrome</span>
                  <span className="v-form-label-h">These controls were previously hidden in the tweak drawer. This prototype surfaces them as first-class settings.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    {[
                      ["topnav", "Top navigation", "Best when the app is used mostly as a dashboard."],
                      ["sidebar", "Sidebar", "Best when the app is used as an operational workspace."],
                    ].map(([id, label, help]) => (
                      <div key={id} className={`v-radio ${currentPrefs.nav === id ? "is-on" : ""}`} onClick={() => setPreference("nav", id)}>
                        <div className="v-radio-mark" />
                        <div className="v-radio-text">
                          <span className="v-radio-l">{label}</span>
                          <span className="v-radio-h">{help}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Overview default</span>
                  <span className="v-form-label-h">Lets the user choose whether overview opens as a calm briefing or a denser operations dashboard.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    {[
                      ["calm", "Calm", "Narrative scan with fewer competing surfaces."],
                      ["dense", "Data-dense", "Maximum telemetry on first load."],
                    ].map(([id, label, help]) => (
                      <div key={id} className={`v-radio ${currentPrefs.overview === id ? "is-on" : ""}`} onClick={() => setPreference("overview", id)}>
                        <div className="v-radio-mark" />
                        <div className="v-radio-text">
                          <span className="v-radio-l">{label}</span>
                          <span className="v-radio-h">{help}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Library default view</span>
                  <span className="v-form-label-h">A persistent choice between compact inventory browsing and card-based visual scanning.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    {[
                      ["rows", "Compact rows", "Fastest path for searching and sorting."],
                      ["cards", "Card grid", "More cover-forward browsing."],
                    ].map(([id, label, help]) => (
                      <div key={id} className={`v-radio ${currentPrefs.libraryView === id ? "is-on" : ""}`} onClick={() => setPreference("libraryView", id)}>
                        <div className="v-radio-mark" />
                        <div className="v-radio-text">
                          <span className="v-radio-l">{label}</span>
                          <span className="v-radio-h">{help}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Command palette</span>
                  <span className="v-form-label-h">Still prototype-only. The screen now makes the gap explicit rather than burying it.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-callout">
                    <span className="v-callout-l">Deferred interaction</span>
                    <span>The keyboard shortcut affordance is visible in the chrome, but command routing still needs a dedicated workflow prototype before story updates.</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "cost" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Cost basis</div>
                <h3 className="v-card-title">How Verso computes effective price</h3>
              </div>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Default basis</span>
                  <span className="v-form-label-h">Once a per-credit value is configured, it becomes the default. List price remains available everywhere.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    <div className={`v-radio ${costBasis === "credit" ? "is-on" : ""}`} onClick={() => setCostBasis("credit")}>
                      <div className="v-radio-mark" />
                      <div className="v-radio-text">
                        <span className="v-radio-l">Per-credit value</span>
                        <span className="v-radio-h">Honest cost on Premium Plus titles.</span>
                      </div>
                    </div>
                    <div className={`v-radio ${costBasis === "list" ? "is-on" : ""}`} onClick={() => setCostBasis("list")}>
                      <div className="v-radio-mark" />
                      <div className="v-radio-text">
                        <span className="v-radio-l">List price</span>
                        <span className="v-radio-h">What Audible quotes.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Per-credit value</span>
                  <span className="v-form-label-h">Membership annual cost ÷ credits received. Used wherever Cost Basis = per-credit.</span>
                </div>
                <div className="v-form-control">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="v-eyebrow">USD</span>
                    <input type="number" step="0.01" value={creditVal}
                           onChange={(e) => setCreditVal(parseFloat(e.target.value) || 0)}
                           className="v-input v-input-mono" style={{ width: 140 }} />
                    <span className="v-eyebrow">/ CREDIT</span>
                  </div>
                  <div className="v-meta-row" style={{ marginTop: -4 }}>
                    <span>EFFECTIVE COST · ${(creditVal * 12).toFixed(2)} / 12 CREDITS</span>
                    <span>RECOMPUTED ON SAVE</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "storage" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Local data</div>
                <h3 className="v-card-title">Where Verso writes</h3>
              </div>
              <span className="v-pill is-info">SQLite · ADR 0005</span>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Database location</span>
                  <span className="v-form-label-h">EF Core owns migrations. Move requires re-binding via CLI.</span>
                </div>
                <div className="v-form-control">
                  <input className="v-input v-input-mono" defaultValue="~/.local/share/verso/verso.db" disabled />
                  <div className="v-meta-row">
                    <span>SIZE · 184.2 MB</span>
                    <span>SCHEMA · v0.4</span>
                    <span>RAW PAYLOADS · 812 (ADR 0036)</span>
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Cover cache</span>
                  <span className="v-form-label-h">ADR 0024 — covers are cached locally on refresh.</span>
                </div>
                <div className="v-form-control">
                  <input className="v-input v-input-mono" defaultValue="~/.local/share/verso/covers/" disabled />
                  <div className="v-meta-row">
                    <span>SIZE · 96.7 MB</span>
                    <span>FILES · 812</span>
                    <span>MISSING · 0</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="v-btn v-btn-outline v-btn-sm">Recache missing</button>
                    <button className="v-btn v-btn-ghost v-btn-sm" style={{ color: "var(--negative)" }}>Clear cover cache</button>
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Companion PDFs</span>
                  <span className="v-form-label-h">Solid v1 preserves the link only. Caching deferred per ADR 0025.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-callout">
                    <span className="v-callout-l">Deferred</span>
                    <span>PDF caching arrives with the PDF Companion Vault in Phase 3.</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "export" && (
          <>
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Archive export</div>
                <h3 className="v-card-title">Library Export & Archival (ADR 0010)</h3>
              </div>
              <button className="v-btn v-btn-primary" onClick={() => onNavigate && onNavigate("export")}>{I.download} Open export runner</button>
            </div>
            <div className="v-card-body" style={{ padding: "8px 18px 18px" }}>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Format</span>
                  <span className="v-form-label-h">JSON is the archive of record. CSV and Markdown are projection exports — they may flatten or omit structure.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-radio-row">
                    {[
                      ["json", "JSON · archive", "Audible facts, raw payloads, annotations, snapshots."],
                      ["csv", "CSV · projection", "Flat. Loses raw payloads and per-snapshot fidelity."],
                      ["md", "Markdown · projection", "One file per item. Frontmatter + summary."],
                    ].map(([id, l, h]) => (
                      <div key={id} className={`v-radio ${format === id ? "is-on" : ""}`} onClick={() => setFormat(id)}>
                        <div className="v-radio-mark" />
                        <div className="v-radio-text">
                          <span className="v-radio-l">{l}</span>
                          <span className="v-radio-h">{h}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Include raw payloads</span>
                  <span className="v-form-label-h">ADR 0036 — stored alongside normalized fields for fidelity.</span>
                </div>
                <div className="v-form-control">
                  <div className="v-switch-row" onClick={() => setIncludeRaw(!includeRaw)}>
                    <span className={`v-switch ${includeRaw ? "is-on" : ""}`}><span className="v-switch-knob" /></span>
                    <span>{includeRaw ? "Include" : "Omit"}</span>
                  </div>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Cover images</span>
                  <span className="v-form-label-h">Bundle as a sibling folder, or embed as base64.</span>
                </div>
                <div className="v-form-control">
                  <select className="v-input">
                    <option>Sibling folder (recommended)</option>
                    <option>Embedded base64</option>
                    <option>Omit covers</option>
                  </select>
                </div>
              </div>
              <div className="v-form-group">
                <div className="v-form-label">
                  <span className="v-form-label-l">Restore from archive</span>
                  <span className="v-form-label-h">Deferred to Solid v1.1 per ADR 0026.</span>
                </div>
                <div className="v-form-control">
                  <button className="v-btn v-btn-outline" disabled>{I.upload} Restore… · deferred</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ReportHealth, RefreshStatus, Settings });
