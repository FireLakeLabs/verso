import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import {
  chromium,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type {
  LibraryItemDetailDto,
  LibraryItemDetailResponse,
  LibraryItemDto,
  LibraryItemsResponse,
  LibraryOverviewResponse,
  LibraryRefreshJobDto,
  LibraryRefreshStatusResponse,
  SettingsResponse,
  StartLibraryRefreshResponse,
} from "../src/library-api";
import { buildVisualParitySearch } from "../src/shell/visual-parity";

type PrototypeItem = {
  _present: boolean;
  asin: string;
  author: string;
  has_pdf: boolean;
  is_dropped: boolean;
  is_returnable: boolean;
  narrators: string[];
  percent_complete: number;
  product_image_seed: number;
  publisher_summary: string | null;
  purchase_date: string;
  runtime_length_min: number;
  series: {
    id: string;
    name: string;
    position: number;
    total: number;
  } | null;
  subtitle: string | null;
  tags: string[];
  title: string;
};

type PrototypeVisualData = {
  calmOverviewMetricDetails: {
    completedDetail: string;
    hoursDetail: string;
    itemsDetail: string;
    openFindingsDetail: string;
  };
  findings: readonly { id: string }[];
  items: readonly PrototypeItem[];
  lastRefresh: string;
  refreshDuration: number;
};

type FixtureBundle = {
  detailByAsin: Map<string, LibraryItemDetailDto>;
  items: readonly LibraryItemDto[];
  overview: LibraryOverviewResponse;
  refreshJob: LibraryRefreshJobDto;
  refreshStatus: LibraryRefreshStatusResponse;
  settings: SettingsResponse;
  startRefresh: StartLibraryRefreshResponse;
};

type VisualScenario = {
  appMaskSelectors?: readonly string[];
  clip: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  id: string;
  maxDiffPixelRatio: number;
  prototypeMaskSelectors?: readonly string[];
};

const frontendProjectRoot = process.cwd();
const visualBaselineDirectory = join(
  frontendProjectRoot,
  "tests",
  "visual-parity-baselines",
);
const visualArtifactDirectory = join(
  frontendProjectRoot,
  "tests",
  "visual-parity-artifacts",
);
const prototypeRootDirectory = join(
  frontendProjectRoot,
  "..",
  "..",
  "..",
  "..",
  "clickable-prototype",
  "verso-prototype-smart-shelves-review",
  "prototype",
);
const frontendPort = Number.parseInt(
  process.env.VERSO_FRONTEND_PORT ?? "5224",
  10,
);
const appBaseUrl = `http://127.0.0.1:${frontendPort}`;
const visualDebugEnabled = process.env.VERSO_VISUAL_DEBUG === "1";
const visualExternalServer = process.env.VERSO_VISUAL_EXTERNAL_SERVER === "1";
const visualScenarioFilter = process.env.VERSO_VISUAL_SCENARIO ?? null;
const visualWriteArtifacts = process.env.VERSO_VISUAL_WRITE_ARTIFACTS === "1";
const viewport = {
  width: 1440,
  height: 1200,
};

const visualScenarios: readonly VisualScenario[] = [
  {
    id: "overview-topnav-calm",
    clip: { x: 0, y: 0, width: 1440, height: 720 },
    maxDiffPixelRatio: 0.09,
    appMaskSelectors: ["[data-volatile]", ".v-brand-sub"],
    prototypeMaskSelectors: [
      "text=/Library · \\d{4}-\\d{2}-\\d{2}/",
      ".v-brand-sub",
    ],
  },
  {
    id: "overview-topnav-dense",
    clip: { x: 0, y: 0, width: 1440, height: 760 },
    maxDiffPixelRatio: 0.1,
    appMaskSelectors: ["[data-volatile]", ".v-brand-sub"],
    prototypeMaskSelectors: ["text=/\\d+ min ago/", ".v-brand-sub"],
  },
  {
    id: "overview-sidebar-calm",
    clip: { x: 0, y: 0, width: 1440, height: 720 },
    maxDiffPixelRatio: 0.1,
    appMaskSelectors: ["[data-volatile]", ".v-brand-sub"],
    prototypeMaskSelectors: [
      "text=/Library · \\d{4}-\\d{2}-\\d{2}/",
      ".v-brand-sub",
    ],
  },
  {
    id: "library-rows",
    clip: { x: 0, y: 0, width: 1440, height: 760 },
    maxDiffPixelRatio: 0.11,
    appMaskSelectors: ["[data-volatile]", ".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "library-cards",
    clip: { x: 0, y: 0, width: 1440, height: 820 },
    maxDiffPixelRatio: 0.12,
    appMaskSelectors: ["[data-volatile]", ".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-cadence",
    clip: { x: 0, y: 0, width: 1440, height: 980 },
    maxDiffPixelRatio: 0.13,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-authors",
    clip: { x: 0, y: 0, width: 1440, height: 1120 },
    maxDiffPixelRatio: 0.14,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-runtime",
    clip: { x: 0, y: 0, width: 1440, height: 980 },
    maxDiffPixelRatio: 0.13,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-cost",
    clip: { x: 0, y: 0, width: 1440, height: 1040 },
    maxDiffPixelRatio: 0.14,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-genre",
    clip: { x: 0, y: 0, width: 1440, height: 1080 },
    maxDiffPixelRatio: 0.14,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-keywords",
    clip: { x: 0, y: 0, width: 1440, height: 980 },
    maxDiffPixelRatio: 0.14,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "report-narrators",
    clip: { x: 0, y: 0, width: 1440, height: 1020 },
    maxDiffPixelRatio: 0.14,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "cover-wall",
    clip: { x: 0, y: 0, width: 1440, height: 980 },
    maxDiffPixelRatio: 0.16,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
  {
    id: "settings-interface",
    clip: { x: 0, y: 0, width: 1440, height: 900 },
    maxDiffPixelRatio: 0.08,
    appMaskSelectors: [".v-brand-sub"],
    prototypeMaskSelectors: [".v-brand-sub"],
  },
] as const;

const selectedVisualScenarios =
  visualScenarioFilter === null
    ? visualScenarios
    : visualScenarios.filter(
        (scenario) => scenario.id === visualScenarioFilter,
      );

if (selectedVisualScenarios.length === 0) {
  throw new Error(
    `Unknown visual scenario filter: ${visualScenarioFilter ?? "<empty>"}.`,
  );
}

export async function updateVisualParityBaselines(): Promise<void> {
  mkdirSync(visualBaselineDirectory, { recursive: true });

  const prototypeServer = await startStaticFileServer(prototypeRootDirectory);
  const browser = await chromium.launch();

  try {
    for (const scenario of selectedVisualScenarios) {
      const context = await browser.newContext({
        colorScheme: "light",
        reducedMotion: "reduce",
        viewport,
      });
      const page = await context.newPage();

      await openPrototypeState(page, prototypeServer.baseUrl, scenario.id);

      const screenshot = await captureScenario(page, scenario, "prototype");
      const baselinePath = getBaselinePath(scenario.id);
      mkdirSync(dirname(baselinePath), { recursive: true });
      writeFileSync(baselinePath, screenshot);

      await context.close();
      console.log(`Updated prototype baseline: ${scenario.id}`);
    }
  } finally {
    await browser.close();
    await stopStaticFileServer(prototypeServer.server);
  }
}

export async function verifyVisualParity(): Promise<void> {
  mkdirSync(visualArtifactDirectory, { recursive: true });
  logVisualDebug(`starting compare on ${appBaseUrl}`);

  const server = visualExternalServer
    ? null
    : spawn(
        "node",
        [
          "./node_modules/vite/bin/vite.js",
          "--host",
          "127.0.0.1",
          "--strictPort",
        ],
        {
          cwd: frontendProjectRoot,
          env: {
            ...process.env,
            VERSO_FRONTEND_PORT: String(frontendPort),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
  server?.stdout?.resume();
  server?.stderr?.resume();

  try {
    await waitForServer(appBaseUrl);
    logVisualDebug("frontend server ready");

    const prototypeServer = await startStaticFileServer(prototypeRootDirectory);
    const browser = await chromium.launch();

    try {
      const prototypeFixture = await readPrototypeFixture(
        browser,
        prototypeServer.baseUrl,
      );
      logVisualDebug("prototype fixture loaded");
      const fixtureBundle = createFixtureBundle(prototypeFixture);

      for (const scenario of selectedVisualScenarios) {
        logVisualDebug(`starting scenario ${scenario.id}`);
        const baselinePath = getBaselinePath(scenario.id);

        if (!existsSync(baselinePath)) {
          throw new Error(
            `Missing visual baseline for ${scenario.id}. Run pnpm --dir src/frontend test:visual:update first.`,
          );
        }

        const context = await browser.newContext({
          colorScheme: "light",
          reducedMotion: "reduce",
          viewport,
        });
        const page = await context.newPage();

        await installFixtureRoutes(page, fixtureBundle);
        await openAppState(page, scenario.id);
        logVisualDebug(`opened app state ${scenario.id}`);

        const screenshot = await captureScenario(page, scenario, "app");
        logVisualDebug(`captured screenshot ${scenario.id}`);
        compareWithBaseline({
          actualBuffer: screenshot,
          baselinePath,
          maxDiffPixelRatio: scenario.maxDiffPixelRatio,
          stateId: scenario.id,
        });

        await context.close();
        console.log(`Visual parity passed: ${scenario.id}`);
      }
    } finally {
      await browser.close();
      await stopStaticFileServer(prototypeServer.server);
    }
  } finally {
    if (server !== null) {
      await stopProcess(server);
    }
  }
}

function logVisualDebug(message: string): void {
  if (!visualDebugEnabled) {
    return;
  }

  console.error(`[visual-debug] ${message}`);
}

async function startStaticFileServer(
  rootDirectory: string,
): Promise<{ baseUrl: string; server: Server }> {
  const resolvedRootDirectory = resolve(rootDirectory);
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const requestedPath =
      requestUrl.pathname === "/"
        ? "Verso.html"
        : requestUrl.pathname.replace(/^\//, "");
    const filePath = resolve(resolvedRootDirectory, requestedPath);
    const relativePath = relative(resolvedRootDirectory, filePath);

    if (relativePath.startsWith("..")) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (!existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
    });
    response.end(readFileSync(filePath));
  });

  await new Promise<void>((resolveServer, rejectServer) => {
    const onError = (error: Error) => {
      rejectServer(error);
    };

    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolveServer();
    });
  });

  const address = server.address();
  assert(address && typeof address !== "string");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
  };
}

async function stopStaticFileServer(server: Server): Promise<void> {
  await new Promise<void>((resolveServer, rejectServer) => {
    server.close((error) => {
      if (error) {
        rejectServer(error);
        return;
      }

      resolveServer();
    });
  });
}

function getContentType(filePath: string): string {
  const extension = extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".jsx":
      return "text/babel; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

async function captureScenario(
  page: Page,
  scenario: VisualScenario,
  mode: "app" | "prototype",
): Promise<Buffer> {
  const selectors =
    mode === "app"
      ? (scenario.appMaskSelectors ?? [])
      : (scenario.prototypeMaskSelectors ?? []);

  return page.screenshot({
    animations: "disabled",
    clip: scenario.clip,
    mask: await buildMaskLocators(page, selectors),
  });
}

function compareWithBaseline({
  actualBuffer,
  baselinePath,
  maxDiffPixelRatio,
  stateId,
}: {
  actualBuffer: Buffer;
  baselinePath: string;
  maxDiffPixelRatio: number;
  stateId: string;
}) {
  const expectedPng = PNG.sync.read(readFileSync(baselinePath));
  const actualPng = PNG.sync.read(actualBuffer);

  assert.equal(
    actualPng.width,
    expectedPng.width,
    `Visual parity width mismatch for ${stateId}.`,
  );
  assert.equal(
    actualPng.height,
    expectedPng.height,
    `Visual parity height mismatch for ${stateId}.`,
  );

  const diffPng = new PNG({
    width: expectedPng.width,
    height: expectedPng.height,
  });
  const diffPixels = pixelmatch(
    expectedPng.data,
    actualPng.data,
    diffPng.data,
    expectedPng.width,
    expectedPng.height,
    {
      threshold: 0.12,
    },
  );
  const diffRatio = diffPixels / (expectedPng.width * expectedPng.height);

  const actualPath = join(visualArtifactDirectory, `${stateId}.actual.png`);
  const diffPath = join(visualArtifactDirectory, `${stateId}.diff.png`);

  if (visualWriteArtifacts || diffRatio > maxDiffPixelRatio) {
    mkdirSync(visualArtifactDirectory, { recursive: true });

    writeFileSync(actualPath, actualBuffer);
    writeFileSync(diffPath, PNG.sync.write(diffPng));
  }

  if (diffRatio > maxDiffPixelRatio) {
    throw new Error(
      `Visual parity failed for ${stateId}: diff ratio ${diffRatio.toFixed(4)} exceeds ${maxDiffPixelRatio.toFixed(4)}. Artifacts: ${actualPath}, ${diffPath}`,
    );
  }
}

function createFixtureBundle(data: PrototypeVisualData): FixtureBundle {
  const sortedPrototypeItems = [...data.items].sort(
    (left, right) =>
      new Date(right.purchase_date).getTime() -
      new Date(left.purchase_date).getTime(),
  );
  const libraryItems = sortedPrototypeItems.map((item) =>
    transformLibraryItem(item),
  );
  const detailByAsin = new Map(
    sortedPrototypeItems.map((item) => [
      item.asin,
      transformItemDetail(item, data),
    ]),
  );
  const refreshJob = createRefreshJob(data, libraryItems);

  return {
    detailByAsin,
    items: libraryItems,
    overview: {
      prototypeDisplay: {
        calmOverviewMetricDetails: data.calmOverviewMetricDetails,
      },
      latestRefreshJob: refreshJob,
      summary: {
        completedItems: libraryItems.filter(
          (item) => item.percentComplete >= 95,
        ).length,
        inProgressItems: libraryItems.filter(
          (item) => item.percentComplete > 0 && item.percentComplete < 95,
        ).length,
        noLongerPresentItems: libraryItems.filter(
          (item) => item.isNoLongerPresent,
        ).length,
        openFindingsCount: data.findings.length,
        presentItems: libraryItems.filter((item) => !item.isNoLongerPresent)
          .length,
        totalItems: libraryItems.length,
      },
    },
    refreshJob,
    refreshStatus: {
      activeJobs: [],
      recentJobs: [refreshJob],
    },
    settings: createVisualSettings(data),
    startRefresh: {
      job: {
        ...refreshJob,
        completedAtUtc: null,
        phaseSummary: "Refresh queued with deterministic visual fixture data.",
        status: "running",
      },
    },
  };
}

function createVisualSettings(data: PrototypeVisualData): SettingsResponse {
  return {
    archiveExport: {
      coverImages: "sibling-folder",
      format: "json-archive",
      includeRawPayloads: true,
      restoreSupported: false,
    },
    audibleAuthentication: {
      lastAuthenticatedAtUtc: data.lastRefresh,
      lastError: null,
      locale: "us",
      status: "authenticated",
    },
    costBasis: {
      currencyCode: "USD",
      defaultBasis: "per-credit-value",
      perCreditValue: 14.95,
    },
    interfacePreferences: {
      defaultLibraryView: "rows",
      defaultOverviewVariant: "calm",
      navChrome: "topnav",
    },
    localData: {
      companionPdfsStatus: "deferred",
      coverCacheLocation: "visual-parity/cached-assets",
      coverCacheSizeBytes: 0,
      databaseLocation: "visual-parity/verso.db",
      databaseSizeBytes: 0,
      rawPayloadCount: data.items.length,
      schemaVersion: "visual-parity",
    },
    refresh: {
      retainNoLongerPresentItems: true,
      selectiveSnapshotFields: [
        "percent-complete",
        "presence",
        "companion-pdf-available",
        "is-returnable",
      ],
      trigger: "manual",
    },
  };
}

function createRefreshJob(
  data: PrototypeVisualData,
  items: readonly LibraryItemDto[],
): LibraryRefreshJobDto {
  const noLongerPresentCount = items.filter(
    (item) => item.isNoLongerPresent,
  ).length;
  const snapshotCount = items.filter((item) => item.hasSnapshots).length;

  return {
    completedAtUtc: data.lastRefresh,
    errors: [],
    id: "visual-parity-refresh-job",
    importedItemCount: items.length,
    observedItemCount: items.length,
    phaseSummary: `Imported ${items.length} items from the prototype fixture bundle.`,
    phases: [
      {
        completedAtUtc: data.lastRefresh,
        name: "Fetch library",
        startedAtUtc: data.lastRefresh,
        status: "completed",
        summary: "Loaded the approved prototype fixture data.",
      },
      {
        completedAtUtc: data.lastRefresh,
        name: "Persist import",
        startedAtUtc: data.lastRefresh,
        status: "completed",
        summary:
          "Materialized deterministic library overview and item detail responses.",
      },
    ],
    retainedNoLongerPresentItemCount: noLongerPresentCount,
    snapshotObservationCount: snapshotCount,
    startedAtUtc: data.lastRefresh,
    status: "completed",
  };
}

async function installFixtureRoutes(
  page: Page,
  fixtureBundle: FixtureBundle,
): Promise<void> {
  await page.route("**/api/library/overview", async (route) => {
    await fulfillJson(route, fixtureBundle.overview);
  });

  await page.route("**/api/library/refresh-status", async (route) => {
    await fulfillJson(route, fixtureBundle.refreshStatus);
  });

  await page.route("**/api/library/items/*/cover-images/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathParts = requestUrl.pathname.split("/");
    const asin = decodeURIComponent(pathParts.at(-3) ?? "");
    const item = fixtureBundle.items.find(
      (candidate) => candidate.asin === asin,
    );

    if (!item) {
      await route.fulfill({ status: 404 });
      return;
    }

    await route.fulfill({
      body: renderCachedCoverSvg(item),
      contentType: "image/svg+xml",
      status: 200,
    });
  });

  await page.route("**/api/library/items/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const asin = decodeURIComponent(
      requestUrl.pathname.split("/").at(-1) ?? "",
    );
    const item = fixtureBundle.detailByAsin.get(asin);

    if (!item) {
      await route.fulfill({
        body: JSON.stringify({ message: `Unknown prototype item ${asin}.` }),
        contentType: "application/json",
        status: 404,
      });
      return;
    }

    const response: LibraryItemDetailResponse = {
      item,
    };

    await fulfillJson(route, response);
  });

  await page.route("**/api/library/items?*", async (route) => {
    const response: LibraryItemsResponse = {
      items: filterLibraryItems(
        fixtureBundle.items,
        new URL(route.request().url()),
      ),
    };
    await fulfillJson(route, response);
  });

  await page.route("**/api/library/items", async (route) => {
    await fulfillJson(route, {
      items: fixtureBundle.items,
    } satisfies LibraryItemsResponse);
  });

  await page.route("**/api/library/refresh-jobs", async (route) => {
    await fulfillJson(route, fixtureBundle.startRefresh);
  });

  await page.route("**/api/settings", async (route) => {
    await fulfillJson(route, fixtureBundle.settings);
  });
}

