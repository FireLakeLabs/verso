import type { LibraryItemDto } from "../library-api";

const overlapMatrixLimit = 6;
const multiNarratorSampleLimit = 10;

export type NarratorAffinityReportSource = {
  items: readonly LibraryItemDto[];
};

export type NarratorAffinityEntry = {
  narrator: string;
  count: number;
  hours: number;
  runtimeMinutes: number;
  distinctAuthors: number;
  multiNarratorTitleCount: number;
  shareByHours: number;
};

export type NarratorOverlapMatrixRow = {
  narrator: string;
  countsByAuthor: readonly number[];
};

export type NarratorOverlapMatrix = {
  authors: readonly string[];
  narrators: readonly string[];
  rows: readonly NarratorOverlapMatrixRow[];
  maxCellCount: number;
};

export type MultiNarratorSample = {
  asin: string;
  title: string;
  narrators: readonly string[];
  runtimeMinutes: number;
  percentComplete: number;
  purchaseDate: string | null;
};

export type NarratorAffinityReport = {
  rankedNarratorsByHours: readonly NarratorAffinityEntry[];
  rankedNarratorsByCount: readonly NarratorAffinityEntry[];
  topFiveHoursShare: number;
  multiAuthorNarratorCount: number;
  authorOverlapMatrix: NarratorOverlapMatrix;
  multiNarratorSamples: readonly MultiNarratorSample[];
};

type MutableNarratorAggregate = {
  narrator: string;
  count: number;
  runtimeMinutes: number;
  authors: Set<string>;
  multiNarratorTitleCount: number;
};

type MutableAuthorAggregate = {
  author: string;
  count: number;
  runtimeMinutes: number;
};

export function createNarratorAffinityReport(
  source: NarratorAffinityReportSource,
): NarratorAffinityReport {
  const narrators = new Map<string, MutableNarratorAggregate>();
  const authors = new Map<string, MutableAuthorAggregate>();

  for (const item of source.items) {
    const normalizedAuthors = normalizeNames(item.authors);
    const normalizedNarrators = normalizeNames(item.narrators);
    const runtimeMinutes = Math.max(item.runtimeMinutes, 0);

    for (const author of normalizedAuthors) {
      const authorAggregate = authors.get(author) ?? {
        author,
        count: 0,
        runtimeMinutes: 0,
      };

      authorAggregate.count += 1;
      authorAggregate.runtimeMinutes += runtimeMinutes;
      authors.set(author, authorAggregate);
    }

    for (const narrator of normalizedNarrators) {
      const narratorAggregate = narrators.get(narrator) ?? {
        narrator,
        count: 0,
        runtimeMinutes: 0,
        authors: new Set<string>(),
        multiNarratorTitleCount: 0,
      };

      narratorAggregate.count += 1;
      narratorAggregate.runtimeMinutes += runtimeMinutes;
      narratorAggregate.multiNarratorTitleCount +=
        normalizedNarrators.length > 1 ? 1 : 0;

      for (const author of normalizedAuthors) {
        narratorAggregate.authors.add(author);
      }

      narrators.set(narrator, narratorAggregate);
    }
  }

  const rankedNarratorsByHours = rankNarrators(narrators, "hours");
  const rankedNarratorsByCount = rankNarrators(narrators, "count");
  const totalNarratedRuntimeMinutes = [...narrators.values()].reduce(
    (sum, narrator) => sum + narrator.runtimeMinutes,
    0,
  );
  const topFiveNarratedRuntimeMinutes = [...narrators.values()]
    .sort(
      (left, right) =>
        right.runtimeMinutes - left.runtimeMinutes ||
        right.count - left.count ||
        left.narrator.localeCompare(right.narrator),
    )
    .slice(0, 5)
    .reduce((sum, narrator) => sum + narrator.runtimeMinutes, 0);

  return {
    rankedNarratorsByHours,
    rankedNarratorsByCount,
    topFiveHoursShare: roundToTwo(
      Math.min(
        1,
        totalNarratedRuntimeMinutes === 0
          ? 0
          : topFiveNarratedRuntimeMinutes / totalNarratedRuntimeMinutes,
      ),
    ),
    multiAuthorNarratorCount: rankedNarratorsByHours.filter(
      (narrator) => narrator.distinctAuthors >= 2,
    ).length,
    authorOverlapMatrix: buildAuthorOverlapMatrix(
      source.items,
      authors,
      rankedNarratorsByHours,
    ),
    multiNarratorSamples: source.items
      .filter((item) => normalizeNames(item.narrators).length > 1)
      .map((item) => ({
        asin: item.asin,
        title: item.title,
        narrators: normalizeNames(item.narrators),
        runtimeMinutes: Math.max(item.runtimeMinutes, 0),
        percentComplete: item.percentComplete,
        purchaseDate: readPurchaseDate(item),
      }))
      .sort(compareMultiNarratorSamples)
      .slice(0, multiNarratorSampleLimit),
  };
}

