## Backend technology conventions

This file adds Verso-specific backend rules only. Reuse the APM-managed C# and ASP.NET REST API instructions for general .NET style, and use the installed `ef-core` skill for general EF Core guidance.

### Entry points

- Use `just backend-dev`, `just backend-test`, and `just verify` for normal backend run/build/test loops.
- Do not introduce ad hoc `dotnet` or `pnpm` commands in docs, scripts, or agent output when an existing `just` target already covers the task.

### AudibleApi boundary

- Verso uses `AudibleApi` `10.1.5.1` through the existing service boundaries, not inline in handlers or unrelated services.
- Library fetches go through `IAudibleLibrarySource` and its `AudibleApiLibrarySource` implementation.
- Login flow goes through `IAudibleLoginClient` and `AudibleAuthenticationService`.
- Do not call `EzApiCreator`, `GetLibraryAsync`, or other `AudibleApi` entry points outside those boundaries unless the abstraction layer itself is being extended.
- Authentication is external-browser only. Keep that flow intact; do not add embedded username/password prompts.
- Secrets and account credentials belong in the OS secrets manager or 1Password, never in source, fixtures, checked-in config, or test data.
- The persisted local session artifact is the identity file under `VERSO_DATA_DIRECTORY/audible/identity.json`; treat it as local runtime state, not a durable secret to commit or share.
- Be conservative with Audible traffic: keep imports cancellable, avoid unnecessary parallel fan-out, and prefer clear failure/retry surfaces over silent retries.

### EF Core and SQLite

- Verso uses a single-user local SQLite database; optimize for correctness and inspectability, not multi-tenant scale patterns.
- Keep schema changes in `src/backend/Verso.Api/Persistence/Migrations` and review the generated model snapshot/migration pair as part of the change.
- The app applies migrations on startup; new migrations must remain safe for local upgrade from an existing library database.
- Favor straightforward queries over abstraction-heavy repositories. Query from `VersoDbContext`, keep projections explicit, and preserve ASIN identity rather than collapsing distinct Audible Items.
- Store imported Audible payloads losslessly when the current model depends on them; do not strip source data for convenience.

### Testing

- Backend tests live in `tests/backend/Verso.Api.Tests`.
- Prefer xUnit integration tests built on `WebApplicationFactory<Program>` and service replacement, matching the existing import/authentication tests.
- JSON fixtures live under `tests/backend/Verso.Api.Tests/Fixtures`; add representative Audible payloads there when mapper or contract coverage needs real source shapes.
- Keep tests focused on API contracts, persistence behavior, and import/auth flows rather than private helper implementation.

### Verso product constraints

- Model one `Library Owner`, not a generalized user/tenant/account system.
- Keep the product local-first and private-by-default. Do not add third-party export, telemetry, or sharing paths for Audible Library data unless a domain decision explicitly changes that boundary.
- Audible Facts remain source-of-truth imports; local annotations must not overwrite imported Audible identity/history.
- Distinct ASINs stay distinct Audible Items even when they look like the same work.