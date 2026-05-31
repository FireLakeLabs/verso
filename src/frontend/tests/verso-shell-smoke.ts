import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page, type Route } from "@playwright/test";
import type { LibraryItemsResponse } from "../src/library-api";

const frontendPort = Number.parseInt(
  process.env.VERSO_FRONTEND_PORT ?? "5202",
  10,
);
const backendPort = Number.parseInt(
  process.env.VERSO_BACKEND_PORT ?? "7202",
  10,
);
const baseUrl = `http://127.0.0.1:${frontendPort}`;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const backendProject = fileURLToPath(
  new URL("../../../src/backend/Verso.Api/Verso.Api.csproj", import.meta.url),
);
const smokeDataDirectory = mkdtempSync(join(tmpdir(), "verso-smoke-"));
const cachedCoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#2d4f64"/><path d="M0 240 240 84v156z" fill="#d97757" opacity=".32"/><text x="22" y="44" fill="#f6f4ef" font-family="Arial" font-size="16" letter-spacing="2">SMOKE AUTHOR</text><text x="22" y="136" fill="#f6f4ef" font-family="Arial" font-size="28" font-weight="700">Cached</text><text x="22" y="170" fill="#f6f4ef" font-family="Arial" font-size="28" font-weight="700">Cover</text></svg>`;

const backend = spawn(
  "dotnet",
  ["run", "--project", backendProject, "--no-launch-profile"],
  {
    env: {
      ...process.env,
      VERSO_BACKEND_PORT: String(backendPort),
      VERSO_DATA_DIRECTORY: smokeDataDirectory,
    },
    stdio: "ignore",
  },
);

const server = spawn(
  "node",
  ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--strictPort"],
  {
    env: {
      ...process.env,
      VERSO_FRONTEND_PORT: String(frontendPort),
      VERSO_BACKEND_PORT: String(backendPort),
    },
    stdio: "inherit",
  },
);

try {
  await waitForServer(`${backendUrl}/health`);
  await waitForServer(baseUrl);

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await installCoverWallSmokeRoutes(page);
    await gotoWithRetry(page, baseUrl);
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    const primaryNavText = (await primaryNav.textContent()) ?? "";

    await page.getByRole("heading", { name: "Library overview" }).waitFor();
    assert.equal(
      await page.getByRole("heading", { name: "Library overview" }).isVisible(),
      true,
    );
    assert.match(primaryNavText, /Overview/);
    assert.match(primaryNavText, /Library/);
    assert.match(primaryNavText, /Shelves/);
    assert.match(primaryNavText, /Covers/);
    assert.match(primaryNavText, /Reports/);
    assert.match(primaryNavText, /Health/);
    assert.match(primaryNavText, /Export/);
    assert.match(primaryNavText, /Settings/);
    assert.equal(
      await page
        .getByRole("button", { name: /Search command palette placeholder/i })
        .isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Reports" }).isVisible(),
      true,
    );

    await page
      .getByRole("button", { name: /^Listening cadence/ })
      .evaluate((element) => element.click());
    await page.getByRole("heading", { name: "Listening cadence" }).waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Listening cadence" })
        .isVisible(),
      true,
    );

    await page
      .getByRole("button", { name: /^Runtime distribution/ })
      .evaluate((element) => element.click());
    await page.getByRole("heading", { name: "Runtime distribution" }).waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Runtime distribution" })
        .isVisible(),
      true,
    );

    await page.getByRole("button", { name: "Covers" }).click();
    await page.locator("h1").filter({ hasText: "Cover wall" }).waitFor();
    assert.equal(
      await page
        .getByRole("img", { name: "Cover art for Cached Cover Smoke" })
        .isVisible(),
      true,
    );
    assert.equal(
      await page.getByText("Cover not cached").first().isVisible(),
      true,
    );
  } finally {
    await browser.close();
  }

  console.log("Verso shell smoke passed");
} finally {
  await stopChildProcess(server);
  await stopChildProcess(backend);

  rmSync(smokeDataDirectory, { force: true, recursive: true });
}

async function stopChildProcess(process: ReturnType<typeof spawn>) {
  if (!process.pid || process.exitCode !== null) {
    return;
  }

  process.kill("SIGTERM");

  const exited = await waitForChildProcessExit(process, 5_000);
  if (exited || process.exitCode !== null) {
    return;
  }

  process.kill("SIGKILL");
  await waitForChildProcessExit(process, 5_000);
}

async function waitForChildProcessExit(
  process: ReturnType<typeof spawn>,
  timeoutMs: number,
) {
  if (process.exitCode !== null) {
    return true;
  }

  return await Promise.race([
    once(process, "exit").then(() => true),
    new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), timeoutMs),
    ),
  ]);
}

async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { timeout: 5_000, waitUntil: "commit" });
      return;
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.message.includes("ERR_ABORTED")) {
        return;
      }

      if (!(error instanceof Error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function installCoverWallSmokeRoutes(page: Page) {
  const response: LibraryItemsResponse = {
    items: [
      {
        asin: "B00SMOKE001",
        authors: ["Smoke Author"],
        coverImages: [
          {
            cachedAsset: {
              cachedAtUtc: "2026-01-02T03:04:05.000Z",
              contentType: "image/svg+xml",
              sizeBytes: cachedCoverSvg.length,
              url: "/api/library/items/B00SMOKE001/cover-images/500",
            },
            sourceUrl: "https://images.audible.test/smoke-cached.jpg",
            variant: "500",
          },
        ],
        hasSnapshots: false,
        isNoLongerPresent: false,
        narrators: ["Smoke Narrator"],
        percentComplete: 20,
        rawAudiblePayload: JSON.stringify({ purchase_date: "2026-01-02" }),
        runtimeMinutes: 480,
        title: "Cached Cover Smoke",
      },
      {
        asin: "B00SMOKE002",
        authors: ["Smoke Author"],
        coverImages: [
          {
            cachedAsset: null,
            sourceUrl: "https://images.audible.test/remote-only.jpg",
            variant: "500",
          },
        ],
        hasSnapshots: false,
        isNoLongerPresent: false,
        narrators: ["Smoke Narrator"],
        percentComplete: 0,
        rawAudiblePayload: JSON.stringify({ purchase_date: "2026-01-01" }),
        runtimeMinutes: 300,
        title: "Missing Cover Smoke",
      },
    ],
  };

  await page.route(
    "**/api/library/items/B00SMOKE001/cover-images/500",
    async (route) => {
      await route.fulfill({
        body: cachedCoverSvg,
        contentType: "image/svg+xml",
        status: 200,
      });
    },
  );
  await page.route("**/api/library/items", async (route) => {
    await fulfillJson(route, response);
  });
  await page.route("**/api/library/items?*", async (route) => {
    await fulfillJson(route, response);
  });
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status: 200,
  });
}

async function waitForServer(url: string) {
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
