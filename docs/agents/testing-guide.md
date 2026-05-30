# Testing Guide

Use the root orchestration layer for all normal verification work:

- `just backend-test` runs the backend xUnit suite.
- `just frontend-test` runs the frontend Node test suite for plain TypeScript modules and component-adjacent tests.
- `just verify` runs the full local sensor bundle.

## Backend fixture pattern

Approved AudibleApi fixtures live under `tests/backend/Verso.Api.Tests/Fixtures/AudibleApi`.

- `single-item/` holds one raw AudibleApi item per file for mapper-focused tests.
- `current-audible-facts/` holds arrays of raw items shaped like import-time Current Audible Facts snapshots.
- File names should explain the behavior under test, such as `asin-identity` or `sparse-rich-edge-cases`.

Tests should load fixtures through `AudibleApiFixtureLibrary` instead of hard-coding JSON strings in each test. This keeps ASIN identity, Current Audible Facts intent, and raw payload preservation visible at the call site.

Preferred backend pattern:

```csharp
var rawItem = AudibleApiFixtureLibrary.LoadRawItem("single-item/sparse-rich-edge-cases");
var importedItems = AudibleApiFixtureLibrary.LoadImportedItems("current-audible-facts/asin-identity");
```

Fixture coverage for Solid v1 should stay realistic:

- sparse metadata;
- multiple authors and narrators;
- category ladders and series data;
- missing price amounts;
- companion PDF links;
- returnability flags;
- unusual completion values.

## Frontend transform pattern

Frontend report logic belongs in plain TypeScript modules, tested without rendering React components.

- Put report transforms under `src/frontend/src/reports`.
- Keep tests in the existing `src/**/*.test.ts` pattern.
- Prefer raw-ish source fixtures that look like backend DTOs, then assert on transformed report output.

Use `src/frontend/src/test/report-test-harness.ts` for two things:

- building small report fixtures inline;
- asserting that a report module stays outside React/component imports.

That architecture check is intentionally lightweight: it protects the boundary early, before heavier feature work lands.