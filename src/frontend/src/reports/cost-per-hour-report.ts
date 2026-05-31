import type { CostBasisSettingsDto, LibraryItemDto } from "../library-api";

export type CostBasisSelection = "per-credit-value" | "list-price";

export type MissingCostReason = "missing-list-price" | "missing-runtime";

export type CostPerHourReportSource = {
  items: readonly LibraryItemDto[];
  selectedBasis?: CostBasisSelection;
  settings: CostBasisSettingsDto;
};

export type CostPerHourEntry = {
  asin: string;
  authors: readonly string[];
  cost: number;
  costPerHour: number;
  runtimeHours: number;
  runtimeMinutes: number;
  title: string;
};

export type MissingCostItem = {
  asin: string;
  reason: MissingCostReason;
  title: string;
};

export type CostPerHourReport = {
  basisLabel: string;
  bestValueItems: readonly CostPerHourEntry[];
  chartPoints: readonly CostPerHourEntry[];
  currencyCode: string;
  highCostShortList: readonly CostPerHourEntry[];
  knownCostItemCount: number;
  missingCostItems: readonly MissingCostItem[];
  selectedBasis: CostBasisSelection;
};

export function createCostPerHourReport(
  source: CostPerHourReportSource,
): CostPerHourReport {
  const selectedBasis = normalizeBasis(
    source.selectedBasis ?? source.settings.defaultBasis,
  );
  const entries: CostPerHourEntry[] = [];
  const missingCostItems: MissingCostItem[] = [];

  for (const item of source.items) {
    const runtimeMinutes = Math.max(item.runtimeMinutes, 0);

    if (runtimeMinutes <= 0) {
      missingCostItems.push({
        asin: item.asin,
        reason: "missing-runtime",
        title: item.title,
      });
      continue;
    }

    const cost =
      selectedBasis === "per-credit-value"
        ? source.settings.perCreditValue
        : readListPriceAmount(item);

    if (cost === null) {
      missingCostItems.push({
        asin: item.asin,
        reason: "missing-list-price",
        title: item.title,
      });
      continue;
    }

    const runtimeHours = runtimeMinutes / 60;

    entries.push({
      asin: item.asin,
      authors: item.authors,
      cost: roundToTwo(cost),
      costPerHour: roundToTwo(cost / runtimeHours),
      runtimeHours: roundToTwo(runtimeHours),
      runtimeMinutes,
      title: item.title,
    });
  }

  return {
    basisLabel:
      selectedBasis === "per-credit-value" ? "Per-credit value" : "List price",
    bestValueItems: [...entries].sort(compareBestValue).slice(0, 12),
    chartPoints: [...entries].sort(
      (left, right) =>
        left.runtimeMinutes - right.runtimeMinutes ||
        left.costPerHour - right.costPerHour ||
        left.title.localeCompare(right.title),
    ),
    currencyCode: source.settings.currencyCode,
    highCostShortList: [...entries].sort(compareHighCost).slice(0, 12),
    knownCostItemCount: entries.length,
    missingCostItems,
    selectedBasis,
  };
}

function normalizeBasis(value: string): CostBasisSelection {
  return value === "list-price" ? "list-price" : "per-credit-value";
}

function compareBestValue(
  left: CostPerHourEntry,
  right: CostPerHourEntry,
): number {
  return (
    left.costPerHour - right.costPerHour ||
    right.runtimeMinutes - left.runtimeMinutes ||
    left.title.localeCompare(right.title)
  );
}

function compareHighCost(
  left: CostPerHourEntry,
  right: CostPerHourEntry,
): number {
  return (
    right.costPerHour - left.costPerHour ||
    left.runtimeMinutes - right.runtimeMinutes ||
    left.title.localeCompare(right.title)
  );
}

function readListPriceAmount(item: LibraryItemDto): number | null {
  const rawPayload = readRawPayload(item);
  const rawPrice = asRecord(rawPayload)?.price;
  const rawAmount = asRecord(rawPrice)?.amount;

  if (typeof rawAmount === "number") {
    return Number.isFinite(rawAmount) && rawAmount >= 0 ? rawAmount : null;
  }

  if (typeof rawAmount === "string") {
    const parsedAmount = Number.parseFloat(rawAmount);
    return Number.isFinite(parsedAmount) && parsedAmount >= 0
      ? parsedAmount
      : null;
  }

  return null;
}

function readRawPayload(item: LibraryItemDto): unknown {
  try {
    return JSON.parse(item.rawAudiblePayload) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
