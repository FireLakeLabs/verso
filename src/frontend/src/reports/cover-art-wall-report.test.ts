import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LibraryItemDto } from "../library-api";
import { expectReportTransformModule } from "../test/report-test-harness";
import {
  createCoverArtWallReport,
  type CoverArtWallOrder,
} from "./cover-art-wall-report";

describe("cover art wall report", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(
      new URL("./cover-art-wall-report.ts", import.meta.url),
    );
  });

  it("sorts the wall by the approved local orderings", () => {
    const items = [
      createItem({
        asin: "B003",
        title: "Blue Horizon",
        purchaseDate: "2026-02-10",
        runtimeMinutes: 300,
        sourceUrl: "https://images.audible.test/blue.jpg",
      }),
      createItem({
        asin: "B001",
        title: "Amber Signal",
        purchaseDate: "2026-02-10",
        runtimeMinutes: 900,
        sourceUrl: "https://images.audible.test/amber.jpg",
      }),
      createItem({
        asin: "B002",
        title: "Cinder Archive",
        purchaseDate: "2025-12-20",
        runtimeMinutes: 120,
        sourceUrl: "https://images.audible.test/cinder.jpg",
      }),
    ];

    assert.deepEqual(asinsFor(items, "recent"), ["B003", "B001", "B002"]);
    assert.deepEqual(asinsFor(items, "runtime"), ["B001", "B003", "B002"]);
    assert.deepEqual(
      asinsFor(items, "palette"),
      [...items]
        .sort((left, right) =>
          `${left.coverImages?.[0]?.sourceUrl ?? ""}${left.asin}`.localeCompare(
            `${right.coverImages?.[0]?.sourceUrl ?? ""}${right.asin}`,
          ),
        )
        .map((item) => item.asin),
    );
    assert.deepEqual(
      asinsFor(items, "random"),
      [...items]
        .sort((left, right) =>
          `${left.asin}${left.title}`.localeCompare(
            `${right.asin}${right.title}`,
          ),
        )
        .map((item) => item.asin),
    );
  });

  it("uses cached cover assets and falls back without remote image dependency", () => {
    const report = createCoverArtWallReport({
      order: "recent",
      items: [
        createItem({
          asin: "B001",
          cachedAssetUrl: "/api/library/items/B001/cover-images/500",
          sourceUrl: "https://images.audible.test/remote-only.jpg",
        }),
        createItem({
          asin: "B002",
          sourceUrl: "https://images.audible.test/missing-cache.jpg",
        }),
        createItem({
          asin: "B003",
          coverImages: [],
        }),
      ],
    });

    assert.equal(report.cachedCoverCount, 1);
    assert.equal(report.missingCoverCount, 2);
    assert.deepEqual(
      report.entries.map((entry) => entry.cover),
      [
        {
          alt: "Cover art for B001",
          cachedAtUtc: "2026-01-02T03:04:05.000Z",
          kind: "cached",
          sourceUrl: "https://images.audible.test/remote-only.jpg",
          url: "/api/library/items/B001/cover-images/500",
          variant: "500",
        },
        {
          alt: "Missing cover art for B002",
          kind: "placeholder",
          sourceUrl: "https://images.audible.test/missing-cache.jpg",
          variant: "500",
        },
        {
          alt: "Missing cover art for B003",
          kind: "placeholder",
        },
      ],
    );
  });
});

function asinsFor(
  items: readonly LibraryItemDto[],
  order: CoverArtWallOrder,
): string[] {
  return createCoverArtWallReport({ items, order }).entries.map(
    (entry) => entry.asin,
  );
}

function createItem({
  asin,
  cachedAssetUrl,
  coverImages,
  purchaseDate = "2026-01-01",
  runtimeMinutes = 60,
  sourceUrl,
  title = asin,
}: {
  asin: string;
  cachedAssetUrl?: string;
  coverImages?: LibraryItemDto["coverImages"];
  purchaseDate?: string;
  runtimeMinutes?: number;
  sourceUrl?: string;
  title?: string;
}): LibraryItemDto {
  return {
    asin,
    authors: ["Test Author"],
    coverImages:
      coverImages ??
      (sourceUrl
        ? [
            {
              cachedAsset: cachedAssetUrl
                ? {
                    cachedAtUtc: "2026-01-02T03:04:05.000Z",
                    contentType: "image/jpeg",
                    sizeBytes: 123,
                    url: cachedAssetUrl,
                  }
                : null,
              sourceUrl,
              variant: "500",
            },
          ]
        : undefined),
    hasSnapshots: false,
    isNoLongerPresent: false,
    narrators: ["Test Narrator"],
    percentComplete: 0,
    rawAudiblePayload: JSON.stringify({ purchase_date: purchaseDate }),
    runtimeMinutes,
    title,
  };
}
