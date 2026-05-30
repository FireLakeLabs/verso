# Handoff: Verso · Solid v1 prototype

## Overview

**Verso** is a single-user, local-only personal companion for an Audible library. It sits *next to* Audible: it ingests library facts via the AudibleApi library, persists them locally in SQLite, and gives the Library Owner curation tools (tags, smart shelves — deferred), a Library Health Check, ten Phase 1 reports, and a fidelity-first archive export. Audible remains the source of truth for imported facts; Verso owns the user's annotations beside them.

This bundle covers the **Solid v1** release boundary — see `context/adr/0004-solid-v1-is-first-release-boundary.md`. Reading journal, collections, AI features, external enrichments, alerts, and public profiles are **explicitly out of scope** and gated by their own ADRs.

## About the design files

The HTML files in `prototype/` are **design references**, not production code. They were built as a Babel-transpiled React prototype loaded directly in the browser, with all sample data generated client-side from a fixed seed. They show the intended look, density, layout, copy, and interactions in detail — but they are **not** the deliverable.

Your task is to recreate these screens in Verso's chosen production stack:

- **Frontend** — Vite + React + shadcn/ui + TypeScript (ADR 0015). Recharts is the default charting library (ADR 0022). UI report transforms live in plain TypeScript modules under `src/frontend/reports/` (ADRs 0017, 0018). Smart Shelves and Library Health Findings are evaluated by the backend (ADRs 0020, 0021); the frontend renders them.
- **Backend** — ASP.NET Core API wrapping AudibleApi, EF Core + SQLite for persistence (ADRs 0005, 0016, 0035). Raw AudibleApi payloads stored alongside normalized fields (ADR 0036). Explicit DTOs per operation — do **not** return EF entities (ADR 0041).
- **Repo shape** — `src/frontend` + `src/backend` monorepo, root `justfile`, pnpm for the frontend (ADRs 0038, 0039, 0040).

Read `context/verso-project-plan.md` for the full feature catalog and phased roadmap. Read `context/adr/README.md` for the ADR decision map.

## Fidelity

**High-fidelity.** The prototype is built on a real, locked design system (Firelake Labs — Swiss-style minimalism, neo-grotesque + prominent mono, single Ember accent, sharp corners). All colors, fonts, type sizes, spacing, and component patterns in the prototype come from that system's `colors_and_type.css`, which is included in `prototype/verso/colors_and_type.css` and used unmodified.

The implementation should **recreate the UI pixel-perfectly** in shadcn/ui, mapping the Firelake Labs tokens to the project's Tailwind config or CSS variables. Don't reach for shadcn's defaults where they differ from Firelake — the design system is binding, not advisory.

## How to view the prototype

