# Issue #7 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#7`.

```text
You are going to implement GitHub issue #7 in FireLakeLabs/verso:

Add Library Health Check findings

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add backend-authoritative Library Health Check evaluation and the UI workflow for reviewable Health Findings. Findings should be advisory only and support stable Finding Dispositions across refreshes.

## Acceptance criteria

- [ ] Backend evaluates Health Findings for near-complete items, Duplicate Candidates, returnable barely-started items, and missing metadata.
- [ ] Health Findings do not automatically mutate Audible Items or Audible Facts.
- [ ] Finding Dispositions can be acknowledged or dismissed and survive refreshes while the finding identity remains meaningfully the same.
- [ ] The UI presents active findings and a clear dispositioned history or filtered disposition view.
- [ ] Duplicate Candidates are surfaced without merging ASINs.
- [ ] Snooze is not required in this slice unless its persistence and reappearance semantics are explicitly specified.
- [ ] Tests cover finding identity stability and disposition persistence.

## Blocked by

- #5

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-7-health-findings`
  - worktree: `.worktrees/issue-7-health-findings`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-7-health-findings -b issue-7-health-findings main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5207`
  - backend: `7207`
- Prefer root orchestration commands such as `just dev ISSUE=7`, `just backend-test`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5207`, and `just verify`.

Before writing code, read and follow these repo instructions and guides:

- `AGENTS.md`
- `docs/agents/development-workflow.md`
- `docs/agents/definition-of-done.md`
- `docs/agents/harness.md`
- `docs/agents/implementation-guide.md`
- `docs/agents/testing-guide.md`
- `src/backend/AGENTS.md`
- `src/frontend/AGENTS.md`
- `CONTEXT.md`
- relevant ADRs for this slice, especially:
  - `docs/adr/0003-asin-identifies-audible-items.md`
  - `docs/adr/0021-backend-evaluates-health-findings.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0041-explicit-api-dtos.md`
  - `docs/adr/0044-typed-user-facing-operation-errors.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth for any signed-off surface this issue changes.
- If this issue changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI change is intentional, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Keep Health Finding evaluation backend-authoritative; the frontend should not invent finding identity or semantics locally.
- Keep findings advisory only. Do not auto-merge, auto-tag, auto-drop, or otherwise mutate Audible Items.
- Preserve stable finding identity across refreshes so dispositions remain attached when the same underlying condition persists.
- Keep API contracts explicit and data-shape preserving.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add Health Finding identity tests, Finding Disposition persistence tests, and a backend-authority architecture check, matching the harness requirement for issue #7.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. If a signed-off frontend surface changes, the relevant visual parity checks pass or the PR documents the intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-7-health-findings` and is ready for review.
10. The final note and PR description name commands run and remaining risk.

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
10. Only then report completion, including commands run, PR link, parity note, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```