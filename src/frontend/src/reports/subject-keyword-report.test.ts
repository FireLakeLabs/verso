import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createSubjectKeywordReport } from "./subject-keyword-report";

describe("subject keyword report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./subject-keyword-report.ts", import.meta.url),
    );
  });

  it("weights imported Audible subject keywords across the library", () => {
    const report = createSubjectKeywordReport({
      items: [
        createLibraryItem({
          asin: "B00SPACE001",
          title: "Space Opera One",
          keywords: ["space opera", "fleet", "empire"],
          purchaseDate: "2023-01-10",
        }),
        createLibraryItem({
          asin: "B00SPACE002",
          title: "Space Opera Two",
          keywords: ["space opera", "fleet"],
          purchaseDate: "2023-08-17",
        }),
        createLibraryItem({
          asin: "B00HIST001",
          title: "History of Rome",
          keywords: ["history", "empire"],
          purchaseDate: "2024-03-05",
        }),
        createLibraryItem({
          asin: "B00MIXD001",
          title: "Empires in Space",
          keywords: ["history", "space opera", "empire"],
          purchaseDate: "2024-09-20",
        }),
      ],
    });

    assert.equal(report.uniqueKeywordCount, 4);
    assert.equal(report.maxItemCount, 3);
    assert.equal(report.medianKeywordsPerItem, 2.5);
    assert.deepEqual(report.keywords, [
      {
        keyword: "empire",
        itemCount: 3,
        weight: 1,
        asins: ["B00HIST001", "B00MIXD001", "B00SPACE001"],
      },
      {
        keyword: "space opera",
        itemCount: 3,
        weight: 1,
        asins: ["B00MIXD001", "B00SPACE001", "B00SPACE002"],
      },
      {
        keyword: "fleet",
        itemCount: 2,
        weight: 0.67,
        asins: ["B00SPACE001", "B00SPACE002"],
      },
      {
        keyword: "history",
        itemCount: 2,
        weight: 0.67,
        asins: ["B00HIST001", "B00MIXD001"],
      },
    ]);
    assert.deepEqual(report.purchaseYearSeries, [
      {
        keyword: "empire",
        buckets: [
          { year: 2023, itemCount: 1 },
          { year: 2024, itemCount: 2 },
        ],
      },
      {
        keyword: "space opera",
        buckets: [
          { year: 2023, itemCount: 2 },
          { year: 2024, itemCount: 1 },
        ],
      },
      {
        keyword: "fleet",
        buckets: [{ year: 2023, itemCount: 2 }],
      },
      {
        keyword: "history",
        buckets: [{ year: 2024, itemCount: 2 }],
      },
    ]);
  });
});

function createLibraryItem(input: {
  asin: string;
  title: string;
  keywords: readonly string[];
  purchaseDate: string;
}): LibraryItemDto {
  return {
    asin: input.asin,
    title: input.title,
    authors: [],
    narrators: [],
    runtimeMinutes: 0,
    percentComplete: 0,
    rawAudiblePayload: JSON.stringify({
      purchase_date: input.purchaseDate,
      thesaurus_subject_keywords: input.keywords,
    }),
    isNoLongerPresent: false,
    hasSnapshots: false,
  };
}
