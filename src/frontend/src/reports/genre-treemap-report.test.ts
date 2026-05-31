import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import { createGenreTreemapReport } from "./genre-treemap-report";

describe("genre treemap report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./genre-treemap-report.ts", import.meta.url),
    );
  });

  it("aggregates imported Audible category ladders into hierarchy, treemap, and supporting rows", () => {
    const report = createGenreTreemapReport({
      items: [
        createLibraryItem({
          asin: "B00SPACE001",
          title: "Space Opera One",
          runtimeMinutes: 600,
          percentComplete: 96,
          categoryLadders: [["Fiction", "Science Fiction", "Space Opera"]],
        }),
        createLibraryItem({
          asin: "B00SPACE002",
          title: "Space Opera Two",
          runtimeMinutes: 360,
          percentComplete: 50,
          categoryLadders: [["Fiction", "Science Fiction", "Space Opera"]],
        }),
        createLibraryItem({
          asin: "B00MYST001",
          title: "Cozy Mystery",
          runtimeMinutes: 480,
          percentComplete: 100,
          categoryLadders: [["Fiction", "Mystery", "Cozy"]],
        }),
        createLibraryItem({
          asin: "B00HIST001",
          title: "History of Rome",
          runtimeMinutes: 240,
          percentComplete: 0,
          categoryLadders: [["Nonfiction", "History"]],
        }),
      ],
    });

    assert.equal(report.totalItems, 4);
    assert.equal(report.totalRuntimeMinutes, 1680);
    assert.deepEqual(
      report.hierarchy.children.map((node) => ({
        label: node.label,
        itemCount: node.itemCount,
        runtimeMinutes: node.runtimeMinutes,
        completedItems: node.completedItems,
      })),
      [
        {
          label: "Fiction",
          itemCount: 3,
          runtimeMinutes: 1440,
          completedItems: 2,
        },
        {
          label: "Nonfiction",
          itemCount: 1,
          runtimeMinutes: 240,
          completedItems: 0,
        },
      ],
    );
    assert.deepEqual(
      report.treemapNodes.map((node) => ({
        label: node.label,
        path: node.path,
        value: node.value,
        itemCount: node.itemCount,
      })),
      [
        {
          label: "Space Opera",
          path: ["Fiction", "Science Fiction", "Space Opera"],
          value: 960,
          itemCount: 2,
        },
        {
          label: "Cozy",
          path: ["Fiction", "Mystery", "Cozy"],
          value: 480,
          itemCount: 1,
        },
        {
          label: "History",
          path: ["Nonfiction", "History"],
          value: 240,
          itemCount: 1,
        },
      ],
    );
    assert.deepEqual(report.ladderRows, [
      {
        path: ["Fiction", "Science Fiction", "Space Opera"],
        pathLabel: "Fiction > Science Fiction > Space Opera",
        itemCount: 2,
        runtimeMinutes: 960,
        completedItems: 1,
        asins: ["B00SPACE001", "B00SPACE002"],
      },
      {
        path: ["Fiction", "Mystery", "Cozy"],
        pathLabel: "Fiction > Mystery > Cozy",
        itemCount: 1,
        runtimeMinutes: 480,
        completedItems: 1,
        asins: ["B00MYST001"],
      },
      {
        path: ["Nonfiction", "History"],
        pathLabel: "Nonfiction > History",
        itemCount: 1,
        runtimeMinutes: 240,
        completedItems: 0,
        asins: ["B00HIST001"],
      },
    ]);
  });
});

function createLibraryItem(input: {
  asin: string;
  title: string;
  runtimeMinutes: number;
  percentComplete: number;
  categoryLadders: readonly (readonly string[])[];
}): LibraryItemDto {
  return {
    asin: input.asin,
    title: input.title,
    authors: [],
    narrators: [],
    runtimeMinutes: input.runtimeMinutes,
    percentComplete: input.percentComplete,
    rawAudiblePayload: JSON.stringify({
      category_ladders: input.categoryLadders,
    }),
    isNoLongerPresent: false,
    hasSnapshots: false,
  };
}
