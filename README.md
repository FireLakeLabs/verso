# Verso

Verso is a local, single-user personal library companion for inspecting, curating, and exporting an Audible Library.

## Prerequisites

- .NET SDK 10
- Node.js 24 or newer
- pnpm 11 or newer
- just

## Repository Layout

- `src/backend/Verso.Api` contains the ASP.NET Core API.
- `tests/backend/Verso.Api.Tests` contains backend behavior tests.
- `src/frontend` contains the Vite React frontend.
- `docs/agents` contains agent workflow guides and sensors.
- `docs/adr` contains durable architecture decisions.

## Local Development

Install frontend dependencies after cloning or switching worktrees:

```bash
pnpm install
```

Run the backend only:

```bash
just backend-dev
```

Run the frontend only:

```bash
just frontend-dev
```

Run both local servers with issue-derived ports:

```bash
just dev ISSUE=2
```

Manual port overrides are also supported:

```bash
just dev FRONTEND_PORT=5300 BACKEND_PORT=7300
```

The default #2 development ports are frontend `5202` and backend `7202`. Override them with `VERSO_FRONTEND_PORT` and `VERSO_BACKEND_PORT` when needed.

## Verification

Run the full local sensor suite:

```bash
just verify
```

Useful narrower commands:

```bash
just backend-test
just frontend-typecheck
just frontend-test
just frontend-lint
just frontend-smoke
just audit
```

The backend readiness endpoint is available at `/health`.