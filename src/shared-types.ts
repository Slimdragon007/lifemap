/**
 * Types and constants shared across multiple views.
 */

export type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";

export type PriorityActionState = "completed" | "snoozed";

/** Sentinel value for the "Other…" option in owner-picker selects. */
export const OTHER_OWNER = "__other__";

/** Resolve the selected owner from whoFor + otherOwner state. */
export function resolveOwner(whoFor: string, otherOwner: string): string {
  return whoFor === OTHER_OWNER ? otherOwner.trim() : whoFor.trim();
}
