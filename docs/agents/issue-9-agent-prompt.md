# Issue #9 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#9`.

```text
You are going to implement GitHub issue #9 in FireLakeLabs/verso:

Add cover asset caching

Issue body / acceptance criteria:

## Parent

#1

## What to build

Cache cover images locally when available during import or refresh, preserving source URLs as Current Audible Facts while making Cached Assets available for Cover Art Wall and Archive Export. Companion PDF downloading remains out of scope.

## Acceptance criteria

- [ ] Cover image URLs from Audible can produce local Cached Assets when available.
- [ ] Cached Assets are associated with Audible Items and source variants where practical.
- [ ] Failed asset downloads produce typed user-facing status without failing the whole library refresh when the item data is otherwise valid.
- [ ] Archive/export code can reference cached cover metadata.
- [ ] Companion PDF files are not downloaded or cached.
- [ ] Tests cover successful cover caching and asset download failure handling.

## Blocked by

- #3

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-9-cover-assets`
  - worktree: `.worktrees/issue-9-cover-assets`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-9-cover-assets -b issue-9-cover-assets main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for local runs when needed:
  - frontend: `5209`
  - backend: `7209`
- Prefer root orchestration commands such as `just dev ISSUE=9`, `just backend-test`, and `just verify`.

Before writing code, read and follow these repo instructions and guides:

- `AGENTS.md`
- `docs/agents/development-workflow.md`
- `docs/agents/definition-of-done.md`
- `docs/agents/export-privacy-guide.md`
- `docs/agents/harness.md`
- `docs/agents/implementation-guide.md`
- `docs/agents/testing-guide.md`
- `src/backend/AGENTS.md`
- `CONTEXT.md`
- relevant ADRs for this slice, especially:
  - `docs/adr/0010-export-fidelity-first.md`
  - `docs/adr/0024-cache-cover-images-locally.md`
  - `docs/adr/0025-defer-companion-pdf-caching.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0043-local-job-model-for-refresh-and-export.md`
  - `docs/adr/0044-typed-user-facing-operation-errors.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.

Implementation expectations:

- Preserve source image URLs as imported Current Audible Facts while adding local Cached Asset metadata beside them.
- Asset download failures should be surfaced as typed user-facing status and must not fail the entire refresh when item import is otherwise valid.
- Do not download, cache, or otherwise broaden scope to companion PDF files.
- Keep export/privacy guidance current if the cached-asset behavior changes the expected archive contract.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add Cached Asset tests and asset download failure typed-error tests, and keep the export/privacy guidance aligned with the final behavior, matching the harness requirement for issue #9.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
5. Tests cover behavior, not private implementation details.
6. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
7. Any new durable decision is recorded as an ADR.
8. A pull request is opened from `issue-9-cover-assets` and is ready for review.
9. The final note and PR description name commands run and remaining risk.

Expected execution sequence:

1. Ensure the dedicated worktree exists and switch into it.
2. Read the issue, guides, ADRs, and nearby implementation surfaces.
3. Use TDD to implement the issue.
4. Add or update the issue-owned sensors and tests.
5. Run narrow checks during development.
6. Run `just verify` or the closest available equivalent before handoff.
7. Run the review workflow against the branch diff.
8. Commit, push, and open a PR with a review-ready description.
9. Only then report completion, including commands run, PR link, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```