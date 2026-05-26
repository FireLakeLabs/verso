# pnpm and just for Local Development

Verso uses pnpm for frontend package management and a root `justfile` for local development orchestration. The justfile should expose convenient commands such as starting both servers and running tests, while backend .NET commands and frontend pnpm commands remain usable directly.