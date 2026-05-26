# Verso

Verso is a single-user personal library companion for turning an Audible library into an inspectable, exportable, and curatable body of audiobook data.

## Language

**Library Owner**:
The single person whose Audible library is imported into Verso and whose tags, shelves, journal entries, snapshots, exports, and privacy choices are stored by Verso. A Verso instance has one Library Owner unless a later product decision changes the boundary.
_Avoid_: User, account, tenant, customer

**Audible Library**:
The collection of audiobook records imported from Audible for the Library Owner. It is source metadata from Audible, distinct from user-authored Verso data.
_Avoid_: Catalog, bookshelf, inventory

**Audible Item**:
A single audiobook entry in the Audible Library, identified by ASIN. Different ASINs remain different Audible Items even when they appear to represent the same work or edition family.
_Avoid_: Book, work, edition when identity matters

**No Longer Present Audible Item**:
An Audible Item that existed in a previous successful refresh but is absent from the current successful Audible Library refresh. Verso keeps its historical record and Verso Annotations rather than deleting it.
_Avoid_: Deleted item, removed record, purged book

**Audible Fact**:
An imported property supplied by Audible for an audiobook in the Audible Library. Audible is the source of truth for Audible Facts, even when a later refresh changes a previously imported value.
_Avoid_: Local metadata, editable book field, canonical Verso field

**Current Audible Fact**:
The latest value Audible reported for an Audible Fact. Current Audible Facts power the normal library view, while Snapshots preserve selected historical observations for analysis-relevant values.
_Avoid_: Canonical local copy, approved metadata, frozen metadata

**Verso Annotation**:
Library Owner-authored data attached to the Audible Library, such as tags, journal entries, collection order, acknowledgements, or privacy choices. Verso Annotations live beside Audible Facts and do not replace them.
_Avoid_: Override, corrected metadata, custom Audible field

**Tag**:
A lightweight Library Owner-defined label attached to one or more Audible Items. Tags are personal labels, not formal genres, metadata corrections, or hierarchical taxonomy terms.
_Avoid_: Category, genre override, taxonomy node

**Smart Shelf**:
A saved rule that dynamically selects Audible Items from Audible Facts and Verso Annotations. A Smart Shelf has no manual membership, hand-picked exceptions, or manual ordering.
_Avoid_: Collection, playlist, saved list

**Collection**:
A hand-curated ordered list of Audible Items. Collections preserve Library Owner intent and sequence, while Smart Shelves derive membership from rules.
_Avoid_: Smart Shelf, saved filter, tag group

**Archive Export**:
A lossless export intended to preserve Audible Facts, Cached Assets, Verso Annotations, Smart Shelves, Finding Dispositions, and relevant interpretation settings with backup fidelity. JSON is the archive format of record when friendly formats cannot preserve structure.
_Avoid_: Report, spreadsheet export, printable list

**Projection Export**:
A friendly export shaped for a destination such as CSV, Markdown, Obsidian, or Notion. Projection Exports may flatten or omit structure when the destination format cannot represent the full Archive Export faithfully.
_Avoid_: Archive, backup, source of truth

**Cached Asset**:
A local copy of an imported asset, such as cover art, stored so Verso views and Archive Exports do not depend on remote URLs remaining available. Cached Assets are tied to Audible Items and source asset variants where possible.
_Avoid_: Hotlink, remote asset, temporary download

**Snapshot**:
A recorded observation of available Audible Facts at refresh time. A Snapshot may preserve when Verso observed a value, but observation time is not treated as the real-world time an Audible event happened unless Audible supplies that event time.
_Avoid_: Event log, inferred history, continuous timeline

**Datapoint**:
A value used for reporting or analysis, populated from the best available source data. Missing Datapoints remain null unless the Library Owner explicitly chooses interpolation or extrapolation in an analysis or display.
_Avoid_: Guess, backfill, inferred value

**Completed Audible Item**:
An Audible Item whose best available completion Datapoint is at least 95 percent. A value below 95 percent remains unfinished unless a specific analysis defines a different threshold.
_Avoid_: Finished book, read book, 100-percent-only completion

