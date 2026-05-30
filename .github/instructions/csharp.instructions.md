---
description: 'Repo-wide C# language and style conventions for Verso (.NET 10 / C# 14).'
applyTo: '**/*.cs'
---

# C# conventions (Verso)

Repo-wide C# rules. Domain and backend-specific rules live in `src/backend/AGENTS.md`; mechanical style (naming, `var`, file-scoped namespaces, brace and spacing rules) is enforced by `.editorconfig` and `dotnet format` — follow that rather than restating it here.

## Language level

- Target is `net10.0` with C# 14. Reach for current-version features (collection expressions, primary constructors, pattern matching, `required` members) when they make code clearer — not for novelty.
- `ImplicitUsings` is enabled. Do not add `using` directives that are already implicit.
- Nullable reference types are enabled. Trust the annotations: express intent with `?`, and do not add defensive null checks for values the type system already guarantees as non-null. Use `is null` / `is not null` rather than `== null` / `!= null`.

## Async

- Async all the way down. Never block on async with `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()`.
- Suffix asynchronous methods with `Async` (e.g. `GetLibraryAsync`), matching the existing code.
- Accept a `CancellationToken` on async entry points and honor it — this backs the "imports stay cancellable" rule in `src/backend/AGENTS.md`.

## Types and data

- Model immutable data carriers (DTOs, API contracts, imported Audible payloads) as `record` / `record struct` with init-only members. Mutable EF entities are the exception, not the default.
- Keep types small and single-purpose; favor composition over inheritance.
- Mark fields `readonly` when they are not reassigned after construction.

## Error handling

- Throw specific exception types. Do not throw or catch bare `Exception` except at a deliberate top-level boundary.
- Never silently swallow exceptions. If a failure is expected and recoverable, model it explicitly (a result type, a nullable, or a typed outcome) rather than catching-and-ignoring.
- Validate inputs at public boundaries; assume internal callers honor the contract.

## Dependency injection

- Constructor injection only; register services in `Program.cs`. No service-locator pattern and no static singletons for application services.
- Add an interface only for a seam you actually substitute (see the Audible boundary in `src/backend/AGENTS.md`). Don't add an interface per class by reflex.

## Comments

- Comment the *why*, not the *what*. Don't narrate code that already reads clearly.