function filterLibraryItems(
  items: readonly LibraryItemDto[],
  requestUrl: URL,
): LibraryItemDto[] {
  const search =
    requestUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const presence = requestUrl.searchParams.get("presence") ?? "all";
  const completion = requestUrl.searchParams.get("completion") ?? "all";

  return items.filter((item) => {
    if (
      search.length > 0 &&
      ![item.asin, item.title, ...item.authors, ...item.narrators]
        .join(" ")
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }

    if (presence === "present" && item.isNoLongerPresent) {
      return false;
    }

    if (presence === "no-longer-present" && !item.isNoLongerPresent) {
      return false;
    }

    if (completion === "completed" && item.percentComplete < 95) {
      return false;
    }

    if (
      completion === "in-progress" &&
      (item.percentComplete <= 0 || item.percentComplete >= 95)
    ) {
      return false;
    }

    if (completion === "not-started" && item.percentComplete > 0) {
      return false;
    }

    if (
      completion === "anomalous" &&
      item.percentComplete >= 0 &&
      item.percentComplete <= 100
    ) {
      return false;
    }

    return true;
  });
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status: 200,
  });
}

async function openAppState(page: Page, stateId: string): Promise<void> {
  const appUrl = new URL(buildVisualParitySearch(stateId), `${appBaseUrl}/`)
    .href;

  await page.goto(appUrl);
  await page.locator(`[data-parity-state="${stateId}"]`).waitFor();
}

