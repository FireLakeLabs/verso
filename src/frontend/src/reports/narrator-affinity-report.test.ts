import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createNarratorAffinityReport } from "./narrator-affinity-report";

describe("narrator affinity report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./narrator-affinity-report.ts", import.meta.url),
    );
  });

  it("ranks narrators, exposes cross-author overlap, and preserves multi-narrator samples", () => {
    const report = createNarratorAffinityReport({
      items: [
        createItem({
          asin: "A1",
          authors: ["Author A"],
          narrators: ["Narrator One"],
          runtimeMinutes: 600,
          percentComplete: 100,
          purchaseDate: "2026-01-01",
          title: "Author A Solo",
        }),
        createItem({
          asin: "A2",
          authors: ["Author A"],
          narrators: ["Narrator One", "Narrator Two"],
          runtimeMinutes: 300,
          percentComplete: 35,
          purchaseDate: "2026-02-15",
          title: "Author A Duo",
        }),
        createItem({
          asin: "B1",
          authors: ["Author B"],
          narrators: ["Narrator One"],
          runtimeMinutes: 240,
          percentComplete: 0,
          purchaseDate: "2026-03-10",
          title: "Author B Solo",
        }),
        createItem({
          asin: "B2",
          authors: ["Author B"],
          narrators: ["Narrator Two"],
          runtimeMinutes: 180,
          percentComplete: 70,
          purchaseDate: "2026-04-10",
          title: "Author B Return",
        }),
        createItem({
          asin: "C1",
          authors: ["Author C"],
          narrators: ["Narrator Three", "Narrator Two"],
          runtimeMinutes: 120,
          percentComplete: 20,
          purchaseDate: "2026-05-12",
          title: "Author C Ensemble",
        }),
      ],
    });

    assert.deepEqual(
      report.rankedNarratorsByHours.map((entry) => ({
        narrator: entry.narrator,
        hours: entry.hours,
        count: entry.count,
        distinctAuthors: entry.distinctAuthors,
        multiNarratorTitleCount: entry.multiNarratorTitleCount,
      })),
      [
        {
          narrator: "Narrator One",
          hours: 19,
          count: 3,
          distinctAuthors: 2,
          multiNarratorTitleCount: 1,
        },
        {
          narrator: "Narrator Two",
          hours: 10,
          count: 3,
          distinctAuthors: 3,
          multiNarratorTitleCount: 2,
        },
        {
          narrator: "Narrator Three",
          hours: 2,
          count: 1,
          distinctAuthors: 1,
          multiNarratorTitleCount: 1,
        },
      ],
    );

    assert.equal(report.topFiveHoursShare, 1);
    assert.equal(report.multiAuthorNarratorCount, 2);

    assert.deepEqual(report.authorOverlapMatrix.authors, [
      "Author A",
      "Author B",
      "Author C",
    ]);
    assert.deepEqual(report.authorOverlapMatrix.narrators, [
      "Narrator One",
      "Narrator Two",
      "Narrator Three",
    ]);
    assert.deepEqual(report.authorOverlapMatrix.rows, [
      {
        narrator: "Narrator One",
        countsByAuthor: [2, 1, 0],
      },
      {
        narrator: "Narrator Two",
        countsByAuthor: [1, 1, 1],
      },
      {
        narrator: "Narrator Three",
        countsByAuthor: [0, 0, 1],
      },
    ]);

    assert.deepEqual(
      report.multiNarratorSamples.map((entry) => ({
        asin: entry.asin,
        narrators: entry.narrators,
        title: entry.title,
      })),
      [
        {
          asin: "C1",
          narrators: ["Narrator Three", "Narrator Two"],
          title: "Author C Ensemble",
        },
        {
          asin: "A2",
          narrators: ["Narrator One", "Narrator Two"],
          title: "Author A Duo",
        },
      ],
    );
  });
});

function createItem(
  overrides: Partial<LibraryItemDto> & {
    asin: string;
    authors: string[];
    narrators: string[];
    purchaseDate?: string;
  },
): LibraryItemDto {
  return {
    asin: overrides.asin,
    authors: overrides.authors,
    coverSeed: overrides.coverSeed,
    hasSnapshots: overrides.hasSnapshots ?? false,
    isNoLongerPresent: overrides.isNoLongerPresent ?? false,
    narrators: overrides.narrators,
    percentComplete: overrides.percentComplete ?? 0,
    rawAudiblePayload:
      overrides.rawAudiblePayload ??
      JSON.stringify({ purchase_date: overrides.purchaseDate ?? "2026-01-01" }),
    runtimeMinutes: overrides.runtimeMinutes ?? 0,
    title: overrides.title ?? overrides.asin,
  } satisfies LibraryItemDto;
}
