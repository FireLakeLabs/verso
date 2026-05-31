import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createRuntimeDistributionReport } from "./runtime-distribution-report";

describe("runtime distribution report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./runtime-distribution-report.ts", import.meta.url),
    );
  });

  it("bins runtimes and exposes summary markers plus outlier tables", () => {
    const report = createRuntimeDistributionReport({
      items: [
        createItem({ asin: "B00A", runtimeMinutes: 30, percentComplete: 0 }),
        createItem({ asin: "B00B", runtimeMinutes: 89, percentComplete: 10 }),
        createItem({ asin: "B00C", runtimeMinutes: 90, percentComplete: 20 }),
        createItem({ asin: "B00D", runtimeMinutes: 91, percentComplete: 30 }),
        createItem({ asin: "B00E", runtimeMinutes: 240, percentComplete: 40 }),
        createItem({ asin: "B00F", runtimeMinutes: 1440, percentComplete: 50 }),
        createItem({ asin: "B00G", runtimeMinutes: 1441, percentComplete: 60 }),
      ],
    });

    assert.equal(report.binSizeMinutes, 90);
    assert.equal(report.maxBinCount, 2);
    assert.deepEqual(
      report.bins.slice(0, 4).map((bin) => bin.itemCount),
      [2, 2, 1, 0],
    );

    assert.deepEqual(report.markers, {
      meanMinutes: 488.7142857142857,
      medianMinutes: 91,
      p90Minutes: 1441,
    });

    assert.deepEqual(
      report.longOutliers.map((entry) => entry.asin),
      ["B00G", "B00F"],
    );
    assert.deepEqual(
      report.shortOutliers.map((entry) => entry.asin),
      ["B00A", "B00B", "B00C", "B00D"],
    );
  });

  it("leaves markers null when no runtime datapoints exist", () => {
    const report = createRuntimeDistributionReport({ items: [] });

    assert.deepEqual(report.markers, {
      meanMinutes: null,
      medianMinutes: null,
      p90Minutes: null,
    });
    assert.equal(report.maxBinCount, 0);
    assert.equal(report.longOutliers.length, 0);
    assert.equal(report.shortOutliers.length, 0);
  });
});

function createItem(overrides: Partial<LibraryItemDto> & { asin: string }) {
  return {
    asin: overrides.asin,
    authors: overrides.authors ?? ["Test Author"],
    coverSeed: overrides.coverSeed,
    hasSnapshots: overrides.hasSnapshots ?? false,
    isNoLongerPresent: overrides.isNoLongerPresent ?? false,
    narrators: overrides.narrators ?? ["Test Narrator"],
    percentComplete: overrides.percentComplete ?? 0,
    rawAudiblePayload:
      overrides.rawAudiblePayload ??
      JSON.stringify({ purchase_date: "2026-01-01" }),
    runtimeMinutes: overrides.runtimeMinutes ?? 0,
    title: overrides.title ?? overrides.asin,
  } satisfies LibraryItemDto;
}
