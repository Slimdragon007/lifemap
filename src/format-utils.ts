/**
 * Shared formatting and pluralization helpers used across views.
 */

/** Return `label` when count is 1, otherwise `label` + "s". */
export function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}

/** `"3 items"` / `"1 item"` — count + auto-pluralized label. */
export function formatCount(count: number, singularLabel: string): string {
  return `${count} ${pluralize(singularLabel, count)}`;
}

/** Parse an ISO date string and format as e.g. "Jun 18". */
export function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
