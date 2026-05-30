# Export and Privacy Guide

Use this guide with `CONTEXT.md`, `docs/adr/0010-export-fidelity-first.md`, `docs/adr/0024-cache-cover-images-locally.md`, `docs/adr/0025-defer-companion-pdf-caching.md`, and `docs/adr/0027-private-by-default.md` when changing Cached Assets, Archive Export, or public-sharing-adjacent behavior.

## Archive fidelity

- Archive Export is fidelity-first. Prefer preserving the Audible Fact shape plus explicit cached-asset metadata over flattening or rewriting asset history.
- Cached cover metadata should stay tied to the Audible Item ASIN and the source cover variant key where available.
- Export code may either embed cached cover files or reference them through stable cached-asset metadata, depending on the export option for that slice.

## Cached cover expectations

- Cover image source URLs remain Current Audible Facts even when a local Cached Asset exists.
- Cached cover metadata should include enough information for later export and UI work to find the local file without depending on the original remote URL.
- Cached Assets are private local state. Do not expose absolute local filesystem paths in API responses or export metadata.

## Privacy boundary

- Treat Cached Assets the same way as the rest of the Audible Library: private by default unless a later feature adds explicit Public Visibility controls.
- Export defaults should assume local, private use and avoid creating public links or remote dependencies.

## Companion PDFs

- Preserve companion PDF links as Audible Facts when Audible provides them.
- Do not download, cache, OCR, index, or export companion PDF files in Solid v1.
- PDF file handling belongs to the later PDF Companion Vault work, not cover caching or the initial archive/export slices.
