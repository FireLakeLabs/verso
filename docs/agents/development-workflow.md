# Development Workflow

How agents should work on Verso implementation issues.

## Skills

Use the `tdd` skill for implementation issues by default. The expected loop is red, green, refactor, then verify with the issue's assigned sensors.

Documentation-only or planning-only issues may skip `tdd`, but should say why in the final note or issue comment.

Use the `review` skill for review passes before implementation work is considered ready to merge or close.

Reviews should check the issue acceptance criteria, relevant ADRs, `CONTEXT.md`, assigned guide/sensor obligations, tests, and avoidable merge-conflict risk.

If a review finds that an assigned guide or sensor is missing, the issue should stay open or be returned for follow-up.

## Signed-off UI Surfaces

Use the approved prototype bundle under `clickable-prototype/verso-prototype-smart-shelves-review/` as the design source of truth for signed-off frontend surfaces unless an ADR or issue explicitly records a divergence.

Issue #24 establishes the baseline visual parity sensor. Issue #8 and frontend report/visualization issues such as #10 through #15 own extending the stable parity states and baselines for any signed-off surface they change, rather than treating visual updates as out-of-band follow-up.

When an issue changes a signed-off UI surface:

- run `just frontend-visual FRONTEND_PORT=<issue-derived-port>` while developing and `just verify` before review;
- keep fixture data deterministic and stabilize or mask volatile regions such as timestamps or in-flight job progress instead of loosening thresholds broadly;
- if the UI change is intentional, update the approved handoff or prototype reference first, then update the parity baselines and explain the divergence in the same PR.

## Review Handoff

For implementation issues, do not report the work as done once local verification passes. The branch should be pushed and a pull request should be created before reporting completion.

The pull request should be ready for review rather than left as an unreviewable local worktree state. At minimum, that means:

- the PR is opened from the issue branch;
- the PR description summarizes scope, commands run, and remaining risk;
- the PR description notes any parity baseline updates or explicitly says no signed-off UI baselines changed;
- the PR is not blocked on known follow-up work needed just to make it reviewable.

If local work is complete but the PR has not been created yet, report the state as "implementation complete, PR not opened yet" rather than "done."

## Parallel Worktrees

Use repo-local worktrees under `.worktrees/` for concurrent agent work. Keeping worktrees inside the VS Code workspace avoids repeated permission friction from agents operating outside the current workspace, while `.gitignore` keeps the worktree directories out of the parent repository.

Create worktrees from WSL at the repository root:

```bash
mkdir -p .worktrees
git worktree add .worktrees/issue-2-scaffold -b issue-2-scaffold main
git worktree add .worktrees/issue-10-cadence-runtime -b issue-10-cadence-runtime main
```

Use one branch and one worktree per issue. Prefer branch names like `issue-2-scaffold`, `issue-7-health-findings`, or `issue-10-cadence-runtime`. Agents should work inside the issue worktree, run that issue's verification commands there, and report any shared files they changed.

Remove completed worktrees from the parent repository root after their branches are merged:

```bash
git worktree remove .worktrees/issue-2-scaffold
git branch -d issue-2-scaffold
```

## Parallel Ports

Use issue-number-derived ports when running multiple worktrees at the same time:

```text
frontend port = 5200 + issue number
backend port  = 7200 + issue number
```

Examples:

| Issue | Frontend | Backend |
| ---: | ---: | ---: |
| #2 | 5202 | 7202 |
| #3 | 5203 | 7203 |
| #10 | 5210 | 7210 |
| #16 | 5216 | 7216 |

Issue #2 should make ports configurable through environment variables and root orchestration. Prefer these names unless the scaffold discovers a better local convention:

```bash
VERSO_FRONTEND_PORT=5210
VERSO_BACKEND_PORT=7210
```

The root `justfile` should support issue-derived ports and manual overrides. Desired shape:

```bash
just dev ISSUE=10
just dev FRONTEND_PORT=5300 BACKEND_PORT=7300
```

Use strict port behavior for local servers and browser tests. Vite should fail loudly when its requested port is occupied, ASP.NET Core should bind from env/config rather than hardcoded launch settings, and Playwright should read the same port configuration as the app it tests.
