# Agent Prompt Template For Issues 10, 11, 12, 14, And 15

Use this template when launching an autonomous agent for the remaining report and visualization issues:

- #10 Add Listening Cadence and Runtime reports
- #11 Add Genre Treemap and Subject Keyword reports
- #12 Add Author and Narrator reports
- #14 Add Cost-Per-Hour report
- #15 Add Cover Art Wall

These issues should run in separate repo-local worktrees to reduce merge conflicts.

## Suggested Worktree Matrix

| Issue | Branch | Worktree | Frontend Port | Backend Port | Issue-Specific Sensor Obligation |
| --- | --- | --- | ---: | ---: | --- |
| #10 | `issue-10-cadence-runtime` | `.worktrees/issue-10-cadence-runtime` | 5210 | 7210 | Add frontend transform tests for cadence buckets and runtime bins. |
| #11 | `issue-11-genre-subject` | `.worktrees/issue-11-genre-subject` | 5211 | 7211 | Add frontend transform tests for category hierarchy aggregation and keyword weighting. |
| #12 | `issue-12-author-narrator` | `.worktrees/issue-12-author-narrator` | 5212 | 7212 | Add frontend transform tests for author concentration and narrator ranking. |
| #14 | `issue-14-cost-per-hour` | `.worktrees/issue-14-cost-per-hour` | 5214 | 7214 | Add frontend transform tests for Cost Basis calculations and missing-cost behavior. |
| #15 | `issue-15-cover-art-wall` | `.worktrees/issue-15-cover-art-wall` | 5215 | 7215 | Add frontend transform tests for cover-wall sorting and a smoke test for cached-asset display. |

## How To Use

1. Copy the template below.
2. Replace every `{{...}}` placeholder.
3. Paste the filled prompt into the agent.
4. Run one agent per issue, each in its own worktree.

## Template

```text
You are going to implement GitHub issue #{{ISSUE_NUMBER}} in FireLakeLabs/verso:

{{ISSUE_TITLE}}

Issue body / acceptance criteria:
{{ISSUE_BODY}}

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `{{BRANCH_NAME}}`
  - worktree: `{{WORKTREE_PATH}}`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add {{WORKTREE_PATH}} -b {{BRANCH_NAME}} main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `{{FRONTEND_PORT}}`
  - backend: `{{BACKEND_PORT}}`
- Prefer root orchestration commands such as `just dev ISSUE={{ISSUE_NUMBER}}`, `just frontend-test`, `just frontend-visual FRONTEND_PORT={{FRONTEND_PORT}}`, and `just verify`.

Before writing code, read and follow these repo instructions and guides:

- `AGENTS.md`
- `docs/agents/development-workflow.md`
- `docs/agents/definition-of-done.md`
- `docs/agents/harness.md`
- `docs/agents/implementation-guide.md`
- `docs/agents/ui-report-guide.md`
- `docs/agents/testing-guide.md`
- `src/frontend/AGENTS.md`
- `CONTEXT.md`
- relevant ADRs for this slice, especially:
  - `docs/adr/0017-frontend-owns-ui-report-transforms.md`
  - `docs/adr/0018-frontend-report-transforms-live-in-typescript-modules.md`
  - `docs/adr/0019-rawish-api-for-frontend-transforms.md`
  - `docs/adr/0022-recharts-default-visualization-library.md`
  - `docs/adr/0023-no-external-enrichments-in-solid-v1.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0028-library-overview-first-screen.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth unless the issue explicitly records a divergence.
- Because issues #10, #11, #12, #14, and #15 change signed-off frontend surfaces, treat visual parity updates as part of the implementation, not cleanup. If the UI changes intentionally, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Keep frontend report shaping in plain TypeScript modules under `src/frontend/src/reports`, not inside React components.
- Add behavior tests for the report transforms using the repo's existing `src/**/*.test.ts` pattern.
- Add the architecture fitness check with `expectReportTransformModule(new URL("./module.ts", import.meta.url))` for new report transform modules where applicable.
- Preserve repo boundaries: backend owns raw-ish data and commands; frontend owns report shaping and view presentation.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.
- If you must touch shared files, do so minimally and intentionally.

Issue-specific sensor requirements for this issue:

