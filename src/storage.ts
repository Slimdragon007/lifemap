import { normalizeAnalysis, type LifeMapAnalysis } from "./lifemap";

const STORAGE_KEY = "lifemap-demo-state";

export type StoredDemoState = {
  isLoggedIn?: boolean;
  intake?: string;
  analysis?: LifeMapAnalysis;
  disabledApprovalIds?: string[];
  approvalBodyEdits?: Record<string, string>;
};

export function loadStoredDemoState(): StoredDemoState {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!isRecord(parsed)) {
      return {};
    }

    const analysis = parsed.analysis === undefined ? undefined : normalizeAnalysis(parsed.analysis);

    const state: StoredDemoState = {};
    const approvalBodyEdits = parseStringRecord(parsed.approvalBodyEdits);

    if (typeof parsed.isLoggedIn === "boolean") {
      state.isLoggedIn = parsed.isLoggedIn;
    }

    if (typeof parsed.intake === "string") {
      state.intake = parsed.intake;
    }

    if (analysis?.ok) {
      state.analysis = analysis.analysis;
    }

    if (Array.isArray(parsed.disabledApprovalIds)) {
      state.disabledApprovalIds = parsed.disabledApprovalIds.filter(
        (id): id is string => typeof id === "string"
      );
    }

    if (approvalBodyEdits) {
      state.approvalBodyEdits = approvalBodyEdits;
    }

    return state;
  } catch {
    return {};
  }
}

export function saveStoredDemoState(state: StoredDemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
