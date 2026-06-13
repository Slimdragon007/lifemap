import { describe, expect, test } from "vitest";
import { buildCalendarEventsFromAnalysis } from "./familyOS";
import type { LifeMapAnalysis } from "./lifemap";

function makeAnalysis(dueDate: string): LifeMapAnalysis {
  return {
    dueItems: [
      {
        id: "due-1",
        title: "School form",
        dueDate,
        sourceQuote: "Return the school form.",
      },
    ],
    missingInfo: [],
    waitingOn: [],
    nextActions: [],
    reminders: [],
    draftMessages: [],
    sourceEvidence: [],
  };
}

describe("family operating system projections", () => {
  test("does not silently turn unparseable due dates into today", () => {
    expect(buildCalendarEventsFromAnalysis(makeAnalysis("ASAP"))[0].date).toBe(
      "undated",
    );
  });

  test("rejects impossible numeric due dates", () => {
    expect(buildCalendarEventsFromAnalysis(makeAnalysis("13/40"))[0].date).toBe(
      "undated",
    );
  });
});
