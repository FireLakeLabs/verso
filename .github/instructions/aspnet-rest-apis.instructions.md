---
description: 'ASP.NET Core API-layer conventions for the Verso backend (local, single-user).'
applyTo: 'src/backend/Verso.Api/**/*.cs'
---

# ASP.NET Core API conventions (Verso)

Verso's backend is a **local, single-user** ASP.NET Core API on `net10.0` serving the Vite/React frontend. Domain rules (the Audible boundary, EF/SQLite, product constraints) live in `src/backend/AGENTS.md`; this file covers the HTTP/API layer only.

## Scope — do NOT add

This is not a multi-tenant or public API. Unless a recorded decision in `docs/adr/` changes it, do not introduce:

- Authentication or authorization middleware, ASP.NET Identity, JWT/bearer, OAuth/OIDC, or `[Authorize]`. The only authentication is the external-browser Audible login handled inside the Audible boundary.
- API versioning, or Swagger/OpenAPI generation (`Swashbuckle`, `NSwag`).
- Rate-limiting, CORS beyond what local dev requires, or reverse-proxy/deployment concerns — this runs on localhost for one user.

Removing this surface area is intentional. Do not reintroduce it as "best practice."

## Endpoints

- Match the existing endpoint style in `Program.cs`. Prefer Minimal APIs for new endpoints, grouped by resource with `MapGroup`. Do not introduce MVC controllers unless the project already uses them.
- Return `TypedResults` (`Results<Ok<T>, NotFound, ...>`) so response shapes and status codes are explicit and testable.
- Keep the readiness endpoint at `/health` working.

## Contracts

- Define request/response DTOs as records in the API layer. Never serialize EF entities (`VersoDbContext` types) directly over the wire — project to a DTO so the storage shape and the API shape can diverge independently.
- Keep projections explicit and data-shape preserving (see `src/backend/AGENTS.md`); preserve ASIN identity in responses rather than collapsing distinct Audible Items.

## Validation and errors

- Validate at the endpoint boundary. Return `ProblemDetails` (via `TypedResults.Problem` or the problem-details service) for error responses, with the correct status code.
- Do not leak exception messages, stack traces, filesystem paths, or `AudibleApi` internals in responses.

## Configuration

- Read configuration and paths from config/environment (e.g. `VERSO_DATA_DIRECTORY`, `VERSO_BACKEND_PORT`). Never hardcode ports, hosts, or filesystem paths.
- Bind settings with the options pattern (`IOptions<T>`), not by reading `IConfiguration` ad hoc deep inside services.

## Testing

- Cover endpoints with the existing xUnit + `WebApplicationFactory<Program>` integration style (see `src/backend/AGENTS.md`), exercising real API contracts rather than unit-testing handlers in isolation.
