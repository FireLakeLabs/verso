# Solid v1 Agent Harness

This document describes the guides and sensors that keep coding-agent work on Verso aligned with the Solid v1 plan.

## Model

- **Guides** are feedforward controls. They tell an agent what good work should look like before it starts.
- **Sensors** are feedback controls. They observe work after an agent acts and help it self-correct before human review.
- Every important guide should eventually have a matching sensor. A rule without a check is only a suggestion; a check without a guide is harder for an agent to fix.

## Existing guides

- `CONTEXT.md` defines domain language. Use these terms in issue titles, tests, API DTOs, UI labels, and docs.
- `docs/adr/` records durable decisions. Check relevant ADRs before changing architecture, data semantics, API boundaries, or Solid v1 scope.
- `docs/verso-project-plan.md` is the roadmap and Solid v1 implementation plan.
- `docs/adr/README.md` maps ADRs to implementation concerns.
- `docs/agents/issue-tracker.md` defines how to use GitHub Issues.
- `docs/agents/triage-labels.md` defines the canonical tracker labels.
- `docs/agents/implementation-guide.md` defines the Solid v1 monorepo, worktree, port, and verification conventions.
- `docs/agents/export-privacy-guide.md` defines Cached Asset, Archive Export, privacy, and no-PDF-caching boundaries.
- `clickable-prototype/verso-prototype-smart-shelves-review/` is the approved Firelake UI reference bundle for signed-off frontend surfaces until a newer handoff or ADR replaces it.
- `docs/agents/development-workflow.md` defines TDD/review usage, parallel worktrees, and issue-derived local ports.
- `docs/agents/definition-of-done.md` defines when implementation issues are complete.

## Guides to add

| Guide | Target issue | Required before |
| --- | ---: | ---: |
| ADR index / decision map | #2 | #3 |
| Solid v1 implementation guide | #2 | #3 |
| Definition of Done | #2 | #3 |
| Issue Definition of Ready | Harness tracker issue | New implementation issues |
| API contract guide | #3 | #5 |
| Data semantics guide | #3 | #5 |
| Testing guide | #4 | #5 |
| UI/report guide | #4 | #10, #11, #12, #14, #15 |

## Sensors to add

| Sensor | Target issue | What it protects |
| --- | ---: | --- |
| Root `just verify` | #2 | Gives every agent one command for local self-correction. |
| Backend build/test command | #2, expanded in #3 | Backend compile and behavior regressions. |
| Frontend typecheck/test command | #2, expanded in report issues | Type drift and frontend transform regressions. |
| Lint/format checks | #2 | Style drift and noisy churn. |
| Dependency/security scanning | #2 | Vulnerable or stale dependencies. |
| Playwright shell smoke test | #2 | Local web app starts and renders. |
| EF migration smoke test | #3 | Clean SQLite database can be created and migrated. |
| API contract tests | #3, then each API issue | DTO contracts stay stable and do not leak EF entities. |
| Approved AudibleApi fixtures | #4 | Behavior tests use realistic library data. |
| Architecture fitness tests | #4, enforced from #5 onward | Backend/frontend ownership boundaries do not drift. |
| Refresh behavior tests | #5 | Partial refresh, no-longer-present items, snapshots, and typed errors behave correctly. |
| Tag and Dropped tests | #6 | Verso Annotations survive refresh and bulk edits behave safely. |
| Health Finding identity tests | #7 | Finding Dispositions stay stable across refreshes. |
| Cost Basis settings tests | #8 | Cost interpretation is explicit and stable. |
| Cached Asset tests | #9 | Cover caching and asset failure behavior work without PDF caching creep. |
| Frontend report transform tests | #10, #11, #12, #14, #15 | Report calculations stay testable outside React components. |
| Frontend visual parity sensor | #24, then each signed-off UI issue | Signed-off Firelake surfaces do not drift silently from the approved prototype bundle. |
| Smart Shelf rule tests | #13 | Backend-authoritative structured rules behave consistently. |
| Archive Export golden tests | #16 | Fidelity-first export includes the expected restorable state. |
| Export job tests | #16 | Export status, typed errors, and result handling work. |

