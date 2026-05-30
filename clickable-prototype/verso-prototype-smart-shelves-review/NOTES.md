# Prototype note

Question this prototype copy is answering:

- What do the missing Solid v1 screens look like when added to the existing handoff without changing the original bundle?
- Can the missing reporting and operations surfaces fit the established Firelake-style shell and still respect the ADR boundaries already captured in the repo?
- Which preferences need a visible home in Settings instead of living only in the prototype tweak drawer?

Answer captured in this copy:

- Smart Shelves work as a dense two-column curation screen and still feel consistent with the rest of the app.
- The missing analysis screens also fit cleanly in the same shell: Listening Cadence, Genre Treemap, Narrator Affinity, and Cost per Hour.
- Export needs its own operational status screen, separate from export settings, so the user can see job phases, outputs, and history.
- Interface defaults need a visible Settings section; hiding them only in the tweak drawer makes the design under-specify the real product surface.

What changed in this copy:

- Added Smart Shelves under Curation.
- Added four new report screens in `prototype/verso/missing-screens.jsx`:
	- Listening Cadence
	- Genre Treemap
	- Narrator Affinity
	- Cost per Hour
- Added an Export Status screen in `prototype/verso/missing-screens.jsx` and wired export actions toward it.
- Added an Interface section in Settings so nav style, overview default, and library view are prototype-visible.
- Expanded report navigation in the top-nav dropdown, the sidebar, and the overview quick-link section.
- Added cache-busting query strings to local script tags in `prototype/Verso.html` so review loads the updated copy reliably.
- Left the original handoff untouched.

Review entry point:

- `prototype/Verso.html`

Suggested review path:

- Overview → use the expanded Reports quick links.
- Reports dropdown or Sidebar → review all report surfaces.
- Curation → Smart Shelves.
- Operations → Export Status and Settings → Interface.

If you want the full report list always visible during review:

- Open Settings → Interface → Sidebar.
