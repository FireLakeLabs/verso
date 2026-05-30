import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { LibrarySummarySource } from "../reports/library-summary-report";

type ReportFixtureOverrides = Partial<LibrarySummarySource>;

export function createReportFixture(
  overrides: ReportFixtureOverrides = {},
): LibrarySummarySource {
  return {
    items:
      overrides.items?.map((item) => ({
        ...item,
        authors: [...item.authors],
        narrators: [...item.narrators],
      })) ?? [],
  };
}

export function expectReportTransformModule(moduleUrl: URL): void {
  const source = readFileSync(fileURLToPath(moduleUrl), "utf8");

  assert.doesNotMatch(source, /from\s+["']react(?:-dom)?["']/);
  assert.doesNotMatch(source, /from\s+["'][.]{1,2}\/components\//);
  assert.doesNotMatch(source, /jsx-runtime/);
}
