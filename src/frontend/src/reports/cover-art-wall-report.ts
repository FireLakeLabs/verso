import type { LibraryItemCoverImageDto, LibraryItemDto } from "../library-api";

export type CoverArtWallOrder = "recent" | "runtime" | "palette" | "random";

export type CoverArtWallCachedCover = {
  alt: string;
  cachedAtUtc: string;
  kind: "cached";
  sourceUrl: string;
  url: string;
  variant: string;
};

export type CoverArtWallPlaceholderCover = {
  alt: string;
  kind: "placeholder";
  sourceUrl?: string;
  variant?: string;
};

export type CoverArtWallCover =
  | CoverArtWallCachedCover
  | CoverArtWallPlaceholderCover;

export type CoverArtWallEntry = {
  asin: string;
  authors: readonly string[];
  cover: CoverArtWallCover;
  paletteKey: string;
  percentComplete: number;
  purchaseDateUtc: string | null;
  randomKey: string;
  runtimeMinutes: number;
  title: string;
};

export type CoverArtWallReport = {
  cachedCoverCount: number;
  entries: readonly CoverArtWallEntry[];
  missingCoverCount: number;
  order: CoverArtWallOrder;
  totalCount: number;
};

export type CoverArtWallReportSource = {
  items: readonly LibraryItemDto[];
  order?: CoverArtWallOrder;
};

export function createCoverArtWallReport(
  source: CoverArtWallReportSource,
): CoverArtWallReport {
  const order = source.order ?? "recent";
  const entries = source.items
    .map(toCoverWallEntry)
    .sort(createEntryComparer(order));
  const cachedCoverCount = entries.filter(
    (entry) => entry.cover.kind === "cached",
  ).length;

  return {
    cachedCoverCount,
    entries,
    missingCoverCount: entries.length - cachedCoverCount,
    order,
    totalCount: entries.length,
  };
}

function toCoverWallEntry(item: LibraryItemDto): CoverArtWallEntry {
  const coverImage = selectCoverImage(item.coverImages);
  const cachedAsset = coverImage?.cachedAsset ?? null;
  const title = item.title || item.asin;
  const sourceUrl = coverImage?.sourceUrl;
  const variant = coverImage?.variant;

  return {
    asin: item.asin,
    authors: item.authors,
    cover: cachedAsset
      ? {
          alt: `Cover art for ${title}`,
          cachedAtUtc: cachedAsset.cachedAtUtc,
          kind: "cached",
          sourceUrl: sourceUrl ?? "",
          url: cachedAsset.url,
          variant: variant ?? "",
        }
      : {
          alt: `Missing cover art for ${title}`,
          kind: "placeholder",
          ...(sourceUrl ? { sourceUrl } : {}),
          ...(variant ? { variant } : {}),
        },
    paletteKey: `${sourceUrl ?? ""}${item.asin}`,
    percentComplete: item.percentComplete,
    purchaseDateUtc: readPurchaseDateUtc(item.rawAudiblePayload),
    randomKey: `${item.asin}${title}`,
    runtimeMinutes: Math.max(0, item.runtimeMinutes),
    title,
  };
}

function createEntryComparer(order: CoverArtWallOrder) {
  return (left: CoverArtWallEntry, right: CoverArtWallEntry) => {
    if (order === "recent") {
      return compareNullableDateDescending(
        left.purchaseDateUtc,
        right.purchaseDateUtc,
      );
    }

    if (order === "runtime") {
      return (
        right.runtimeMinutes - left.runtimeMinutes || compareTitle(left, right)
      );
    }

    if (order === "palette") {
      return (
        left.paletteKey.localeCompare(right.paletteKey) ||
        compareTitle(left, right)
      );
    }

    return (
      left.randomKey.localeCompare(right.randomKey) || compareTitle(left, right)
    );
  };
}

function compareNullableDateDescending(
  left: string | null,
  right: string | null,
) {
  const leftTime = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;

  return rightTime - leftTime;
}

function compareTitle(left: CoverArtWallEntry, right: CoverArtWallEntry) {
  return (
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
    left.asin.localeCompare(right.asin)
  );
}

function selectCoverImage(
  coverImages: LibraryItemDto["coverImages"],
): LibraryItemCoverImageDto | null {
  if (!coverImages || coverImages.length === 0) {
    return null;
  }

  return (
    [...coverImages]
      .sort((left, right) => compareCoverVariant(right.variant, left.variant))
      .find((coverImage) => coverImage.cachedAsset !== null) ?? coverImages[0]!
  );
}

function compareCoverVariant(left: string, right: string) {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function readPurchaseDateUtc(rawAudiblePayload: string): string | null {
  try {
    const payload = JSON.parse(rawAudiblePayload) as Record<string, unknown>;
    const value =
      readString(payload.purchase_date) ??
      readString(payload.purchaseDate) ??
      readString(payload.purchaseDateUtc) ??
      readString(payload.date_added);

    return value && !Number.isNaN(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
