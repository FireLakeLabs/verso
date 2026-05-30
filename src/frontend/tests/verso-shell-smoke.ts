import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

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
    stdio: "inherit",
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
    await page.goto(baseUrl);

    await page.getByRole("heading", { name: "Verso Library" }).waitFor();
    assert.equal(
      await page.getByRole("heading", { name: "Library overview" }).isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Refresh status" }).isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Library table" }).isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Item detail" }).isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole("button", { name: /start refresh/i }).isVisible(),
      true,
    );
  } finally {
    await browser.close();
  }

  console.log("Verso shell smoke passed");
} finally {
  if (server.pid) {
    server.kill("SIGTERM");
    const exitResult = await Promise.race([
      once(server, "exit").then(() => "exited"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 5_000)),
    ]);

    if (exitResult === "timeout") {
      server.kill("SIGKILL");
      await once(server, "exit");
    }
  }

  if (backend.pid) {
    backend.kill("SIGTERM");
    const exitResult = await Promise.race([
      once(backend, "exit").then(() => "exited"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 5_000)),
    ]);

    if (exitResult === "timeout") {
      backend.kill("SIGKILL");
      await once(backend, "exit");
    }
  }

  rmSync(smokeDataDirectory, { force: true, recursive: true });
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
