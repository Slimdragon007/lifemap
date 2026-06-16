import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import CalendarView from "./CalendarView";
import type { LifeMapAnalysis } from "./lifemap";
import { familyEvents, recurringCareItems } from "./familyOS";

const emptyMap: LifeMapAnalysis = {
  dueItems: [],
  missingInfo: [],
  waitingOn: [],
  nextActions: [],
  reminders: [],
  draftMessages: [],
  sourceEvidence: [],
};

const handlers = {
  onSaveSuggestion: vi.fn(),
  onSaveSuggestions: vi.fn(),
  onDismissSuggestion: vi.fn(),
};

describe("CalendarView de-demo", () => {
  test("a real viewer sees no demo events and gets empty states", () => {
    render(
      <CalendarView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyEvents={[]}
        recurringCareItems={[]}
        savedSuggestionIds={new Set()}
        {...handlers}
      />,
    );

    expect(screen.queryByText(/Field trip permission slip due/i)).toBeNull();
    expect(screen.getByText(/No events yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No recurring loops yet/i)).toBeInTheDocument();
  });

  test("demo mode still renders the sample events and recurring loops", () => {
    render(
      <CalendarView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyEvents={familyEvents}
        recurringCareItems={recurringCareItems}
        savedSuggestionIds={new Set()}
        {...handlers}
      />,
    );

    expect(
      screen.getByText(/Field trip permission slip due/i),
    ).toBeInTheDocument();
  });
});
