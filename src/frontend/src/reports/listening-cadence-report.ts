import type { LibraryItemDto } from "../library-api";

const cohortLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"] as const;
const twelveMonths = 12;
const weeksInHeatmap = 52;
const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;

export type ListeningCadenceCell = {
  dayLabel: (typeof dayLabels)[number];
  purchaseCount: number;
};

export type ListeningCadenceCohort = {
  completedCount: number;
  inProgressCount: number;
  key: string;
  label: string;
  totalCount: number;
  untouchedCount: number;
};

export type ListeningCadenceReport = {
  activeWeeks: number;
  busiestWeekPurchases: number;
  cohorts: readonly ListeningCadenceCohort[];
  heatmap: readonly (readonly ListeningCadenceCell[])[];
  maxCellPurchases: number;
  totalPurchasesInRange: number;
  weeklyTotals: readonly number[];
};

export type ListeningCadenceReportSource = {
  items: readonly LibraryItemDto[];
  now?: Date;
};

export function createListeningCadenceReport(
  source: ListeningCadenceReportSource,
): ListeningCadenceReport {
  const now = normalizeCalendarDate(source.now ?? new Date());
  const heatmap = Array.from({ length: weeksInHeatmap }, () =>
    dayLabels.map((dayLabel) => ({ dayLabel, purchaseCount: 0 })),
  );

  const cohorts = buildMonthlyCohorts(now);

  for (const item of source.items) {
    const purchaseDate = readPurchaseDate(item);

    if (purchaseDate === null) {
      continue;
    }

    const weeksAgo = Math.floor(
      (now.getTime() - purchaseDate.getTime()) / weekMs,
    );

    if (weeksAgo >= 0 && weeksAgo < weeksInHeatmap) {
      const weekIndex = weeksInHeatmap - 1 - weeksAgo;
      const dayIndex = (purchaseDate.getUTCDay() + 6) % 7;
      heatmap[weekIndex]![dayIndex] = {
        ...heatmap[weekIndex]![dayIndex],
        purchaseCount: heatmap[weekIndex]![dayIndex]!.purchaseCount + 1,
      };
    }

    const cohortKey = buildCohortKey(
      purchaseDate.getUTCFullYear(),
      purchaseDate.getUTCMonth(),
    );
    const cohort = cohorts.find((entry) => entry.key === cohortKey);

    if (!cohort) {
      continue;
    }

    cohort.totalCount += 1;

    if (item.percentComplete >= 95) {
      cohort.completedCount += 1;
    } else if (item.percentComplete >= 1) {
      cohort.inProgressCount += 1;
    } else {
      cohort.untouchedCount += 1;
    }
  }

  const weeklyTotals = heatmap.map((week) =>
    week.reduce((sum, cell) => sum + cell.purchaseCount, 0),
  );
  const maxCellPurchases = Math.max(
    0,
    ...heatmap.flat().map((cell) => cell.purchaseCount),
  );

  return {
    activeWeeks: weeklyTotals.filter((count) => count > 0).length,
    busiestWeekPurchases: Math.max(0, ...weeklyTotals),
    cohorts,
    heatmap,
    maxCellPurchases,
    totalPurchasesInRange: weeklyTotals.reduce((sum, count) => sum + count, 0),
    weeklyTotals,
  };
}

function buildMonthlyCohorts(now: Date): ListeningCadenceCohort[] {
  const cohorts: ListeningCadenceCohort[] = [];

  for (let offset = twelveMonths - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1, 12),
    );

    cohorts.push({
      completedCount: 0,
      inProgressCount: 0,
      key: buildCohortKey(date.getUTCFullYear(), date.getUTCMonth()),
      label: cohortLabelFormatter.format(date),
      totalCount: 0,
      untouchedCount: 0,
    });
  }

  return cohorts;
}

function buildCohortKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function normalizeCalendarDate(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      12,
    ),
  );
}

function readPurchaseDate(item: LibraryItemDto): Date | null {
  const rawItem = readRawMetadata(item);
  const purchaseDate = rawItem?.purchase_date;

  if (!purchaseDate) {
    return null;
  }

  const parsed = new Date(`${purchaseDate}T12:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readRawMetadata(
  item: LibraryItemDto,
): { purchase_date?: string } | null {
  try {
    return JSON.parse(item.rawAudiblePayload) as { purchase_date?: string };
  } catch {
    return null;
  }
}
