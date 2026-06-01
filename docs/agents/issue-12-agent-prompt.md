# Issue #12 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#12`.

```text
You are going to implement GitHub issue #12 in FireLakeLabs/verso:

Add Author and Narrator reports

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add thin first versions of the Author Concentration and Narrator Affinity reports using frontend TypeScript transform modules and isolated report views. These should help the Library Owner understand author clustering and narrator listening patterns.

## Acceptance criteria

- [ ] Author Concentration shows top authors and concentration behavior by count and hours from Audible Items.
- [ ] Narrator Affinity shows top narrators by relevant counts or hours and highlights cross-author narrator overlap.
- [ ] Narrator Affinity can surface multi-narrator samples where data exists without inventing additional listening history.
- [ ] Reports include all Audible Items by default as Reflection Reports, with filters where useful.
- [ ] Report UI is reachable from Library Overview.
- [ ] Tests cover author aggregation, narrator ranking, and author-narrator overlap transforms.

## Blocked by

- #5

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-12-author-narrator`
  - worktree: `.worktrees/issue-12-author-narrator`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-12-author-narrator -b issue-12-author-narrator main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5212`
  - backend: `7212`
- Prefer root orchestration commands such as `just dev ISSUE=12`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5212`, and `just verify`.

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
- Because issue #12 changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI changes intentionally, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Keep frontend report shaping in plain TypeScript modules under `src/frontend/src/reports`, not inside React components.
- Add behavior tests for the report transforms using the repo's existing `src/**/*.test.ts` pattern.
- Add the architecture fitness check with `expectReportTransformModule(new URL("./module.ts", import.meta.url))` for new report transform modules where applicable.
- Preserve repo boundaries: backend owns raw-ish data and commands; frontend owns report shaping and view presentation.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.
- If you must touch shared files, do so minimally and intentionally.

Issue-specific sensor requirements for this issue:

- Add frontend transform tests for author aggregation, narrator ranking, and author-narrator overlap, matching the harness requirement for issue #12.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. Signed-off frontend surfaces pass the relevant visual parity checks, or the PR documents intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-12-author-narrator` and is ready for review.
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