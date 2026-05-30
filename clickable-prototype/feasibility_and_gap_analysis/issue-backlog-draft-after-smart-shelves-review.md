# Issue backlog draft after Smart Shelves prototype

Status after approved prototype review on 2026-05-29:

- GitHub issues were updated to match the signed-off prototype.
- Updated issues: #5, #6, #7, #8, #10, #11, #12, #13, #14, #15, #16.
- Renamed issues: #5 is now `Add refresh jobs and core library surfaces`; #13 is now `Add Smart Shelves manager and rules`.
- No new GitHub issues were created in this pass; the approved prototype gaps folded cleanly into the existing backlog.

This file is the local draft for step 1 so we can review the Smart Shelves prototype before changing or creating stories in GitHub.

## Existing issues to edit after review

### #5 Add refresh jobs and Library Table

Proposed change:

- Expand scope to explicitly own the shipped Library Overview variants, the dedicated Refresh Status screen, and Item Detail.
- If that feels too large, split Item Detail into its own issue and leave #5 owning Overview + Table + Refresh.

Reason:

- The prototype handoff treats these as one coherent baseline user experience.

### #6 Add Tags, Dropped marking, and bulk tagging

Proposed change:

- Clarify whether bulk tag actions apply to selected rows only or to whole filtered result sets.
- Decide whether tag CRUD remains inline or whether the `Manage tags` action needs a dedicated destination.

Reason:

- The current handoff only visibly supports selected-item bulk operations.

### #7 Add Library Health Check findings

Proposed change:

- Decide whether `Snooze` is a real disposition.
- Add acceptance criteria for dismissed or acknowledged findings history, not only active findings.

Reason:

- The prototype shows more behavior than the issue currently models.

### #8 Add Solid v1 settings

Proposed change:

- Add app-shell preference ownership: nav chrome choice, overview variant, and table-density default.
- Define `Daily at idle` precisely enough to implement.

Reason:

- These are signed-off behaviors in the prototype, but they only exist in the tweak panel today.

### #10 Add Listening Cadence and Runtime reports

Proposed change:

- Split into two issues or mark Listening Cadence as blocked on design.

Reason:

- Runtime is designed. Cadence is not.

### #11 Add Genre Treemap and Subject Keyword reports

Proposed change:

- Split into two issues or mark Genre Treemap as blocked on design.

Reason:

- Subject Keywords is designed. Genre Treemap is not.

### #12 Add Author and Narrator reports

Proposed change:

- Split into two issues or mark Narrator Affinity as blocked on design.

Reason:

- Author Concentration is designed. Narrator Affinity is not.

### #13 Add Smart Shelf rules

Proposed change:

- Update the issue body to reflect the reviewed Smart Shelves screen and to call out the end-to-end slice more concretely.
- Explicitly name the screen shape: saved shelf list, selected shelf detail, structured boolean groups, frontend preview of backend-evaluated results.
- Add acceptance criteria clarifying nested groups, annotation-field inputs, and lack of manual membership.

Reason:

- This prototype copy now answers the biggest UI question in #13.

Suggested revised acceptance additions:

- The UI can display multiple saved shelves with result counts and last-evaluated metadata.
- The rule builder supports nested AND/OR groups over current Audible facts and Verso annotations.
- The UI can preview matching items without turning the frontend into the source of truth for saved membership.
- Manual membership, per-item exceptions, and manual ordering are not introduced.

### #15 Add Cover Art Wall

Proposed change:

- Align the sort list with the prototype or decide intentionally to diverge.

Reason:

- The issue text and prototype do not currently describe the same sort set.

### #16 Add Archive and Projection Exports

Proposed change:

- Add a design dependency or follow-up issue for export job status, progress, and typed errors.

Reason:

- The handoff covers export entry points and settings, but not the required job UX.

## Proposed new issues after review

These are intentionally not created yet.

1. Add Smart Shelves manager screen and preview flow
2. Add Listening Cadence report design and implementation slice
3. Add Genre Treemap design and implementation slice
4. Add Narrator Affinity design and implementation slice
5. Add export job status and results surface
6. Add app-shell preference controls and persistence
7. Add Item Detail and selective snapshot history slice if not folded into #5

## Review questions to answer before GitHub changes

1. Does Smart Shelves belong under Curation, Library, or both?
2. Is the two-column list-plus-detail layout the right density for the rule builder?
3. Are nested boolean groups enough, or do we need deeper composition than this prototype shows?
4. Should the frontend preview always show exact backend results, or is a lighter preview acceptable while editing?
5. Should we split #13 into design-first and implementation slices, or keep one issue with clearer acceptance criteria?
