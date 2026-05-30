# Data Semantics Guide

Use this guide with `CONTEXT.md` and the relevant ADRs before changing Verso persistence or import behavior.

## Audible Library Identity

- An Audible Item is identified by ASIN.
- Re-importing the same ASIN updates the existing Audible Item instead of creating a second record.
- Different ASINs stay distinct even if they appear to represent the same work.

## Current Audible Facts

- Imported library fields are Audible Facts, and Audible remains the source of truth for them.
- The persisted library view should reflect the latest successful import as Current Audible Facts.
- Verso does not store local corrections to Audible Facts in the issue #3 baseline.

## Raw Payload Preservation

- Store the raw AudibleApi item payload alongside normalized fields for each Audible Item.
- Preserve unknown fields from the AudibleApi payload rather than reserializing only known mapped properties.
- Query normalized fields for product behavior; use raw payloads for fidelity, audit, and debugging.

## Authentication Material

- Delegate Audible authentication to AudibleApi's supported local flow.
- Verso must not ask for or store the Audible password directly.
- Persist only the minimum local identity/session material needed for later refreshes.
- Treat expired or missing auth as a local re-authentication event.

## SQLite Baseline

- EF Core owns schema creation and migration history.
- Issue #3 startup must apply migrations to a clean SQLite database.
- Keep persistence logic in services; do not move refresh or import merge rules into entity classes.

## Issue #3 Import Rules

- A successful import persists Audible Items by ASIN.
- Import updates normalized current facts and raw payloads for existing ASINs.
- Contributor names are normalized into author and narrator roles for stable querying.
- Import requires a current Audible auth session; missing auth is an operation failure, not silent empty data.