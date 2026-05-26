# Development Workflow

How agents should work on Verso implementation issues.

## Skills

Use the `tdd` skill for implementation issues by default. The expected loop is red, green, refactor, then verify with the issue's assigned sensors.

Documentation-only or planning-only issues may skip `tdd`, but should say why in the final note or issue comment.

Use the `review` skill for review passes before implementation work is considered ready to merge or close.

Reviews should check the issue acceptance criteria, relevant ADRs, `CONTEXT.md`, assigned guide/sensor obligations, tests, and avoidable merge-conflict risk.

If a review finds that an assigned guide or sensor is missing, the issue should stay open or be returned for follow-up.

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
