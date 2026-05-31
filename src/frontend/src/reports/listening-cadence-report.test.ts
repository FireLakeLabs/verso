import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createListeningCadenceReport } from "./listening-cadence-report";

describe("listening cadence report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./listening-cadence-report.ts", import.meta.url),
    );
  });

  it("buckets 52 weeks of purchase cadence and rolls current completion into purchase cohorts", () => {
    const report = createListeningCadenceReport({
      items: [
        createItem({
          asin: "B00THISWEEK1",
          percentComplete: 100,
          purchaseDate: "2026-05-31",
        }),
        createItem({
          asin: "B00THISWEEK2",
          percentComplete: 20,
          purchaseDate: "2026-05-28",
        }),
        createItem({
          asin: "B00LASTWEEK",
          percentComplete: 0,
          purchaseDate: "2026-05-24",
        }),
        createItem({
          asin: "B00APRCOHORT",
          percentComplete: 95,
          purchaseDate: "2026-04-10",
        }),
        createItem({
          asin: "B00APRPROG",
          percentComplete: 94,
          purchaseDate: "2026-04-09",
        }),
        createItem({
          asin: "B00NODATE",
          percentComplete: 100,
          rawAudiblePayload: JSON.stringify({ series: { name: "No Date" } }),
        }),
      ],
      now: new Date("2026-05-31T12:00:00.000Z"),
    });

    assert.equal(report.totalPurchasesInRange, 5);
    assert.equal(report.activeWeeks, 3);
    assert.equal(report.busiestWeekPurchases, 2);
    assert.equal(report.maxCellPurchases, 1);

    assert.equal(report.weeklyTotals[44], 2);
    assert.equal(report.weeklyTotals[50], 1);
    assert.equal(report.weeklyTotals[51], 2);

    assert.equal(report.heatmap[44]?.[3]?.purchaseCount, 1);
    assert.equal(report.heatmap[44]?.[4]?.purchaseCount, 1);
    assert.equal(report.heatmap[50]?.[6]?.purchaseCount, 1);
    assert.equal(report.heatmap[51]?.[3]?.purchaseCount, 1);
    assert.equal(report.heatmap[51]?.[6]?.purchaseCount, 1);

    assert.deepEqual(
      report.cohorts.slice(-2).map((cohort) => ({
        completed: cohort.completedCount,
        inProgress: cohort.inProgressCount,
        label: cohort.label,
        total: cohort.totalCount,
        untouched: cohort.untouchedCount,
      })),
      [
        {
          completed: 1,
          inProgress: 1,
          label: "Apr",
          total: 2,
          untouched: 0,
        },
        {
          completed: 1,
          inProgress: 1,
          label: "May",
          total: 3,
          untouched: 1,
        },
      ],
    );
  });
});

function createItem(
  overrides: Partial<LibraryItemDto> & { asin: string; purchaseDate?: string },
): LibraryItemDto {
  const rawPayload =
    overrides.rawAudiblePayload ??
    JSON.stringify({
      purchase_date: overrides.purchaseDate,
      series: { name: "Test Series" },
    });

  return {
    asin: overrides.asin,
    authors: overrides.authors ?? ["Test Author"],
    coverSeed: overrides.coverSeed,
    hasSnapshots: overrides.hasSnapshots ?? false,
    isNoLongerPresent: overrides.isNoLongerPresent ?? false,
    narrators: overrides.narrators ?? ["Test Narrator"],
    percentComplete: overrides.percentComplete ?? 0,
    rawAudiblePayload: rawPayload,
    runtimeMinutes: overrides.runtimeMinutes ?? 600,
    title: overrides.title ?? overrides.asin,
  };
}
