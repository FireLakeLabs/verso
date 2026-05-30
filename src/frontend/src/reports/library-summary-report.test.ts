import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeLibraryReport } from "./library-summary-report";
import {
  createReportFixture,
  expectReportTransformModule,
} from "../test/report-test-harness";

describe("library summary report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./library-summary-report.ts", import.meta.url),
    );
  });

  it("summarizes raw-ish Current Audible Facts data without rendering components", () => {
    const report = summarizeLibraryReport(
      createReportFixture({
        items: [
          {
            asin: "B00TEST123",
            title: "Project Hail Mary",
            authors: ["Andy Weir"],
            narrators: ["Ray Porter"],
            runtimeMinutes: 973,
            percentComplete: 100,
          },
          {
            asin: "B0EDGE0001",
            title: "The Long Way Home",
            authors: ["Author One", "Author Two"],
            narrators: ["Narrator One", "Narrator Two"],
            runtimeMinutes: 0,
            percentComplete: 135,
          },
        ],
      }),
    );

    assert.deepEqual(report, {
      totalItems: 2,
      totalRuntimeMinutes: 973,
      finishedItems: 2,
      anomalousCompletionItems: 1,
      distinctAuthors: 3,
      distinctNarrators: 3,
    });
  });
});
