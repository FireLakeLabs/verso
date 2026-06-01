# Issue #17 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#17`.

```text
You are going to implement GitHub issue #17 in FireLakeLabs/verso:

Install Solid v1 agent harness guides and sensors

Issue body / acceptance criteria:

## Parent

#1

## What to build

Install the Solid v1 agent harness described in `docs/agents/harness.md`. The harness should make the guide/sensor system visible to future agents and ensure each implementation issue adds the controls assigned to it.

This is a coordination issue, not a product feature. It should update documentation and, where useful, comment on or edit implementation issues so agents know which harness pieces they own.

## Acceptance criteria

- [ ] `docs/agents/harness.md` exists and maps guides and sensors to issues #2 through #16.
- [ ] `AGENTS.md` links to the harness guide.
- [ ] A lightweight ADR index or decision map exists before #3 begins.
- [ ] Definition of Done guidance exists before #3 begins.
- [ ] Issue #2 clearly owns root `just verify`, scaffold-level checks, lint/format, dependency/security scanning, and shell smoke testing.
- [ ] Issue #3 clearly owns API/data guides, EF migration smoke tests, DTO contract tests, ingestion tests, ASIN identity tests, and raw payload tests.
- [ ] Issue #4 clearly owns approved fixtures, testing guide, frontend transform test pattern, and architecture fitness test pattern.
- [ ] Issues #5 through #16 clearly own their assigned sensors from the harness guide.
- [ ] A milestone review note or checklist exists for after #5 and after #16.

## Comments to honor

- The documentation and coordination parts can start immediately, but scaffold-dependent sensors must be verified through their owning issues before this issue closes.
- Implementation issues should use the `tdd` skill by default and the `review` skill before closure unless the work is documentation-only or another exception is explicitly justified.
- Repo-local worktrees under `.worktrees/` and issue-derived local ports are part of the harness guidance and should stay reflected in the implementation docs.

## Blocked by

None. Coordination can start immediately, but closure depends on the harness obligations for #2 through #16 being landed or explicitly deferred with rationale.

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-17-harness`
  - worktree: `.worktrees/issue-17-harness`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-17-harness -b issue-17-harness main`
- Do all implementation, review, and PR work from inside that worktree.
- Use issue-derived ports for local verification when a sensor requires live frontend or backend runs:
  - frontend: `5217`
  - backend: `7217`
- Prefer root orchestration commands such as `just verify` and the narrow issue-owner commands referenced by the harness guide.

Before writing code, read and follow these repo instructions and guides:

- `AGENTS.md`
- `docs/agents/development-workflow.md`
- `docs/agents/definition-of-done.md`
- `docs/agents/harness.md`
- `docs/agents/implementation-guide.md`
- `docs/agents/testing-guide.md`
- `CONTEXT.md`
- `docs/adr/README.md`
- plus any issue-specific ADRs that are touched by harness updates

Workflow requirements:

- This issue is coordination and documentation heavy. Strict TDD may be partially or wholly inapplicable for pure docs updates; if so, say why in the final note and PR.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.

Implementation expectations:

- Treat this as harness coordination, not product-feature development.
- Audit the guides and sensors assigned to issues #2 through #16 against the current repo state and tracker state.
- Update docs, prompts, checklists, or issue-facing guidance so future agents can see which guide or sensor they own.
- Do not close the issue while required harness obligations are still missing from owning issues unless the gap is explicitly deferred with rationale in the docs and PR.
- Keep changes tightly scoped to harness coordination and documentation.

Issue-specific completion requirements for this issue:

- Verify the milestone review notes or checklists for after #5 and after #16 exist and are current.
- If you add or revise prompt files for implementation issues, keep them aligned with the current harness assignments.
- Name which harness obligations are now satisfied, which remain owned by other issues, and any explicit deferrals in the PR description.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met or any remaining gaps are explicitly documented as still owned by their implementation issues.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors or ownership notes are updated where this issue is responsible for them.
4. `just verify` or the closest available harness-stage equivalent passes when applicable to the touched documentation or automation.
5. The implementation is consistent with `CONTEXT.md`, `docs/agents/harness.md`, and relevant ADRs.
6. Any new durable decision is recorded as an ADR.
7. A pull request is opened from `issue-17-harness` and is ready for review.
8. The final note and PR description name commands run, remaining harness gaps owned elsewhere, and remaining risk.

Expected execution sequence:

1. Ensure the dedicated worktree exists and switch into it.
2. Read the issue, guides, ADR index, and current issue/prompt surfaces.
3. Audit the existing harness obligations against the repo and tracker.
4. Update the needed docs, prompts, and checklists.
5. Run the narrowest relevant verification.
6. Run the review workflow against the branch diff.
7. Commit, push, and open a PR with a review-ready description.
8. Only then report completion, including commands run, PR link, remaining harness gaps, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```