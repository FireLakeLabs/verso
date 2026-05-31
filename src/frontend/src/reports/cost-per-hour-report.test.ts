import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto, SettingsResponse } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createCostPerHourReport } from "./cost-per-hour-report";

describe("cost per hour report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./cost-per-hour-report.ts", import.meta.url),
    );
  });

  it("defaults to configured per-credit value and ranks value by cost per hour", () => {
    const report = createCostPerHourReport({
      items: [
        createItem({ asin: "B00A", runtimeMinutes: 600, title: "Long Listen" }),
        createItem({
          asin: "B00B",
          runtimeMinutes: 120,
          title: "Short Listen",
        }),
        createItem({ asin: "B00C", runtimeMinutes: 300, title: "Mid Listen" }),
      ],
      settings: createSettings({
        defaultBasis: "per-credit-value",
        perCreditValue: 15,
      }),
    });

    assert.equal(report.selectedBasis, "per-credit-value");
    assert.equal(report.basisLabel, "Per-credit value");
    assert.equal(report.currencyCode, "USD");
    assert.equal(report.knownCostItemCount, 3);
    assert.equal(report.missingCostItems.length, 0);
    assert.deepEqual(
      report.bestValueItems.map((item) => [item.asin, item.costPerHour]),
      [
        ["B00A", 1.5],
        ["B00C", 3],
        ["B00B", 7.5],
      ],
    );
    assert.deepEqual(
      report.highCostShortList.map((item) => [item.asin, item.costPerHour]),
      [
        ["B00B", 7.5],
        ["B00C", 3],
        ["B00A", 1.5],
      ],
    );
    assert.deepEqual(
      report.chartPoints.map((point) => ({
        asin: point.asin,
        cost: point.cost,
        costPerHour: point.costPerHour,
        runtimeHours: point.runtimeHours,
      })),
      [
        { asin: "B00B", cost: 15, costPerHour: 7.5, runtimeHours: 2 },
        { asin: "B00C", cost: 15, costPerHour: 3, runtimeHours: 5 },
        { asin: "B00A", cost: 15, costPerHour: 1.5, runtimeHours: 10 },
      ],
    );
  });

  it("can toggle to imported list price without guessing missing prices", () => {
    const report = createCostPerHourReport({
      items: [
        createItem({
          asin: "B00A",
          listPriceAmount: 30,
          runtimeMinutes: 600,
          title: "Known Price",
        }),
        createItem({
          asin: "B00B",
          listPriceAmount: 12.5,
          runtimeMinutes: 150,
          title: "Short Known Price",
        }),
        createItem({
          asin: "B00C",
          listPriceAmount: null,
          runtimeMinutes: 300,
          title: "Missing Price",
        }),
      ],
      selectedBasis: "list-price",
      settings: createSettings({
        defaultBasis: "per-credit-value",
        perCreditValue: 15,
      }),
    });

    assert.equal(report.selectedBasis, "list-price");
    assert.equal(report.basisLabel, "List price");
    assert.equal(report.knownCostItemCount, 2);
    assert.deepEqual(
      report.bestValueItems.map((item) => [item.asin, item.costPerHour]),
      [
        ["B00A", 3],
        ["B00B", 5],
      ],
    );
    assert.deepEqual(report.missingCostItems, [
      {
        asin: "B00C",
        reason: "missing-list-price",
        title: "Missing Price",
      },
    ]);
  });

  it("keeps invalid runtime and malformed cost datapoints out of calculations", () => {
    const report = createCostPerHourReport({
      items: [
        createItem({ asin: "B00A", listPriceAmount: 18, runtimeMinutes: 0 }),
        createItem({
          asin: "B00B",
          rawAudiblePayload: "{not-json",
          runtimeMinutes: 360,
        }),
        createItem({ asin: "B00C", listPriceAmount: 24, runtimeMinutes: 480 }),
      ],
      selectedBasis: "list-price",
      settings: createSettings({
        defaultBasis: "list-price",
        perCreditValue: 15,
      }),
    });

    assert.deepEqual(
      report.chartPoints.map((point) => point.asin),
      ["B00C"],
    );
    assert.deepEqual(report.missingCostItems, [
      { asin: "B00A", reason: "missing-runtime", title: "B00A" },
      { asin: "B00B", reason: "missing-list-price", title: "B00B" },
    ]);
  });
});

function createItem(
  overrides: Partial<LibraryItemDto> & {
    asin: string;
    listPriceAmount?: number | null;
  },
) {
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
      JSON.stringify({
        price: {
          amount: overrides.listPriceAmount ?? null,
          currency_code: "USD",
        },
      }),
    runtimeMinutes: overrides.runtimeMinutes ?? 0,
    title: overrides.title ?? overrides.asin,
  } satisfies LibraryItemDto;
}

function createSettings(
  overrides: Partial<SettingsResponse["costBasis"]> = {},
): SettingsResponse["costBasis"] {
  return {
    currencyCode: overrides.currencyCode ?? "USD",
    defaultBasis: overrides.defaultBasis ?? "per-credit-value",
    perCreditValue: overrides.perCreditValue ?? 14.95,
  };
}
