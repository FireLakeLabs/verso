import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import {
  createLibraryScreenReport,
  formatCompletion,
  formatRuntimeMinutes,
} from "./library-screen-report";

describe("library screen report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./library-screen-report.ts", import.meta.url),
    );
  });

  it("chooses a visible active item and reports retained selection counts", () => {
    const items: LibraryItemDto[] = [
      {
        asin: "B00FIRST123",
        title: "Project Hail Mary",
        authors: ["Andy Weir"],
        narrators: ["Ray Porter"],
        runtimeMinutes: 973,
        percentComplete: 100,
        rawAudiblePayload: '{"asin":"B00FIRST123"}',
        isNoLongerPresent: false,
        hasSnapshots: true,
      },
      {
        asin: "B00SECOND45",
        title: "The Long Way Home",
        authors: [],
        narrators: ["Narrator One"],
        runtimeMinutes: 135,
        percentComplete: 45,
        rawAudiblePayload: '{"asin":"B00SECOND45"}',
        isNoLongerPresent: true,
        hasSnapshots: false,
      },
    ];

    const report = createLibraryScreenReport({
      items,
      selectedAsins: ["B00SECOND45", "MISSING-ASIN"],
      activeAsin: "MISSING-ASIN",
    });

    assert.equal(report.activeAsin, "B00FIRST123");
    assert.equal(report.selectedCount, 1);
    assert.equal(report.presentItemCount, 1);
    assert.equal(report.noLongerPresentItemCount, 1);
    assert.deepEqual(report.rows[1], {
      asin: "B00SECOND45",
      title: "The Long Way Home",
      authorsLabel: "Unknown",
      narratorsLabel: "Narrator One",
      runtimeLabel: "2h 15m",
      completionLabel: "45% in progress",
      presenceLabel: "No longer present",
      isNoLongerPresent: true,
      isSelected: true,
      hasSnapshots: false,
    });
  });

  it("formats completion and runtime labels for edge cases", () => {
    assert.equal(formatRuntimeMinutes(0), "0m");
    assert.equal(formatRuntimeMinutes(60), "1h");
    assert.equal(formatRuntimeMinutes(61), "1h 1m");
    assert.equal(formatCompletion(0), "Not started");
    assert.equal(formatCompletion(100), "100% complete");
    assert.equal(formatCompletion(120), "120% (check)");
  });
});
