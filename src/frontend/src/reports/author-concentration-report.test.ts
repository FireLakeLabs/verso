import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createAuthorConcentrationReport } from "./author-concentration-report";

describe("author concentration report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./author-concentration-report.ts", import.meta.url),
    );
  });

  it("ranks authors by hours and count while exposing concentration thresholds", () => {
    const report = createAuthorConcentrationReport({
      items: [
        createItem({ asin: "A1", authors: ["Author A"], runtimeMinutes: 600 }),
        createItem({ asin: "A2", authors: ["Author A"], runtimeMinutes: 300 }),
        createItem({ asin: "B1", authors: ["Author B"], runtimeMinutes: 360 }),
        createItem({ asin: "C1", authors: ["Author C"], runtimeMinutes: 180 }),
        createItem({ asin: "D1", authors: ["Author D"], runtimeMinutes: 120 }),
        createItem({ asin: "E1", authors: ["Author E"], runtimeMinutes: 60 }),
      ],
    });

    assert.equal(report.totalDistinctAuthors, 5);
    assert.equal(report.totalItems, 6);

    assert.deepEqual(
      report.rankedByHours.slice(0, 3).map((entry) => ({
        author: entry.author,
        count: entry.count,
        hours: entry.hours,
        share: entry.share,
        cumulativeShare: entry.cumulativeShare,
      })),
      [
        {
          author: "Author A",
          count: 2,
          hours: 15,
          share: 0.56,
          cumulativeShare: 0.56,
        },
        {
          author: "Author B",
          count: 1,
          hours: 6,
          share: 0.22,
          cumulativeShare: 0.78,
        },
        {
          author: "Author C",
          count: 1,
          hours: 3,
          share: 0.11,
          cumulativeShare: 0.89,
        },
      ],
    );

    assert.deepEqual(
      report.rankedByCount.map((entry) => ({
        author: entry.author,
        count: entry.count,
        cumulativeShare: entry.cumulativeShare,
      })),
      [
        { author: "Author A", count: 2, cumulativeShare: 0.33 },
        { author: "Author B", count: 1, cumulativeShare: 0.5 },
        { author: "Author C", count: 1, cumulativeShare: 0.67 },
        { author: "Author D", count: 1, cumulativeShare: 0.83 },
        { author: "Author E", count: 1, cumulativeShare: 1 },
      ],
    );

    assert.deepEqual(report.thresholdsByHours, {
      authorsToHalf: 1,
      authorsToEighty: 3,
      topFiveShare: 1,
      topTenShare: 1,
    });

    assert.deepEqual(report.thresholdsByCount, {
      authorsToHalf: 2,
      authorsToEighty: 4,
      topFiveShare: 1,
      topTenShare: 1,
    });
  });
});

function createItem(
  overrides: Partial<LibraryItemDto> & { asin: string; authors: string[] },
): LibraryItemDto {
  return {
    asin: overrides.asin,
    authors: overrides.authors,
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
