# Issue #13 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#13`.

```text
You are going to implement GitHub issue #13 in FireLakeLabs/verso:

Add Smart Shelves manager and rules

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add Smart Shelves as backend-authoritative saved rules over Audible Facts and Verso Annotations, plus the signed-off manager UI for browsing saved shelves, editing structured boolean groups, and previewing results. Solid v1 rules should avoid scripting, SQL editors, manual membership, per-item exceptions, and manual ordering.

## Acceptance criteria

- [ ] The Library Owner can create, edit, and delete Smart Shelves.
- [ ] The UI shows multiple saved shelves with result counts and last-evaluated metadata.
- [ ] The selected shelf view shows summary metrics, a structured rule builder, and a matching-item preview.
- [ ] Smart Shelf rules support nested boolean AND/OR groups over known Audible Facts and Verso Annotations.
- [ ] Backend evaluates saved Smart Shelf membership authoritatively.
- [ ] Preview while editing is produced from backend evaluation of the in-progress draft rule payload or another API contract that preserves backend authority; the frontend does not invent heuristic membership locally.
- [ ] Saved shelf counts and persisted membership always come from backend-evaluated results.
- [ ] Smart Shelves do not support manual membership, hand-picked exceptions, or manual ordering.
- [ ] Tests cover nested rule evaluation, draft-preview contract behavior, persistence, and membership API behavior.

## Blocked by

- #6

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-13-smart-shelves`
  - worktree: `.worktrees/issue-13-smart-shelves`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-13-smart-shelves -b issue-13-smart-shelves main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5213`
  - backend: `7213`
- Prefer root orchestration commands such as `just dev ISSUE=13`, `just backend-test`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5213`, and `just verify`.

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
  - `docs/adr/0009-structured-smart-shelf-rules-for-solid-v1.md`
  - `docs/adr/0020-backend-evaluates-smart-shelves.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0041-explicit-api-dtos.md`
  - `docs/adr/0044-typed-user-facing-operation-errors.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth unless the issue explicitly records a divergence.
- Because issue #13 changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI change is intentional, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Keep Smart Shelf rule evaluation backend-authoritative for both saved membership and in-progress preview.
- Support structured nested boolean groups only. Do not introduce scripting, SQL editing, manual membership, exceptions, or manual ordering.
- Keep request and response contracts explicit so later export and settings work can rely on stable shelf shapes.
- Preserve the separation between Audible Facts, Verso Annotations, and evaluated membership.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add backend rule evaluation tests, rule DTO contract tests, and a backend-authority architecture check, matching the harness requirement for issue #13.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. Signed-off frontend surfaces pass the relevant visual parity checks, or the PR documents the intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-13-smart-shelves` and is ready for review.
10. The final note and PR description name commands run, parity status, and remaining risk.

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