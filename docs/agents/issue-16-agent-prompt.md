# Issue #16 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#16`.

```text
You are going to implement GitHub issue #16 in FireLakeLabs/verso:

Add Archive and Projection Exports

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add Library Export & Archival for Solid v1. JSON Archive Export is the fidelity-first format of record and should preserve Audible Facts, raw payloads, Cached Assets, Verso Annotations, Smart Shelves, Finding Dispositions, and relevant settings. CSV and Markdown are Projection Exports and may flatten or omit structure when the destination format cannot preserve the full archive faithfully. Settings own export defaults, while a dedicated Export Status surface owns running jobs, progress, results, and history.

## Acceptance criteria

- [ ] Archive Export produces a versioned JSON payload with schema version metadata.
- [ ] Archive Export includes normalized Audible Facts and raw AudibleApi payloads.
- [ ] Archive Export includes Tags, Dropped status, Smart Shelves, Finding Dispositions, Cost Basis settings, and relevant local interpretation settings.
- [ ] Archive Export includes or references Cached Assets according to export options.
- [ ] CSV and Markdown Projection Exports are available and clearly distinct from the Archive Export.
- [ ] Export flow includes both settings defaults and a separate Export Status surface for running jobs.
- [ ] Export runs as a local job with phase-level status, summary, typed errors, and downloadable result artifacts.
- [ ] Archive restore/import workflow is not introduced in this slice.
- [ ] Tests cover archive fidelity, projection behavior, and export job status.

## Blocked by

- #6
- #7
- #8
- #9
- #13

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-16-exports`
  - worktree: `.worktrees/issue-16-exports`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-16-exports -b issue-16-exports main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5216`
  - backend: `7216`
- Prefer root orchestration commands such as `just dev ISSUE=16`, `just backend-test`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5216`, and `just verify`.

Before writing code, read and follow these repo instructions and guides:

- `AGENTS.md`
- `docs/agents/development-workflow.md`
- `docs/agents/definition-of-done.md`
- `docs/agents/export-privacy-guide.md`
- `docs/agents/harness.md`
- `docs/agents/implementation-guide.md`
- `docs/agents/testing-guide.md`
- `src/backend/AGENTS.md`
- `src/frontend/AGENTS.md`
- `CONTEXT.md`
- relevant ADRs for this slice, especially:
  - `docs/adr/0010-export-fidelity-first.md`
  - `docs/adr/0024-cache-cover-images-locally.md`
  - `docs/adr/0025-defer-companion-pdf-caching.md`
  - `docs/adr/0026-defer-archive-restore-workflow.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0041-explicit-api-dtos.md`
  - `docs/adr/0043-local-job-model-for-refresh-and-export.md`
  - `docs/adr/0044-typed-user-facing-operation-errors.md`
  - `docs/adr/0045-minimal-solid-v1-settings.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth for any signed-off surface this issue changes.
- If this issue changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI change is intentional, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Treat JSON Archive Export as the fidelity-first format of record and preserve the full Solid v1 state the issue requires.
- Keep CSV and Markdown clearly framed as Projection Exports with intentionally flattened or lossy shapes where necessary.
- Reuse the local job model with typed status and errors rather than inventing a one-off export flow.
- Do not introduce archive restore or import behavior in this slice.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add Archive Export golden tests, Projection Export tests, and Export job status and error tests, matching the harness requirement for issue #16.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. If a signed-off frontend surface changes, the relevant visual parity checks pass or the PR documents the intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-16-exports` and is ready for review.
10. The final note and PR description name commands run, parity status if relevant, and remaining risk.

Expected execution sequence:

1. Ensure the dedicated worktree exists and switch into it.
2. Read the issue, guides, ADRs, and nearby implementation surfaces.
3. Use TDD to implement the issue.
4. Add or update the issue-owned sensors and tests.
5. Run narrow checks during development.
6. Run visual parity checks while developing if a signed-off UI surface changes.
7. Run `just verify` or the closest available equivalent before handoff.
8. Run the review workflow against the branch diff.
9. Commit, push, and open a PR with a review-ready description.
10. Only then report completion, including commands run, PR link, parity note if relevant, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```