# Issue #6 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#6`.

```text
You are going to implement GitHub issue #6 in FireLakeLabs/verso:

Add Tags, Dropped marking, and bulk tagging

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add the first Verso Annotation workflows to the Library Table and Item Detail: lightweight Tags, explicit Dropped Audible Item marking, and limited bulk tag editing. This should make the Library Table a real curation workspace without introducing destructive bulk actions or whole-filter mutations.

## Acceptance criteria

- [ ] The Library Owner can add and remove lightweight Tags on Audible Items.
- [ ] The Library Owner can mark and unmark an Audible Item as dropped.
- [ ] Dropped status is explicit and never inferred from completion history.
- [ ] Library Table supports bulk add/remove Tags for explicitly selected Audible Items.
- [ ] Whole-filter bulk mutation, bulk delete, bulk metadata override, and bulk merge actions are not introduced.
- [ ] Tag editing may remain inline; a dedicated tag-management destination is not required in this slice.
- [ ] Tags and Dropped status survive refreshes.
- [ ] Tests cover tag mutation, selection-based bulk tag behavior, and Dropped status persistence.

## Blocked by

- #5

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-6-tags-dropped`
  - worktree: `.worktrees/issue-6-tags-dropped`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-6-tags-dropped -b issue-6-tags-dropped main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5206`
  - backend: `7206`
- Prefer root orchestration commands such as `just dev ISSUE=6`, `just backend-test`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5206`, and `just verify`.

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
  - `docs/adr/0002-audible-facts-remain-source-of-truth.md`
  - `docs/adr/0003-asin-identifies-audible-items.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0029-limited-bulk-editing-for-solid-v1.md`
  - `docs/adr/0030-dropped-marking-in-solid-v1.md`
  - `docs/adr/0041-explicit-api-dtos.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth for any signed-off surface this issue changes.
- If this issue changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI change is intentional, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Keep Tags and Dropped state as explicit Verso Annotations that do not overwrite imported Audible Facts.
- Keep bulk mutation scoped to explicitly selected items only; do not add whole-filter bulk actions or destructive bulk operations.
- Keep backend command/query endpoints on explicit DTOs; do not return EF entities directly.
- Preserve refresh behavior so Tags and Dropped state survive future imports.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add tag mutation tests, bulk tag safety tests, Dropped status persistence tests, and API command contract tests, matching the harness requirement for issue #6.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. If a signed-off frontend surface changes, the relevant visual parity checks pass or the PR documents the intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-6-tags-dropped` and is ready for review.
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