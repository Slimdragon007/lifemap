import { normalizeDailyBrief, type DailyBrief } from "./dailyBrief";
import { normalizeAnalysis, type LifeMapAnalysis } from "./lifemap";
import {
  defaultSetupProfile,
  normalizeSetupBucketIds,
  normalizeSetupProfile,
  type SetupBucketId,
  type SetupProfile,
} from "./setupBuckets";

const STORAGE_KEY = "lifemap-demo-state";

export type StoredDemoState = {
  isLoggedIn?: boolean;
  intake?: string;
  analysis?: LifeMapAnalysis;
  disabledApprovalIds?: string[];
  approvalBodyEdits?: Record<string, string>;
  dailyBrief?: DailyBrief;
  savedSuggestionIds?: string[];
  dismissedSuggestionIds?: string[];
  setupProfile?: SetupProfile;
  setupBucketIds?: SetupBucketId[];
};

export function loadStoredDemoState(): StoredDemoState {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    return normalizeStoredDemoState(JSON.parse(rawValue));
  } catch {
    return {};
  }
}

export function saveStoredDemoState(state: StoredDemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeStoredDemoState(value: unknown): StoredDemoState {
  if (!isRecord(value)) {
    return {};
  }

  const analysis =
    value.analysis === undefined
      ? undefined
      : normalizeAnalysis(value.analysis);
  const dailyBrief =
    value.dailyBrief === undefined
      ? undefined
      : normalizeDailyBrief(value.dailyBrief);
  const setupProfile =
    value.setupProfile === undefined
      ? undefined
      : normalizeSetupProfile(value.setupProfile);
  const setupBucketIds = normalizeSetupBucketIds(value.setupBucketIds);

  const state: StoredDemoState = {};
  const approvalBodyEdits = parseStringRecord(value.approvalBodyEdits);

  if (typeof value.isLoggedIn === "boolean") {
    state.isLoggedIn = value.isLoggedIn;
  }

  if (typeof value.intake === "string") {
    state.intake = value.intake;
  }

  if (analysis?.ok) {
    state.analysis = analysis.analysis;
  }

  if (Array.isArray(value.disabledApprovalIds)) {
    state.disabledApprovalIds = value.disabledApprovalIds.filter(
      (id): id is string => typeof id === "string",
    );
  }

  if (Array.isArray(value.savedSuggestionIds)) {
    state.savedSuggestionIds = value.savedSuggestionIds.filter(
      (id): id is string => typeof id === "string",
    );
  }

  if (Array.isArray(value.dismissedSuggestionIds)) {
    state.dismissedSuggestionIds = value.dismissedSuggestionIds.filter(
      (id): id is string => typeof id === "string",
    );
  }

  if (approvalBodyEdits) {
    state.approvalBodyEdits = approvalBodyEdits;
  }

  if (dailyBrief?.ok) {
    state.dailyBrief = dailyBrief.brief;
  }

  if (setupProfile) {
    state.setupProfile = setupProfile;
  }

  if (setupBucketIds.length > 0) {
    state.setupBucketIds = setupBucketIds;
  }

  return state;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function emptyAnalysis(): LifeMapAnalysis {
  return {
    dueItems: [],
    missingInfo: [],
    waitingOn: [],
    nextActions: [],
    reminders: [],
    draftMessages: [],
    sourceEvidence: [],
  };
}

function emptyDailyBrief(): DailyBrief {
  return {
    todaySummary: "",
    topPriorities: [],
    openLoops: [],
    canWait: [],
    suggestedMessages: [],
    conflicts: [],
    groundingNote: "",
  };
}

export function emptyPersistedState(): StoredDemoState {
  return {
    intake: "",
    analysis: emptyAnalysis(),
    disabledApprovalIds: [],
    approvalBodyEdits: {},
    dailyBrief: emptyDailyBrief(),
    savedSuggestionIds: [],
    dismissedSuggestionIds: [],
    setupProfile: defaultSetupProfile,
    setupBucketIds: [],
  };
}

// When a Supabase session loads, remote is the source of truth: fields the
// remote snapshot omits reset to empty rather than keeping seed/local values,
// so demo/local state can never bleed into an authenticated account.
export function authoritativeRemoteState(
  remote: StoredDemoState,
): StoredDemoState {
  return { ...emptyPersistedState(), ...remote };
}