Open `prototype/Verso.html` in a browser. No build step. The Tweaks panel (toolbar toggle in this design tool's host; in a standalone browser, use the protocol described in `prototype/verso/tweaks-panel.jsx`) controls:

- Nav chrome: **sidebar** vs **top nav** (default: top nav)
- Library Overview variant: **data-dense** vs **calm** (default: calm)
- Library Table density: **compact rows** vs **card grid** (both keep)
- Ember left-border accent on KPI cards: on / off

The default combination (top nav + calm overview + compact rows) is what the user signed off on. Both Library Table density modes are part of the spec — the user wants both shippable; expose the toggle in the product.

## Files in this bundle

```
design_handoff_verso_solid_v1/
├── README.md                           ← this file
├── prototype/
│   ├── Verso.html                      ← entry point
│   └── verso/
│       ├── app.jsx                     ← root, routing, tweaks state
│       ├── app.css                     ← Verso-specific extensions atop the design system
│       ├── colors_and_type.css         ← Firelake Labs tokens (binding)
│       ├── components.jsx              ← Cover, Sidebar, TopNav, TopBar, KPI, Progress, icons
│       ├── library.jsx                 ← OverviewDense, OverviewCalm, LibraryTable, ItemDetail
│       ├── reports.jsx                 ← Author Pareto, Runtime hist, Cover wall, Keyword cloud + trend
│       ├── operations.jsx              ← Health Check, Refresh status, Settings
│       ├── data.js                     ← procedural ~800-item generator (prototype only)
│       ├── tweaks-panel.jsx            ← Tweaks shell (host protocol)
│       └── fonts/                      ← Geist Sans + Geist Mono (variable, self-hosted)
└── context/
    ├── verso-project-plan.md           ← full feature catalog, scoring, phased roadmap
    └── adr/                            ← 45 architecture decision records
        ├── README.md                   ← ADR decision map by topic
        └── 0001-…through-0045-….md
```

---

## Solid v1 product boundary

Build only what the user actually selected for this prototype. Anything else is later-phase.

**In scope (this handoff):**

- Library ingestion via AudibleApi
- Library Overview (first screen — ADR 0028)
- Library Table with search/filter/sort/pagination + limited bulk tagging (ADR 0029)
- Item Detail
- Cover Wall report
- Author Concentration (Pareto) report
- Runtime Distribution report
- Subject Keyword Cloud report (with year-bucketed trend)
- Library Health Check (advisory findings — ADR 0021)
- Refresh job status + history (ADR 0043)
- Settings: Audible auth, refresh, cost basis, local data, archive export (ADR 0045)
- Tag CRUD (ADR pending — minimal: add/remove per item, bulk add/remove only)
- Dropped Audible Item marking (explicit only — ADR 0030)

**Phase 1 reports NOT in this handoff but in Solid v1** (build later, same patterns):

- Listening Cadence Heatmap (#1)
- Genre Treemap (#2)
- Narrator Affinity (#4)
- Cost-Per-Hour Dashboard (#16)

**Explicitly deferred** — see ADRs for the rationale:

- Reading Journal & Highlights (ADR 0031 → Phase 2)
- Custom Collections (ADR 0032 → Phase 2)
- Archive Restore (ADR 0026 → Solid v1.1)
- PDF Companion Vault (ADR 0025 → Phase 3)
- External enrichments / NYT / Hardcover / Wikidata (ADR 0023)
- AI features (Phase 3)
- Public profile, sync, alerts (Phase 3+)

---

## Design tokens (binding — from Firelake Labs)

All tokens are CSS custom properties in `prototype/verso/colors_and_type.css`. Map these to Tailwind theme extensions or your CSS variable layer; do not introduce values outside this list.

### Color

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#FAFBFC` | Default page background |
| `--white` | `#FFFFFF` | Elevated surfaces (cards, modals) |
| `--ink-950` | `#0B0E14` | Primary text, inverse hero ground |
| `--ink-900` | `#131720` | Headlines |
| `--ink-800` | `#1E2330` | Body |
| `--ink-700` | `#2D3340` | Strong icons |
| `--ink-600` | `#424A5C` | Secondary text |
| `--ink-500` | `#5B6478` | — |
| `--ink-400` | `#7A8395` | Tertiary text |
| `--ink-300` | `#A8B0BF` | Emphatic borders, disabled |
| `--ink-200` | `#CDD2DD` | Strong borders, input borders |
| `--ink-150` | `#DCE0E8` | **Hairline borders** (most common) |
| `--ink-100` | `#E5E8EF` | Hover fills |
| `--ink-75` | `#ECEFF4` | — |
| `--ink-50` | `#F2F4F8` | Subtle fills, table-row hover |
| `--ember-700` | `#7A2A07` | Active press |
| `--ember-600` | `#9A3309` | Hover |
| `--ember-500` | `#C2410C` | **The accent.** Primary CTAs, active tabs, "the data point that matters" |
| `--ember-400` | `#E2541A` | — |
| `--ember-300` | `#F0825C` | Inverse-hero eyebrow on dark |
| `--ember-100` | `#FDEAD9` | Soft accent fill |
| `--ember-50` | `#FEF6EF` | Selected row background |

**Chart palette — 10 categoricals:** `--chart-1` (ember `#C2410C` — "the subject") through `--chart-10` (graphite `#2D3340`). See the CSS file for hex values. Use these for category differentiation; ember stays for the subject of the view.

**Sequential ramp:** `--seq-1` through `--seq-7` — single-hue slate ramp for histograms, choropleths, intensity.

**Status:** `--positive` `#3F7A4F`, `--negative` `#B43A3A`, `--caution` `#B58A3E`, `--info` `#3A6B8C`, plus `-soft` variants.

### Type

- **Sans:** Geist (variable, self-hosted in `prototype/verso/fonts/`). Stack: `"Geist", "Söhne", "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif`.
- **Mono:** Geist Mono (variable). **Used heavily** — every eyebrow, label, numeric, KPI value, timestamp, ASIN, table header, brand sub-tag. Always uppercase + `letter-spacing: 0.10em–0.12em` when set as a label/eyebrow.
- **Scale:** `--t-0` 10px → `--t-9` 72px. Body is `--t-3` 16px, table body 13px, table headers 10px mono. KPI value 26px mono medium.
- **Weights used:** 400 regular, 500 medium. Display headlines use 500 with `letter-spacing: -0.02em`.

### Spacing

4 px base. Tokens `--s-1` 4px through `--s-13` 128px. Dense default: 16/20/24 between related items; 48–64 between sections. Table row padding 10×14 default, 6×14 compact.

### Radii & shadows

**Sharp corners.** Default `--r-1` 2px (visible only at close inspection). Max `--r-3` 6px (only on marketing cards — not used in Verso). Pills (`--r-pill` 999px) only for status indicators.

**Shadows are restrained.** `--shadow-0` none (default for cards — they have a border instead). `--shadow-1` hairline raise for floating KPI cards. `--shadow-2` for popovers/menus. `--shadow-3` for modals. `--shadow-focus` (Ember at 25 %) on focused inputs. **Cards do NOT have shadows by default** — they have a 1px `--line-1` border.

### Motion

`--dur-2` 140ms (default), `--dur-3` 220ms (entries). `--ease-standard` (`cubic-bezier(0.2, 0, 0, 1)`). **No springs, no bounces, no parallax, no scroll-triggered animation.** Charts animate once on mount, never on data update.

---

## Voice and copy

The system has a strict voice guide. Reproduce it.

- **Sentence case** everywhere — buttons, headlines, nav, tabs. *"Run analysis"*, not *"Run Analysis"*. **Title Case is never used.**
- **All-caps** is reserved for mono eyebrows / labels / metadata, always with `+0.10em` tracking.
- **First-person plural ("we")** for product copy. Avoid first-person singular. Use "you" only in form labels / onboarding flows.
- **Em dashes** for asides, no spaces in print, thin spaces in UI.
- Numbers: `$ 4.82B` (space after currency), `12.4%` (no space before %).
- **No emoji.** Anywhere. Slack is fine; the product is not.

The copy in the prototype is on-system — feel free to lift it verbatim.

---

## Screens

### 1. Library Overview — `/overview` (first screen, per ADR 0028)

**Two variants, both shipped, toggleable by user preference (settings):**

#### 1a. Calm (default)

**Purpose:** quick read of the library state. Optimized for someone opening the app casually.

**Layout:** single-column flow, generous whitespace (56 px section gaps). No KPI strip; instead a four-up giant-numeric block, then horizontal rules and large-headline sections.

**Components:**

- **Top eyebrow:** `LIBRARY · YYYY-MM-DD` (mono, 10px, +0.12em, fg-3)
- **Four-up stat block** (grid, gap 48 px, baseline-aligned):
  - Items (ember eyebrow), Hours, Completed, Open findings
  - Numbers: Geist Mono, 56 px, weight 500, letter-spacing −0.02em, line-height 1
  - Subtext: mono eyebrow, fg-2
- **Section: "Pick back up"** — eyebrow + 32 px sentence-case headline. Four cover-card columns (top-4 in-progress sorted by `percent_complete` desc). Each card: square cover, title (14 px medium), author (mono eyebrow), progress bar (2 px), `45 % · 6.4 h left` meta line with narrator last-name on the right.
- **Three-column footer:** "Reports" link list (underlined, mono right-aligned eyebrow), "Findings" snippet (top 4 findings, with "All N findings →" outline button), "System" fact grid (Refreshed / Duration / Items synced / Outcome with `pos` pill).

#### 1b. Data-dense

**Purpose:** the dashboard-y read for users who want everything at once.

**Layout:** inverse-hero strip → 5-KPI row → 60/40 two-column work area → 50/50 author + narrator leaderboards.

**Components:**

- **Inverse hero strip** — full-width `ink-950` ground, white type, 32 px padding, margin-top `−24` to bleed past content padding. Left: ember eyebrow + 32 px headline ("812 items · 8,127 h · 41 % completed.") + 13 px sub. Right: three vertical stat columns (Authors / Narrators / Series), each a 10px mono label + 28px mono number, separated by hairline `rgba(255,255,255,0.08)` left borders.
- **KPI row** — 5 columns of `v-kpi` cards. First has Ember left-border accent. Each: mono label (10px, +0.12em), mono value (26px medium tabular), foot row with delta (+pos / −neg) and sub (mono, fg-2).
- **Two-column:**
  - **Pick back up** (1.4fr) — compact-density table with cover thumb (28 px square), title + author sub, narrator, % complete, hours remaining. Header link "All in-progress →" navigates to Library Table.
  - **Right column** (1fr): Cadence sparkline card (52 weekly bars, ocean `--chart-2` with recency-fade opacity 0.4→1.0, 80 px SVG) + Recently-added list (row-list of 6, with 28 px cover, title, author + runtime in mono eyebrow, MM-DD trail).
- **Two-column leaderboards** — Top authors by hours (rank, name, count, hours) and Top narrators (same shape).

### 2. Library Table — `/library`

**Purpose:** central dense workspace for curation. The user lives here.

**Layout:** card wrapper with three header strips (filter row, status row, view-mode toggles + show-dropped), then table OR card grid, then pagination footer. A floating bulk bar appears at the bottom when items are selected.

**Filter strip (top of card):**

- Left:
  - **Search input** with prepended search icon. 320 px wide. Placeholder: "Title, author, narrator…"
  - **Genre tags** — segmented chip strip. Options: All, Space Opera, Hard SF, Cyberpunk, Post-Cyberpunk, Military SF, Climate Fiction, Generation Ship, First Contact, AI & Singularity, Solarpunk. Active chip: ink-950 ground, white text, ember count.
- Right:
  - **Progress tags** — All, Unstarted, In progress, Completed, Near-finished.

**Status strip:**

- Left mono eyebrow: `N ITEMS · PAGE 1 / 14 · DROPPED HIDDEN`
- Right: "Show dropped" checkbox + view-mode segmented toggle (rows icon / grid icon).

**View 1 — Compact rows:**

- Sticky-header HTML table, `min-width: 1100`. Columns: select checkbox, cover thumb (32 px), Title + series sub, Author, Narrator, Runtime (right, mono), Pc (right, mono — em-dash for 0, `--positive` green for ≥95, ember for in-progress), Purchased (right, mono date), Price (right, mono `$ N.NN`), Tags (pills).
- Row hover → `--bg` fill. Selected → `--ember-50` fill.
- Sortable headers (Title, Author, Runtime, Pc, Purchased, Price). Click cycles desc → asc → off.

**View 2 — Card grid:**

- `repeat(auto-fill, minmax(170px, 1fr))` grid, 20×16 gap, 20 px padding.
- Each card: full-bleed square cover, title (13 px medium, 2-line clamp, `text-wrap: pretty`), author (mono eyebrow), 2 px progress bar, foot row with runtime left + `N %` or `—` right (both mono).

**Pagination footer:**

- Mono eyebrow `N ITEMS · M PAGES`, Prev/Next buttons centered on the right with current/total in mono.

**Bulk bar (visible when ≥1 selected):**

- Position: sticky bottom. Ground: `ink-950`, white type, 8×14 px padding.
- Left: `N SELECTED` + secondary mono note "Bulk tag operations only · per ADR 0029".
- Right: `+ Add tag…`, `− Remove tag…`, `Clear`. Per ADR 0029, **no bulk delete / metadata override / merge**.

### 3. Item Detail — `/library/:asin`

**Purpose:** every Audible fact for one item + the Verso annotation layer.

**Layout:** `240px 1fr` two-column grid, 32 px gap.

- **Left column:**
  - 240 × 240 cover
  - Centered mono "ASIN · B0…" eyebrow

- **Right column** — stacked cards with 20 px gap:
  - **Header block:** if series, ember eyebrow `<Series name> · Book N of M`. Then 32 px headline (the title), then a row of author + dot + "Narrated by …" + dropped pill if applicable.
  - **Listening progress card** — eyebrow + right-aligned mono % (positive green if ≥95). Progress bar (2 px). Meta row: "X h of Y h heard" + "Returnable window open/closed".
  - **Audible facts card** — head with eyebrow `Audible facts · current` + meta `last seen 47 min ago`. Body: definition list (`140px 1fr` grid, mono uppercase dt). Fields: Publisher, Format, Released, Purchased, Runtime (`h min · raw min`), Price · paid, Plans (info pills), Companion PDF (info pill + "cache deferred (ADR 0025)"), Returnable (caution pill if yes), Categories (mono with `›` separator), Keywords (default pills).
  - **Verso annotations card** — ember-accented (3 px left border). Eyebrow in ember. Body sections: Tags (chips + ghost "+ Add tag" button) and Notes ("Reading journal arrives in Phase 2 — see ADR 0031.", italic fg-2).
  - **Publisher summary card** — eyebrow + 14 px body with `text-wrap: pretty`.
  - **Series strip card** (if applicable) — auto-fill 110px-min grid of all series peers. Current item gets 2 px ember outline with 2 px offset. Below each: mono `№NN · ✓` or `№NN · 45%`.
  - **Snapshots card** — meta `per ADR 0037`. Compact table: Date / % complete / Price / Returnable / Plans. Today's row highlighted in `--ember-50`. Shows the **selective** history per ADR 0037 — not every field.

- **Top action bar (above the two columns):**
  - Left: "← All items" ghost button
  - Right: "Tags", "Refresh this item", "Mark dropped" (text in `--negative`)

### 4. Cover Wall — `/wall`

**Purpose:** aesthetic browse view (ADR-blessed feature #26).

**Layout:** auto-fill `minmax(96px, 1fr)` grid with **2 px gap** (deliberate hairline). Each tile is a square cover. Hover → `transform: scale(1.04)` (140 ms) + `--shadow-2`.

**Header:** mono eyebrow `812 covers` + title "Cover wall". Right: segmented sort control — Recent / Runtime / Palette / Random.

### 5. Author Concentration (Pareto) — `/reports/authors`

**Purpose:** show how mono-author the library actually is. The "I thought I read broadly" reckoning.

**Layout:**

- **KPI row (4):** Top author by mode (first name + last initial + count + hours, ember-accent card), Top 5 authors `N %`, Top 10 authors `N %`, Long tail count.
- **Pareto chart card:** Title eyebrow + mode toggle (By hours / By count, segmented ink-950 active).
  - SVG `1100 × 360`, margins `50/50/24/60`.
  - Y axis: 0–100 % grid lines (dashed except 50/80), right-side labels in % mono 10px, left-side labels in absolute count/hours.
  - Bars: 30 bars. **Top 3 distinct chart colors** (`--chart-1` / `--chart-2` / `--chart-3`), 4–7 in `--ink-400`, 8+ in `--ink-300`.
  - Cumulative line in `--chart-10` (graphite), 1.5 px stroke, 2.2 r dots.
  - **50 %** and **80 %** crossing markers: vertical dashed lines + mono labels `50 % AT N` (ember) / `80 % AT N` (ink-700).
  - X labels: every-other author abbreviated `F. Lastname`, rotated 28° around its anchor.
  - Footer strip (ink-50 ground): mono eyebrow `TAKEAWAY` + sentence "**N** authors carry half your library hours · **M** carry 80 %." + Export button right-aligned.
- **Full author list card:** 80-row max-height scroll. Columns: rank (mono mute), Author, Books (r mono), Hours (r mono), Share % (r mono), Concentration bar — top 10 bars cycle through chart-1..10, 11+ in `--ink-400`.

### 6. Runtime Distribution — `/reports/runtime`

**Purpose:** what shape are the books in this library, length-wise.

- **KPI row (4):** Median (ember-accent), P90, Doorstoppers ≥24 h count, Novellas <4 h count.
- **Histogram card:** SVG `1100 × 320`. 27 bins, 90 min each, 0–40 h range. Median bin in `--chart-1`, all other bins use `--seq-1..7` ramp keyed off bar height (so taller bars are darker — gives the distribution depth without overusing accent). Dashed ember vertical line at median with mono `MEDIAN · X.X h` label. X ticks every 5 h.
- **Two side-by-side lists:** Doorstoppers (top 16 by runtime desc) and Novellas (top 16 by runtime asc). Each: compact table with Title / Author / Runtime / Pc.

### 7. Subject Keywords — `/reports/keywords`

**Purpose:** what topics actually saturate the library.

- **KPI row (3):** Unique keyword count (ember accent), most-tagged keyword, median tags per item.
- **Weighted cloud card:** flex-wrap baseline-aligned word cloud, log-scale size (13 → 56 px). Each word: weight 500 if above half of max. **Top 10 keywords cycle through `--chart-1..10`**; 11–18 in `--ink-800`; 19+ in `--ink-500`. Hover shows mono eyebrow in card head: `KEYWORD · N ITEMS`.
- **Trend small-multiples card:** for top 6 keywords, an 8-bucket-across-purchase-history bar chart. Three-column grid: name + matching swatch chip (left), 32 px-tall SVG bars in that keyword's chart color (middle), total count in mono (right).

### 8. Library Health Check — `/health`

**Purpose:** advisory findings inbox. The cleanup screen.

**Per ADR 0021, findings are backend-authoritative.** The frontend renders them and lets the user dispose of them. Stable dispositions are stored backend-side.

- **KPI row (4):** Open findings (accent), Caution count, Info count, Last check (relative time).
- **Findings card:**
  - Header: eyebrow `Library health · advisory only (ADR 0021)` + title + right-aligned "Re-evaluate" / "Export findings" outline buttons.
  - **Tabs by kind:** All / Stuck near 100% / Bounced early / Still returnable / Possible duplicate / Sparse metadata. Each tab has a mono count badge.
  - When a kind tab is selected, a sub-strip explains the kind (ink-50 ground, 12.5 px fg-2).
  - **Finding rows** (24px icon, text, actions grid, 14 px column gap, 18×14 padding, hairline-divided): icon (2 px-border square, ember `caution-soft` fill for caution, `info-soft` for info), title (13.5 px medium), note `<item title bold> · <author> · <severity-specific message>` (12.5 px fg-2). Below: "OPEN ITEM →" mono link + "FINDING · ID" mono eyebrow. Right column: Dismiss (outline sm) + Snooze (ghost sm).
  - Bottom strip if any dispositioned: count + "Undo all" ghost.

### 9. Refresh Status — `/refresh`

**Purpose:** show the current local refresh job (ADR 0043) and its history.

- **Current job card** (ember left-border accent):
  - Header: eyebrow `Refresh · local job` + title (either "Refreshing now…" or "Last refresh · OK · X min ago"). Right: "Refresh now" primary OR "Pause" outline (state-dependent), plus "Schedule…" outline.
  - Sub-strip (ember-50 ground if running, ink-50 otherwise): mono job ID, started time, elapsed, items, and (if complete) `OUTCOME · OK` in positive green. Shows a spinner if running.
  - **7 job steps:** auth → fetch → covers → normalize → snapshot → smart shelves → health findings. Each row: status dot (done = positive solid, running = pulsing ember halo, pending = ink-300 outline), step name, ADR-citing detail line, time column (`12.4 / 78 S` while running; `✓ 78 S` when done; `—` when pending). The running step has a 280 px progress bar.
  - Footer callout (ember-bordered, ink-50): "Partial-failure policy" — ADRs 0033 + 0034.
- **Job history card:** compact table, last 8 runs. Columns: Job ID (ember mono), Started (relative), Duration, Items, Added (+N), Updated (Δ N), Outcome (pill — pos / cau). Show a partial-retained example in the history to demo that state.

### 10. Settings — `/settings`

**Purpose:** the *only* configurable layer in Solid v1, per ADR 0045 — interpretation + local operation only.

**Layout:** `220px 1fr` two-column grid, 32 px gap.

- **Left nav** (sticky): five sections — Audible authentication / Refresh / Cost basis / Local data / Archive export. Active item: ember left-border accent, ink-950 medium. Above the list: mono eyebrow `Settings · Solid v1`. Below the list: a callout citing ADR 0045.

- **Right pane** is a single card whose contents swap per active section. All form rows use a `280px 1fr` `form-group` layout: label column (label + helper text) on the left, control(s) on the right.

  - **Audible authentication:**
    - Status pill: `Active` (positive)
    - Marketplace: select (US / UK / CA / AU)
    - Account: disabled input showing the auth identity + mono meta row (created / expires / rotations)
    - Buttons: "Re-authenticate via AudibleApi" + "Sign out" (ghost, negative color)

  - **Refresh:**
    - Trigger: radio group (Manual / On app start / Daily at idle). Selected radio: ember outline + `--ember-50` fill.
    - Retain no-longer-present items: switch (default on, ADR 0034)
    - Selective snapshot fields: read-only grid of mono field names with all-checked checkboxes (visualizes ADR 0037 — these are not user-editable in Solid v1)

  - **Cost basis** (ADR pending — but pattern follows the spec):
    - Default basis radio: "Per-credit value" / "List price"
    - Per-credit value: number input + mono "USD" / "/ CREDIT" eyebrows + computed `EFFECTIVE COST · $N / 12 CREDITS` meta row

  - **Local data:**
    - Database location: disabled mono input + meta row (size / schema version / raw-payload count per ADR 0036). `SQLite · ADR 0005` info pill in header.
    - Cover cache location + meta + "Recache missing" / "Clear cover cache" buttons
    - Companion PDFs: callout `Deferred` per ADR 0025

  - **Archive export:** primary "Export now" button in header.
    - Format radio: JSON archive / CSV projection / Markdown projection (matching ADR 0010 — JSON is the archive of record)
    - Include raw payloads: switch (default on, ADR 0036)
    - Cover images: select (sibling folder / embedded base64 / omit)
    - Restore: disabled button labeled "Restore… · deferred" per ADR 0026

---

## Navigation chrome — two patterns

Both ship; user can switch. Default is **top nav**.

### Top nav (default)

Sticky header bar, white ground, 1px hairline bottom. Contents (left to right): brand mark + "Verso" + mono `v0.4` sub, primary nav items (Overview / Library / Covers / Reports ▾ / Health / Settings), `⌘K` command bar, refresh icon button, 26 px ember avatar.

Active item: ink-950 medium with 2 px ember underline (`margin-bottom: -13px; padding-bottom: 18px` to land on the bar's bottom edge).

Reports has a hover popover (background white, hairline border, `--shadow-2`) with the three report children.

### Sidebar

232 px fixed-width left rail. Sections: Library (Overview, All items, Cover wall), Reports (Author concentration, Runtime distribution, Subject keywords), Curation (Health check), Operations (Refresh status, Settings). Each section: mono eyebrow header + nav items.

Active item: full-row ink-950 fill, white text, ember count (e.g., the count number turns ember-300 on active).

Footer: refresh-status chip (positive left-border when OK, ember when running, caution when stale) + user block (28 px ember avatar + "Library owner / Local · single-user").

---

## Cover art

**Procedural typographic placeholders are a prototype shim, not the production answer.** In production, covers come from `product_images` on the Audible fact (ADR 0024 — locally cached). The placeholder generator is in `prototype/verso/components.jsx` (function `Cover` + `coverStyle` + `CoverMark`); use it as a fallback when a cover is missing, not as the primary.

The placeholder spec (for fallback use):

- Square aspect, palette deterministic on `product_image_seed`
- 13 palettes drawn from `--ink-*`, `--chart-*`, `--ember-*` tokens
- 6 mark variants: empty, dashed rules, grid, single horizontal rule, outline square, diagonal accent triangle
- Author at top in mono uppercase 1.2cqi
- Title centered-bottom in Geist 500, 2.6cqi, `letter-spacing: -0.02em`
- Runtime + truncated series name at bottom in mono 1cqi
- If series, top-right `№ NN` mono badge
- Uses `container-type: inline-size` so the SVG/text scales with the cover slot

---

## Sample data

`prototype/verso/data.js` builds a deterministic ~812-item library with:

- 25 invented series of 2–9 books each
- ~120 invented authors (with 8 made artificially prolific to make the Pareto realistic)
- 80 invented narrators
- 10 sub-genres weighted toward space opera / hard SF / cyberpunk
- Realistic distributions of: runtime (novella → doorstopper), purchase date (8 years back with slight uptick), percent_complete (untouched / mid / finished biased), price ($5–$45), plans, returnability, tags, dropped flag, has_pdf
- Generated health findings of all five kinds
- 1 % of items marked `_present: false` to test no-longer-present retention

This is **not** the production data source. Production data comes from AudibleApi via the backend, normalized into the DTOs per ADR 0041, and exposed by raw-ish endpoints (ADR 0019) for the frontend TS report transforms to consume (ADRs 0017, 0018).

Use the prototype data shape as a **starting point for the frontend DTO TypeScript types** — it lines up with the AudibleApi response groups documented in `context/verso-project-plan.md`.

---

## Interactions catalog

- **Hover** — outline buttons fill `--bg-2`, ghost buttons fill `--bg-2`, primary buttons darken ember-500 → ember-600. No translate/scale.
- **Press** — primary darkens to ember-700.
- **Focus** — 3 px ember halo at 25 % opacity (`--shadow-focus`). Never `outline: none` without replacement.
- **Disabled** — `--bg-2` fill, `--fg-3` text, no opacity hack.
- **Cover wall hover** — `transform: scale(1.04)` + `--shadow-2`, z-index 2. Only motion in the entire app.
- **Sort** — clicking a sortable header cycles desc → asc → off, indicator is a 9 px ember triangle (▼/▲) in `--sort` class.
- **Selection** — single click on a row's checkbox toggles selection; bulk bar appears when ≥1 selected. Clicking the row body opens detail.
- **Refresh job** — clicking "Refresh now" starts the simulated 7-step pipeline. Each step animates its progress bar at ~80 ms tick rate. Final state shows OK in positive green.
- **Health findings** — Dismiss/Snooze move the row out; "Undo all" returns them.

---

## State to manage

Approximate front-end state surface (excluding what comes from the backend):

- **Active route** — top-level page selection
- **Open detail item** — derived from route `/library/:asin`
- **Library Table:** search text, genre filter, progress filter, sort key/dir, selected ASIN set, page index, show-dropped toggle, view mode (rows / cards)
- **Cover wall:** sort mode
- **Author Pareto:** mode (hours / count)
- **Health Check:** active kind tab, dispositioned-this-session set (server-side once dispositions are persisted)
- **Refresh:** running flag, step index, step progress, elapsed
- **Settings:** form draft state per section
- **Tweak/preference state** (persist server-side or in user settings): nav-chrome choice, overview variant choice, table density default

---

## What to ask the user before building

1. **Tag CRUD UI** — the prototype shows the surfaces that consume tags (Library Table bulk bar, Item Detail tags chip + add button, Library Overview filter chips) but does not show a dedicated Tag management screen. Ask whether they want one, or whether tag CRUD lives entirely inline.
2. **`⌘K` command palette** — referenced in the chrome but not designed. Ask whether to ship a real one in Solid v1 or leave it as a placeholder.
3. **Mobile / narrow viewport** — the prototype is desktop-only (≥1280 px). Confirm whether Solid v1 needs a responsive treatment.
4. **Empty states** — partial coverage (`Empty` component exists). Need per-screen empty-state copy when the user has 0 items, 0 findings, 0 search results.
5. **Error states** — typed user-facing errors per ADR 0044 are not surfaced in the prototype. Need a toast / inline error UI pattern.

---

## Open ADRs / scope questions surfaced by this prototype

- Cost basis settings — implied by ADR 0045 but the precise toggles are not codified. Prototype proposes the radio + per-credit value pattern; please codify.
- Bulk tag UX — ADR 0029 limits scope but the UX of "add tag" / "remove tag" dialogs in the bulk bar is unspecified.
- Refresh schedule semantics — the prototype shows daily-at-idle but doesn't specify what "idle" means.
- Health Finding stable disposition model — ADR 0021 says backend-authoritative; the prototype only models session-local dispositions. Need a Finding Disposition entity + lifecycle.

---

## Final notes

- Recharts is the default per ADR 0022. Anywhere the prototype uses hand-rolled SVG (Pareto, histogram, sparkline, trend small-multiples), Recharts equivalents exist. Use them. Match the visual specs exactly; Recharts' defaults will not.
- shadcn/ui components map cleanly to most of this — Button, Dialog, Sheet, Table, Tabs, Select, Checkbox, Switch, RadioGroup, Progress, Tooltip. Configure them with the Firelake tokens (no rounded radii, sharp corners) so they don't look stock.
- Geist is OFL-licensed. Geist Mono ships from Google Fonts but a self-hosted variable version is in `prototype/verso/fonts/`.
- **Read the ADRs before writing code.** Every screen in this prototype is a direct read of one or more durable decisions — building anything that contradicts them is wasted work.
