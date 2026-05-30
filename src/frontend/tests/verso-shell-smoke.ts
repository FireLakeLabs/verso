import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "@playwright/test";

const frontendPort = Number.parseInt(
  process.env.VERSO_FRONTEND_PORT ?? "5202",
  10,
);
const baseUrl = `http://127.0.0.1:${frontendPort}`;

const server = spawn(
  "node",
  ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--strictPort"],
  {
    env: { ...process.env, VERSO_FRONTEND_PORT: String(frontendPort) },
    stdio: "inherit",
  },
);

try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(baseUrl);

    await page.getByRole("heading", { name: "Verso" }).waitFor();
    assert.equal(await page.getByText("Library Table").isVisible(), true);
    assert.equal(
      await page.getByRole("button", { name: /ready for import/i }).isVisible(),
      true,
    );
  } finally {
    await browser.close();
  }

  console.log("Verso shell smoke passed");
} finally {
  if (server.pid) {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
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