**At-Risk Audible Item**:
An Audible Item that has been started, is not completed, and shows no observed completion progress across two consecutive Snapshots at least 14 days apart. At-risk status depends on observed evidence and should not be inferred from missing history.
_Avoid_: Abandoned book, stale book, inactive book

**Dropped Audible Item**:
An Audible Item the Library Owner has explicitly marked as no longer intended to finish. Dropped status is a Verso Annotation and is never inferred automatically from completion history.
_Avoid_: Abandoned book, inferred DNF, stale book

**Reflection Report**:
A view that describes the Audible Library as it exists, including Dropped Audible Items by default. Reflection Reports may offer filters for curated lenses, but they do not hide library history automatically.
_Avoid_: Action queue, recommendation list, cleanup workflow

**Cost Basis**:
The selected valuation method for cost and value reports. Verso supports a list-price Cost Basis and a Library Owner-configured per-credit Cost Basis; reports default to the configured per-credit value when present, otherwise list price with an explicit label.
_Avoid_: True cost, guessed price, inferred purchase cost

**Action View**:
A view meant to help the Library Owner decide what to do next. Action Views may exclude Dropped Audible Items, dismissed Health Findings, or other non-actionable items by default.
_Avoid_: Reflection Report, historical report, archive view

**Library Table**:
The central searchable and filterable workspace for Audible Items, Audible Facts, Verso Annotations, and Health Findings. The Library Table supports dense inspection and curation work that does not belong to a single report.
_Avoid_: Report, dashboard, spreadsheet export

**Public Visibility**:
An explicit Verso Annotation that allows selected Audible Items or curated surfaces to appear outside the private local library. Audible Items are private by default unless the Library Owner opts them into public sharing later.
_Avoid_: Public by default, implicit sharing, social visibility

**Duplicate Candidate**:
Two or more Audible Items that Verso suspects may represent the same underlying work, edition family, or accidental duplicate purchase. Duplicate Candidates are review signals, not automatic merges.
_Avoid_: Merged book, canonical book, duplicate record

**Health Finding**:
A reviewable issue surfaced by Library Health Check, such as a near-complete item, Duplicate Candidate, returnable barely-started item, or missing metadata. Health Findings are advisory and do not mutate Audible Items automatically.
_Avoid_: Auto-fix, cleanup action, mutation

**Finding Disposition**:
The Library Owner's persisted response to a stable Health Finding, such as acknowledged or dismissed. Finding Dispositions survive refreshes while the underlying Health Finding identity remains meaningfully the same.
_Avoid_: Finding result, auto-resolution, permanent suppression

**Personal Library Companion**:
A private tool for understanding, curating, exporting, and augmenting one Library Owner's Audible Library. It is not a multi-user reading platform or social network.
_Avoid_: Platform, social app, SaaS

**Solid v1**:
The first shippable version of Verso: ingestion, Library Export & Archival, Library Health Check, all ten Phase 1 read-only reports, Custom Tags & Smart Shelves, and simple Dropped Audible Item marking. Solid v1 is the smallest release that makes Verso useful for active library curation, not only passive inspection; individual reports may ship as thin first versions.
_Avoid_: MVP, beta, dashboard-only release

## Example Dialogue

Developer: Should tags belong to a user account?
Domain expert: No. In the current Verso boundary, tags belong to the Library Owner's single Audible Library.

Developer: Does Public Reader Profile mean Verso has multiple users?
Domain expert: No. Public Reader Profile is a publishing surface for selected data from the Library Owner, not a sign that Verso is a social platform.

Developer: If Audible changes a title during refresh, do we keep our older imported title?
Domain expert: No. The title is an Audible Fact, so the refreshed Audible value wins. Any local interpretation should be a Verso Annotation.

Developer: If the Library Owner has an abridged and unabridged version of the same title, do annotations merge?
Domain expert: No. They are separate Audible Items because they have separate ASINs; Verso may flag them as Duplicate Candidates without merging them.

