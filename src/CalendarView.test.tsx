import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import CalendarView from "./CalendarView";
import type { LifeMapAnalysis } from "./lifemap";
import { familyEvents, recurringCareItems } from "./familyOS";
import { getGoogleStatus, pushCalendarEvent } from "./api";
import { getAccessToken } from "./supabaseClient";

vi.mock("./api", async (importActual) => ({
  ...(await importActual<typeof import("./api")>()),
  getGoogleStatus: vi.fn(),
  pushCalendarEvent: vi.fn(),
}));
vi.mock("./supabaseClient", async (importActual) => ({
  ...(await importActual<typeof import("./supabaseClient")>()),
  getAccessToken: vi.fn(),
}));

const mockGetGoogleStatus = vi.mocked(getGoogleStatus);
const mockPushCalendarEvent = vi.mocked(pushCalendarEvent);
const mockGetAccessToken = vi.mocked(getAccessToken);

beforeEach(() => {
  mockGetAccessToken.mockResolvedValue(undefined);
  mockGetGoogleStatus.mockResolvedValue({ ok: true, connected: false });
  mockPushCalendarEvent.mockResolvedValue({ ok: false, error: "x" });
});

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

describe("CalendarView Google push", () => {
  const savedAnalysis: LifeMapAnalysis = {
    ...emptyMap,
    dueItems: [
      {
        id: "d1",
        title: "Renew passport",
        dueDate: "2026-07-12",
        sourceQuote: "passport checklist",
      },
    ],
  };

  test("pushes a saved event to Google Calendar on tap", async () => {
    mockGetAccessToken.mockResolvedValue("token-123");
    mockGetGoogleStatus.mockResolvedValue({ ok: true, connected: true });
    mockPushCalendarEvent.mockResolvedValue({ ok: true, id: "g1" });

    render(
      <CalendarView
        analysis={savedAnalysis}
        dismissedSuggestionIds={new Set()}
        familyEvents={[]}
        recurringCareItems={[]}
        savedSuggestionIds={new Set(["ai-event-d1"])}
        {...handlers}
      />,
    );

    const button = await screen.findByRole("button", {
      name: /Add to Google Calendar/i,
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByText(/On your Google Calendar/i)).toBeInTheDocument(),
    );
    expect(mockPushCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ai-event-d1", title: "Renew passport" }),
      "token-123",
    );
  });

  test("hides the Google button when not connected", async () => {
    mockGetAccessToken.mockResolvedValue("token-123");
    mockGetGoogleStatus.mockResolvedValue({ ok: true, connected: false });

    render(
      <CalendarView
        analysis={savedAnalysis}
        dismissedSuggestionIds={new Set()}
        familyEvents={[]}
        recurringCareItems={[]}
        savedSuggestionIds={new Set(["ai-event-d1"])}
        {...handlers}
      />,
    );

    expect(screen.getByText(/Saved to LifeMap/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Add to Google Calendar/i }),
      ).toBeNull(),
    );
  });
});
