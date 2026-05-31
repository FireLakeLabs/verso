# Solid v1 Implementation Guide

Use this guide with `CONTEXT.md`, `docs/adr/README.md`, and `docs/agents/definition-of-done.md` before starting implementation issues.

## Start From the Issue Worktree

Create one branch and one repo-local worktree per implementation issue:

```bash
git worktree add .worktrees/issue-2-scaffold -b issue-2-scaffold main
```

Run commands from inside that issue worktree. Keep generated app state, package installs, and verification output local to the issue branch.

## Use Issue-Derived Ports

Local servers must use issue-derived ports unless the issue has a reason to override them:

```text
frontend port = 5200 + issue number
backend port  = 7200 + issue number
```

Use root orchestration for both servers:

```bash
just dev ISSUE=10
```

Manual overrides are available when a port is occupied:

```bash
just dev FRONTEND_PORT=5300 BACKEND_PORT=7300
```

The frontend reads `VERSO_FRONTEND_PORT`; the backend reads `VERSO_BACKEND_PORT` unless `ASPNETCORE_URLS` is already set.

## Keep the Monorepo Shape Simple

- Put the ASP.NET Core API under `src/backend/Verso.Api`.
- Put backend tests under `tests/backend`.
- Put the Vite React app under `src/frontend`.
- Keep frontend report transforms in plain TypeScript modules as they appear.
- Keep API responses as explicit DTOs; do not return EF entities.

## Follow Red, Green, Refactor

Implementation issues use the `tdd` skill. Prefer one behavior-level test, the minimum implementation to pass it, then the next behavior. Tests should name public behavior using the vocabulary in `CONTEXT.md`.

## Run Sensors Before Review

Run the issue-relevant narrow commands while developing. Before handoff, run:

```bash
just verify
```

If the issue changes a signed-off frontend surface, also run the visual parity sensor on the issue-derived frontend port while developing:

```bash
just frontend-visual FRONTEND_PORT=5210
```

Use deterministic fixture data and approved prototype reference states for parity runs. Treat changed baselines as part of the implementation, not post-review cleanup.

If `just verify` cannot pass, document the exact command failure and why the issue is still safe to review.