import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellDestinations, shellSummary } from "./shell-model";

describe("Verso shell model", () => {
  it("names the Solid v1 starting points", () => {
    assert.deepEqual(shellDestinations, [
      "Library Table",
      "Health Check",
      "Tags",
      "Archive Export",
    ]);
  });

  it("describes a local Audible Library workspace", () => {
    assert.match(shellSummary, /Audible Library/);
  });
});
