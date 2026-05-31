import type { LibraryItemDto } from "../library-api";

export type AuthorConcentrationReportSource = {
  items: readonly LibraryItemDto[];
};

export type AuthorConcentrationEntry = {
  author: string;
  count: number;
  hours: number;
  runtimeMinutes: number;
  share: number;
  cumulativeShare: number;
};

export type AuthorConcentrationThresholds = {
  authorsToHalf: number;
  authorsToEighty: number;
  topFiveShare: number;
  topTenShare: number;
};

export type AuthorConcentrationReport = {
  totalDistinctAuthors: number;
  totalItems: number;
  rankedByHours: readonly AuthorConcentrationEntry[];
  rankedByCount: readonly AuthorConcentrationEntry[];
  thresholdsByHours: AuthorConcentrationThresholds;
  thresholdsByCount: AuthorConcentrationThresholds;
};

type MutableAuthorAggregate = {
  author: string;
  count: number;
  runtimeMinutes: number;
};

export function createAuthorConcentrationReport(
  source: AuthorConcentrationReportSource,
): AuthorConcentrationReport {
  const aggregates = new Map<string, MutableAuthorAggregate>();

  for (const item of source.items) {
    for (const author of normalizeNames(item.authors)) {
      const aggregate = aggregates.get(author) ?? {
        author,
        count: 0,
        runtimeMinutes: 0,
      };

      aggregate.count += 1;
      aggregate.runtimeMinutes += Math.max(item.runtimeMinutes, 0);
      aggregates.set(author, aggregate);
    }
  }

  const authorEntries = [...aggregates.values()];

  return {
    totalDistinctAuthors: authorEntries.length,
    totalItems: source.items.length,
    rankedByHours: toRankedEntries(authorEntries, "hours"),
    rankedByCount: toRankedEntries(authorEntries, "count"),
    thresholdsByHours: summarizeThresholds(
      toRankedEntries(authorEntries, "hours"),
    ),
    thresholdsByCount: summarizeThresholds(
      toRankedEntries(authorEntries, "count"),
    ),
  };
}

function toRankedEntries(
  entries: readonly MutableAuthorAggregate[],
  mode: "hours" | "count",
): AuthorConcentrationEntry[] {
  const sortedEntries = [...entries].sort((left, right) =>
    mode === "hours"
      ? right.runtimeMinutes - left.runtimeMinutes ||
        right.count - left.count ||
        left.author.localeCompare(right.author)
      : right.count - left.count ||
        right.runtimeMinutes - left.runtimeMinutes ||
        left.author.localeCompare(right.author),
  );
  const total = sortedEntries.reduce(
    (sum, entry) =>
      sum + (mode === "hours" ? entry.runtimeMinutes : entry.count),
    0,
  );

  let cumulativeShare = 0;

  return sortedEntries.map((entry) => {
    const value = mode === "hours" ? entry.runtimeMinutes : entry.count;
    const rawShare = total === 0 ? 0 : value / total;
    const share = roundToTwo(rawShare);

    cumulativeShare = total === 0 ? 0 : cumulativeShare + rawShare;

    return {
      author: entry.author,
      count: entry.count,
      hours: roundToTwo(entry.runtimeMinutes / 60),
      runtimeMinutes: entry.runtimeMinutes,
      share,
      cumulativeShare: roundToTwo(cumulativeShare),
    };
  });
}

function summarizeThresholds(
  entries: readonly AuthorConcentrationEntry[],
): AuthorConcentrationThresholds {
  const authorsToHalf = findThreshold(entries, 0.5);
  const authorsToEighty = findThreshold(entries, 0.8);

  return {
    authorsToHalf,
    authorsToEighty,
    topFiveShare: roundToTwo(Math.min(1, sumShare(entries.slice(0, 5)))),
    topTenShare: roundToTwo(Math.min(1, sumShare(entries.slice(0, 10)))),
  };
}

function findThreshold(
  entries: readonly AuthorConcentrationEntry[],
  threshold: number,
): number {
  const index = entries.findIndex(
    (entry) => entry.cumulativeShare >= threshold,
  );

  return index === -1 ? 0 : index + 1;
}

function sumShare(entries: readonly AuthorConcentrationEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.share, 0);
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
