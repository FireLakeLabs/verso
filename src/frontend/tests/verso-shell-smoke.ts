import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";

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
