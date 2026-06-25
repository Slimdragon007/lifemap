import { afterEach, describe, expect, test } from "vitest";
import {
  authoritativeRemoteState,
  clearStoredDemoState,
  emptyPersistedState,
  initialAppState,
  loadStoredDemoState,
  saveStoredDemoState,
  shouldShowOnboarding,
  normalizeStoredDemoState,
} from "./storage";
import { defaultSetupProfile } from "./setupBuckets";
import {
  presentationAnalysis,
  presentationBrief,
  presentationIntake,
} from "./demoSeed";
import type { DailyBrief } from "./dailyBrief";

const dailyBrief: DailyBrief = {
  todaySummary: "School form is the clearest thing to move today.",
  topPriorities: [
    {
      id: "priority-form",
      label: "Sign the form",
      reason: "It is due this week.",
    },
  ],
  openLoops: [],
  canWait: [],
  suggestedMessages: [],
  conflicts: [],
  groundingNote: "Grounded in current map.",
};

describe("demo browser storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  test("saves and restores demo login, intake, analysis, and disabled approvals", () => {
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "messy school email",
      analysis: {
        dueItems: [],
        missingInfo: [],
        waitingOn: [],
        nextActions: [],
        reminders: [],
        draftMessages: [],
        sourceEvidence: [],
      },
      disabledApprovalIds: ["reminder-slip"],
      savedSuggestionIds: ["ai-event-slip"],
      dismissedSuggestionIds: ["ai-vault-noise"],
      approvalBodyEdits: {
        "draft-slip": "Edited draft body",
        "reminder-slip": "Edited reminder body",
      },
      dailyBrief,
    });

    expect(loadStoredDemoState()).toEqual({
      isLoggedIn: true,
      intake: "messy school email",
      analysis: {
        dueItems: [],
        missingInfo: [],
        waitingOn: [],
        nextActions: [],
        reminders: [],
        draftMessages: [],
        sourceEvidence: [],
      },
      disabledApprovalIds: ["reminder-slip"],
      savedSuggestionIds: ["ai-event-slip"],
      dismissedSuggestionIds: ["ai-vault-noise"],
      approvalBodyEdits: {
        "draft-slip": "Edited draft body",
        "reminder-slip": "Edited reminder body",
      },
      dailyBrief,
    });
  });

  test("ignores invalid stored approval body edits", () => {
    localStorage.setItem(
      "lifemap-demo-state",
      JSON.stringify({
        approvalBodyEdits: {
          "draft-slip": "Edited draft body",
          "broken-slip": 42,
        },
      }),
    );

    expect(loadStoredDemoState()).toEqual({
      approvalBodyEdits: {
        "draft-slip": "Edited draft body",
      },
    });
  });

  test("normalizes stored suggestion review ids", () => {
    localStorage.setItem(
      "lifemap-demo-state",
      JSON.stringify({
        savedSuggestionIds: ["ai-event-slip", 42],
        dismissedSuggestionIds: [false, "ai-vault-noise"],
      }),
    );

    expect(loadStoredDemoState()).toEqual({
      savedSuggestionIds: ["ai-event-slip"],
      dismissedSuggestionIds: ["ai-vault-noise"],
    });
  });

  test("ignores invalid stored daily briefs", () => {
    localStorage.setItem(
      "lifemap-demo-state",
      JSON.stringify({
        dailyBrief: {
          todaySummary: "too thin",
        },
      }),
    );

    expect(loadStoredDemoState()).toEqual({});
  });

  test("ignores corrupt stored state", () => {
    localStorage.setItem("lifemap-demo-state", "{not json");

    expect(loadStoredDemoState()).toEqual({});
  });
});

describe("clear demo state", () => {
  test("clearStoredDemoState removes the stored blob", () => {
    saveStoredDemoState({ isLoggedIn: true, intake: "note" });
    clearStoredDemoState();
    expect(localStorage.getItem("lifemap-demo-state")).toBeNull();
  });
});

describe("authoritative remote state", () => {
  test("empty baseline has no seed content", () => {
    const empty = emptyPersistedState();
    expect(empty.intake).toBe("");
    expect(empty.analysis?.dueItems).toEqual([]);
    expect(empty.setupBucketIds).toEqual([]);
  });

  test("remote fields win; unset fields reset to empty (not seed/local)", () => {
    const result = authoritativeRemoteState({ intake: "real cloud note" });
    expect(result.intake).toBe("real cloud note");
    expect(result.analysis).toEqual(emptyPersistedState().analysis);
    expect(result.dailyBrief).toEqual(emptyPersistedState().dailyBrief);
    expect(result.setupBucketIds).toEqual([]);
  });
});

describe("initialAppState", () => {
  test("real mode returns the empty persisted state and ignores stored demo data", () => {
    const result = initialAppState({
      demoMode: false,
      stored: { intake: "leftover demo notes", isLoggedIn: true },
    });

    expect(result.intake).toBe("");
    expect(result.analysis).toEqual(emptyPersistedState().analysis);
    expect(result.dailyBrief).toEqual(emptyPersistedState().dailyBrief);
    expect(result.isLoggedIn).toBeUndefined();
  });

  test("demo mode with no stored state seeds the presentation demo", () => {
    const result = initialAppState({ demoMode: true, stored: {} });

    expect(result.intake).toBe(presentationIntake);
    expect(result.analysis).toEqual(presentationAnalysis);
    expect(result.dailyBrief).toEqual(presentationBrief);
  });

  test("demo mode lets stored values override the demo seeds", () => {
    const result = initialAppState({
      demoMode: true,
      stored: { intake: "my own notes" },
    });

    expect(result.intake).toBe("my own notes");
    expect(result.analysis).toEqual(presentationAnalysis);
  });
});

describe("shouldShowOnboarding", () => {
  test("shows for a brand-new account: no flag, no data, no localStorage", () => {
    expect(shouldShowOnboarding({}, false)).toBe(true);
  });

  test("hides when persisted onboarded === true (any device, no localStorage)", () => {
    expect(shouldShowOnboarding({ onboarded: true }, false)).toBe(false);
  });

  test("falls back to the localStorage flag when remote has no onboarded flag", () => {
    expect(shouldShowOnboarding({}, true)).toBe(false);
  });

  test("does not re-onboard legacy accounts with real setup data", () => {
    // Existing users predate the onboarded flag; presence of a setup profile or
    // buckets means they already used the app and must not be interrupted.
    expect(
      shouldShowOnboarding({ setupProfile: defaultSetupProfile }, false),
    ).toBe(false);
    expect(shouldShowOnboarding({ setupBucketIds: ["money-admin"] }, false)).toBe(
      false,
    );
  });

  test("onboarded survives a normalize round-trip (persisted to remote state)", () => {
    expect(normalizeStoredDemoState({ onboarded: true }).onboarded).toBe(true);
    expect(normalizeStoredDemoState({ onboarded: false }).onboarded).toBe(
      false,
    );
    expect(normalizeStoredDemoState({}).onboarded).toBeUndefined();
  });
});