async function openPrototypeState(
  page: Page,
  prototypeBaseUrl: string,
  stateId: string,
): Promise<void> {
  await page.goto(prototypeBaseUrl);
  await page.getByRole("heading", { name: "Library overview" }).waitFor();

  switch (stateId) {
    case "overview-topnav-calm":
      return;
    case "overview-topnav-dense":
      await openPrototypeSettingsInterface(page);
      await choosePrototypeOption(page, "Data-dense");
      await navigatePrototype(page, "Overview");
      return;
    case "overview-sidebar-calm":
      await openPrototypeSettingsInterface(page);
      await choosePrototypeOption(page, "Sidebar");
      await navigatePrototype(page, "Overview");
      return;
    case "library-rows":
      await navigatePrototype(page, "Library");
      return;
    case "library-cards":
      await openPrototypeSettingsInterface(page);
      await choosePrototypeOption(page, "Card grid");
      await navigatePrototype(page, "Library");
      return;
    case "report-cadence":
      await openPrototypeReportLink(page, "Listening cadence");
      await page.getByRole("heading", { name: "Listening cadence" }).waitFor();
      return;
    case "report-authors":
      await openPrototypeReportLink(page, "Author concentration");
      await page
        .getByRole("heading", { name: "Author concentration" })
        .waitFor();
      return;
    case "report-runtime":
      await openPrototypeReportLink(page, "Runtime distribution");
      await page
        .getByRole("heading", { name: "Runtime distribution" })
        .waitFor();
      return;
    case "report-cost":
      await openPrototypeReportLink(page, "Cost per hour");
      await page.getByRole("heading", { name: "Cost per hour" }).waitFor();
      return;
    case "report-genre":
      await openPrototypeReportLink(page, "Genre treemap");
      await page.getByRole("heading", { name: "Genre treemap" }).waitFor();
      return;
    case "report-keywords":
      await openPrototypeReportLink(page, "Subject keywords");
      await page.getByRole("heading", { name: "Subject keywords" }).waitFor();
      return;
    case "report-narrators":
      await openPrototypeReportLink(page, "Narrator affinity");
      await page.getByRole("heading", { name: "Narrator affinity" }).waitFor();
      return;
    case "cover-wall":
      await navigatePrototype(page, "Covers");
      await page.locator("h1").filter({ hasText: "Cover wall" }).waitFor();
      return;
    case "settings-interface":
      await openPrototypeSettingsInterface(page);
      return;
    default:
      throw new Error(`Unknown prototype state ${stateId}.`);
  }
}

