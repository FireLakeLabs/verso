/* global React, KPI, I, formatHoursShort, relativeTime */
// =============================================================
// VERSO — Smart Shelves prototype screen
// =============================================================
const { useMemo: useMemoShelves, useState: useStateShelves } = React;

function buildShelfDefinitions(data) {
  const topAuthor = data.authors[0]?.name;
  return [
    {
      id: "returnable-undecided",
      name: "Still returnable · undecided",
      tone: "cau",
      cadence: "Re-evaluate after every refresh",
      description: "Catch recent purchases still inside the return window before they disappear into the stack.",
      operator: "all",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "all",
          rules: [
            { field: "Returnable", op: "is", value: "Yes", note: "Audible fact" },
            { field: "Progress", op: "below", value: "8%", note: "annotation-adjacent" },
            { field: "Dropped", op: "is", value: "No", note: "explicit only" },
          ],
        },
      ],
      test: (item) => item.is_returnable && item.percent_complete < 8 && !item.is_dropped,
      takeaway: "Good first shelf for validating backend rule evaluation and preview behavior.",
    },
    {
      id: "long-series-in-flight",
      name: "Long series · in flight",
      tone: "accent",
      cadence: "Re-evaluate nightly or on demand",
      description: "Keep the heavy, multi-book commitments visible while they are still unfinished.",
      operator: "all",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "all",
          rules: [
            { field: "Series", op: "exists", value: "Any series", note: "current Audible facts" },
            { field: "Runtime", op: ">", value: "16 h", note: "raw runtime minutes" },
            { field: "Progress", op: "between", value: "1–94%", note: "active listen" },
          ],
        },
      ],
      test: (item) => !!item.series && item.runtime_length_min >= 16 * 60 && item.percent_complete > 0 && item.percent_complete < 95,
      takeaway: "Clarifies that shelves can intersect source facts and annotation-layer progress without manual membership.",
    },
    {
      id: "high-cost-unstarted",
      name: "High-cost · untouched",
      tone: "info",
      cadence: "Re-evaluate after cost-basis changes",
      description: "Surface purchased value that is still sitting idle.",
      operator: "all",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "all",
          rules: [
            { field: "Price", op: ">=", value: "$ 24.00", note: "current fact" },
            { field: "Progress", op: "is", value: "0%", note: "unstarted" },
            { field: "Present", op: "is", value: "Yes", note: "retained items excluded" },
          ],
        },
      ],
      test: (item) => item.price >= 24 && item.percent_complete === 0 && item._present,
      takeaway: "A simple but concrete shelf that pressures export fidelity and Cost Basis follow-on work.",
    },
    {
      id: "tagged-reread-candidates",
      name: "Tagged revisit candidates",
      tone: "dark",
      cadence: "Re-evaluate after annotation edits",
      description: "Treat lightweight tags as first-class inputs to structured shelf rules.",
      operator: "all",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "all",
          rules: [
            { field: "Tags", op: "contains", value: "to-revisit", note: "Verso annotation" },
            { field: "Progress", op: ">=", value: "50%", note: "far enough in to matter" },
          ],
        },
        {
          operator: "any",
          nested: true,
          rules: [
            { field: "Runtime", op: ">=", value: "10 h", note: "long enough to revisit intentionally" },
            { field: "Keywords", op: "contains", value: "habitat", note: "subject keyword" },
          ],
        },
      ],
      test: (item) => item.tags.includes("to-revisit") && item.percent_complete >= 50 && (item.runtime_length_min >= 10 * 60 || item.thesaurus_subject_keywords.includes("habitat")),
      takeaway: "This is the shelf that most clearly forces a decision on nested boolean groups in the backend model.",
    },
    {
      id: "narrator-collectors",
      name: "Narrator collectors",
      tone: "pos",
      cadence: "Re-evaluate after import",
      description: "Follow recurring narrator patterns even when authors vary.",
      operator: "all",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "all",
          rules: [
            { field: "Narrator count", op: "is", value: "1", note: "single voice only" },
            { field: "Runtime", op: ">=", value: "6 h", note: "keeps the shelf meaningful" },
          ],
        },
      ],
      test: (item) => item.narrators.length === 1 && item.runtime_length_min >= 6 * 60,
      takeaway: "Useful as a bridge between Smart Shelves and the still-undesigned Narrator Affinity report.",
    },
    {
      id: "clean-up-queue",
      name: "Clean-up queue",
      tone: "cau",
      cadence: "Re-evaluate after finding dispositions",
      description: "A pragmatic bucket for books that look like they need an explicit decision.",
      operator: "any",
      updatedAt: data.lastRefresh,
      groups: [
        {
          operator: "any",
          rules: [
            { field: "Dropped", op: "is", value: "Yes", note: "explicitly marked" },
            { field: "Progress", op: "between", value: "95–99%", note: "stuck near finish" },
            { field: "Summary", op: "is missing", value: "Publisher summary", note: "sparse metadata signal" },
          ],
        },
      ],
      test: (item) => item.is_dropped || (item.percent_complete >= 95 && item.percent_complete < 100) || !item.publisher_summary,
      takeaway: "Helps explain how Smart Shelves should coexist with Health Findings without duplicating dispositions.",
    },
  ];
}

