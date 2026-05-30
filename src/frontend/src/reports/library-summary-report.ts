export type LibrarySummarySourceItem = {
  asin: string;
  title: string;
  authors: string[];
  narrators: string[];
  runtimeMinutes: number;
  percentComplete: number;
};

export type LibrarySummarySource = {
  items: LibrarySummarySourceItem[];
};

export type LibrarySummaryReport = {
  totalItems: number;
  totalRuntimeMinutes: number;
  finishedItems: number;
  anomalousCompletionItems: number;
  distinctAuthors: number;
  distinctNarrators: number;
};

export function summarizeLibraryReport(
  source: LibrarySummarySource,
): LibrarySummaryReport {
  const authors = new Set<string>();
  const narrators = new Set<string>();

  let totalRuntimeMinutes = 0;
  let finishedItems = 0;
  let anomalousCompletionItems = 0;

  for (const item of source.items) {
    totalRuntimeMinutes += Math.max(item.runtimeMinutes, 0);

    if (item.percentComplete >= 100) {
      finishedItems += 1;
    }

    if (item.percentComplete < 0 || item.percentComplete > 100) {
      anomalousCompletionItems += 1;
    }

    for (const author of item.authors) {
      authors.add(author);
    }

    for (const narrator of item.narrators) {
      narrators.add(narrator);
    }
  }

  return {
    totalItems: source.items.length,
    totalRuntimeMinutes,
    finishedItems,
    anomalousCompletionItems,
    distinctAuthors: authors.size,
    distinctNarrators: narrators.size,
  };
}
