set shell := ["bash", "-euo", "pipefail", "-c"]

frontend_port := env_var_or_default("VERSO_FRONTEND_PORT", "5202")
backend_port := env_var_or_default("VERSO_BACKEND_PORT", "7202")

default:
    @just --list

backend-restore:
    dotnet restore Verso.slnx

dev *ARGS:
    ./scripts/dev.sh {{ARGS}}

backend-dev BACKEND_PORT=backend_port:
    cd src/backend/Verso.Api && ASPNETCORE_ENVIRONMENT=Development VERSO_BACKEND_PORT="{{BACKEND_PORT}}" dotnet run --no-launch-profile

frontend-dev FRONTEND_PORT=frontend_port:
    cd src/frontend && VERSO_FRONTEND_PORT="{{FRONTEND_PORT}}" pnpm dev

backend-build: backend-restore
    dotnet build Verso.slnx --no-restore

backend-test: backend-restore
    dotnet test Verso.slnx --no-restore

backend-format: backend-restore
    dotnet format Verso.slnx --no-restore --verify-no-changes

frontend-build:
    pnpm --dir src/frontend build

frontend-typecheck:
    pnpm --dir src/frontend typecheck

frontend-test:
    pnpm --dir src/frontend test

frontend-lint:
    pnpm --dir src/frontend lint

frontend-format:
    pnpm --dir src/frontend format:check

frontend-smoke FRONTEND_PORT=frontend_port:
    cd src/frontend && VERSO_FRONTEND_PORT="{{FRONTEND_PORT}}" pnpm test:smoke

audit:
    dotnet list Verso.slnx package --vulnerable --include-transitive
    pnpm --dir src/frontend audit --audit-level moderate

scaffold-smoke:
    bash tests/scaffold/scaffold-smoke.sh

verify: backend-build backend-test backend-format frontend-typecheck frontend-test frontend-lint frontend-format audit frontend-smoke