- `{{ISSUE_SENSOR_REQUIREMENTS}}`

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. Signed-off frontend surfaces pass the relevant visual parity checks, or the PR documents intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `{{BRANCH_NAME}}` and is ready for review.
10. The final note and PR description name commands run and remaining risk.

Expected execution sequence:

1. Ensure the dedicated worktree exists and switch into it.
2. Read the issue, guides, ADRs, and nearby implementation surfaces.
3. Use TDD to implement the issue.
4. Add or update the issue-owned sensors and tests.
5. Run narrow checks during development.
6. Run visual parity checks while developing if the signed-off UI surface changes.
7. Run `just verify` or the closest available equivalent before handoff.
8. Run the review workflow against the branch diff.
9. Commit, push, and open a PR with a review-ready description.
10. Only then report completion, including commands run, PR link, parity note, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```

## Quick-Fill Values

### Issue #10

- `{{ISSUE_NUMBER}}` -> `10`
- `{{ISSUE_TITLE}}` -> `Add Listening Cadence and Runtime reports`
- `{{BRANCH_NAME}}` -> `issue-10-cadence-runtime`
- `{{WORKTREE_PATH}}` -> `.worktrees/issue-10-cadence-runtime`
- `{{FRONTEND_PORT}}` -> `5210`
- `{{BACKEND_PORT}}` -> `7210`
- `{{ISSUE_SENSOR_REQUIREMENTS}}` -> `Add frontend transform tests for cadence bucketing, cohort completion rollups, and runtime binning, matching the harness requirement for issue #10.`

### Issue #11

- `{{ISSUE_NUMBER}}` -> `11`
- `{{ISSUE_TITLE}}` -> `Add Genre Treemap and Subject Keyword reports`
- `{{BRANCH_NAME}}` -> `issue-11-genre-subject`
- `{{WORKTREE_PATH}}` -> `.worktrees/issue-11-genre-subject`
- `{{FRONTEND_PORT}}` -> `5211`
- `{{BACKEND_PORT}}` -> `7211`
- `{{ISSUE_SENSOR_REQUIREMENTS}}` -> `Add frontend transform tests for category hierarchy aggregation, treemap-ready rollups, and keyword weighting, matching the harness requirement for issue #11.`

### Issue #12

- `{{ISSUE_NUMBER}}` -> `12`
- `{{ISSUE_TITLE}}` -> `Add Author and Narrator reports`
- `{{BRANCH_NAME}}` -> `issue-12-author-narrator`
- `{{WORKTREE_PATH}}` -> `.worktrees/issue-12-author-narrator`
- `{{FRONTEND_PORT}}` -> `5212`
- `{{BACKEND_PORT}}` -> `7212`
- `{{ISSUE_SENSOR_REQUIREMENTS}}` -> `Add frontend transform tests for author aggregation, narrator ranking, and author-narrator overlap, matching the harness requirement for issue #12.`

### Issue #14

- `{{ISSUE_NUMBER}}` -> `14`
- `{{ISSUE_TITLE}}` -> `Add Cost-Per-Hour report`
- `{{BRANCH_NAME}}` -> `issue-14-cost-per-hour`
- `{{WORKTREE_PATH}}` -> `.worktrees/issue-14-cost-per-hour`
- `{{FRONTEND_PORT}}` -> `5214`
- `{{BACKEND_PORT}}` -> `7214`
- `{{ISSUE_SENSOR_REQUIREMENTS}}` -> `Add frontend transform tests for Cost Basis calculations, basis toggling, and missing-cost behavior, matching the harness requirement for issue #14.`

### Issue #15

- `{{ISSUE_NUMBER}}` -> `15`
- `{{ISSUE_TITLE}}` -> `Add Cover Art Wall`
- `{{BRANCH_NAME}}` -> `issue-15-cover-art-wall`
- `{{WORKTREE_PATH}}` -> `.worktrees/issue-15-cover-art-wall`
- `{{FRONTEND_PORT}}` -> `5215`
- `{{BACKEND_PORT}}` -> `7215`
- `{{ISSUE_SENSOR_REQUIREMENTS}}` -> `Add frontend transform tests for cover-wall sorting and a smoke test for cached-asset display, matching the harness requirement for issue #15.`