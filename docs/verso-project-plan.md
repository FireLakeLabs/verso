# Verso - Audible Library Project — Feature Catalog & Roadmap

A consolidated planning document covering 33 feature ideas built on the [AudibleApi](https://github.com/rmcrackan/AudibleApi) library, with effort/value scoring and a phased build order.

## How to use this document

- **Scoring table** is for at-a-glance scanning and re-prioritization
- **Phased roadmap** is the actionable build order with checkboxes
- **Full catalog** has the complete spec for every feature
- **Natural cuts** section shows different deployable slices if scope needs to flex
- Effort and value are both 1–10. Priority within a phase is sorted by Value − Effort.

---

## AudibleApi field reference

From the README's `response_groups` documentation:

`asin`, `purchase_date`, `sku`, `sku_lite`, `status`, `title`, `subtitle`, `authors`, `narrators`, `publisher_name`, `release_date`, `issue_date`, `runtime_length_min`, `language`, `category_ladders`, `thesaurus_subject_keywords`, `merchandising_summary`, `publisher_summary`, `editorial_reviews`, `audible_editors_summary`, `product_images`, `content_type`, `content_delivery_type`, `format_type`, `content_rating`, `is_adult_product`, `is_listenable`, `is_returnable`, `is_downloaded`, `has_children`, `percent_complete`, `price`, `plans`, `rating`, `customer_reviews`, `series`, `relationships`, `sample_url`, `origin_marketplace`, `pdf_link`.

---

## Scoring summary

| # | Feature | Category | Phase | E | V | Score |
|---|---|---|---|---|---|---|
| 30 | Library Export & Archival | Export | 1 | 2 | 9 | 7 |
| 25 | Library Health Check | Curation | 1 | 3 | 8 | 5 |
| 1 | Listening Cadence Heatmap | Habits | 1 | 2 | 7 | 5 |
| 8 | What's Next Series Inbox | Discovery | 3 | 3 | 9 | 6 |
| 22 | Custom Tags & Smart Shelves | Curation | 2 | 4 | 9 | 5 |
| 29 | AI Refresher Summaries | Capture | 3 | 3 | 8 | 5 |
| 4 | Narrator Affinity | Habits | 1 | 3 | 7 | 4 |
| 16 | Cost-Per-Hour Dashboard | Reflection | 1 | 2 | 6 | 4 |
| 2 | Genre Treemap | Habits | 1 | 2 | 6 | 4 |
| 7 | Series Completion Tracker | Discovery | 3 | 5 | 9 | 4 |
| 17 | Abandoned & At-Risk Books | Reflection | 2 | 4 | 7 | 3 |
| 3 | Author Concentration | Habits | 1 | 3 | 6 | 3 |
| 23 | Custom Collections | Curation | 2 | 3 | 6 | 3 |
| 26 | Cover Art Wall | Curation | 1 | 2 | 5 | 3 |
| 32 | Obsidian / Notion Export | Export | 3 | 4 | 7 | 3 |
| 5 | Runtime Distribution | Habits | 1 | 2 | 5 | 3 |
| 27 | Reading Journal & Highlights | Capture | 2 | 6 | 9 | 3 |
| 12 | Author Back Catalog | Discovery | 3 | 4 | 7 | 3 |
| 18 | Subject Keyword Cloud | Reflection | 1 | 3 | 5 | 2 |
| 15 | Annual Wrapped Review | Reflection | 2 | 6 | 8 | 2 |
| 21 | Audible Plus Crossover | Alerts | 3 | 4 | 6 | 2 |
| 19 | Pre-order Watchlist | Alerts | 3 | 5 | 7 | 2 |
| 9 | AI Because You Listened | Discovery | 3 | 5 | 7 | 2 |
| 33 | Public Reader Profile | Export | 4 | 6 | 8 | 2 |
| 6 | Purchase-to-Listen Lag | Habits | 2 | 6 | 7 | 1 |
| 20 | Wishlist Price Monitor | Alerts | 3 | 6 | 7 | 1 |
| 11 | Award Winners You Missed | Discovery | 3 | 5 | 6 | 1 |
| 28 | PDF Companion Vault | Capture | 3 | 5 | 6 | 1 |
| 24 | Narrator Playlist Builder | Curation | 2 | 4 | 5 | 1 |
| 10 | NYT Bestseller Crossover | Discovery | 3 | 4 | 5 | 1 |
| 14 | Underexplored Adjacent Genres | Discovery | 3 | 7 | 6 | -1 |
| 31 | Cross-Platform Sync | Export | 3 | 6 | 6 | 0 |
| 13 | Reader Affinity Network | Discovery | 4 | 8 | 5 | -3 |

---

## Phased roadmap

### Phase 1 — Foundation (9 items)

No external dependencies, no persistence layer required. Pure transforms of library data into views. Build first to validate the data layer.

- [ ] **#30 Library Export & Archival** — E2 V9
- [ ] **#25 Library Health Check** — E3 V8
- [ ] **#1 Listening Cadence Heatmap** — E2 V7
- [ ] **#4 Narrator Affinity** — E3 V7
- [ ] **#16 Cost-Per-Hour Dashboard** — E2 V6
- [ ] **#2 Genre Treemap** — E2 V6
- [ ] **#3 Author Concentration** — E3 V6
- [ ] **#26 Cover Art Wall** — E2 V5
- [ ] **#5 Runtime Distribution** — E2 V5
- [ ] **#18 Subject Keyword Cloud** — E3 V5

### Phase 2 — Build out (8 items)

Adds your own DB — tags, journal entries, `percent_complete` snapshots over time. Unlocks the time-aware reports.

- [ ] **#22 Custom Tags & Smart Shelves** — E4 V9 (foundation for #23, #24)
- [ ] **#17 Abandoned & At-Risk Books** — E4 V7
- [ ] **#23 Custom Collections** — E3 V6 *(depends on #22)*
- [ ] **#27 Reading Journal & Highlights** — E6 V9
- [ ] **#15 Annual Wrapped Review** — E6 V8 *(needs snapshot history)*
- [ ] **#6 Purchase-to-Listen Lag** — E6 V7 *(needs snapshot history)*
- [ ] **#24 Narrator Playlist Builder** — E4 V5

### Phase 3 — Integrate (14 items)

External APIs (Hardcover, NYT, Wikidata, Anthropic) and AI integrations. The dependency-heavy middle game where the tool starts to feel ambient.

- [ ] **#8 What's Next Series Inbox** — E3 V9 *(depends on #7)*
- [ ] **#29 AI Refresher Summaries** — E3 V8
- [ ] **#7 Series Completion Tracker** — E5 V9
- [ ] **#32 Obsidian / Notion Export** — E4 V7
- [ ] **#12 Author Back Catalog** — E4 V7
- [ ] **#9 AI Because You Listened** — E5 V7
- [ ] **#19 Pre-order Watchlist** — E5 V7
- [ ] **#20 Wishlist Price Monitor** — E6 V7 *(needs snapshot history)*
- [ ] **#21 Audible Plus Crossover** — E4 V6
- [ ] **#11 Award Winners You Missed** — E5 V6
- [ ] **#28 PDF Companion Vault** — E5 V6
- [ ] **#31 Cross-Platform Sync** — E6 V6
- [ ] **#10 NYT Bestseller Crossover** — E4 V5
- [ ] **#14 Underexplored Adjacent Genres** — E7 V6

### Phase 4 — Polish (2 items)

Aspirational or complex. Tackle once everything else works and you have a clear use case for the extra effort.

- [ ] **#33 Public Reader Profile** — E6 V8
- [ ] **#13 Reader Affinity Network** — E8 V5

---

## Natural deployable cuts

If scope needs to flex, these are sensible release boundaries:

**Weekend v1 (Phase 1 only):** Ten read-only reports + library export. Validates the AudibleApi integration and gives you something to use immediately.

**Solid v1 (recommended):** Phase 1 + #22 Tags + #25 Health Check + #30 Export. A complete personal tool that doesn't rely on any external service. This is the cut to actually ship.

**Ambient companion (+ Phase 2):** Adds the persistence layer, journal, and time-aware features. Becomes a daily-use tool rather than a once-a-month dashboard.

**Integrated platform (+ Phase 3):** External APIs and AI features. The tool starts to feel like Goodreads but for audiobooks and shaped to your actual listening.

**Public release (+ Phase 4):** Public profile, complex graph viz. Portfolio-piece territory under the Fire Lake Labs banner.

---

## Resolved Solid v1 decisions

These decisions supersede earlier stack notes or speculative feature text where they conflict. See `CONTEXT.md` for domain language and `docs/adr/` for the decision record.

### Product boundary

- Verso is a **single-user personal library companion** for one Library Owner.
- Audible remains the source of truth for imported facts. Verso owns user-authored annotations beside those facts.
- An Audible Item is identified by ASIN. Duplicate detection surfaces reviewable candidates; it does not merge items.
- Solid v1 is the first release boundary: ingestion, Library Export & Archival, Library Health Check, all ten Phase 1 reports, Custom Tags & Smart Shelves, and simple Dropped Audible Item marking.
- Reading Journal, Collections, companion PDF caching, external enrichments, AI features, public profile, alerts, and cross-platform sync are outside Solid v1.
- Local data is private by default. Future public surfaces require explicit public visibility choices.

### Runtime and stack

- Solid v1 runs locally on demand as a local web app.
- Two local servers are acceptable: an ASP.NET Core API backend and a Vite React frontend using shadcn/ui.
- The repository should use a simple monorepo layout: `src/backend` and `src/frontend`, with shared docs at the root.
- SQLite is the Solid v1 database; EF Core owns persistence and migrations.
- pnpm is the frontend package manager, and a root `justfile` should orchestrate common local development commands while preserving independent backend/frontend commands.
- Recharts is the default charting library. Specialized visualization libraries are allowed only where Recharts is a poor fit.

### Data and refresh

- Live AudibleApi import is the primary ingestion path. File-based imports may come later as fallback adapters.
- Verso delegates Audible authentication to AudibleApi's supported local flow and stores only the minimum resulting local session material.
- Current Audible Facts reflect the latest successful Audible response. Verso stores selective Snapshot history only for analysis-relevant values such as completion, price, plans, returnability, rating, companion PDF availability, and presence.
- Datapoints use the best available source data. Missing values stay null unless a specific analysis/display explicitly chooses interpolation or extrapolation.
- A refresh must not replace Current Audible Facts with partial or failed data. Preserve the last successful library state and surface a typed refresh result.
- Audible Items missing from a later successful refresh are retained as no-longer-present items with their history and Verso Annotations.
- Store raw AudibleApi payloads alongside normalized fields for archive fidelity, audit, and debugging. Product behavior should query normalized fields.
- Cache cover images locally when available. Preserve companion PDF links in Solid v1, but defer PDF downloading/caching to PDF Companion Vault.

### Curation and interpretation

- Tags are lightweight Library Owner-defined labels, not a formal taxonomy.
- Smart Shelves are saved rules with no manual membership, exceptions, or ordering. Solid v1 rules use structured boolean groups over known Audible Facts and Verso Annotations, with no scripting or SQL editor.
- Smart Shelf evaluation is backend-authoritative. The frontend may preview rule edits, but exports and saved shelf behavior depend on backend evaluation.
- Library Health Check emits advisory Health Findings only. Findings do not mutate Audible Items automatically.
- Health Finding evaluation and stable Finding Dispositions are backend-authoritative.
- A Completed Audible Item defaults to `percent_complete >= 95`.
- A Dropped Audible Item is only explicit Library Owner intent, never inferred. Solid v1 supports simple dropped/undropped marking.
- Reflection reports include all Audible Items by default, including Dropped and no-longer-present items unless filtered. Action Views may hide non-actionable items by default.
- Cost reports support a Cost Basis toggle between list price and a Library Owner-configured per-credit value. Once configured, per-credit value is the default; list price remains available.

### API, UI, and exports

- The API exposes explicit request/response DTOs per operation. Do not return EF entities directly.
- No formal API endpoint versioning is needed in Solid v1 because frontend and backend evolve together locally. Archive Export payloads must include schema versioning.
- The API is raw-ish: expose stable library, annotation, snapshot, finding, and settings shapes for frontend report modules to transform. Use focused command/query endpoints for refresh, export, tags, Smart Shelves, Health Findings, and settings.
- UI report transforms live in plain frontend TypeScript modules, not inline React component code. Smart Shelves and Health Findings are the intentional backend exceptions.
- Refresh and export use explicit local jobs with status, progress where available, timestamps, summaries, and typed user-facing errors plus expandable technical details.
- Archive Export is fidelity-first. JSON is the archive format of record and should preserve Audible Facts, raw payloads, Cached Assets, Verso Annotations, Smart Shelves, Finding Dispositions, and relevant interpretation settings.
- CSV, Markdown, and later knowledge-system exports are Projection Exports and may flatten or omit structure when the destination format cannot represent the full archive faithfully.
- Solid v1 produces versioned Archive Exports but does not need restore/import from archive yet.

### Solid v1 UX

- Open to a Library Overview dashboard showing refresh status, search/filter entry points, key counts, changes or attention areas, and links into reports, Library Health Check, Library Export & Archival, Tags, and Smart Shelves.
- Include a central searchable/filterable Library Table as the dense curation workspace.
- Support limited bulk editing in the Library Table: bulk add/remove Tags only. No bulk delete, metadata override, or merge operations.
- Solid v1 settings should cover only interpretation and local operation: Audible auth/session, refresh controls/status, Cost Basis, local data/storage visibility, and Archive Export options/defaults.

### Implementation slicing

- Build the first baseline slice as ingestion → SQLite persistence → Library Table with refresh status.
- After that baseline, prefer multiple orthogonal issues that can be picked up in parallel.
- Structure follow-up issues to avoid merge conflicts where practical: keep vertical slices independently demoable, avoid broad shared-file rewrites, and isolate report modules/views so parallel agents can work without stepping on the same files.

---

## High-leverage items worth highlighting

- **#30 Library Export (E2 V9)** — foundational insurance against Audible policy changes; also the prerequisite for #31 sync and #32 KM export. Build it second after data ingestion.
- **#22 Custom Tags (E4 V9)** — unlocks #23 collections, #24 playlists, and meaningful smart-shelf rules. The single highest-leverage Phase 2 item.
- **#8 What's Next Inbox (E3 V9)** — minimal additional work once #7 series tracker exists. Punches well above its effort score because of how often you'll actually use it.
- **#27 Reading Journal (E6 V9)** — value compounds over time. Start capturing data into it early even if the UI stays rough; the value-at-3-years is what makes the score a 9.
- **#29 AI Refresher Summaries (E3 V8)** — cheap to build with Claude Haiku, solves a real problem (starting book 3 of a series after a year away).

---

## Full feature catalog

### A. Habits & Patterns

#### 1. Listening Cadence Heatmap
**Habits · Phase 1 · Effort 2/10 · Value 7/10**

A GitHub-style calendar heatmap showing purchase activity (and, where available, completion activity) day-by-day across years. Reveals seasonality — are you a binge buyer around holidays, or steady week-by-week? Useful for noticing dry spells and burst patterns that might signal life events or genre shifts.

- **Audible fields:** `purchase_date`, `runtime_length_min`, `percent_complete`
- **External APIs:** None required; optionally enrich with weather API (Open-Meteo, free) to overlay "rainy day reading" patterns
- **Tech:** `react-calendar-heatmap`, Recharts, or D3 with `d3-time-format`; tooltip via Radix UI

#### 2. Genre Treemap
**Habits · Phase 1 · Effort 2/10 · Value 6/10**

A hierarchical treemap of your library by `category_ladders` (multi-level — e.g., Fiction → Sci-Fi → Space Opera). Sizes by book count or total runtime hours. Lets you see at a glance whether you're a sci-fi monoculture or genuinely eclectic, and which sub-genres you've actually invested time in vs. just sampled.

- **Audible fields:** `category_ladders`, `runtime_length_min`, `title`
- **External APIs:** Optional Google Books API for fallback genre tags on books with sparse Audible categories
- **Tech:** Nivo `ResponsiveTreeMap`, ECharts treemap, or D3 `d3-hierarchy` with custom React rendering

#### 3. Author Concentration (Lorenz / Pareto)
**Habits · Phase 1 · Effort 3/10 · Value 6/10**

A Pareto chart showing what percentage of your library comes from your top N authors. Most readers discover they're surprisingly mono-author — "I thought I read broadly, but 40% of my hours are Neal Stephenson and Brandon Sanderson." Pair with a Gini coefficient for a single "author diversity score."

- **Audible fields:** `authors`, `runtime_length_min`, `title`
- **External APIs:** Wikidata SPARQL for author nationality/era enrichment (free, no key)
- **Tech:** Recharts ComposedChart (bar + line), or Observable Plot for quick implementation

#### 4. Narrator Affinity Dashboard
**Habits · Phase 1 · Effort 3/10 · Value 7/10**

Top narrators by hours listened, plus a loyalty view showing which narrators you follow across authors. Many listeners discover books *through* favored narrators — this surfaces that bias and turns it into a discovery vector. Includes an "unheard from" panel for narrators you've sampled once but haven't returned to.

- **Audible fields:** `narrators`, `runtime_length_min`, `percent_complete`, `purchase_date`
- **External APIs:** Audible's product search for narrator catalog; optionally ListenNotes for narrator podcast appearances
- **Tech:** TanStack Table for ranking grid, Recharts for hours-per-narrator chart

#### 5. Runtime Distribution & "Doorstopper" Index
**Habits · Phase 1 · Effort 2/10 · Value 5/10**

Histogram of book lengths in your library, with markers for median, your "comfort zone," and outliers. Tracks whether you've drifted toward longer or shorter books over time (a year-over-year overlay). Surfaces the "I have ten 30+ hour audiobooks I started and never finished" pattern.

- **Audible fields:** `runtime_length_min`, `purchase_date`, `percent_complete`
- **External APIs:** None
- **Tech:** Recharts histogram or D3 with `d3-array.bin()`; ridgeline plot via Plotly for year-over-year

#### 6. Purchase-to-Listen Lag
**Habits · Phase 2 · Effort 6/10 · Value 7/10**

For each book, the time between `purchase_date` and the date `percent_complete` first crossed some threshold (requires snapshot history via a scheduled .NET job). Visualized as a beeswarm plot to show your "TBR debt." Sortable by genre to see which categories rot in the queue.

- **Audible fields:** `purchase_date`, `percent_complete`, `title`, `category_ladders`
- **External APIs:** None — but requires your own snapshot DB (SQLite or Postgres) to track `percent_complete` over time
- **Tech:** D3 force-simulation beeswarm, or Plotly strip plot; Hangfire or .NET BackgroundService for the polling job

### B. Discovery & Recommendations

#### 7. Series Completion Tracker
**Discovery · Phase 3 · Effort 5/10 · Value 9/10**

For every series in your library, a progress bar showing books owned vs. books in the series, with the next unread book pre-fetched. Audible's `series` field gives you the identifier, but you need an external source to know the full series. Solves the "wait, is book 4 out yet?" problem that costs every series reader time.

- **Audible fields:** `series`, `title`, `authors`, `percent_complete`, `relationships`
- **External APIs:** Hardcover.app GraphQL API (free, Goodreads successor); Open Library as fallback
- **Tech:** shadcn/ui Progress bars, TanStack Query for series lookup caching

#### 8. "What's Next" Series Inbox
**Discovery · Phase 3 · Effort 3/10 · Value 9/10**

A focused widget that lists the immediate next unread book in every active series you own, ranked by how recently you finished the prior book. Quietly the highest-value view for a reader, because the friction of "which book is next in The Expanse again?" is real and recurring. Hooks straight into the series tracker.

- **Audible fields:** `series`, `percent_complete`, `title`, `purchase_date`
- **External APIs:** Hardcover or Open Library for series ordering; Audible product API for next-title availability/price
- **Tech:** shadcn/ui Card components, Next.js server components for prefetch

#### 9. AI-Generated "Because You Listened To…" Engine
**Discovery · Phase 3 · Effort 5/10 · Value 7/10**

For each completed book, an LLM-generated list of 5 thematically similar recommendations — but specifically titles available on Audible and not already in your library. Sends the book's summary, keywords, and genre context to Claude, gets structured recommendations back, then validates against Audible's catalog. Far better than Audible's own recommender, which is heavily commercial.

- **Audible fields:** `title`, `authors`, `publisher_summary`, `thesaurus_subject_keywords`, `category_ladders`, `percent_complete`
- **External APIs:** Anthropic API (Claude) or OpenAI for generation; Audible product search to validate availability and pricing
- **Tech:** Next.js API route, structured output via tool use, shadcn/ui Carousel

#### 10. NYT Bestseller Crossover
**Discovery · Phase 3 · Effort 4/10 · Value 5/10**

A view comparing your library against the New York Times bestseller lists (current and historical). Two panels: "Bestsellers you already own" and "Bestsellers in your favorite genres you've missed." Avoids recency bias by letting you scan historical lists in genres you actually read.

- **Audible fields:** `title`, `authors`, `category_ladders`, `purchase_date`
- **External APIs:** NYT Books API (free with key) — list history back to the 1930s
- **Tech:** Recharts horizontal bar for crossover counts, `string-similarity` for fuzzy title matching

#### 11. Award Winners You Haven't Read
**Discovery · Phase 3 · Effort 5/10 · Value 6/10**

For each major literary award (Hugo, Nebula, Booker, Pulitzer, Edgar), show winners and finalists in your active genres, marking which you own, which are on Audible, and which aren't. Hugo/Nebula are particularly relevant given the sci-fi interest. Turns "I want to read more award-winning sci-fi" into a checkbox list.

- **Audible fields:** `title`, `authors`, `category_ladders`
- **External APIs:** Wikidata SPARQL (free); Audible product search for availability
- **Tech:** TanStack Table with faceted filters, shadcn/ui Badge for award status

#### 12. Author Back Catalog Explorer
**Discovery · Phase 3 · Effort 4/10 · Value 7/10**

Pick any author in your library, see their full bibliography with your owned books marked. Surfaces older titles you might've missed and pre-orders/upcoming releases. Particularly valuable for prolific authors (Stephen King, Sanderson, Stephenson) where it's genuinely hard to know what you haven't read.

- **Audible fields:** `authors`, `title`, `release_date`, `series`
- **External APIs:** Open Library Author API (free), or Hardcover for richer community data
- **Tech:** Mermaid timeline diagram, or vertical Recharts ScatterChart with release dates

#### 13. Reader Affinity Network (Graph)
**Discovery · Phase 4 · Effort 8/10 · Value 5/10**

A force-directed graph where nodes are books in your library and edges connect books sharing authors, narrators, series, or subject keywords. Visually shows clusters — your "hard sci-fi" cluster, your "WWII history" cluster — and the bridge books that link them. The bridges often reveal your most generative discovery paths.

- **Audible fields:** `title`, `authors`, `narrators`, `series`, `thesaurus_subject_keywords`, `category_ladders`
- **External APIs:** None core; optional OpenAI embeddings ($0.02/1M tokens) for semantic similarity edges from `publisher_summary`
- **Tech:** React Force Graph, Cytoscape.js, or D3 force; WebGL renderer if library exceeds ~500 books

#### 14. Underexplored Adjacent Genres
**Discovery · Phase 3 · Effort 7/10 · Value 6/10**

Identifies sub-genres statistically adjacent to your top genres (i.e., other readers of your top genres also read these) but absent from your library, with one or two specific entry-point recommendations. Tackles the "I've exhausted my comfort zone" problem.

- **Audible fields:** `category_ladders`, `thesaurus_subject_keywords`
- **External APIs:** Hardcover or Open Library for "readers also read"; or build co-occurrence from Goodreads Kaggle dumps
- **Tech:** Nivo `Sankey` showing genre flow, or chord diagram via D3

### C. Reflection & Insights

#### 15. Annual "Wrapped"-Style Year in Review
**Reflection · Phase 2 · Effort 6/10 · Value 8/10**

A scrollable, animated annual review modeled on Spotify Wrapped — total hours, top author, top narrator, longest book finished, most-binged series, genre breakdown, year-over-year delta, and a personality archetype chosen via simple rules. Generates a sharable image card.

- **Audible fields:** All, scoped by `purchase_date` year and `percent_complete` deltas
- **External APIs:** Optionally Anthropic API for the prose narrative summary; html-to-image for the share card
- **Tech:** Framer Motion for scroll animations, `html-to-image` or Puppeteer for export, shadcn/ui for layout

#### 16. Cost-Per-Hour Dashboard
**Reflection · Phase 1 · Effort 2/10 · Value 6/10**

For each book, effective cost-per-hour using `price` (or credit value) divided by `runtime_length_min`. Aggregated views: best value purchases, worst (short books at full price), credit efficiency over time. Bluntly answers "is my Premium Plus membership actually paying off?"

- **Audible fields:** `price`, `plans`, `runtime_length_min`, `purchase_date`, `title`
- **External APIs:** None
- **Tech:** Recharts scatter (runtime vs. price, colored by cost-per-hour), TanStack Table for ranked list

#### 17. Abandoned & At-Risk Books
**Reflection · Phase 2 · Effort 4/10 · Value 7/10**

Surfaces books where `percent_complete` has been stuck between 5% and 80% for a long time — your DNF pile and your "I'll finish it someday" pile. Categorizes them ("Bounced early" <20%, "Mid-book wall" 20-60%, "So close" 60-95%) and offers actions: drop, restart, acknowledge. Reduces the silent guilt-load every audiobook reader carries.

- **Audible fields:** `percent_complete`, `runtime_length_min`, `purchase_date`, `title`, `category_ladders`
- **External APIs:** None
- **Tech:** Three-column shadcn/ui board (drop, finish, defer), with completion progress bars

#### 18. Subject Keyword Wordcloud (with Trend)
**Reflection · Phase 1 · Effort 3/10 · Value 5/10**

A weighted wordcloud of `thesaurus_subject_keywords` across your library, plus a small-multiples view showing how those keywords have evolved year over year. The trend view is the real insight — reflective in a way that genre alone never is.

- **Audible fields:** `thesaurus_subject_keywords`, `purchase_date`
- **External APIs:** None; optionally embeddings to cluster semantically similar keywords
- **Tech:** `react-wordcloud` or D3 `d3-cloud`, Observable Plot for small multiples trend

### D. Alerts & Monitoring

#### 19. Pre-order & New Release Watchlist
**Alerts · Phase 3 · Effort 5/10 · Value 7/10**

A dashboard surfacing upcoming releases from authors, narrators, and series already in your library, with pre-order links and release-date countdowns. Quietly catches the books you'd otherwise miss for months — particularly useful for prolific authors with multiple series, where Audible's own notifications are noisy.

- **Audible fields:** `authors`, `narrators`, `series`, `title`, `release_date`
- **External APIs:** Audible product search; Open Library or Hardcover for announcements not yet on Audible; email via Resend/SendGrid
- **Tech:** .NET BackgroundService for polling, MJML for email templates, shadcn/ui for in-app view

#### 20. Wishlist Price & Daily Deal Monitor
**Alerts · Phase 3 · Effort 6/10 · Value 7/10**

Tracks the price of books on your wishlist over time and alerts you when something hits a Daily Deal, drops into Audible Plus, or becomes claimable. Audible's own Daily Deal is a single book; this widens the net to your actual interests and historical price floors.

- **Audible fields:** `asin`, `price`, `plans`, `title`, `authors`
- **External APIs:** Audible product API (price polling); your own price-history DB
- **Tech:** Hangfire/.NET cron for polling, Postgres time-series or TimescaleDB, push via ntfy.sh (self-hostable)

#### 21. Audible Plus Catalog Crossover
**Alerts · Phase 3 · Effort 4/10 · Value 6/10**

A view of Audible Plus titles matching your taste profile — same authors, narrators, top sub-genres — that you haven't added. Plus titles are effectively free with membership, so this is unclaimed value sitting in plain sight. Good for sampling new authors without burning a credit.

- **Audible fields:** `authors`, `narrators`, `category_ladders`, `thesaurus_subject_keywords`
- **External APIs:** Audible catalog search filtered by Plus availability
- **Tech:** TanStack Table with faceted filters, shadcn/ui Sheet for detail view

### E. Library Curation

#### 22. Custom Tags & Smart Shelves
**Curation · Phase 2 · Effort 4/10 · Value 9/10**

Audible's categorization is shallow and inconsistent. This adds your own tagging layer ("read-with-tea," "Sarah-recommended," "skimmed-not-finished") plus smart shelves that auto-populate based on rules (e.g., "Unfinished sci-fi under 12 hours"). Tags persist in your own DB, keyed by ASIN, fully independent of Audible.

- **Audible fields:** `asin`, `title`, `runtime_length_min`, `percent_complete`, `category_ladders`
- **External APIs:** None
- **Tech:** Your DB (Postgres/SQLite), shadcn/ui Combobox with autocomplete, a small rules DSL or JSON predicates

#### 23. Custom Collections & Playlists
**Curation · Phase 2 · Effort 3/10 · Value 6/10**

Hand-curated, ordered lists of books — "Long flights," "Comfort re-listens," "Stuff to recommend to Mike." Unlike tags (categorical), collections preserve order and intent. Export to share with friends or paste into a blog post.

- **Audible fields:** `asin`, `title`, `authors`, `product_images`
- **External APIs:** None
- **Tech:** `dnd-kit` for drag-and-drop, shadcn/ui Card, `@vercel/og` for shareable previews

#### 24. Narrator Playlist Builder
**Curation · Phase 2 · Effort 4/10 · Value 5/10**

Pick a narrator, queue up a sequence of their books for a long road trip. Tracks total runtime as you add, warns about duplicates, links to listening positions in the Audible app. For many readers, narrator continuity matters more than genre continuity.

- **Audible fields:** `narrators`, `runtime_length_min`, `title`, `asin`, `percent_complete`
- **External APIs:** Audible catalog search by narrator
- **Tech:** `dnd-kit`, running-total widget; deep links to `audible://` URI scheme on mobile

#### 25. Library Health Check
**Curation · Phase 1 · Effort 3/10 · Value 8/10**

Flags library issues: books at 99% completion (the never-quite-finished pile), suspected duplicates (audiobook + abridged, or re-issued editions with different ASINs), books with `is_returnable` still true that you've barely started, broken metadata. The cleanup screen no other audiobook tool gives you.

- **Audible fields:** `asin`, `title`, `subtitle`, `authors`, `percent_complete`, `is_returnable`, `purchase_date`, `runtime_length_min`
- **External APIs:** None; fuzzy-match library against itself for duplicates
- **Tech:** TanStack Table with row actions, `fuse.js` for fuzzy matching

#### 26. Cover Art Wall
**Curation · Phase 1 · Effort 2/10 · Value 5/10**

A pure aesthetic view — wall-of-covers gallery, sortable by dominant color, publication year, length, or recency. Looks great as a desktop wallpaper export or a public profile page. Trivial to build but makes a personal tool feel polished.

- **Audible fields:** `product_images`, `title`, `release_date`, `runtime_length_min`
- **External APIs:** None
- **Tech:** `node-vibrant` or `colorthief` for dominant-color extraction (cache once), CSS Grid with `aspect-ratio: 1`, `next/image`

### F. Capture & Augment

#### 27. Reading Journal & Highlights
**Capture · Phase 2 · Effort 6/10 · Value 9/10**

Per-book notes, quotes, ratings beyond Audible's 5-star, and timestamped reflections you can capture mid-listen. The killer feature is the quick-capture flow on mobile — paste a quote, tag a timestamp, move on. Solves the genuine problem that audiobooks resist annotation in ways print and Kindle don't.

- **Audible fields:** `asin`, `title`, `authors`, `runtime_length_min`
- **External APIs:** Optionally Anthropic API to surface "themes across your highlights" periodically
- **Tech:** Your DB, TipTap or Lexical for rich editor, PWA with offline support for mobile capture

#### 28. PDF Companion Vault
**Capture · Phase 3 · Effort 5/10 · Value 6/10**

Many audiobooks ship with a PDF containing charts, maps, recipes, or reference material — and those PDFs are almost impossible to find later in Audible's apps. This pulls them all into one searchable vault with OCR'd full-text search and the ability to open any PDF next to its book listing.

- **Audible fields:** `pdf_link`, `pdf_url`, `asin`, `title`
- **External APIs:** Tesseract.js for OCR; or Adobe PDF Extract API for higher fidelity
- **Tech:** `react-pdf` for inline rendering, `pdf-lib` for manipulation, full-text search via Postgres `tsvector` or Meilisearch

#### 29. AI Refresher Summaries
**Capture · Phase 3 · Effort 3/10 · Value 8/10**

For any book in your library, generate a 200-word "what happened, who's who, where it left off" recap on demand — especially before starting book 3 of a series you began two years ago. Uses `publisher_summary` plus retrieval from your captured notes (#27) to ground the summary in what you actually noticed.

- **Audible fields:** `title`, `subtitle`, `authors`, `series`, `publisher_summary`, `editorial_reviews`, `audible_editors_summary`, `thesaurus_subject_keywords`
- **External APIs:** Anthropic API — Haiku is plenty for this and very cheap
- **Tech:** Next.js API route with streaming response, `ai` SDK from Vercel, `react-markdown`

### G. Export & Integration

#### 30. Library Export & Archival
**Export · Phase 1 · Effort 2/10 · Value 9/10**

One-click export of your entire library as CSV, JSON, or Markdown — every field, with options to include/exclude fields and to embed cover images as base64 or local files. Critical for backup (Audible could change policy tomorrow), portability (moving to Libro.fm or Storytel), and downstream tooling. Pairs naturally with Libation.

- **Audible fields:** All of them
- **External APIs:** None
- **Tech:** Server-side generation in .NET, `CsvHelper` for CSV, `System.Text.Json` for JSON

#### 31. Cross-Platform Library Sync
**Export · Phase 3 · Effort 6/10 · Value 6/10**

One-way push of your Audible library to Hardcover, StoryGraph, or Goodreads — including ratings, read status (derived from `percent_complete`), and dates. Solves the "I want my reading life in one place but Audible isn't a real reading platform" problem. Run as on-demand sync rather than realtime.

- **Audible fields:** `asin`, `title`, `authors`, `purchase_date`, `percent_complete`, `rating`
- **External APIs:** Hardcover GraphQL (best); StoryGraph (mostly CSV import); Goodreads (CSV-only since API closure)
- **Tech:** .NET HTTP client with Polly for retries, structured logging, UI to preview diffs before push

#### 32. Obsidian / Notion Knowledge Export
**Export · Phase 3 · Effort 4/10 · Value 7/10**

Export each book as a structured Markdown file with YAML frontmatter (or Notion page) so books become first-class citizens in your knowledge management system. Lets you backlink books to project notes, meeting notes, ideas — turning your library into a genuine personal knowledge graph. Templated sections mirror your journal (#27) schema.

- **Audible fields:** All metadata; especially `title`, `authors`, `series`, `category_ladders`, `thesaurus_subject_keywords`, `publisher_summary`
- **External APIs:** Notion API (free, generous limits); pure file system writes for Obsidian vaults
- **Tech:** Handlebars or Razor templating, `YamlDotNet` for serialization, file watching for reverse-direction edits

#### 33. Public Reader Profile
**Export · Phase 4 · Effort 6/10 · Value 8/10**

A Letterboxd-style public page — sharable URL, top books, current listen, recent finishes, year-to-date stats, custom collections — with a static-rendered version for performance and SEO. Lives at `firelakelabs.com/reading` and becomes a permanent part of your online presence. Per-book privacy toggles so you can hide whatever you don't want public.

- **Audible fields:** Whatever you opt to expose: `title`, `authors`, `product_images`, `percent_complete`, `rating`, `purchase_date`
- **External APIs:** None core; optionally `@vercel/og` for dynamic Open Graph cards per book
- **Tech:** Next.js with `generateStaticParams` and ISR, shadcn/ui, RSS feed generation

---

## Stack notes

Resolved Solid v1 stack:

1. **ASP.NET Core API backend** wrapping AudibleApi, using EF Core and SQLite for local persistence.
2. **Vite React + shadcn/ui frontend** for the local web interface. Frontend report transforms live in plain TypeScript modules.
3. **Raw-ish API with explicit DTOs** for Audible Items, Verso Annotations, Snapshots, Health Findings, settings, and local jobs.
4. **Selective snapshot history** for analysis-relevant observations, not a full event-sourced copy of every Audible field.
5. **Root `justfile` + pnpm** for local development orchestration, while backend and frontend remain independently runnable.

Later phases can introduce background services, external API auth, AI providers, alerts, and homelab/always-on deployment if those features justify the added operational weight.

---

## Open questions for next planning session

These are decisions that affect architecture and are worth resolving before deep implementation:

- Hosting: self-host on the Ubuntu homelab, or deploy frontend to Vercel and backend to homelab?
- Auth: single-user (just you) or multi-user from day one? Affects how tags/journal/collections are scoped.
- Mobile capture for #27 journal: PWA, native shell (Capacitor), or skip mobile entirely?
- Snapshot cadence: hourly, daily, weekly? Audible rate limits matter here.
- Public profile (#33): standalone Next.js site, or sub-path on existing Fire Lake Labs site?
