import { afterEach, describe, expect, test } from "vitest";
import { loadStoredDemoState, saveStoredDemoState } from "./storage";
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
        sourceEvidence: []
      },
      disabledApprovalIds: ["reminder-slip"],
      approvalBodyEdits: {
        "draft-slip": "Edited draft body",
        "reminder-slip": "Edited reminder body"
      },
      dailyBrief
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
        sourceEvidence: []
      },
      disabledApprovalIds: ["reminder-slip"],
      approvalBodyEdits: {
        "draft-slip": "Edited draft body",
        "reminder-slip": "Edited reminder body"
      },
      dailyBrief
    });
  });

  test("ignores invalid stored approval body edits", () => {
    localStorage.setItem(
      "lifemap-demo-state",
      JSON.stringify({
        approvalBodyEdits: {
          "draft-slip": "Edited draft body",
          "broken-slip": 42
        }
      })
    );

    expect(loadStoredDemoState()).toEqual({
      approvalBodyEdits: {
        "draft-slip": "Edited draft body"
      }
    });
  });

  test("ignores invalid stored daily briefs", () => {
    localStorage.setItem(
      "lifemap-demo-state",
      JSON.stringify({
        dailyBrief: {
          todaySummary: "too thin"
        }
      })
    );

    expect(loadStoredDemoState()).toEqual({});
  });

  test("ignores corrupt stored state", () => {
    localStorage.setItem("lifemap-demo-state", "{not json");

    expect(loadStoredDemoState()).toEqual({});
  });
});
