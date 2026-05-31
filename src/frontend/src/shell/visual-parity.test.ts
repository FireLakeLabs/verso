import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expectReportTransformModule } from "../test/report-test-harness";
import {
  buildVisualParitySearch,
  defaultShellPreferences,
  getVisualParityState,
  normalizeShellPreferences,
  readVisualParityStateId,
  visualParityStates,
} from "./visual-parity";

describe("visual parity shell model", () => {
  it("stays in a plain TypeScript module without React or component imports", () => {
    expectReportTransformModule(new URL("./visual-parity.ts", import.meta.url));
  });

  it("defaults to the signed-off Firelake shell preferences", () => {
    assert.deepEqual(defaultShellPreferences, {
      nav: "topnav",
      overview: "calm",
      libraryView: "rows",
    });

    assert.deepEqual(normalizeShellPreferences(), defaultShellPreferences);
    assert.deepEqual(
      normalizeShellPreferences({
        nav: "sidebar",
        overview: "dense",
        libraryView: "cards",
      }),
      {
        nav: "sidebar",
        overview: "dense",
        libraryView: "cards",
      },
    );
  });

  it("defines the stable prototype-derived reference states for issue 24", () => {
    assert.deepEqual(
      visualParityStates.map((state) => state.id),
      [
        "overview-topnav-calm",
        "overview-topnav-dense",
        "overview-sidebar-calm",
        "library-rows",
        "library-cards",
        "report-cadence",
        "report-authors",
        "report-runtime",
        "report-cost",
        "report-genre",
        "report-keywords",
        "report-narrators",
        "settings-interface",
      ],
    );

    assert.deepEqual(
      visualParityStates.map((state) => ({
        id: state.id,
        view: state.view,
        nav: state.preferences.nav,
        overview: state.preferences.overview,
        libraryView: state.preferences.libraryView,
      })),
      [
        {
          id: "overview-topnav-calm",
          view: "overview",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "overview-topnav-dense",
          view: "overview",
          nav: "topnav",
          overview: "dense",
          libraryView: "rows",
        },
        {
          id: "overview-sidebar-calm",
          view: "overview",
          nav: "sidebar",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "library-rows",
          view: "library",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "library-cards",
          view: "library",
          nav: "topnav",
          overview: "calm",
          libraryView: "cards",
        },
        {
          id: "report-cadence",
          view: "report-cadence",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-authors",
          view: "report-authors",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-runtime",
          view: "report-runtime",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-cost",
          view: "report-cost",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-genre",
          view: "report-genre",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-keywords",
          view: "report-keywords",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "report-narrators",
          view: "report-narrators",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
        {
          id: "settings-interface",
          view: "settings",
          nav: "topnav",
          overview: "calm",
          libraryView: "rows",
        },
      ],
    );
  });

  it("serializes and resolves parity state identifiers for deterministic URLs", () => {
    assert.equal(
      buildVisualParitySearch("overview-topnav-calm"),
      "?parity=overview-topnav-calm",
    );
    assert.equal(
      readVisualParityStateId("?parity=library-cards&nav=sidebar"),
      "library-cards",
    );
    assert.equal(readVisualParityStateId("?nav=topnav"), null);
    assert.deepEqual(
      getVisualParityState("settings-interface"),
      visualParityStates.find((state) => state.id === "settings-interface"),
    );
    assert.equal(getVisualParityState("missing-state"), null);
  });
});
