import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectReportTransformModule } from "./report-test-harness";

describe("report test harness", () => {
  it("accepts a plain TypeScript report module", () => {
    assert.doesNotThrow(() => {
      expectReportTransformModule(
        new URL(
          "./fixtures/report-module-boundary/clean-report-module.ts",
          import.meta.url,
        ),
      );
    });
  });

  it("rejects side-effect React imports", () => {
    assert.throws(() => {
      expectReportTransformModule(
        new URL(
          "./fixtures/report-module-boundary/react-side-effect-import.ts",
          import.meta.url,
        ),
      );
    });
  });

  it("rejects nested react-dom entry points", () => {
    assert.throws(() => {
      expectReportTransformModule(
        new URL(
          "./fixtures/report-module-boundary/react-dom-client-import.ts",
          import.meta.url,
        ),
      );
    });
  });

  it("rejects deep relative component imports", () => {
    assert.throws(() => {
      expectReportTransformModule(
        new URL(
          "./fixtures/report-module-boundary/nested/deep-component-import.ts",
          import.meta.url,
        ),
      );
    });
  });
});
