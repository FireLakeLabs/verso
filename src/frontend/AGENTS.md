## Frontend technology conventions

This file adds Verso-specific frontend rules only. Reuse the APM-managed React package for generic React guidance and the repo's existing TypeScript/Tailwind config for the rest.

### Entry points

- Use `just frontend-dev`, `just frontend-typecheck`, `just frontend-test`, `just frontend-lint`, and `just frontend-smoke`.
- Use `just verify` for the full sensor suite.
- Do not introduce ad hoc `pnpm` commands in docs, scripts, or agent output when a `just` target already exists.

### Linting and formatting

- Linting is `oxlint`, not ESLint.
- Do not add ESLint config, ESLint plugins, or `eslint-disable` comments.
- Resolve lint findings in the code instead of suppressing them unless the repo already has an approved pattern.
- Formatting is Prettier via `pnpm --dir src/frontend format:check`; keep formatting fixes compatible with that command.

### Testing

- Unit and component tests run on the Node test runner through `tsx --test`; do not add Vitest or Jest.
- Keep test files in the existing `src/**/*.test.ts` pattern unless the repo establishes a new one.
- Browser smoke and e2e coverage use Playwright; prefer extending that layer over adding another browser test framework.

### TypeScript

- Preserve strict type-checking with `tsc --noEmit -p tsconfig.app.json`.
- Do not introduce `any`, broad `unknown` casts, or `@ts-ignore` escape hatches to get code through the compiler.
- Keep API/report transforms explicit and data-shape preserving; the frontend owns report shaping, but it should not guess missing backend data.

### Styling and UI composition

- Styling is Tailwind CSS 3.
- Compose conditional classes through the existing `cn()` helper in `src/lib/utils.ts`, which already wraps `clsx` and `tailwind-merge`.
- Use `lucide-react` for icons unless an existing screen already depends on another icon source.
- Reuse the local UI primitives under `src/components/ui` before introducing a new component pattern.

### Verso product constraints

- The frontend serves one local `Library Owner`; do not add multi-user auth, cloud account assumptions, or collaboration flows.
- Treat the Audible Library as private by default. Do not add third-party embeds, analytics exports, or remote sync assumptions for library data.
- Keep Audible Items and ASIN identity intact in client state and UI transforms; similar titles are not license to merge records.
- Reflection-style views should default to showing the real library state, including historical or dropped items when the product language says they belong.
