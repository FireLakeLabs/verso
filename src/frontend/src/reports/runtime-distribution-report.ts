import type { LibraryItemDto } from "../library-api";

const binSizeMinutes = 90;
const maxHistogramMinutes = 40 * 60;
const longOutlierThresholdMinutes = 24 * 60;
const shortOutlierThresholdMinutes = 4 * 60;

export type RuntimeDistributionBin = {
  endMinutes: number;
  itemCount: number;
  label: string;
  startMinutes: number;
};

export type RuntimeDistributionEntry = {
  asin: string;
  authors: readonly string[];
  percentComplete: number;
  runtimeMinutes: number;
  title: string;
};

export type RuntimeDistributionReport = {
  binSizeMinutes: number;
  bins: readonly RuntimeDistributionBin[];
  longOutliers: readonly RuntimeDistributionEntry[];
  markers: {
    meanMinutes: number | null;
    medianMinutes: number | null;
    p90Minutes: number | null;
  };
  maxBinCount: number;
  shortOutliers: readonly RuntimeDistributionEntry[];
};

export type RuntimeDistributionReportSource = {
  items: readonly LibraryItemDto[];
};

export function createRuntimeDistributionReport(
  source: RuntimeDistributionReportSource,
): RuntimeDistributionReport {
  const binCount = Math.ceil(maxHistogramMinutes / binSizeMinutes);
  const bins = Array.from({ length: binCount }, (_, index) => ({
    endMinutes: (index + 1) * binSizeMinutes,
    itemCount: 0,
    label: `${index * binSizeMinutes}-${(index + 1) * binSizeMinutes}`,
    startMinutes: index * binSizeMinutes,
  }));
  const normalizedItems = source.items.map(toDistributionEntry);
  const runtimes = normalizedItems
    .map((item) => item.runtimeMinutes)
    .sort((left, right) => left - right);

  for (const item of normalizedItems) {
    const binIndex = Math.min(
      binCount - 1,
      Math.floor(item.runtimeMinutes / binSizeMinutes),
    );
    bins[binIndex] = {
      ...bins[binIndex]!,
      itemCount: bins[binIndex]!.itemCount + 1,
    };
  }

  return {
    binSizeMinutes,
    bins,
    longOutliers: normalizedItems
      .filter((item) => item.runtimeMinutes >= longOutlierThresholdMinutes)
      .sort((left, right) => right.runtimeMinutes - left.runtimeMinutes),
    markers: {
      meanMinutes:
        runtimes.length > 0
          ? runtimes.reduce((sum, runtime) => sum + runtime, 0) /
            runtimes.length
          : null,
      medianMinutes:
        runtimes.length > 0 ? runtimes[Math.floor(runtimes.length / 2)]! : null,
      p90Minutes:
        runtimes.length > 0
          ? runtimes[
              Math.min(runtimes.length - 1, Math.floor(runtimes.length * 0.9))
            ]!
          : null,
    },
    maxBinCount: Math.max(0, ...bins.map((bin) => bin.itemCount)),
    shortOutliers: normalizedItems
      .filter((item) => item.runtimeMinutes < shortOutlierThresholdMinutes)
      .sort((left, right) => left.runtimeMinutes - right.runtimeMinutes),
  };
}

function toDistributionEntry(item: LibraryItemDto): RuntimeDistributionEntry {
  return {
    asin: item.asin,
    authors: item.authors,
    percentComplete: item.percentComplete,
    runtimeMinutes: Math.max(item.runtimeMinutes, 0),
    title: item.title,
  };
}