async function openPrototypeSettingsInterface(page: Page): Promise<void> {
  await navigatePrototype(page, "Settings");
  const interfaceButton = page.getByRole("button", { name: "Interface" });
  await interfaceButton.waitFor();
  await interfaceButton.click();
  await page
    .getByRole("heading", { name: "Prototype-visible display preferences" })
    .waitFor();
}

async function choosePrototypeOption(page: Page, label: string): Promise<void> {
  await page.locator(".v-radio").filter({ hasText: label }).first().click();
}

async function navigatePrototype(
  page: Page,
  label:
    | "Covers"
    | "Genre treemap"
    | "Library"
    | "Overview"
    | "Settings"
    | "Subject keywords",
): Promise<void> {
  const names =
    label === "Library"
      ? [/^Library$/, /^All items$/]
      : [new RegExp(escapeRegExp(label))];

  for (const name of names) {
    const locators = [
      page.getByRole("button", { name }),
      page.getByRole("link", { name }),
      page.locator("button, a").filter({ hasText: label }),
    ];

    for (const locator of locators) {
      if ((await locator.count()) > 0) {
        await locator.first().click();
        return;
      }
    }
  }

  throw new Error(`Could not navigate prototype to ${label}.`);
}

async function openPrototypeReportLink(
  page: Page,
  label:
    | "Author concentration"
    | "Cost per hour"
    | "Genre treemap"
    | "Listening cadence"
    | "Narrator affinity"
    | "Runtime distribution"
    | "Subject keywords",
): Promise<void> {
  const locators = [
    page.locator("a").filter({ hasText: label }),
    page.locator("button").filter({ hasText: label }),
    page.locator("button, a").filter({ hasText: label }),
  ];

  for (const locator of locators) {
    if ((await locator.count()) > 0) {
      await locator.first().click();
      return;
    }
  }

  throw new Error(`Could not open prototype report link ${label}.`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readPrototypeFixture(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  prototypeBaseUrl: string,
): Promise<PrototypeVisualData> {
  const context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport,
  });
  const page = await context.newPage();

  try {
    await page.goto(prototypeBaseUrl);
    await page.waitForFunction(() =>
      Boolean((window as { VERSO_DATA?: unknown }).VERSO_DATA),
    );

    return await page.evaluate(() => {
      const rawData = JSON.parse(
        JSON.stringify((window as { VERSO_DATA: unknown }).VERSO_DATA),
      ) as PrototypeVisualData;
      const content = document.querySelector(".v-content");
      const firstSection = content?.querySelector("section");
      const metricGrid = firstSection?.children.item(1);
      const metricBlocks = metricGrid
        ? Array.from(metricGrid.children).slice(0, 4)
        : [];
      const metricDetails = metricBlocks.map((block) => {
        const eyebrowTexts = Array.from(block.querySelectorAll(".v-eyebrow"))
          .map((element) => element.textContent?.trim() ?? "")
          .filter((value) => value.length > 0);

        return {
          detail: eyebrowTexts.at(-1) ?? "",
          label: eyebrowTexts[0] ?? "",
        };
      });

      return {
        ...rawData,
        calmOverviewMetricDetails: {
          completedDetail:
            metricDetails.find((detail) => detail.label === "Completed")
              ?.detail ?? "37 % of library",
          hoursDetail:
            metricDetails.find((detail) => detail.label === "Hours")?.detail ??
            "median 11.4 h / book",
          itemsDetail:
            metricDetails.find((detail) => detail.label === "Items")?.detail ??
            "incl. 8 no-longer-present",
          openFindingsDetail:
            metricDetails.find((detail) => detail.label === "Open findings")
              ?.detail ?? "advisory only",
        },
      } satisfies PrototypeVisualData;
    });
  } finally {
    await context.close();
  }
}

