# Issue #8 Agent Prompt

Use this prompt to launch an autonomous agent for issue `#8`.

```text
You are going to implement GitHub issue #8 in FireLakeLabs/verso:

Add Solid v1 settings

Issue body / acceptance criteria:

## Parent

#1

## What to build

Add the minimal Solid v1 settings surface for local operation, interpretation, and app-shell defaults. Settings should cover Audible session status, a usable Audible authentication/re-authentication path, refresh controls, Cost Basis, local data/storage visibility, Archive Export defaults, and the signed-off interface preferences without adding future external-provider configuration.

## Acceptance criteria

- [ ] Settings show the current Audible authentication/session state, including locale/marketplace, last authenticated time when available, and relevant auth failure state when present.
- [ ] From an unauthenticated state, Settings can start an Audible authentication session and present the AudibleApi-supported external-browser handoff without asking for an Audible password inside Verso.
- [ ] The Library Owner can complete the AudibleApi-supported external-browser authentication flow from Settings, and Verso persists the resulting authenticated session locally.
- [ ] After successful authentication, Settings update to the authenticated state without requiring a page reload and expose explicit re-authenticate and sign-out actions.
- [ ] Re-authenticate replaces the previous session cleanly, and sign-out clears the current session and returns Settings to the unauthenticated state.
- [ ] If authentication fails, times out, or is cancelled, Settings show an actionable error and preserve the previous valid session state when one exists.
- [ ] Settings expose refresh controls and a clear entry point into Refresh Status.
- [ ] Refresh controls gate correctly: unauthenticated users are directed to authenticate first, and authenticated users can start refresh without hitting the auth-required failure path.
- [ ] After successful authentication, the Library Owner can start refresh from the app and a successful refresh surfaces persisted library data.
- [ ] The Library Owner can choose Cost Basis and configure per-credit value.
- [ ] Settings show local data/storage location visibility.
- [ ] Settings include Archive Export defaults/options needed by Solid v1.
- [ ] Settings include app-shell preferences for nav chrome choice, default overview variant, and default library view.
- [ ] App-shell preferences persist across restart and are exposed through the settings DTO/API shape used by the frontend.
- [ ] App-shell preferences are included in Archive Export wherever #16 refers to relevant local interpretation settings.
- [ ] `Daily at idle` is specified as a local app-initiated refresh mode, not an always-running background daemon.
- [ ] Settings do not include AI provider keys, external API keys, alerts, public profile, notifications, or mobile capture settings.
- [ ] Tests cover Cost Basis behavior, settings DTO behavior, persisted interface-preference behavior, and the Settings authentication flow across unauthenticated, successful authentication, failed/cancelled authentication, re-authentication, sign-out, and post-auth refresh gating.

## Additional verification

- One human-operated manual smoke pass is still required before calling this issue done: complete the real external-browser Audible login with a real Audible account and confirm that a subsequent refresh can pull real library data.

## Blocked by

- #5

Operate autonomously and do not stop at analysis, a partial implementation, or local validation. Continue until the repo Definition of Done is reached for this issue as defined in docs/agents/definition-of-done.md, or until you hit a real blocker that you cannot resolve yourself.

Mandatory operating constraints:

- Work in WSL, not PowerShell.
- Use a dedicated repo-local worktree for this issue:
  - branch: `issue-8-settings`
  - worktree: `.worktrees/issue-8-settings`
- If the worktree does not exist yet, create it from the repository root with:
  - `git worktree add .worktrees/issue-8-settings -b issue-8-settings main`
- Do all implementation, testing, review, and PR work from inside that worktree.
- Use issue-derived ports for all local runs and browser checks:
  - frontend: `5208`
  - backend: `7208`
- Prefer root orchestration commands such as `just dev ISSUE=8`, `just backend-test`, `just frontend-test`, `just frontend-visual FRONTEND_PORT=5208`, and `just verify`.

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
  - `docs/adr/0012-delegate-audible-authentication-to-audibleapi-flow.md`
  - `docs/adr/0027-private-by-default.md`
  - `docs/adr/0028-library-overview-first-screen.md`
  - `docs/adr/0041-explicit-api-dtos.md`
  - `docs/adr/0043-local-job-model-for-refresh-and-export.md`
  - `docs/adr/0044-typed-user-facing-operation-errors.md`
  - `docs/adr/0045-minimal-solid-v1-settings.md`
  - plus any issue-specific ADRs that apply

Workflow requirements:

- Use the `tdd` skill for implementation work unless you can justify in the issue or PR why strict TDD was not applicable.
- Use the `review` skill before considering the issue complete.
- Do not report the issue as done when local verification passes but no PR exists. The issue is only complete when the PR is open and ready for review per `docs/agents/development-workflow.md` and `docs/agents/definition-of-done.md`.
- Use the approved prototype bundle at `clickable-prototype/verso-prototype-smart-shelves-review/` as the signed-off frontend source of truth unless the issue explicitly records a divergence.
- Because issue #8 changes a signed-off frontend surface, treat visual parity updates as part of the implementation, not cleanup. If the UI change is intentional, update the relevant parity states/baselines and explain the change in the PR.

Implementation expectations:

- Preserve the external-browser Audible authentication flow. Do not add embedded Audible password prompts or store credentials in source-controlled config.
- Keep settings transport and persistence explicit through DTOs and persisted local state.
- Keep refresh gating and settings state transitions typed and user-facing; failures should preserve any previous valid session when the issue requires it.
- Persist app-shell preferences and Cost Basis behavior in a way issue #14 and issue #16 can build on without reshaping the contract.
- Keep changes tightly scoped to this issue. Avoid drive-by refactors.

Issue-specific sensor requirements for this issue:

- Add Cost Basis setting tests, Settings DTO contract tests, and authentication-flow coverage for unauthenticated, successful, failed or cancelled, re-authenticate, sign-out, and post-auth refresh gating paths, matching the harness requirement for issue #8.

Minimum completion bar before you stop:

1. Acceptance criteria are demonstrably met.
2. Relevant guides are updated or explicitly deemed unnecessary.
3. Relevant sensors are added or updated.
4. Signed-off frontend surfaces pass the relevant visual parity checks, or the PR documents the intentional divergence and includes the required reference/baseline updates.
5. `just verify` or the closest available issue-stage equivalent passes from the issue worktree.
6. Tests cover behavior, not private implementation details.
7. The implementation is consistent with `CONTEXT.md` and relevant ADRs.
8. Any new durable decision is recorded as an ADR.
9. A pull request is opened from `issue-8-settings` and is ready for review.
10. The final note and PR description name commands run, parity status, the required manual Audible-login smoke pass status, and remaining risk.

Expected execution sequence:

1. Ensure the dedicated worktree exists and switch into it.
2. Read the issue, guides, ADRs, and nearby implementation surfaces.
3. Use TDD to implement the issue.
4. Add or update the issue-owned sensors and tests.
5. Run narrow checks during development.
6. Run visual parity checks while developing if the signed-off UI surface changes.
7. Run `just verify` or the closest available equivalent before handoff.
8. Run the review workflow against the branch diff.
9. Commit, push, and open a PR with a review-ready description that calls out the remaining manual Audible-login smoke pass if it was not completed.
10. Only then report completion, including commands run, PR link, parity note, manual-smoke status, and remaining risk.

Only stop early if you encounter a real blocker that cannot be resolved locally. If blocked, report the exact blocker, what you tried, and what decision or dependency is required.
```