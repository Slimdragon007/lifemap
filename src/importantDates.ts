import type { FamilyEvent } from "./familyOS";

// UTC-based date math: we parse "YYYY-MM-DD" with Date.UTC to avoid the
// classic "new Date('2026-06-30')" → off-by-one-in-the-Pacific bug.

export function isImportantDate(event: FamilyEvent): boolean {
  return Boolean(event.eventCategory);
}

function parseYmd(
  dateISO: string,
): { year: number; month: number; day: number } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO.trim());
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }
  return { year, month, day };
}

// Start-of-day UTC timestamp for a Date (drops time + tz so "days until" counts
// whole calendar days, not partial ones).
function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

// The next calendar date this event lands on, as "YYYY-MM-DD".
//   - non-annual → the literal stored date (a one-off).
//   - annual     → roll the stored month/day into `today`'s year; if that has
//                  already passed today, roll to next year. (A birthday today
//                  counts as "today", i.e. 0 days, not next year.)
export function nextOccurrence(
  dateISO: string,
  isAnnual: boolean,
  today: Date,
): string {
  const parts = parseYmd(dateISO);
  if (!parts) {
    return dateISO;
  }
  if (!isAnnual) {
    return toIso(parts.year, parts.month, parts.day);
  }
  const todayStart = utcDayStart(today);
  const thisYear = today.getUTCFullYear();
  const candidateMs = Date.UTC(thisYear, parts.month - 1, parts.day);
  const yearOffset = candidateMs < todayStart ? 1 : 0;
  // Build via Date so Feb-29 in a non-leap year normalizes to Mar-01 — using
  // the raw stored day would produce "YYYY-02-29" which is an invalid ISO string.
  const normalized = new Date(
    Date.UTC(thisYear + yearOffset, parts.month - 1, parts.day),
  );
  return toIso(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth() + 1,
    normalized.getUTCDate(),
  );
}

// Whole calendar days from `today` until `dateISO` (negative if already past).
export function daysUntil(dateISO: string, today: Date): number {
  const parts = parseYmd(dateISO);
  if (!parts) {
    return Number.NaN;
  }
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  const todayStart = utcDayStart(today);
  return Math.round((target - todayStart) / 86_400_000);
}

export type UpcomingDate = {
  event: FamilyEvent;
  nextDate: string;
  daysUntil: number;
};

// Important-Date events whose next occurrence falls within `withinDays` of today
// (inclusive, today = 0), sorted ascending by that next occurrence. Only events
// carrying an eventCategory are considered — generic calendar events stay out of
// the "never forget" surface.
export function upcomingDates(
  events: FamilyEvent[],
  today: Date,
  withinDays: number,
): UpcomingDate[] {
  return events
    .filter((event) => isImportantDate(event) && Boolean(event.date))
    .map((event) => {
      const nextDate = nextOccurrence(
        event.date,
        event.isAnnual ?? false,
        today,
      );
      return { event, nextDate, daysUntil: daysUntil(nextDate, today) };
    })
    .filter(
      (entry) =>
        Number.isFinite(entry.daysUntil) &&
        entry.daysUntil >= 0 &&
        entry.daysUntil <= withinDays,
    )
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

// Calm "in N days" phrasing shared by Today + the Important Dates view.
export function relativeDayLabel(days: number): string {
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "tomorrow";
  }
  return `in ${days} days`;
}