function transformLibraryItem(item: PrototypeItem): LibraryItemDto {
  return {
    asin: item.asin,
    authors: [item.author],
    coverImages: [
      {
        cachedAsset: {
          cachedAtUtc: "2026-01-02T03:04:05.000Z",
          contentType: "image/svg+xml",
          sizeBytes: 1024,
          url: `/api/library/items/${encodeURIComponent(item.asin)}/cover-images/500`,
        },
        sourceUrl: `https://images.audible.test/${item.asin}-500.jpg`,
        variant: "500",
      },
    ],
    coverSeed: item.product_image_seed,
    hasSnapshots: item.percent_complete > 0 || !item._present,
    isNoLongerPresent: !item._present,
    narrators: item.narrators,
    percentComplete: item.percent_complete,
    rawAudiblePayload: JSON.stringify(item),
    runtimeMinutes: item.runtime_length_min,
    title: item.title,
  };
}

function renderCachedCoverSvg(item: LibraryItemDto): string {
  const palette = getCoverPalette(item.coverSeed ?? hashString(item.asin));
  const titleLines = splitCoverTitle(item.title);
  const author = escapeXml((item.authors[0] ?? "Unknown").toUpperCase());

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="${palette.background}"/><path d="M0 240 240 84v156z" fill="${palette.accent}" opacity=".18"/><text x="22" y="40" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="13" letter-spacing="2" opacity=".78">${author}</text>${titleLines.map((line, index) => `<text x="22" y="${126 + index * 30}" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(line)}</text>`).join("")}</svg>`;
}

function splitCoverTitle(title: string): string[] {
  const words = title.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines.at(-1);
    if (!currentLine || currentLine.length + word.length > 15) {
      lines.push(word);
      continue;
    }

    lines[lines.length - 1] = `${currentLine} ${word}`;
  }

  return lines.slice(0, 3);
}

function getCoverPalette(seed: number): {
  accent: string;
  background: string;
  foreground: string;
} {
  const palettes = [
    { accent: "#c2410c", background: "#0b0e14", foreground: "#fafbfc" },
    { accent: "#0b0e14", background: "#c2410c", foreground: "#fef6ef" },
    { accent: "#f0825c", background: "#1e2330", foreground: "#fafbfc" },
    { accent: "#3a6b8c", background: "#3a6b8c", foreground: "#fafbfc" },
    { accent: "#f0825c", background: "#5c7a55", foreground: "#fef6ef" },
    { accent: "#f0825c", background: "#8c4156", foreground: "#fafbfc" },
    { accent: "#1e2330", background: "#b58a3e", foreground: "#fafbfc" },
    { accent: "#fef6ef", background: "#4f7f7c", foreground: "#fafbfc" },
    { accent: "#f0825c", background: "#6b5478", foreground: "#fafbfc" },
    { accent: "#e2541a", background: "#2d3340", foreground: "#fafbfc" },
    { accent: "#c2410c", background: "#fafbfc", foreground: "#0b0e14" },
    { accent: "#c2410c", background: "#fdead9", foreground: "#0b0e14" },
    { accent: "#3a6b8c", background: "#eceff4", foreground: "#0b0e14" },
  ] as const;

  return palettes[Math.abs(seed) % palettes.length];
}

function hashString(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }

  return hash;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

function transformItemDetail(
  item: PrototypeItem,
  data: PrototypeVisualData,
): LibraryItemDetailDto {
  return {
    asin: item.asin,
    currentAudibleFacts: {
      authors: [item.author],
      hasCompanionPdf: item.has_pdf,
      isReturnable: item.is_returnable,
      narrators: item.narrators,
      percentComplete: item.percent_complete,
      publisherSummary: item.publisher_summary,
      rawAudiblePayload: JSON.stringify(item),
      runtimeMinutes: item.runtime_length_min,
      title: item.title,
    },
    isNoLongerPresent: !item._present,
    series: item.series
      ? [
          {
            sequence: String(item.series.position),
            title: item.series.name,
          },
        ]
      : [],
    snapshotHistory:
      item.percent_complete > 0 || !item._present
        ? [
            {
              field: "percent_complete",
              observedAtUtc: data.lastRefresh,
              value: `${item.percent_complete}%`,
            },
            {
              field: "_present",
              observedAtUtc: data.lastRefresh,
              value: item._present ? "Present" : "No longer present",
            },
          ]
        : [],
    versoAnnotations: {
      isDropped: item.is_dropped,
      note: null,
      tags: item.tags,
    },
  };
}

async function buildMaskLocators(
  page: Page,
  selectors: readonly string[],
): Promise<Locator[]> {
  const locators: Locator[] = [];

  for (const selector of selectors) {
    const locator = page.locator(selector);

    if ((await locator.count()) > 0) {
      locators.push(locator.first());
    }
  }

  return locators;
}

function getBaselinePath(stateId: string): string {
  return join(visualBaselineDirectory, `${stateId}.png`);
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopProcess(
  processHandle: ReturnType<typeof spawn>,
): Promise<void> {
  if (!processHandle.pid) {
    return;
  }

  processHandle.kill("SIGTERM");

  const exitResult = await Promise.race([
    once(processHandle, "exit").then(() => "exited"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 5_000)),
  ]);

  if (exitResult === "timeout") {
    processHandle.kill("SIGKILL");
    await once(processHandle, "exit");
  }
}
