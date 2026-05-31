import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createLibraryApi } from "./library-api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("library api", () => {
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
