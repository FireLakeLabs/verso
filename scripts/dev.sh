#!/usr/bin/env bash
set -euo pipefail

issue=""
frontend_override=""
backend_override=""

for arg in "$@"; do
  case "$arg" in
    ISSUE=*) issue="${arg#ISSUE=}" ;;
    FRONTEND_PORT=*) frontend_override="${arg#FRONTEND_PORT=}" ;;
    BACKEND_PORT=*) backend_override="${arg#BACKEND_PORT=}" ;;
    *)
      if [[ -z "$issue" ]]; then
        issue="$arg"
      else
        echo "Unknown dev argument: $arg" >&2
        exit 2
      fi
      ;;
  esac
done

if [[ -n "$issue" && ! "$issue" =~ ^[0-9]+$ ]]; then
  echo "Issue must be numeric, got: $issue" >&2
  exit 2
fi

if [[ -n "$issue" ]]; then
  frontend_port="$((5200 + issue))"
  backend_port="$((7200 + issue))"
else
  frontend_port="${VERSO_FRONTEND_PORT:-5202}"
  backend_port="${VERSO_BACKEND_PORT:-7202}"
fi

if [[ -n "$frontend_override" ]]; then
  frontend_port="$frontend_override"
fi

if [[ -n "$backend_override" ]]; then
  backend_port="$backend_override"
fi

export VERSO_FRONTEND_PORT="$frontend_port"
export VERSO_BACKEND_PORT="$backend_port"
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

echo "Starting Verso API on http://127.0.0.1:${VERSO_BACKEND_PORT}"
dotnet run --no-launch-profile --project src/backend/Verso.Api/Verso.Api.csproj &
backend_pid=$!

echo "Starting Verso frontend on http://127.0.0.1:${VERSO_FRONTEND_PORT}"
pnpm --dir src/frontend dev &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait -n "$backend_pid" "$frontend_pid"