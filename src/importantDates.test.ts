import { describe, expect, test } from "vitest";
import {
  daysUntil,
  nextOccurrence,
  relativeDayLabel,
  upcomingDates,
} from "./importantDates";
import type { FamilyEvent } from "./familyOS";

// Frozen "today" for deterministic math. Built in UTC so the assertions don't
// drift with the machine's timezone.
const TODAY = new Date("2026-06-23T00:00:00Z");

function event(partial: Partial<FamilyEvent>): FamilyEvent {
  return {
    id: partial.id ?? "e",
    title: partial.title ?? "Event",
    date: partial.date ?? "2026-06-30",
    time: "",
    layer: "admin",
    owner: partial.owner ?? "",
    source: "important-dates",
    eventCategory: partial.eventCategory,
    isAnnual: partial.isAnnual,
  };
}

describe("nextOccurrence", () => {
  test("non-annual returns the literal stored date", () => {
    expect(nextOccurrence("2026-07-05", false, TODAY)).toBe("2026-07-05");
    // a past one-off stays in the past (it's literal, not rolled)
    expect(nextOccurrence("2026-01-01", false, TODAY)).toBe("2026-01-01");
  });

  test("annual rolls a stored MM-DD into this year when still ahead", () => {
    // stored in 2010, birthday is 06-30 → next is 2026-06-30
    expect(nextOccurrence("2010-06-30", true, TODAY)).toBe("2026-06-30");
  });

  test("annual rolls to next year when this year's date already passed", () => {
    // 06-10 already passed 06-23 → 2027-06-10
    expect(nextOccurrence("1990-06-10", true, TODAY)).toBe("2027-06-10");
  });

  test("annual landing exactly on today counts as today (0 days)", () => {
    expect(nextOccurrence("2000-06-23", true, TODAY)).toBe("2026-06-23");
  });

  test("annual Feb-29 in a non-leap year normalizes to Mar-01", () => {
    // 2027 is not a leap year; Feb-29 must roll to Mar-01, not emit "2027-02-29".
    const feb29Today = new Date("2027-01-01T00:00:00Z");
    const result = nextOccurrence("2000-02-29", true, feb29Today);
    expect(result).toBe("2027-03-01");
    expect(daysUntil(result, feb29Today)).toBe(59);
  });
});

describe("daysUntil", () => {
  test("counts whole calendar days ahead", () => {
    expect(daysUntil("2026-06-30", TODAY)).toBe(7);
    expect(daysUntil("2026-07-05", TODAY)).toBe(12);
    expect(daysUntil("2026-06-23", TODAY)).toBe(0);
  });

  test("is negative for past dates", () => {
    expect(daysUntil("2026-06-20", TODAY)).toBe(-3);
  });
});

describe("upcomingDates", () => {
  test("filters to Important Dates within the window and sorts ascending", () => {
    const events: FamilyEvent[] = [
      event({ id: "renewal", date: "2026-07-05", eventCategory: "renewal" }),
      event({
        id: "bday",
        date: "2010-06-30",
        eventCategory: "birthday",
        isAnnual: true,
      }),
      // a generic calendar event (no eventCategory) must be excluded
      {
        ...event({ id: "generic", date: "2026-06-25" }),
        eventCategory: undefined,
      },
      // outside the 30-day window
      event({ id: "far", date: "2026-09-01", eventCategory: "custom" }),
    ];

    const result = upcomingDates(events, TODAY, 30);

    expect(result.map((r) => r.event.id)).toEqual(["bday", "renewal"]);
    expect(result[0].daysUntil).toBe(7);
    expect(result[1].daysUntil).toBe(12);
  });

  test("excludes past one-off dates", () => {
    const events: FamilyEvent[] = [
      event({ id: "past", date: "2026-06-01", eventCategory: "bill" }),
    ];
    expect(upcomingDates(events, TODAY, 30)).toEqual([]);
  });
});

describe("relativeDayLabel", () => {
  test("phrases the count calmly", () => {
    expect(relativeDayLabel(0)).toBe("today");
    expect(relativeDayLabel(1)).toBe("tomorrow");
    expect(relativeDayLabel(7)).toBe("in 7 days");
  });
});