Developer: If Audible stops listing an ASIN after a return, should Verso erase it?
Domain expert: No. Mark it as a No Longer Present Audible Item and keep its history and Verso Annotations.

Developer: Is the first release only a read-only dashboard?
Domain expert: No. Solid v1 includes Custom Tags & Smart Shelves so the Library Owner can actively curate the Audible Library.

Developer: Can Solid v1 drop lower-value Phase 1 reports to ship sooner?
Domain expert: No. Solid v1 includes all ten Phase 1 reports, though each can start as a thin useful version.

Developer: Do I need to wait for Abandoned & At-Risk Books to mark an item dropped?
Domain expert: No. Solid v1 supports simple Dropped Audible Item marking; richer at-risk workflows can come later.

Developer: If Verso first observes a book at 100 percent on Friday, do we say it was completed on Friday?
Domain expert: Not unless Audible reports Friday as the completion date. Friday is the Snapshot observation time; the completion Datapoint stays null if no better source data exists.

Developer: If Audible changes a book's category, should the Genre Treemap show the old category?
Domain expert: No. The normal Genre Treemap uses Current Audible Facts unless a specific analysis explicitly asks for historical category observations.

Developer: If I tag a book `sci-fi`, does that replace Audible's category?
Domain expert: No. `sci-fi` is a Tag, so it is a personal label that Smart Shelves and filters can use; it does not correct or replace Audible Facts.

Developer: Can I force a 15-hour book into a Smart Shelf for unfinished sci-fi under 12 hours?
Domain expert: No. Change the rule or add a Tag that makes the Audible Item match; hand-picked membership belongs in a Collection.

Developer: Should CSV preserve every nested Audible field exactly?
Domain expert: No. The Archive Export preserves fidelity. CSV is a Projection Export and may flatten structure for readability.

Developer: If I restore an Archive Export on a new machine, should my Tags and Smart Shelves come back?
Domain expert: Yes. Archive Export preserves the personal Verso state needed to restore the Library Owner's curated library.

Developer: If Public Reader Profile exists later, is a newly imported Audible Item public?
Domain expert: No. Public Visibility is explicit; the Audible Library is private by default.

Developer: Where should I bulk-tag unfinished books by a favorite narrator?
Domain expert: Use the Library Table for dense filtering and curation across Audible Facts and Verso Annotations.

Developer: If Audible's cover image URL disappears, should Cover Art Wall still work?
Domain expert: Yes. Cover art should be available as a Cached Asset when it was imported successfully.

Developer: If Verso finds two near-identical Audible Items, should it merge them?
Domain expert: No. Library Health Check creates a Health Finding; the Library Owner decides what the finding means.

Developer: If I dismiss a Duplicate Candidate, should it return on the next refresh?
Domain expert: No, not while it is meaningfully the same Health Finding. The Finding Disposition should survive refreshes.

Developer: Does a 96 percent Audible Item count as completed?
Domain expert: Yes. Verso treats 95 percent or greater as a Completed Audible Item for default reports and rules.

Developer: If I refresh twice in one day and an item is still at 37 percent, is it at-risk?
Domain expert: No. At-risk requires no observed progress across two consecutive Snapshots at least 14 days apart.

Developer: If an item stays at 12 percent for a year, is it dropped?
Domain expert: No. Verso can surface it as at-risk, but only the Library Owner can mark a Dropped Audible Item.

Developer: Should Runtime Distribution hide Dropped Audible Items by default?
Domain expert: No. Runtime Distribution is a Reflection Report, so it includes the real Audible Library unless the Library Owner applies a filter.

Developer: If Audible does not report a cash purchase price, should Verso guess the cost?
Domain expert: No. Cost reports use the selected Cost Basis, such as list price or a Library Owner-configured per-credit value.

Developer: If a credit value is configured, should Cost-Per-Hour still default to list price?
Domain expert: No. The configured per-credit Cost Basis is the default once present; list price remains available as a toggle.
