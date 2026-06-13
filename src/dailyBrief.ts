import type { DraftMessage, LifeMapAnalysis } from "./lifemap";

export type BriefPriority = {
  id: string;
  label: string;
  reason: string;
};

export type BriefOpenLoop = {
  id: string;
  label: string;
  blockedBy: string;
};

export type BriefCanWait = {
  id: string;
  label: string;
  reason: string;
};

export type BriefConflict = {
  id: string;
  label: string;
  reason: string;
};

export type DailyBrief = {
  todaySummary: string;
  topPriorities: BriefPriority[];
  openLoops: BriefOpenLoop[];
  canWait: BriefCanWait[];
  suggestedMessages: DraftMessage[];
  conflicts: BriefConflict[];
  groundingNote: string;
};

export type NormalizeDailyBriefResult =
  | {
      ok: true;
      brief: DailyBrief;
    }
  | {
      ok: false;
      error: string;
    };

const INVALID_BRIEF_ERROR = "LifeMap could not understand the daily brief.";

export function buildDailyBriefFromAnalysis(
  analysis: LifeMapAnalysis,
): DailyBrief {
  const firstDue = analysis.dueItems[0];
  const topPriorities = analysis.nextActions.slice(0, 3).map((action) => ({
    id: `priority-${action.id}`,
    label: action.label,
    reason: firstDue
      ? `${firstDue.title} is due ${firstDue.dueDate}.`
      : "This is one of the clearest next moves in the current map.",
  }));
  const openLoops = [
    ...analysis.missingInfo.map((item) => ({
      id: `loop-${item.id}`,
      label: item.label,
      blockedBy: item.reason,
    })),
    ...analysis.waitingOn.map((party) => ({
      id: `loop-${party.id}`,
      label: party.name,
      blockedBy: party.reason,
    })),
  ].slice(0, 5);
  const canWait = analysis.dueItems.slice(1, 4).map((item) => ({
    id: `wait-${item.id}`,
    label: item.title,
    reason: `Keep it visible, but ${item.dueDate} is not the first action.`,
  }));
  const summarySubject = firstDue?.title ?? "your current LifeMap";

  return {
    todaySummary:
      topPriorities.length > 0
        ? `${summarySubject} is the clearest thing to move today.`
        : "Your map is quiet right now. Capture anything new before it turns into background stress.",
    topPriorities,
    openLoops,
    canWait,
    suggestedMessages: analysis.draftMessages.slice(0, 3),
    conflicts: [],
    groundingNote:
      analysis.sourceEvidence.length > 0
        ? `Grounded in ${analysis.sourceEvidence
            .slice(0, 3)
            .map((source) => source.label)
            .join(", ")}.`
        : "Grounded only in the current LifeMap analysis.",
  };
}

export function normalizeDailyBrief(value: unknown): NormalizeDailyBriefResult {
  if (!isRecord(value)) {
    return invalidBrief();
  }

  const todaySummary = readString(value.todaySummary);
  const topPriorities = parseArray(value.topPriorities, parsePriority);
  const openLoops = parseArray(value.openLoops, parseOpenLoop);
  const canWait = parseArray(value.canWait, parseCanWait);
  const suggestedMessages = parseArray(
    value.suggestedMessages,
    parseSuggestedMessage,
  );
  const conflicts = parseArray(value.conflicts, parseConflict);
  const groundingNote = readString(value.groundingNote);

  if (
    !todaySummary ||
    !topPriorities ||
    !openLoops ||
    !canWait ||
    !suggestedMessages ||
    !conflicts ||
    !groundingNote
  ) {
    return invalidBrief();
  }

  return {
    ok: true,
    brief: {
      todaySummary,
      topPriorities: topPriorities.slice(0, 3),
      openLoops,
      canWait,
      suggestedMessages,
      conflicts,
      groundingNote,
    },
  };
}

function invalidBrief(): NormalizeDailyBriefResult {
  return {
    ok: false,
    error: INVALID_BRIEF_ERROR,
  };
}

function parsePriority(value: unknown): BriefPriority | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const label = readString(value.label);
  const reason = readString(value.reason);
  return id && label && reason ? { id, label, reason } : undefined;
}

function parseOpenLoop(value: unknown): BriefOpenLoop | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const label = readString(value.label);
  const blockedBy = readString(value.blockedBy);
  return id && label && blockedBy ? { id, label, blockedBy } : undefined;
}

function parseCanWait(value: unknown): BriefCanWait | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const label = readString(value.label);
  const reason = readString(value.reason);
  return id && label && reason ? { id, label, reason } : undefined;
}

function parseSuggestedMessage(value: unknown): DraftMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const recipient = readString(value.recipient);
  const subject = readString(value.subject);
  const body = readString(value.body);
  const status = readStatus(value.status);
  return id && recipient && subject && body && status
    ? { id, recipient, subject, body, status }
    : undefined;
}

function parseConflict(value: unknown): BriefConflict | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const label = readString(value.label);
  const reason = readString(value.reason);
  return id && label && reason ? { id, label, reason } : undefined;
}

function parseArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | undefined,
): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.map(parseItem);
  return items.every((item): item is T => item !== undefined)
    ? items
    : undefined;
}

function readStatus(value: unknown): DraftMessage["status"] | undefined {
  return value === "Scheduled" || value === "Needs review" ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