function rankNarrators(
  narrators: Map<string, MutableNarratorAggregate>,
  mode: "hours" | "count",
): NarratorAffinityEntry[] {
  const sortedEntries = [...narrators.values()].sort((left, right) =>
    mode === "hours"
      ? right.runtimeMinutes - left.runtimeMinutes ||
        right.count - left.count ||
        left.narrator.localeCompare(right.narrator)
      : right.count - left.count ||
        right.runtimeMinutes - left.runtimeMinutes ||
        left.narrator.localeCompare(right.narrator),
  );
  const totalRuntimeMinutes = sortedEntries.reduce(
    (sum, narrator) => sum + narrator.runtimeMinutes,
    0,
  );

  return sortedEntries.map((entry) => ({
    narrator: entry.narrator,
    count: entry.count,
    hours: roundToTwo(entry.runtimeMinutes / 60),
    runtimeMinutes: entry.runtimeMinutes,
    distinctAuthors: entry.authors.size,
    multiNarratorTitleCount: entry.multiNarratorTitleCount,
    shareByHours:
      totalRuntimeMinutes === 0
        ? 0
        : roundToTwo(entry.runtimeMinutes / totalRuntimeMinutes),
  }));
}

function buildAuthorOverlapMatrix(
  items: readonly LibraryItemDto[],
  authors: Map<string, MutableAuthorAggregate>,
  rankedNarratorsByHours: readonly NarratorAffinityEntry[],
): NarratorOverlapMatrix {
  const topAuthors = [...authors.values()]
    .sort(
      (left, right) =>
        right.runtimeMinutes - left.runtimeMinutes ||
        right.count - left.count ||
        left.author.localeCompare(right.author),
    )
    .slice(0, overlapMatrixLimit)
    .map((entry) => entry.author);
  const topNarrators = rankedNarratorsByHours
    .slice(0, overlapMatrixLimit)
    .map((entry) => entry.narrator);

  let maxCellCount = 0;
  const rows = topNarrators.map((narrator) => {
    const countsByAuthor = topAuthors.map((author) => {
      const count = items.filter((item) => {
        const itemAuthors = normalizeNames(item.authors);
        const itemNarrators = normalizeNames(item.narrators);

        return itemAuthors.includes(author) && itemNarrators.includes(narrator);
      }).length;

      maxCellCount = Math.max(maxCellCount, count);
      return count;
    });

    return { narrator, countsByAuthor };
  });

  return {
    authors: topAuthors,
    narrators: topNarrators,
    rows,
    maxCellCount,
  };
}

function compareMultiNarratorSamples(
  left: MultiNarratorSample,
  right: MultiNarratorSample,
): number {
  const leftDate =
    left.purchaseDate === null ? 0 : Date.parse(left.purchaseDate);
  const rightDate =
    right.purchaseDate === null ? 0 : Date.parse(right.purchaseDate);

  return (
    rightDate - leftDate ||
    right.runtimeMinutes - left.runtimeMinutes ||
    left.title.localeCompare(right.title)
  );
}

function readPurchaseDate(item: LibraryItemDto): string | null {
  try {
    const metadata = JSON.parse(item.rawAudiblePayload) as {
      purchase_date?: string;
    };
    return metadata.purchase_date?.trim() || null;
  } catch {
    return null;
  }
}

function normalizeNames(names: readonly string[]): readonly string[] {
  return [
    ...new Set(
      names.map((name) => name.trim()).filter((name) => name.length > 0),
    ),
  ];
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
