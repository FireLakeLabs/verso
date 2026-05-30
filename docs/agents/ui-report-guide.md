# UI / Report Guide

Frontend-owned report shaping for Solid v1 lives in plain TypeScript modules, not inside React components. This follows the decisions in the report-transform ADRs and keeps future Cadence, Genre, Author, Narrator, Cost, and Cover views testable from Node.

## Module boundary

- Report modules belong under `src/frontend/src/reports`.
- Report modules may import shared types and other report helpers.
- Report modules should not import `react`, `react-dom`, or local UI components.

## Test pattern

Each new report transform should usually add two checks:

- a behavior test over raw-ish source data;
- a lightweight architecture fitness check using `expectReportTransformModule(new URL("./module.ts", import.meta.url))`.

This keeps the frontend ownership boundary explicit: the backend supplies raw-ish data, while the frontend owns aggregation and presentation shaping.

## Root commands

Run report-transform tests through the root orchestration layer:

- `just frontend-test` for the focused frontend suite;
- `just verify` before review.