## Issue-by-issue timing

### #2 Scaffold local web monorepo

Add the basic harness foundation:

- ADR index / decision map.
- Solid v1 implementation guide.
- Document the repo-local `.worktrees/` convention in the implementation guide.
- Document the issue-number-derived local port convention in the implementation guide.
- Definition of Done.
- Root `just verify` command.
- Backend build/test command.
- Frontend typecheck/test command.
- Lint/format checks.
- Dependency/security scanning.
- Playwright shell smoke test.

### #3 Build Audible import persistence baseline

Add data and API harnesses:

- API contract guide.
- Data semantics guide.
- EF migration smoke test.
- API contract tests for initial DTOs.
- Ingestion tests using realistic AudibleApi fixtures.
- ASIN identity and raw payload preservation tests.

### #4 Add Solid v1 test harness and fixtures

Make the harness reusable:

- Testing guide.
- UI/report guide.
- Approved AudibleApi fixture library.
- Frontend transform test pattern.
- Architecture fitness test pattern.

### #5 Add refresh jobs and Library Table

Add refresh and baseline UI sensors:

- Refresh job status/error tests.
- Partial refresh preservation tests.
- No-longer-present item tests.
- Selective Snapshot tests.
- Library Overview / Library Table smoke test.

### #6 Add Tags, Dropped marking, and bulk tagging

Add curation behavior sensors:

- Tag mutation tests.
- Bulk tag safety tests.
- Dropped status persistence tests.
- API command contract tests.

### #7 Add Library Health Check findings

Add health workflow sensors:

- Health Finding identity tests.
- Finding Disposition persistence tests.
- Backend-authority architecture check for Health Findings.

### #8 Add Solid v1 settings

Add interpretation setting sensors:

- Cost Basis setting tests.
- Settings DTO contract tests.

### #9 Add cover asset caching

Add asset sensors and draft export guidance:

- Cached Asset tests.
- Asset download failure typed-error tests.
- Export/privacy guide draft, including no PDF caching in Solid v1.

### #10 Add Listening Cadence and Runtime reports

Add frontend transform tests for cadence buckets and runtime bins.

### #11 Add Genre Treemap and Subject Keyword reports

Add frontend transform tests for category hierarchy aggregation and keyword weighting.

### #12 Add Author and Narrator reports

Add frontend transform tests for author concentration and narrator ranking.

### #13 Add Smart Shelf rules

Add Smart Shelf sensors:

- Backend rule evaluation tests.
- Rule DTO contract tests.
- Backend-authority architecture check for Smart Shelves.

### #14 Add Cost-Per-Hour report

Add frontend transform tests for Cost Basis calculations and missing-cost behavior.

### #15 Add Cover Art Wall

Add frontend transform tests for cover-wall sorting and a smoke test for cached-asset display.

### #16 Add Archive and Projection Exports

Add export trust sensors:

- Archive Export golden tests.
- Projection Export tests.
- Export job status/error tests.
- Final export/privacy guide.

### #24 Add Firelake frontend fidelity baseline and visual parity sensor

Add the signed-off UI fidelity controls:

- approved prototype reference states sourced from `clickable-prototype/verso-prototype-smart-shelves-review/`;
- deterministic visual parity checks wired into `just verify`;
- volatile-region stabilization or masking so parity failures signal visual drift rather than runtime noise;
- ownership rules that require issue #8 and frontend report/visualization issues such as #10 through #15 to update the parity states and baselines for any signed-off surface they change.

After #24 lands, later frontend issues should treat parity updates as part of the same change, not as separate cleanup.

## Milestone sensors

- **Before #3 starts**: `just verify`, ADR index, Definition of Done, and implementation guide exist.
- **After #5 lands**: run an architecture review before parallel feature work expands.
- **Before #16 completes**: export/privacy guide is current and covers raw payloads, Cached Assets, Verso Annotations, Smart Shelves, Finding Dispositions, and settings.
- **After #16 lands**: run a Solid v1 harness review to confirm guides and sensors match the actual codebase.

## Done criteria

Use `docs/agents/definition-of-done.md` for issue completion rules. Harness obligations in this file are part of that Definition of Done.
