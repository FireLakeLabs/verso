import type { LibraryItemDto } from "../library-api";

export type LibraryScreenReportSource = {
  items: readonly LibraryItemDto[];
  selectedAsins: readonly string[];
  activeAsin: string | null;
};

export type LibraryTableRowReport = {
  asin: string;
  title: string;
  authorsLabel: string;
  narratorsLabel: string;
  runtimeLabel: string;
  completionLabel: string;
  presenceLabel: string;
  isNoLongerPresent: boolean;
  isSelected: boolean;
  hasSnapshots: boolean;
};

export type LibraryScreenReport = {
  rows: readonly LibraryTableRowReport[];
  activeAsin: string | null;
  selectedCount: number;
  presentItemCount: number;
  noLongerPresentItemCount: number;
};

export function createLibraryScreenReport(
  source: LibraryScreenReportSource,
): LibraryScreenReport {
  const visibleAsins = new Set(source.items.map((item) => item.asin));
  const selectedSet = new Set(
    source.selectedAsins.filter((asin) => visibleAsins.has(asin)),
  );

  return {
    rows: source.items.map((item) => ({
      asin: item.asin,
      title: item.title,
      authorsLabel: formatPeople(item.authors),
      narratorsLabel: formatPeople(item.narrators),
      runtimeLabel: formatRuntimeMinutes(item.runtimeMinutes),
      completionLabel: formatCompletion(item.percentComplete),
      presenceLabel: item.isNoLongerPresent ? "No longer present" : "Present",
      isNoLongerPresent: item.isNoLongerPresent,
      isSelected: selectedSet.has(item.asin),
      hasSnapshots: item.hasSnapshots,
    })),
    activeAsin:
      source.activeAsin && visibleAsins.has(source.activeAsin)
        ? source.activeAsin
        : (source.items[0]?.asin ?? null),
    selectedCount: selectedSet.size,
    presentItemCount: source.items.filter((item) => !item.isNoLongerPresent)
      .length,
    noLongerPresentItemCount: source.items.filter(
      (item) => item.isNoLongerPresent,
    ).length,
  };
}

export function formatRuntimeMinutes(minutes: number): string {
  if (minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function formatCompletion(percentComplete: number): string {
  if (percentComplete < 0 || percentComplete > 100) {
    return `${percentComplete}% (check)`;
  }

  if (percentComplete >= 95) {
    return `${percentComplete}% complete`;
  }

  if (percentComplete <= 0) {
    return "Not started";
  }

  return `${percentComplete}% in progress`;
}

function formatPeople(names: readonly string[]): string {
  return names.length > 0 ? names.join(", ") : "Unknown";
}
