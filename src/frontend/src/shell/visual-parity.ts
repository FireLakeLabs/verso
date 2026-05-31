const navigationChromeValues = ["topnav", "sidebar"] as const;
const overviewVariantValues = ["calm", "dense"] as const;
const libraryViewValues = ["rows", "cards"] as const;

export type NavigationChrome = (typeof navigationChromeValues)[number];
export type OverviewVariant = (typeof overviewVariantValues)[number];
export type LibraryViewMode = (typeof libraryViewValues)[number];
export type VisualParityView =
  | "library"
  | "overview"
  | "report-cadence"
  | "report-runtime"
  | "report-genre"
  | "report-keywords"
  | "settings";

export type ShellPreferences = {
  nav: NavigationChrome;
  overview: OverviewVariant;
  libraryView: LibraryViewMode;
};

export type PrototypeReferenceState = {
  activeView: VisualParityView;
  settingsSection: "interface" | null;
};

export type VisualParityState = {
  id: string;
  view: VisualParityView;
  preferences: ShellPreferences;
  prototype: PrototypeReferenceState;
};

export const defaultShellPreferences: ShellPreferences = {
  nav: "topnav",
  overview: "calm",
  libraryView: "rows",
};

export const visualParityStates: readonly VisualParityState[] = [
  createVisualParityState("overview-topnav-calm", {
    view: "overview",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("overview-topnav-dense", {
    view: "overview",
    preferences: {
      ...defaultShellPreferences,
      overview: "dense",
    },
  }),
  createVisualParityState("overview-sidebar-calm", {
    view: "overview",
    preferences: {
      ...defaultShellPreferences,
      nav: "sidebar",
    },
  }),
  createVisualParityState("library-rows", {
    view: "library",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("library-cards", {
    view: "library",
    preferences: {
      ...defaultShellPreferences,
      libraryView: "cards",
    },
  }),
  createVisualParityState("report-cadence", {
    view: "report-cadence",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("report-runtime", {
    view: "report-runtime",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("report-genre", {
    view: "report-genre",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("report-keywords", {
    view: "report-keywords",
    preferences: defaultShellPreferences,
  }),
  createVisualParityState("settings-interface", {
    view: "settings",
    preferences: defaultShellPreferences,
    settingsSection: "interface",
  }),
] as const;

export function buildVisualParitySearch(id: string): string {
  const params = new URLSearchParams();
  params.set("parity", id);
  return `?${params.toString()}`;
}

export function normalizeShellPreferences(
  preferences: Partial<Record<keyof ShellPreferences, unknown>> = {},
): ShellPreferences {
  return {
    nav: isNavigationChrome(preferences.nav)
      ? preferences.nav
      : defaultShellPreferences.nav,
    overview: isOverviewVariant(preferences.overview)
      ? preferences.overview
      : defaultShellPreferences.overview,
    libraryView: isLibraryViewMode(preferences.libraryView)
      ? preferences.libraryView
      : defaultShellPreferences.libraryView,
  };
}

export function getVisualParityState(id: string): VisualParityState | null {
  return visualParityStates.find((state) => state.id === id) ?? null;
}

export function readVisualParityStateId(search: string): string | null {
  const rawSearch = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(rawSearch);
  const parityStateId = params.get("parity");

  return parityStateId && parityStateId.length > 0 ? parityStateId : null;
}

function createVisualParityState(
  id: string,
  input: {
    view: VisualParityView;
    preferences: ShellPreferences;
    settingsSection?: "interface";
  },
): VisualParityState {
  return {
    id,
    view: input.view,
    preferences: normalizeShellPreferences(input.preferences),
    prototype: {
      activeView: input.view,
      settingsSection: input.settingsSection ?? null,
    },
  };
}

function isNavigationChrome(value: unknown): value is NavigationChrome {
  return (
    typeof value === "string" && includesValue(navigationChromeValues, value)
  );
}

function isOverviewVariant(value: unknown): value is OverviewVariant {
  return (
    typeof value === "string" && includesValue(overviewVariantValues, value)
  );
}

function isLibraryViewMode(value: unknown): value is LibraryViewMode {
  return typeof value === "string" && includesValue(libraryViewValues, value);
}

function includesValue<TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue {
  return values.includes(value as TValue);
}
