#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

test -f justfile
test -f src/backend/Verso.Api/Verso.Api.csproj
test -f src/frontend/package.json

just verify