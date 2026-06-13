import { describe, expect, test } from "vitest";
import {
  buildDailyBriefFromAnalysis,
  normalizeDailyBrief,
  type DailyBrief,
} from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";

const brief: DailyBrief = {
  todaySummary: "Casey's school form is the clearest thing to move today.",
  topPriorities: [
    {
      id: "priority-slip",
      label: "Return the permission slip",
      reason: "It is due this week.",
    },
  ],
  openLoops: [
    {
      id: "loop-signature",
      label: "Parent signature",
      blockedBy: "Need Alex to sign the form.",
    },
  ],
  canWait: [
    {
      id: "wait-passport",
      label: "Passport folder",
      reason: "No deadline today.",
    },
  ],
  suggestedMessages: [
    {
      id: "message-teacher",
      recipient: "Ms. Rivera",
      subject: "Permission slip",
      body: "Hi, I will send this back tomorrow.",
      status: "Needs review",
    },
  ],
  conflicts: [],
  groundingNote: "Based only on the current LifeMap analysis.",
};

const analysis: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-slip",
      title: "Field trip permission slip",
      dueDate: "Jun 18, 2026",
      sourceQuote: "Permission slip is due Friday 6/18.",
    },
  ],
  missingInfo: [
    {
      id: "missing-signature",
      label: "Parent signature",
      reason: "The form cannot be returned unsigned.",
      sourceQuote: "Missing parent signature.",
    },
  ],
  waitingOn: [
    {
      id: "wait-taylor",
      name: "Taylor",
      reason: "Confirm whether they can attend the appointment.",
    },
  ],
  nextActions: [
    {
      id: "action-sign",
      label: "Sign the permission slip",
      owner: "Alex",
    },
    {
      id: "action-return",
      label: "Return the form to school",
      owner: "Alex",
    },
    {
      id: "action-pay",
      label: "Pay the $12 activity fee",
      owner: "Alex",
    },
    {
      id: "action-extra",
      label: "This should not appear",
      owner: "Alex",
    },
  ],
  reminders: [],
  draftMessages: [brief.suggestedMessages[0]],
  sourceEvidence: [
    {
      id: "source-school",
      type: "portal",
      label: "School portal",
      quote: "Permission slip is due Friday 6/18.",
    },
  ],
};

describe("daily brief schema", () => {
  test("normalizes a valid brief and limits top priorities to three", () => {
    const result = normalizeDailyBrief({
      ...brief,
      topPriorities: [
        ...brief.topPriorities,
        { id: "priority-2", label: "Second", reason: "Useful." },
        { id: "priority-3", label: "Third", reason: "Useful." },
        { id: "priority-4", label: "Fourth", reason: "Too many." },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.brief.topPriorities).toHaveLength(3);
  });

  test("rejects incomplete AI output with a safe error", () => {
    expect(normalizeDailyBrief({ todaySummary: "too thin" })).toEqual({
      ok: false,
      error: "LifeMap could not understand the daily brief.",
    });
  });

  test("builds a deterministic daily brief from the current map", () => {
    const result = buildDailyBriefFromAnalysis(analysis);

    expect(result.topPriorities.map((item) => item.label)).toEqual([
      "Sign the permission slip",
      "Return the form to school",
      "Pay the $12 activity fee",
    ]);
    expect(result.openLoops[0].label).toBe("Parent signature");
    expect(result.suggestedMessages[0].recipient).toBe("Ms. Rivera");
    expect(result.groundingNote).toContain("School portal");
  });
});
