# ADR Decision Map

Use this map before changing Verso architecture. It groups the durable decisions in this directory by the kind of implementation work they guide.

## Product Boundary

- `0001-single-user-personal-library-companion.md`
- `0004-solid-v1-is-first-release-boundary.md`
- `0023-no-external-enrichments-in-solid-v1.md`
- `0027-private-by-default.md`
- `0031-defer-reading-journal-to-phase-2.md`
- `0032-defer-collections-to-phase-2.md`

## Runtime and Repository Shape

- `0005-sqlite-primary-database-for-solid-v1.md`
- `0006-local-on-demand-runtime-for-solid-v1.md`
- `0013-local-web-app-primary-interface.md`
- `0014-separate-local-frontend-and-backend-servers.md`
- `0015-vite-react-shadcn-frontend.md`
- `0016-aspnet-core-api-backend.md`
- `0038-simple-frontend-backend-monorepo.md`
- `0039-root-dev-orchestration.md`
- `0040-pnpm-and-just-for-local-development.md`

## Audible Library Data

- `0002-audible-facts-remain-source-of-truth.md`
- `0003-asin-identifies-audible-items.md`
- `0007-datapoints-use-best-available-source-data.md`
- `0008-current-facts-with-selective-snapshot-history.md`
- `0011-live-audibleapi-import-primary.md`
- `0012-delegate-audible-authentication-to-audibleapi-flow.md`
- `0033-preserve-current-facts-on-partial-refresh-failure.md`
- `0034-retain-items-missing-from-successful-refresh.md`
- `0035-ef-core-for-sqlite-persistence.md`
- `0036-store-raw-audible-payloads.md`
- `0037-selective-snapshot-fields.md`

## Curation and Backend Authority

- `0009-structured-smart-shelf-rules-for-solid-v1.md`
- `0020-backend-evaluates-smart-shelves.md`
- `0021-backend-evaluates-health-findings.md`
- `0029-limited-bulk-editing-for-solid-v1.md`
- `0030-dropped-marking-in-solid-v1.md`
- `0045-minimal-solid-v1-settings.md`

## API and Frontend Boundaries

- `0017-frontend-owns-ui-report-transforms.md`
- `0018-frontend-report-transforms-live-in-typescript-modules.md`
- `0019-rawish-api-for-frontend-transforms.md`
- `0041-explicit-api-dtos.md`
- `0042-no-formal-api-versioning-in-solid-v1.md`
- `0043-local-job-model-for-refresh-and-export.md`
- `0044-typed-user-facing-operation-errors.md`

## Reporting, Assets, and Exports

- `0010-export-fidelity-first.md`
- `0022-recharts-default-visualization-library.md`
- `0024-cache-cover-images-locally.md`
- `0025-defer-companion-pdf-caching.md`
- `0026-defer-archive-restore-workflow.md`
- `0028-library-overview-first-screen.md`