function deriveShelves(data) {
  return buildShelfDefinitions(data).map((shelf) => {
    const matches = data.items.filter(shelf.test);
    const totalHours = matches.reduce((sum, item) => sum + item.runtime_length_min / 60, 0);
    const avgProgress = matches.length
      ? Math.round(matches.reduce((sum, item) => sum + item.percent_complete, 0) / matches.length)
      : 0;
    const topKeywords = Object.entries(matches.reduce((acc, item) => {
      for (const keyword of item.thesaurus_subject_keywords) acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      ...shelf,
      matches,
      count: matches.length,
      totalHours,
      avgProgress,
      previewKeywords: topKeywords,
      status: matches.length >= 90 ? "Broad" : matches.length >= 24 ? "Focused" : "Narrow",
    };
  });
}

function toneClass(tone) {
  if (tone === "accent") return "is-accent";
  if (tone === "pos") return "is-pos";
  if (tone === "info") return "is-info";
  if (tone === "dark") return "is-dark";
  return "is-cau";
}

function ReportSmartShelves({ data, onNavigate, onOpenItem }) {
  const shelves = useMemoShelves(() => deriveShelves(data), [data]);
  const [activeId, setActiveId] = useStateShelves(
    shelves.find((shelf) => shelf.groups.some((group) => group.nested))?.id || shelves[0]?.id || null,
  );
  const active = shelves.find((shelf) => shelf.id === activeId) || shelves[0];
  const totalMatches = shelves.reduce((sum, shelf) => sum + shelf.count, 0);
  const broadShelves = shelves.filter((shelf) => shelf.count >= 90).length;
  const nestedShelves = shelves.filter((shelf) => shelf.groups.some((group) => group.nested)).length;
  const preview = active ? active.matches.slice(0, 8) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="v-kpi-row is-4">
        <KPI label="Saved shelves" value={shelves.length} accent sub="structured boolean rules" />
        <KPI label="Nested groups" value={nestedShelves} sub="require backend rule tree" />
        <KPI label="Items covered" value={totalMatches.toLocaleString()} sub="matches across all shelves" />
        <KPI label="Broad shelves" value={broadShelves} sub="90+ matching items" />
      </div>

      <div className="v-shelves-layout">
        <div className="v-shelves-sidebar">
          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Smart shelves · backend authoritative</div>
                <h3 className="v-card-title">Saved rule sets</h3>
              </div>
              <span className="v-card-meta">ADR 0009 · ADR 0020</span>
            </div>
            <div className="v-shelf-list">
              {shelves.map((shelf) => (
                <button
                  key={shelf.id}
                  className={`v-shelf-item ${active?.id === shelf.id ? "is-active" : ""}`}
                  onClick={() => setActiveId(shelf.id)}
                >
                  <div className="v-shelf-item-top">
                    <span className="v-shelf-item-name">{shelf.name}</span>
                    <span className={`v-pill ${toneClass(shelf.tone)}`}>{shelf.status}</span>
                  </div>
                  <div className="v-shelf-item-note">{shelf.description}</div>
                  <div className="v-shelf-item-meta">
                    <span>{shelf.count.toLocaleString()} items</span>
                    <span>{Math.round(shelf.totalHours).toLocaleString()} h</span>
                    <span>{relativeTime(shelf.updatedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="v-card">
            <div className="v-card-head">
              <div className="v-card-head-left">
                <div className="v-eyebrow">Why this screen exists</div>
                <h3 className="v-card-title">Backlog clarifier</h3>
              </div>
            </div>
            <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="v-shelf-helper">This prototype answers the rule-builder question before we split or deepen the Smart Shelves story.</div>
              <div className="v-callout">
                <span className="v-callout-l">Solid v1 guardrails</span>
                <span>No scripting, no manual membership, no exceptions, no ordering. Rules are saved here and evaluated by the backend.</span>
              </div>
            </div>
          </div>
        </div>

        {active ? (
          <div className="v-shelf-detail">
            <div className="v-card">
              <div className="v-card-head">
                <div className="v-card-head-left">
                  <div className="v-eyebrow">Selected shelf</div>
                  <h3 className="v-card-title">{active.name}</h3>
                </div>
                <span className="v-card-meta">{active.operator === "all" ? "ALL conditions" : "ANY condition"} at root</span>
              </div>
              <div className="v-card-body">
                <div className="v-shelf-summary-grid">
                  <div className="v-shelf-summary-card">
                    <div className="v-eyebrow">Matches</div>
                    <div className="v-shelf-summary-value">{active.count.toLocaleString()}</div>
                    <div className="v-shelf-summary-copy">Current backend result set preview.</div>
                  </div>
                  <div className="v-shelf-summary-card">
                    <div className="v-eyebrow">Runtime</div>
                    <div className="v-shelf-summary-value">{Math.round(active.totalHours).toLocaleString()} h</div>
                    <div className="v-shelf-summary-copy">Useful for expectation-setting before export or report pivots.</div>
                  </div>
                  <div className="v-shelf-summary-card">
                    <div className="v-eyebrow">Average progress</div>
                    <div className="v-shelf-summary-value">{active.avgProgress}%</div>
                    <div className="v-shelf-summary-copy">Derived only for the preview, not stored as shelf metadata.</div>
                  </div>
                  <div className="v-shelf-summary-card">
                    <div className="v-eyebrow">Top keywords</div>
                    <div className="v-shelf-summary-value">{active.previewKeywords[0]?.[0] || "—"}</div>
                    <div className="v-shelf-summary-copy">{active.previewKeywords.map(([keyword, count]) => `${keyword} (${count})`).join(" · ") || "No obvious subject cluster."}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="v-card">
              <div className="v-card-head">
                <div className="v-card-head-left">
                  <div className="v-eyebrow">Rule builder prototype</div>
                  <h3 className="v-card-title">Structured boolean groups</h3>
                </div>
                <div className="v-shelf-builder-actions">
                  <button className="v-btn v-btn-outline v-btn-sm">{I.plus} Add rule</button>
                  <button className="v-btn v-btn-outline v-btn-sm">{I.plus} Add group</button>
                  <button className="v-btn v-btn-ghost v-btn-sm">Duplicate</button>
                </div>
              </div>
              <div className="v-card-body v-shelf-builder">
                <div className="v-shelf-kicker">
                  <span>Preview shell only</span>
                  <span>{active.cadence}</span>
                </div>
                <div className="v-shelf-helper">{active.takeaway}</div>
                {active.groups.map((group, index) => (
                  <div key={index} className={`v-shelf-rule-group ${group.nested ? "is-nested" : ""}`}>
                    <div className="v-shelf-rule-group-head">
                      <div>
                        <div className="v-eyebrow">{group.nested ? "Nested group" : index === 0 ? "Root group" : `Group ${index + 1}`}</div>
                        <div className="v-shelf-rule-title">Match {group.operator === "all" ? "all of these" : "any of these"}</div>
                      </div>
                      <span className="v-pill is-info">{group.rules.length} rules</span>
                    </div>
                    <div className="v-shelf-rule-group-body">
                      {group.rules.map((rule, ruleIndex) => (
                        <div key={ruleIndex} className="v-shelf-rule-row">
                          <div className="v-shelf-rule-copy">
                            <div className="v-shelf-rule-title">{rule.field} {rule.op} {rule.value}</div>
                            <div className="v-shelf-rule-note">{rule.note}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="v-btn v-btn-ghost v-btn-sm">Edit</button>
                            <button className="v-btn v-btn-ghost v-btn-sm">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="v-shelf-preview-grid">
              <div className="v-card">
                <div className="v-card-head">
                  <div className="v-card-head-left">
                    <div className="v-eyebrow">Preview results</div>
                    <h3 className="v-card-title">Matching items</h3>
                  </div>
                  <div className="v-shelf-preview-meta">
                    <span>{preview.length} shown</span>
                    <span>{active.count.toLocaleString()} total</span>
                  </div>
                </div>
                <div className="v-card-body is-tight">
                  {preview.length === 0 ? (
                    <div className="v-shelf-empty">No items match this shelf yet.</div>
                  ) : (
                    <table className="v-table is-compact v-shelf-preview-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Author</th>
                          <th className="r">Runtime</th>
                          <th className="r">Pc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((item) => (
                          <tr key={item.asin} onClick={() => onOpenItem(item)}>
                            <td>
                              <div className="v-cell-title">
                                <span className="v-cell-title-main">{item.title}</span>
                                <span className="v-cell-title-sub">{item.category_ladders[0][2]}</span>
                              </div>
                            </td>
                            <td className="v-td-mute">{item.author}</td>
                            <td className="r v-mono">{formatHoursShort(item.runtime_length_min)}</td>
                            <td className="r v-mono">{item.percent_complete === 0 ? "—" : `${item.percent_complete}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="v-card">
                  <div className="v-card-head">
                    <div className="v-card-head-left">
                      <div className="v-eyebrow">Preview semantics</div>
                      <h3 className="v-card-title">What this clarifies</h3>
                    </div>
                  </div>
                  <div className="v-card-body v-shelf-preview-list">
                    <div className="v-shelf-preview-row">
                      <div className="v-shelf-preview-row-main">
                        <strong>Backend-authoritative evaluation</strong>
                        <span className="v-shelf-preview-row-meta">Frontend previews result sets. Saved membership is not client-owned.</span>
                      </div>
                      <span className="v-pill is-dark">ADR 0020</span>
                    </div>
                    <div className="v-shelf-preview-row">
                      <div className="v-shelf-preview-row-main">
                        <strong>No manual membership</strong>
                        <span className="v-shelf-preview-row-meta">A shelf is a rule, not a bucket you hand-edit.</span>
                      </div>
                      <span className="v-pill is-cau">Rule only</span>
                    </div>
                    <div className="v-shelf-preview-row">
                      <div className="v-shelf-preview-row-main">
                        <strong>Annotations participate</strong>
                        <span className="v-shelf-preview-row-meta">Tags and dropped state can be rule inputs beside Audible facts.</span>
                      </div>
                      <span className="v-pill is-accent">Verso layer</span>
                    </div>
                  </div>
                </div>

                <div className="v-card">
                  <div className="v-card-head">
                    <div className="v-card-head-left">
                      <div className="v-eyebrow">Where this goes next</div>
                      <h3 className="v-card-title">Prototype bridge</h3>
                    </div>
                  </div>
                  <div className="v-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="v-shelf-helper">This page is enough to review the information density, nested-group layout, preview behavior, and whether Shelves should sit under Curation or stand as a primary destination.</div>
                    <button className="v-btn v-btn-outline" onClick={() => onNavigate("library")}>{I.arrowR} Compare against Library Table</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

window.ReportSmartShelves = ReportSmartShelves;
