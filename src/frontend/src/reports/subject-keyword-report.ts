import type { LibraryItemDto } from "../library-api";

export type SubjectKeywordReportSource = {
  items: readonly LibraryItemDto[];
};

export type WeightedSubjectKeyword = {
  keyword: string;
  itemCount: number;
  weight: number;
  asins: readonly string[];
};

export type SubjectKeywordYearBucket = {
  year: number;
  itemCount: number;
};

export type SubjectKeywordYearSeries = {
  keyword: string;
  buckets: readonly SubjectKeywordYearBucket[];
};

export type SubjectKeywordReport = {
  uniqueKeywordCount: number;
  maxItemCount: number;
  medianKeywordsPerItem: number;
  keywords: readonly WeightedSubjectKeyword[];
  purchaseYearSeries: readonly SubjectKeywordYearSeries[];
};

type KeywordAccumulator = {
  asins: Set<string>;
  itemCount: number;
  keyword: string;
  years: Map<number, number>;
};

type RawAudibleMetadata = {
  purchase_date?: string;
  thesaurus_subject_keywords?: readonly string[];
};

export function createSubjectKeywordReport(
  source: SubjectKeywordReportSource,
): SubjectKeywordReport {
  const keywords = new Map<string, KeywordAccumulator>();
  const keywordsPerItem: number[] = [];

  for (const item of source.items) {
    const metadata = readRawAudibleMetadata(item);
    const year = readPurchaseYear(metadata?.purchase_date);
    const itemKeywords = [...new Set(readKeywords(metadata))];

    keywordsPerItem.push(itemKeywords.length);

    for (const keyword of itemKeywords) {
      const accumulator = keywords.get(keyword) ?? {
        asins: new Set<string>(),
        itemCount: 0,
        keyword,
        years: new Map<number, number>(),
      };

      accumulator.itemCount += 1;
      accumulator.asins.add(item.asin);

      if (year !== null) {
        accumulator.years.set(year, (accumulator.years.get(year) ?? 0) + 1);
      }

      keywords.set(keyword, accumulator);
    }
  }

  const maxItemCount = Math.max(
    0,
    ...[...keywords.values()].map((entry) => entry.itemCount),
  );
  const weightedKeywords = [...keywords.values()]
    .sort(compareKeywordAccumulators)
    .map((entry) => ({
      keyword: entry.keyword,
      itemCount: entry.itemCount,
      weight:
        maxItemCount === 0 ? 0 : roundToTwo(entry.itemCount / maxItemCount),
      asins: [...entry.asins].sort((left, right) => left.localeCompare(right)),
    }));

  return {
    uniqueKeywordCount: weightedKeywords.length,
    maxItemCount,
    medianKeywordsPerItem: calculateMedian(keywordsPerItem),
    keywords: weightedKeywords,
    purchaseYearSeries: [...keywords.values()]
      .sort(compareKeywordAccumulators)
      .map((entry) => ({
        keyword: entry.keyword,
        buckets: [...entry.years.entries()]
          .sort((left, right) => left[0] - right[0])
          .map(([year, itemCount]) => ({ year, itemCount })),
      })),
  };
}

function compareKeywordAccumulators(
  left: KeywordAccumulator,
  right: KeywordAccumulator,
): number {
  return (
    right.itemCount - left.itemCount ||
    left.keyword.localeCompare(right.keyword)
  );
}

function readKeywords(metadata: RawAudibleMetadata | null): readonly string[] {
  return (
    metadata?.thesaurus_subject_keywords
      ?.map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0) ?? []
  );
}

function readPurchaseYear(purchaseDate: string | undefined): number | null {
  if (!purchaseDate) {
    return null;
  }

  const parsedDate = new Date(`${purchaseDate}T12:00:00Z`);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate.getUTCFullYear();
}

function readRawAudibleMetadata(
  item: LibraryItemDto,
): RawAudibleMetadata | null {
  try {
    return JSON.parse(item.rawAudiblePayload) as RawAudibleMetadata;
  } catch {
    return null;
  }
}

function calculateMedian(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[midpoint] ?? 0;
  }

  return (
    ((sortedValues[midpoint - 1] ?? 0) + (sortedValues[midpoint] ?? 0)) / 2
  );
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
