import type { LibraryItemDto } from "../library-api";

export type GenreTreemapReportSource = {
  items: readonly LibraryItemDto[];
};

export type GenreTreemapHierarchyNode = {
  id: string;
  label: string;
  path: readonly string[];
  depth: number;
  itemCount: number;
  runtimeMinutes: number;
  completedItems: number;
  children: readonly GenreTreemapHierarchyNode[];
};

export type GenreTreemapNode = {
  id: string;
  label: string;
  path: readonly string[];
  value: number;
  itemCount: number;
  runtimeMinutes: number;
  completedItems: number;
};

export type GenreTreemapLadderRow = {
  path: readonly string[];
  pathLabel: string;
  itemCount: number;
  runtimeMinutes: number;
  completedItems: number;
  asins: readonly string[];
};

export type GenreTreemapKeywordSummary = {
  keyword: string;
  itemCount: number;
};

export type GenreTreemapReport = {
  totalItems: number;
  totalRuntimeMinutes: number;
  hierarchy: GenreTreemapHierarchyNode;
  treemapNodes: readonly GenreTreemapNode[];
  ladderRows: readonly GenreTreemapLadderRow[];
  topLeaderKeyword: GenreTreemapKeywordSummary | null;
};

type MutableHierarchyNode = {
  children: Map<string, MutableHierarchyNode>;
  completedItems: number;
  depth: number;
  id: string;
  itemCount: number;
  label: string;
  path: string[];
  runtimeMinutes: number;
};

type RawAudibleMetadata = {
  category_ladders?: readonly (readonly string[])[];
  thesaurus_subject_keywords?: readonly string[];
};

export function createGenreTreemapReport(
  source: GenreTreemapReportSource,
): GenreTreemapReport {
  const root = createMutableHierarchyNode("root", [], 0);
  const ladderRows = new Map<string, GenreTreemapLadderRow>();
  const ladderKeywordCounts = new Map<string, Map<string, number>>();

  for (const item of source.items) {
    const metadata = readRawAudibleMetadata(item);
    const runtimeMinutes = Math.max(item.runtimeMinutes, 0);
    const completedItems = item.percentComplete >= 95 ? 1 : 0;
    const keywords = readKeywords(metadata);

    for (const ladder of readCategoryLadders(metadata)) {
      let currentNode = root;

      for (const segment of ladder) {
        currentNode = getOrCreateChild(currentNode, segment);
        currentNode.itemCount += 1;
        currentNode.runtimeMinutes += runtimeMinutes;
        currentNode.completedItems += completedItems;
      }

      const pathLabel = formatPathLabel(ladder);
      const existingRow = ladderRows.get(pathLabel);

      if (existingRow) {
        ladderRows.set(pathLabel, {
          ...existingRow,
          itemCount: existingRow.itemCount + 1,
          runtimeMinutes: existingRow.runtimeMinutes + runtimeMinutes,
          completedItems: existingRow.completedItems + completedItems,
          asins: [...existingRow.asins, item.asin],
        });

        addKeywordsToLadder(pathLabel, keywords, ladderKeywordCounts);
        continue;
      }

      ladderRows.set(pathLabel, {
        path: [...ladder],
        pathLabel,
        itemCount: 1,
        runtimeMinutes,
        completedItems,
        asins: [item.asin],
      });
      addKeywordsToLadder(pathLabel, keywords, ladderKeywordCounts);
    }
  }

  const sortedRows = [...ladderRows.values()].sort(compareLadderRows);
  const topLeaderPath = sortedRows[0]?.pathLabel ?? null;

  return {
    totalItems: source.items.length,
    totalRuntimeMinutes: source.items.reduce(
      (sum, item) => sum + Math.max(item.runtimeMinutes, 0),
      0,
    ),
    hierarchy: freezeHierarchy(root),
    treemapNodes: sortedRows.map((row) => ({
      id: row.pathLabel,
      label: row.path[row.path.length - 1] ?? row.pathLabel,
      path: row.path,
      value: row.runtimeMinutes,
      itemCount: row.itemCount,
      runtimeMinutes: row.runtimeMinutes,
      completedItems: row.completedItems,
    })),
    ladderRows: sortedRows,
    topLeaderKeyword:
      topLeaderPath === null
        ? null
        : summarizeTopKeyword(ladderKeywordCounts.get(topLeaderPath) ?? null),
  };
}

function createMutableHierarchyNode(
  label: string,
  path: string[],
  depth: number,
): MutableHierarchyNode {
  return {
    children: new Map(),
    completedItems: 0,
    depth,
    id: formatPathLabel(path) || "root",
    itemCount: 0,
    label,
    path,
    runtimeMinutes: 0,
  };
}

function getOrCreateChild(
  node: MutableHierarchyNode,
  segment: string,
): MutableHierarchyNode {
  const existingNode = node.children.get(segment);

  if (existingNode) {
    return existingNode;
  }

  const childNode = createMutableHierarchyNode(
    segment,
    [...node.path, segment],
    node.depth + 1,
  );
  node.children.set(segment, childNode);
  return childNode;
}

function freezeHierarchy(
  node: MutableHierarchyNode,
): GenreTreemapHierarchyNode {
  return {
    id: node.id,
    label: node.label,
    path: node.path,
    depth: node.depth,
    itemCount: node.itemCount,
    runtimeMinutes: node.runtimeMinutes,
    completedItems: node.completedItems,
    children: [...node.children.values()]
      .sort(compareHierarchyNodes)
      .map(freezeHierarchy),
  };
}

function compareHierarchyNodes(
  left: MutableHierarchyNode,
  right: MutableHierarchyNode,
): number {
  return (
    right.runtimeMinutes - left.runtimeMinutes ||
    right.itemCount - left.itemCount ||
    left.label.localeCompare(right.label)
  );
}

function compareLadderRows(
  left: GenreTreemapLadderRow,
  right: GenreTreemapLadderRow,
): number {
  return (
    right.runtimeMinutes - left.runtimeMinutes ||
    right.itemCount - left.itemCount ||
    left.pathLabel.localeCompare(right.pathLabel)
  );
}

function readCategoryLadders(
  metadata: RawAudibleMetadata | null,
): readonly (readonly string[])[] {
  return (
    metadata?.category_ladders
      ?.map((ladder) =>
        ladder
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0),
      )
      .filter((ladder) => ladder.length > 0) ?? []
  );
}

function readKeywords(metadata: RawAudibleMetadata | null): readonly string[] {
  return (
    metadata?.thesaurus_subject_keywords
      ?.map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0) ?? []
  );
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

function formatPathLabel(path: readonly string[]): string {
  return path.join(" > ");
}

function addKeywordsToLadder(
  pathLabel: string,
  keywords: readonly string[],
  ladderKeywordCounts: Map<string, Map<string, number>>,
): void {
  if (keywords.length === 0) {
    return;
  }

  const counts =
    ladderKeywordCounts.get(pathLabel) ?? new Map<string, number>();

  for (const keyword of keywords) {
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }

  ladderKeywordCounts.set(pathLabel, counts);
}

function summarizeTopKeyword(
  keywordCounts: Map<string, number> | null,
): GenreTreemapKeywordSummary | null {
  if (!keywordCounts || keywordCounts.size === 0) {
    return null;
  }

  const [keyword, itemCount] = [...keywordCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0] ?? [null, null];

  return keyword === null || itemCount === null ? null : { keyword, itemCount };
}
