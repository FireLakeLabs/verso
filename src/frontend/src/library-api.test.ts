import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createLibraryApi } from "./library-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("library api", () => {
  it("requests backend health findings instead of deriving them locally", async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      requestedUrls.push(String(input));
      return new Response(
        JSON.stringify({
          findings: [],
          summary: {
            acknowledgedCount: 0,
            currentCount: 0,
            dismissedCount: 0,
            historicalCount: 0,
            openCount: 0,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    const api = createLibraryApi("http://localhost:7207");

    await api.getHealthFindings("dispositioned");

    assert.deepEqual(requestedUrls, [
      "http://localhost:7207/api/library/health-findings?view=dispositioned",
    ]);
  });

  it("persists health finding dispositions through the backend endpoint", async () => {
    let capturedBody = "";
    globalThis.fetch = (async (_input, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          disposition: {
            status: "dismissed",
            updatedAtUtc: "2026-05-31T00:00:00Z",
          },
          updated: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    const api = createLibraryApi("http://localhost:7207");

    const response = await api.updateHealthFindingDisposition("finding/id", {
      status: "dismissed",
    });

    assert.equal(capturedBody, JSON.stringify({ status: "dismissed" }));
    assert.equal(response.disposition?.status, "dismissed");
  });

  it("surfaces ProblemDetails titles for invalid settings updates", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ status: 400, title: "Invalid settings update." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )) as typeof fetch;

    const api = createLibraryApi("http://localhost:7208");

    await assert.rejects(
      () =>
        api.updateSettings({
          costBasis: {
            currencyCode: "USD",
            defaultBasis: "per-credit-value",
            perCreditValue: 21474836.48,
          },
        }),
      (error: unknown) =>
        error instanceof Error && error.message === "Invalid settings update.",
    );
  });
});
