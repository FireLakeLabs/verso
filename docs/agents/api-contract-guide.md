# API Contract Guide

Use this guide for Verso API changes that expose local workflows to the frontend or automation.

## Contract Shape

- Return explicit request and response DTOs for each operation.
- Do not return EF Core entities, navigation properties, or persistence-shaped objects directly.
- Keep response JSON camelCase through the default ASP.NET Core serializer configuration.
- Prefer one top-level response object per endpoint, even for list endpoints.

## Issue #3 Baseline Contracts

- `POST /api/audible-authentication/sessions` starts AudibleApi-supported local authentication and returns a browser prompt DTO.
- `POST /api/audible-authentication/sessions/{sessionId}/complete` completes a pending browser-authentication session and returns the resulting auth status DTO.
- `GET /api/audible-authentication/session` returns the current persisted auth status DTO.
- `DELETE /api/audible-authentication/session` clears the current persisted auth session and any stored identity file.
- `POST /api/audible-library/imports` runs a live Audible Library import using the current auth session and returns a count DTO.
- `GET /api/library/items` returns raw-ish library data DTOs for later frontend transforms.

## Error Contracts

- Use a stable error DTO for user-facing operation failures.
- Keep the error `code` machine-readable and stable across internal refactors.
- Keep the error `message` concise and action-oriented.
- Do not leak stack traces or internal entity names in API responses.

## Change Rules

- If a client-facing field is renamed, removed, or retyped, add or update an API contract test in `tests/backend/Verso.Api.Tests`.
- If an endpoint needs more data, prefer adding an explicit DTO field over returning internal persistence structure.
- Keep library responses raw-ish enough for frontend report transforms, but stable enough that frontend code does not depend on EF schema details.