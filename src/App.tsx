import {
  Archive,
  Bell,
  CalendarDays,
  CalendarHeart,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock3,
  FileText,
  Inbox,
  LockKeyhole,
  Map,
  ListChecks,
  MessageSquare,
  Settings,
  Sparkles,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCount, pluralize } from "./format-utils";
import type { BriefStatus, PriorityActionState } from "./shared-types";
import { analyzeWithAi, generateBriefWithAi, sendDraftEmail } from "./api";
import {
  clearFieldCrypto,
  ensureFieldCrypto,
  type FieldCrypto,
} from "./field-crypto";
import {
  buildDailyBriefFromAnalysis,
  type BriefPriority,
  type DailyBrief,
} from "./dailyBrief";
import {
  buildApprovalQueue,
  type ApprovalItem,
  type LifeMapAnalysis,
  type SourceEvidence,
} from "./lifemap";
import {
  authoritativeRemoteState,
  clearStoredDemoState,
  emptyAnalysis,
  emptyDailyBrief,
  emptyPersistedState,
  initialAppState,
  loadStoredDemoState,
  saveStoredDemoState,
  shouldShowOnboarding,
} from "./storage";
import CalendarView from "./CalendarView";
import AuthScreen from "./auth-screen";
import OnboardingView, { type OnboardingPerson } from "./onboarding-view";
import SetNewPasswordScreen from "./set-new-password-screen";
import { FeedbackPanel } from "./feedback-bubble";
import ModalBackdrop from "./modal-backdrop";
import BucketDetailView from "./BucketDetailView";
import MemberProfileView from "./MemberProfileView";
import LaunchPlanView from "./LaunchPlanView";
import GuidedSetupView from "./GuidedSetupView";
import PrivacyView from "./PrivacyView";
import HowItWorksView from "./how-it-works-view";
import { useSession } from "./use-session";
import { demoMode } from "./demoMode";
import { initialsFromName, viewerIdentity } from "./viewer";
import { sampleCollections } from "./sampleData";
import {
  buildCalendarEventsFromAnalysis,
  buildVaultItemsFromAnalysis,
  type DateCategory,
  type FamilyEvent,
  type FamilyMember,
  type VaultItem,
  type VaultItemFile,
} from "./familyOS";
import {
  deleteAllFamilyData,
  deleteFamilyRow,
  EMPTY_COLLECTIONS,
  loadFamilyCollections,
  upsertFamilyEvent,
  upsertFamilyMember,
  upsertVaultItem,
  upsertVaultItemFile,
  type FamilyCollections,
  type FamilyDataClient,
} from "./family-data";
import {
  getAccessToken,
  getSupabase,
  isSupabaseConfigured,
} from "./supabaseClient";
import TodayView from "./TodayView";
import VaultView, {
  AddDocumentModal,
  type DocumentSaveInput,
} from "./VaultView";
import ImportantDatesView, { AddDateModal } from "./ImportantDatesView";
import { AddPersonModal } from "./add-person-modal";
import { DOCUMENT_TYPES } from "./documentTypes";
import { upcomingDates } from "./importantDates";
import { memberAccent, memberStuff } from "./familyToday";
import EmptyState from "./empty-state";
import {
  loadRemoteState,
  saveRemoteState,
  type RemoteStateClient,
} from "./remoteState";
import {
  presentationAnalysis,
  presentationBrief,
  presentationIntake,
} from "./demoSeed";
import type { StoredDemoState } from "./storage";
import {
  defaultSetupProfile,
  normalizeSetupBucketIds,
  normalizeSetupProfile,
  recommendSetupBuckets,
  type SetupBucketId,
  type SetupFocusArea,
  type SetupProfile,
} from "./setupBuckets";
import {
  downloadVaultFile,
  prepareEncryptedVaultFile,
  removeVaultFileObjects,
  uploadPreparedVaultFile,
  type DocumentStorageClient,
} from "./document-storage";

const starterIntake = presentationIntake;

const sampleIntakes = [
  {
    label: "School form",
    rawIntake: `Screenshot notes from school portal:

Westview Elementary
Casey Kim - Grade 4

Field trip permission slip is due Friday 6/18.
Missing:
- parent signature
- emergency contact phone
- $12 activity fee

Teacher note: Please return the form in the blue folder or email it to Ms. Rivera.`,
  },
  {
    label: "Doctor appointment",
    rawIntake: `Portal note from Valley Pediatrics:

Milo Kim follow-up visit is scheduled for Thursday at 3:30 PM.
Bring the updated medication list and insurance card.
Missing: pharmacy name for the refill.
Waiting on Jordan to confirm pickup from school.`,
  },
  {
    label: "Passport renewal",
    rawIntake: `Text from passport renewal checklist:

Jordan Kim passport renewal for August trip.
Appointment is 7/12 at 10:30 AM at the downtown acceptance office.

Bring:
- original birth certificate
- current passport
- 2x2 passport photo
- both parents' IDs

Missing from the packet: printed DS-11 form and photo.
Waiting on Taylor to confirm they can attend the appointment.`,
  },
  {
    label: "Pet vaccine",
    rawIntake: `Reminder from Desert Paw Vet:

Milo is due for bordetella and rabies boosters before boarding next month.
Appointment options: Monday 9:00 AM or Wednesday 4:15 PM.
Bring previous vaccine record if you have it.
Waiting on boarding facility to confirm which shots they require.`,
  },
  {
    label: "Travel packing",
    rawIntake: `Notes for Maui trip:

Flight to OGG is June 27.
Need TSA PreCheck numbers for Alex and Jordan before check-in.
Pack sunscreen, kids' rash guards, medication, passports, chargers, and swim goggles.
Missing: rental car confirmation and hotel crib request.
Ask Taylor to send the rewards account login.`,
  },
];

const captureTypeGuides = [
  {
    title: "School",
    sampleLabel: "School form",
    description: "Forms, lunch, schedules, fees",
    outcome: "Routes to Today, Calendar, and Review",
  },
  {
    title: "Health",
    sampleLabel: "Doctor appointment",
    description: "Appointments, meds, insurance",
    outcome: "Pulls missing info into Cabinet",
  },
  {
    title: "IDs + records",
    sampleLabel: "Passport renewal",
    description: "Passports, IDs, cards, renewals",
    outcome: "Builds a document checklist",
  },
  {
    title: "Pets",
    sampleLabel: "Pet vaccine",
    description: "Vaccines, boarding, vet tasks",
    outcome: "Tracks care loops and records",
  },
  {
    title: "Travel",
    sampleLabel: "Travel packing",
    description: "Flights, packing, rewards, TSA",
    outcome: "Creates a trip logistics map",
  },
];

type StagedRun = {
  approvals: ApprovalItem[];
  stagedAt: string;
};

type AppView =
  | "today"
  | "capture"
  | "calendar"
  | "vault"
  | "dates"
  | "review"
  | "more"
  | "settings"
  | "family"
  | "member"
  | "setup"
  | "bucket"
  | "launchPlan"
  | "privacy"
  | "howItWorks"
  | "onboarding";
type OnboardingReturnView = Exclude<AppView, "onboarding">;

type CaptureRoute = {
  destination: "vault" | "calendar" | "review";
  buttonLabel: string;
  message: string;
};

const ONBOARDING_ROLE_LABEL: Record<OnboardingPerson["role"], string> = {
  adult: "Adult",
  child: "Child",
  pet: "Pet",
};
const SECURE_SAVE_ERROR =
  "Couldn't save securely. Check your connection and try again.";

function onboardingPersonToFamilyMember(
  person: OnboardingPerson,
): FamilyMember {
  const name = person.name.trim();
  return {
    id: crypto.randomUUID(),
    name,
    role: ONBOARDING_ROLE_LABEL[person.role],
    initials: initialsFromName(name),
    profileType: person.role,
    details: [],
    careNotes: [],
  };
}

// Turn the onboarding area chips into a real setup profile so the wizard's
// choices actually seed buckets (not collected then discarded). "Work" has no
// matching bucket, so it is intentionally ignored.
function setupProfileFromOnboardingAreas(areas: string[]): SetupProfile {
  const focusAreas: SetupFocusArea[] = [];
  const addFocus = (focus: SetupFocusArea) => {
    if (!focusAreas.includes(focus)) {
      focusAreas.push(focus);
    }
  };
  let travels = false;
  let pets = 0;
  for (const area of areas) {
    switch (area) {
      case "School":
        addFocus("school");
        break;
      case "Health":
        addFocus("health");
        break;
      case "Home":
        addFocus("home");
        break;
      case "Bills & dates":
        addFocus("money");
        break;
      case "Travel":
        travels = true;
        break;
      case "Pets":
        pets = 1;
        break;
      default:
        break;
    }
  }
  return { ...defaultSetupProfile, focusAreas, travels, pets };
}

function restoredAnalyzeStatus(
  intake: string | undefined,
  analysis: LifeMapAnalysis,
): "idle" | "success" {
  const hasIntake = (intake ?? "").trim().length > 0;
  const hasAnalysis =
    analysis.dueItems.length > 0 ||
    analysis.missingInfo.length > 0 ||
    analysis.waitingOn.length > 0 ||
    analysis.nextActions.length > 0 ||
    analysis.reminders.length > 0 ||
    analysis.draftMessages.length > 0;

  return hasIntake && hasAnalysis ? "success" : "idle";
}

function App() {
  const [initialStoredState] = useState(() => loadStoredDemoState());
  const hasInitialStoredState = Object.keys(initialStoredState).length > 0;
  const [initialState] = useState(() =>
    initialAppState({ demoMode, stored: initialStoredState }),
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    initialState.isLoggedIn ?? false,
  );
  const [intake, setIntake] = useState(initialState.intake);
  const [map, setMap] = useState(initialState.analysis);
  const approvals = useMemo(() => buildApprovalQueue(map), [map]);
  const [disabledApprovals, setDisabledApprovals] = useState<Set<string>>(
    () => new Set(initialState.disabledApprovalIds ?? []),
  );
  const [approvalBodyEdits, setApprovalBodyEdits] = useState<
    Record<string, string>
  >(initialState.approvalBodyEdits ?? {});
  const [savedSuggestionIds, setSavedSuggestionIds] = useState<Set<string>>(
    () => new Set(initialState.savedSuggestionIds ?? []),
  );
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<
    Set<string>
  >(() => new Set(initialState.dismissedSuggestionIds ?? []));
  const [setupProfile, setSetupProfile] = useState<SetupProfile>(
    () => initialState.setupProfile ?? defaultSetupProfile,
  );
  const [setupBucketIds, setSetupBucketIds] = useState<SetupBucketId[]>(
    () => initialState.setupBucketIds ?? [],
  );
  // Per-account first-run flag, mirrored into the persisted state so a completed
  // or skipped onboarding follows the account across devices. Seeded from the
  // remote load (see the first-run gate effect) and set true by completeOnboarding.
  const [onboarded, setOnboarded] = useState<boolean>(
    () => initialState.onboarded ?? false,
  );
  // One-shot guard so the first-run gate fires at most once per signed-in
  // session (it must not re-show onboarding after the user navigates away).
  const onboardingGateChecked = useRef<string | undefined>(undefined);
  // The display name the user typed in onboarding (persisted separately from the
  // Supabase session so it survives reloads and overrides the email-derived name).
  const [displayName, setDisplayName] = useState<string>(() => {
    try {
      return window.localStorage.getItem("lifemap-display-name") ?? "";
    } catch {
      return "";
    }
  });
  const activeSetupBuckets = useMemo(() => {
    if (setupBucketIds.length === 0) {
      return [];
    }

    const activeIds = new Set(setupBucketIds);
    return recommendSetupBuckets(setupProfile).filter((bucket) =>
      activeIds.has(bucket.id),
    );
  }, [setupBucketIds, setupProfile]);
  const editedApprovals = useMemo(
    () =>
      approvals.map((approval) => ({
        ...approval,
        body: approvalBodyEdits[approval.id] ?? approval.body,
      })),
    [approvalBodyEdits, approvals],
  );
  const selectedApprovals = useMemo(
    () =>
      editedApprovals.filter((approval) => !disabledApprovals.has(approval.id)),
    [disabledApprovals, editedApprovals],
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [stagedRun, setStagedRun] = useState<StagedRun>();
  const [sentDraftIds, setSentDraftIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [sendingDraftId, setSendingDraftId] = useState<string>();
  const [analyzeStatus, setAnalyzeStatus] = useState<
    "idle" | "loading" | "success" | "error" | "fallback"
  >(() =>
    hasInitialStoredState
      ? restoredAnalyzeStatus(initialState.intake, initialState.analysis)
      : "idle",
  );
  const [analyzeError, setAnalyzeError] = useState<string>();
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(
    initialState.dailyBrief,
  );
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("idle");
  const [briefError, setBriefError] = useState<string>();
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<BriefPriority>();
  const [priorityActionStates, setPriorityActionStates] = useState<
    Partial<Record<string, PriorityActionState>>
  >({});
  const [toastMessage, setToastMessage] = useState<string>();
  const [toastUndo, setToastUndo] = useState<(() => void) | undefined>();
  const [view, setView] = useState<AppView>("today");
  const appShellRef = useRef<HTMLElement | null>(null);
  const [onboardingReturnView, setOnboardingReturnView] =
    useState<OnboardingReturnView>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [selectedSetupBucketId, setSelectedSetupBucketId] =
    useState<SetupBucketId>();
  const selectedSetupBucket = useMemo(
    () =>
      activeSetupBuckets.find((bucket) => bucket.id === selectedSetupBucketId),
    [activeSetupBuckets, selectedSetupBucketId],
  );
  const [captureRoute, setCaptureRoute] = useState<CaptureRoute>();
  const [remoteLoadedFor, setRemoteLoadedFor] = useState<string>();
  // Family-first home: which member's stuff is shown, and the tap-to-add sheet.
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [addSheetOwner, setAddSheetOwner] = useState<string>();
  const [quickAdd, setQuickAdd] = useState<"document" | "date" | "person">();
  const [quickAddDocTypeKey, setQuickAddDocTypeKey] = useState("other");
  const [quickAddDateCategory, setQuickAddDateCategory] =
    useState<DateCategory>("custom");
  const {
    session,
    loading: sessionLoading,
    recovering,
    clearRecovery,
  } = useSession();
  const identity = useMemo(() => {
    const base = viewerIdentity(session, demoMode);
    const name = displayName.trim();
    if (demoMode || !name) {
      return base;
    }
    return { name, initials: initialsFromName(name) };
  }, [session, displayName]);
  const samples = useMemo(() => sampleCollections(demoMode), []);
  // The sensitive family collections. In demo mode these are the local seeds;
  // in real mode they start empty and are loaded per-user from Supabase (RLS),
  // then grown as the user saves AI-extracted suggestions into the real tables.
  const [collections, setCollections] = useState<FamilyCollections>(() => ({
    familyMembers: samples.familyMembers,
    familyEvents: samples.familyEvents,
    vaultItems: samples.vaultItems,
    recurringCareItems: samples.recurringCareItems,
  }));
  const selectedMember = collections.familyMembers.find(
    (member) => member.id === selectedMemberId,
  );
  // True only when a remote load actually failed — lets data-backed views show a
  // "couldn't load" banner instead of an empty state that reads as "no records".
  const [recordsLoadFailed, setRecordsLoadFailed] = useState(false);
  // Inline so new Date() is always fresh (memoizing only on familyEvents would
  // go stale across midnight).
  const todayUpcomingDates = upcomingDates(
    collections.familyEvents,
    new Date(),
    30,
  );
  const storedState = useMemo<StoredDemoState>(
    () => ({
      isLoggedIn,
      intake,
      analysis: map,
      disabledApprovalIds: Array.from(disabledApprovals),
      approvalBodyEdits,
      dailyBrief,
      savedSuggestionIds: Array.from(savedSuggestionIds),
      dismissedSuggestionIds: Array.from(dismissedSuggestionIds),
      setupProfile,
      setupBucketIds,
      onboarded,
    }),
    [
      approvalBodyEdits,
      dailyBrief,
      disabledApprovals,
      dismissedSuggestionIds,
      intake,
      isLoggedIn,
      map,
      savedSuggestionIds,
      setupBucketIds,
      setupProfile,
      onboarded,
    ],
  );

  useEffect(() => {
    saveStoredDemoState(storedState);
  }, [storedState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (!google) {
      return;
    }
    setToastMessage(
      google === "connected"
        ? "Google Calendar connected."
        : "Couldn't connect Google Calendar. Try again.",
    );
    params.delete("google");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    // Undo toasts linger longer (5s) so the user has time to reverse a dismiss.
    const timeout = window.setTimeout(
      () => {
        setToastMessage(undefined);
        setToastUndo(undefined);
      },
      toastUndo ? 5000 : 2600,
    );
    return () => window.clearTimeout(timeout);
  }, [toastMessage, toastUndo]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      return;
    }

    let active = true;
    const userId = session.user.id;
    setRemoteLoadedFor(undefined);

    loadRemoteState(userId, getSupabase() as unknown as RemoteStateClient)
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.ok) {
          applyStoredState(result.state);
          // First-run gate: decide AFTER the remote load settles (so it can't
          // race the state populate) and key it on the account, not the device.
          maybeShowOnboarding(userId, result.state);
        } else {
          console.warn("LifeMap remote load failed", result.error);
          setToastMessage("Couldn't sync your saved data — using local copy.");
          // Remote unavailable: fall back to the offline localStorage flag only.
          maybeShowOnboarding(userId, {});
        }
        setRemoteLoadedFor(userId);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("LifeMap remote load error", error);
        setToastMessage("Couldn't sync your saved data — using local copy.");
        setRemoteLoadedFor(userId);
      });

    return () => {
      active = false;
    };
  }, [session]);

  // Load the per-user family records from Supabase. Extracted so both the
  // initial-load effect and the Review banner's "Try again" can re-run it; the
  // isActive guard lets the effect cancel a stale load when the session changes.
  const loadFamilyRecords = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!isSupabaseConfigured || !session) {
        return;
      }
      const userId = session.user.id;
      const accessToken = session.access_token;
      try {
        // Activate per-user field encryption before reading, so the sensitive
        // columns decrypt on the way in (and encrypt on later writes).
        const crypto = await ensureFieldCrypto(accessToken);
        const result = await loadFamilyCollections(
          userId,
          getSupabase() as unknown as FamilyDataClient,
          crypto,
        );
        if (!isActive()) {
          return;
        }
        if (result.ok) {
          setCollections(result.collections);
          setRecordsLoadFailed(false);
        } else {
          console.warn("LifeMap family load failed", result.error);
          setRecordsLoadFailed(true);
          setToastMessage("Couldn't load your saved records — try again.");
        }
      } catch (error) {
        if (isActive()) {
          console.error("LifeMap family load error", error);
          setRecordsLoadFailed(true);
        }
      }
    },
    [session],
  );

  useEffect(() => {
    let active = true;
    void loadFamilyRecords(() => active);
    return () => {
      active = false;
    };
  }, [loadFamilyRecords]);

  // Drop the cached per-user field key when the session changes (sign-out or a
  // different user), so the next session re-derives its own key.
  useEffect(() => {
    return () => {
      clearFieldCrypto();
    };
  }, [session]);

  // First-run gate (real mode only — demo never triggers this). Called once the
  // remote state has settled so it can't race the state populate. Per-ACCOUNT:
  // brand-new accounts see onboarding once; onboarded accounts never do, on any
  // device. The localStorage flag is only an offline/fast-path + legacy fallback.
  // Guarded by a ref so it fires at most once per signed-in session.
  function maybeShowOnboarding(userId: string, remote: StoredDemoState) {
    if (onboardingGateChecked.current === userId) {
      return;
    }
    onboardingGateChecked.current = userId;
    let localFlag = false;
    try {
      localFlag = window.localStorage.getItem("lifemap-onboarded") === "1";
    } catch {
      // Storage unavailable (private mode): treat as no local cache.
      localFlag = false;
    }
    if (shouldShowOnboarding(remote, localFlag)) {
      setOnboardingReturnView(undefined);
      setView("onboarding");
    }
  }

  useEffect(() => {
    if (view !== "onboarding" && onboardingReturnView) {
      setOnboardingReturnView(undefined);
    }
  }, [onboardingReturnView, view]);

  useEffect(() => {
    const shell = appShellRef.current;
    if (shell) {
      shell.scrollTop = 0;
      shell.scrollLeft = 0;
    }

    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [selectedMemberId, selectedSetupBucketId, view]);

  // Reset the one-shot gate guard when the signed-in account changes, so a
  // different account on the same tab can still be gated.
  useEffect(() => {
    onboardingGateChecked.current = undefined;
  }, [session?.user.id]);

  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      !session ||
      remoteLoadedFor !== session.user.id
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveRemoteState(
        session.user.id,
        storedState,
        getSupabase() as unknown as RemoteStateClient,
      ).then((result) => {
        if (!result.ok) {
          console.warn("LifeMap remote save failed", result.error);
        }
      });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [remoteLoadedFor, session, storedState]);

  function applyStoredState(state: StoredDemoState) {
    // Remote is authoritative: fields the snapshot omits reset to empty so
    // demo/local state cannot bleed into an authenticated account.
    const full = authoritativeRemoteState(state);
    const nextIntake = full.intake ?? "";
    const nextAnalysis = full.analysis ?? emptyAnalysis();
    setIntake(nextIntake);
    setMap(nextAnalysis);
    setAnalyzeStatus(restoredAnalyzeStatus(nextIntake, nextAnalysis));
    setAnalyzeError(undefined);
    setDisabledApprovals(new Set(full.disabledApprovalIds ?? []));
    setApprovalBodyEdits(full.approvalBodyEdits ?? {});
    setSavedSuggestionIds(new Set(full.savedSuggestionIds ?? []));
    setDismissedSuggestionIds(new Set(full.dismissedSuggestionIds ?? []));
    setDailyBrief(full.dailyBrief ?? emptyDailyBrief());
    setSetupProfile(
      normalizeSetupProfile(full.setupProfile ?? defaultSetupProfile),
    );
    setSetupBucketIds(normalizeSetupBucketIds(full.setupBucketIds ?? []));
    setOnboarded(state.onboarded === true);
  }

  function saveSuggestion(id: string) {
    if (isSupabaseConfigured && session) {
      void materializeSuggestions([id]);
      return;
    }
    setSavedSuggestionIds((current) => new Set(current).add(id));
    setDismissedSuggestionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function saveSuggestions(ids: string[]) {
    if (isSupabaseConfigured && session) {
      void materializeSuggestions(ids);
      return;
    }
    setSavedSuggestionIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setDismissedSuggestionIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  // Real mode: turn a saved AI suggestion into a durable, typed row in the
  // per-user Supabase tables (RLS-enforced). The freshly-persisted row (with its
  // real uuid) joins the in-memory collection, and the ephemeral analysis
  // suggestion is removed from the review list so it doesn't double-render.
  async function materializeSuggestions(ids: string[]): Promise<boolean> {
    if (!session) {
      return false;
    }
    const userId = session.user.id;
    const client = getSupabase() as unknown as FamilyDataClient;
    // Derive the per-user encryption key BEFORE writing. Using the synchronous
    // getFieldCrypto() here could return identity (no-op) crypto if a save fires
    // before the key finishes loading — silently persisting plaintext sensitive
    // fields. Awaiting guarantees real encryption at rest.
    let crypto: FieldCrypto;
    try {
      crypto = await ensureFieldCrypto(session.access_token);
    } catch (error) {
      console.error("LifeMap field encryption unavailable", error);
      setToastMessage(SECURE_SAVE_ERROR);
      return false;
    }
    const vaultCandidates = buildVaultItemsFromAnalysis(map);
    const eventCandidates = buildCalendarEventsFromAnalysis(map);
    const persistedIds: string[] = [];
    let failed = false;

    for (const id of ids) {
      if (id.startsWith("ai-vault-")) {
        const candidate = vaultCandidates.find((item) => item.id === id);
        if (!candidate) {
          continue;
        }
        const result = await upsertVaultItem(userId, candidate, client, crypto);
        if (result.ok) {
          const saved = result.item;
          setCollections((current) => ({
            ...current,
            vaultItems: [saved, ...current.vaultItems],
          }));
          persistedIds.push(id);
        } else {
          failed = true;
        }
      } else if (id.startsWith("ai-event-")) {
        const candidate = eventCandidates.find((event) => event.id === id);
        if (!candidate) {
          continue;
        }
        const result = await upsertFamilyEvent(userId, candidate, client);
        if (result.ok) {
          const saved = result.item;
          setCollections((current) => ({
            ...current,
            familyEvents: [saved, ...current.familyEvents],
          }));
          persistedIds.push(id);
        } else {
          failed = true;
        }
      }
    }

    if (persistedIds.length > 0) {
      // Remove the now-persisted suggestions from the review list.
      setDismissedSuggestionIds((current) => {
        const next = new Set(current);
        persistedIds.forEach((id) => next.add(id));
        return next;
      });
    }
    if (failed) {
      setToastMessage("Couldn't save every record. Try again.");
    }
    return !failed;
  }

  // Show a toast that can carry an Undo action (5s, restores prior state).
  function notify(message: string, undo?: () => void) {
    setToastMessage(message);
    setToastUndo(() => undo);
  }

  function dismissToast() {
    setToastMessage(undefined);
    setToastUndo(undefined);
  }

  function dismissSuggestion(id: string) {
    // Capture prior state so Undo can restore it (never confirm, always undo).
    const wasSaved = savedSuggestionIds.has(id);
    setDismissedSuggestionIds((current) => new Set(current).add(id));
    setSavedSuggestionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    notify("Dismissed.", () => {
      setDismissedSuggestionIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      if (wasSaved) {
        setSavedSuggestionIds((current) => new Set(current).add(id));
      }
    });
  }

  function toggleApproval(id: string) {
    setDisabledApprovals((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function saveApprovalBody(id: string, body: string) {
    setApprovalBodyEdits((current) => {
      const originalBody =
        approvals.find((approval) => approval.id === id)?.body ?? body;
      const next = { ...current };
      if (body === originalBody) {
        delete next[id];
      } else {
        next[id] = body;
      }
      return next;
    });
  }

  function handleResetDemo() {
    clearStoredDemoState();
    setIntake(starterIntake);
    setMap(presentationAnalysis);
    setDailyBrief(presentationBrief);
    setDisabledApprovals(new Set());
    setApprovalBodyEdits({});
    setSavedSuggestionIds(new Set());
    setDismissedSuggestionIds(new Set());
    setSetupProfile(defaultSetupProfile);
    setSetupBucketIds([]);
    setStagedRun(undefined);
    setSentDraftIds(new Set());
    setView("today");
    setToastMessage("Demo reset.");
  }

  // Real-account "Clear my map / start fresh": irreversibly wipe everything this
  // user has persisted — the four family tables + their lifemapState in
  // user_memory — then reset the in-memory app to a clean slate. Gated to real
  // mode; demo has its own handleResetDemo and never reaches this.
  async function handleClearRealAccount() {
    if (!isSupabaseConfigured || !session) {
      return;
    }
    const userId = session.user.id;
    const client = getSupabase();
    const storedFiles = collections.vaultItems.flatMap(
      (item) => item.files ?? [],
    );

    const fileWipe = await removeVaultFileObjects(
      client as unknown as DocumentStorageClient,
      storedFiles,
    );
    if (!fileWipe.ok) {
      console.warn("LifeMap clear-map file wipe failed", fileWipe.error);
      setToastMessage("Couldn't remove stored files — records were not cleared.");
      return;
    }

    const wipe = await deleteAllFamilyData(
      userId,
      client as unknown as FamilyDataClient,
    );
    if (!wipe.ok) {
      console.warn("LifeMap clear-map family wipe failed", wipe.error);
      setToastMessage("Couldn't clear your records — try again.");
      return;
    }

    const reset = await saveRemoteState(
      userId,
      emptyPersistedState(),
      client as unknown as RemoteStateClient,
    );
    if (!reset.ok) {
      console.warn("LifeMap clear-map remote reset failed", reset.error);
      setToastMessage("Couldn't clear your map — try again.");
      return;
    }

    setIntake("");
    setMap(emptyAnalysis());
    setCollections(EMPTY_COLLECTIONS);
    setDisabledApprovals(new Set());
    setApprovalBodyEdits({});
    setSavedSuggestionIds(new Set());
    setDismissedSuggestionIds(new Set());
    setDailyBrief(emptyDailyBrief());
    setSetupProfile(defaultSetupProfile);
    setSetupBucketIds([]);
    setStagedRun(undefined);
    setSentDraftIds(new Set());
    setRecordsLoadFailed(false);
    setView("today");
    setToastMessage("Your map is clear — start with your own.");
  }

  async function handleSendDraft(item: ApprovalItem, to: string) {
    setSendingDraftId(item.id);
    const token = await getAccessToken().catch(() => undefined);
    if (!token) {
      setToastMessage("Please sign in again to send.");
      setSendingDraftId(undefined);
      return;
    }
    const result = await sendDraftEmail(
      {
        draftId: item.id,
        to,
        recipientName: item.recipient,
        subject: item.title,
        body: approvalBodyEdits[item.id] ?? item.body,
      },
      token,
    );
    setSendingDraftId(undefined);
    if (result.ok) {
      setSentDraftIds((current) => new Set(current).add(item.id));
      setToastMessage("Sent.");
    } else {
      setToastMessage(result.error);
    }
  }

  async function handleAnalyze() {
    setAnalyzeStatus("loading");
    setAnalyzeError(undefined);
    setIsReviewOpen(false);
    setStagedRun(undefined);

    const result = await analyzeWithAi(intake);
    if (result.ok) {
      setMap(result.analysis);
      setDailyBrief(buildDailyBriefFromAnalysis(result.analysis));
      setDisabledApprovals(new Set());
      setApprovalBodyEdits({});
      setSavedSuggestionIds(new Set());
      setDismissedSuggestionIds(new Set());
      setPriorityActionStates({});
      setStagedRun(undefined);
      setBriefStatus("idle");
      setAnalyzeStatus("success");
      return;
    }

    setAnalyzeError(result.error);
    setAnalyzeStatus("error");
  }

  function stageSelectedApprovals() {
    setStagedRun({
      approvals: selectedApprovals,
      stagedAt: new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
    });
    setIsReviewOpen(false);
  }

  function loadSampleIntake(rawIntake: string) {
    setIntake(rawIntake);
    setCaptureRoute(undefined);
    setAnalyzeStatus("idle");
    setAnalyzeError(undefined);
    setIsReviewOpen(false);
    setStagedRun(undefined);
  }

  function openCapture(rawIntake?: string, route?: CaptureRoute) {
    if (rawIntake) {
      loadSampleIntake(rawIntake);
    } else {
      setAnalyzeError(undefined);
    }

    setCaptureRoute(route);
    setView("capture");
  }

  function followCaptureRoute() {
    if (!captureRoute) {
      return;
    }

    setView(captureRoute.destination);
  }

  async function handleGenerateBrief() {
    setBriefStatus("loading");
    setBriefError(undefined);

    const result = await generateBriefWithAi(map);
    if (result.ok) {
      setDailyBrief(result.brief);
      setBriefStatus("success");
      return;
    }

    setDailyBrief(buildDailyBriefFromAnalysis(map));
    setBriefError(result.error);
    setBriefStatus("fallback");
  }

  function completeSelectedPriority() {
    if (!selectedPriority) {
      return;
    }

    setPriorityActionStates((current) => ({
      ...current,
      [selectedPriority.id]: "completed",
    }));
    setToastMessage(`${selectedPriority.label} marked done.`);
    setSelectedPriority(undefined);
  }

  function snoozeSelectedPriority() {
    if (!selectedPriority) {
      return;
    }

    setPriorityActionStates((current) => ({
      ...current,
      [selectedPriority.id]: "snoozed",
    }));
    setToastMessage(`${selectedPriority.label} moved to tomorrow.`);
    setSelectedPriority(undefined);
  }

  function routeSelectedPriority(destination: AppView, message: string) {
    setView(destination);
    setToastMessage(message);
    setSelectedPriority(undefined);
  }

  // First-run onboarding seeds setup and lands on Today. Replay onboarding uses
  // the same save path, then returns to the screen that launched it.
  function completeOnboarding(result?: {
    name: string;
    areas: string[];
    people: OnboardingPerson[];
  }) {
    if (result) {
      const profile = setupProfileFromOnboardingAreas(result.areas);
      setSetupProfile(profile);
      setSetupBucketIds(
        recommendSetupBuckets(profile).map((bucket) => bucket.id),
      );
      const name = result.name.trim();
      if (name) {
        setDisplayName(name);
        try {
          window.localStorage.setItem("lifemap-display-name", name);
        } catch {
          // Storage can be unavailable (private mode); name just won't persist.
        }
      }
      if (result.people.length > 0) {
        void persistOnboardingPeople(result.people);
      }
    }
    // Per-account: mark onboarded in persisted state (saved to remote via the
    // storedState save effect) so it follows the account across devices...
    setOnboarded(true);
    // ...and keep the localStorage write as a fast-path / offline cache.
    try {
      window.localStorage.setItem("lifemap-onboarded", "1");
    } catch {
      // Storage can be unavailable (private mode); the flow still completes.
    }
    const nextView = onboardingReturnView ?? "today";
    setOnboardingReturnView(undefined);
    setView(nextView);
  }

  function handleSetName(value: string) {
    const name = value.trim();
    setDisplayName(name);
    try {
      if (name) {
        window.localStorage.setItem("lifemap-display-name", name);
      } else {
        window.localStorage.removeItem("lifemap-display-name");
      }
    } catch {
      // Storage unavailable in private mode.
    }
  }

  async function persistOnboardingPeople(
    people: OnboardingPerson[],
  ): Promise<void> {
    if (isSupabaseConfigured && session) {
      const userId = session.user.id;
      const client = getSupabase() as unknown as FamilyDataClient;
      // Derive the per-user key BEFORE writing so details/care_notes encrypt at
      // rest (see materializeSuggestions for the same guard).
      let crypto: FieldCrypto;
      try {
        crypto = await ensureFieldCrypto(session.access_token);
      } catch (error) {
        console.error("LifeMap field encryption unavailable", error);
        setToastMessage(SECURE_SAVE_ERROR);
        return;
      }
      const results = await Promise.all(
        people.map((person) =>
          upsertFamilyMember(
            userId,
            onboardingPersonToFamilyMember(person),
            client,
            crypto,
          ),
        ),
      );
      const saved = results.flatMap((result) =>
        result.ok ? [result.item] : [],
      );
      if (saved.length > 0) {
        setCollections((current) => ({
          ...current,
          familyMembers: [...current.familyMembers, ...saved],
        }));
      }
      return;
    }
    // Demo / no-Supabase mode: keep it local.
    const members = people.map(onboardingPersonToFamilyMember);
    setCollections((current) => ({
      ...current,
      familyMembers: [...current.familyMembers, ...members],
    }));
  }

  // Mirrors the family-member save path above.
  async function handleSaveImportantDate(event: FamilyEvent): Promise<void> {
    if (isSupabaseConfigured && session) {
      const userId = session.user.id;
      const client = getSupabase() as unknown as FamilyDataClient;
      const result = await upsertFamilyEvent(userId, event, client);
      if (result.ok) {
        const saved = result.item;
        setCollections((current) => ({
          ...current,
          familyEvents: [saved, ...current.familyEvents],
        }));
      } else {
        setToastMessage("Couldn't save that date. Try again.");
      }
      return;
    }
    // Demo / no-Supabase mode: keep it local.
    setCollections((current) => ({
      ...current,
      familyEvents: [event, ...current.familyEvents],
    }));
  }

  async function handleUpdateFamilyMember(
    member: FamilyMember,
  ): Promise<boolean> {
    if (isSupabaseConfigured && session) {
      try {
        const userId = session.user.id;
        const client = getSupabase() as unknown as FamilyDataClient;
        const crypto = await ensureFieldCrypto(session.access_token);
        const result = await upsertFamilyMember(userId, member, client, crypto);
        if (result.ok) {
          const saved = result.item;
          setCollections((current) => ({
            ...current,
            familyMembers: current.familyMembers.map((currentMember) =>
              currentMember.id === saved.id ? saved : currentMember,
            ),
          }));
          return true;
        }
        setToastMessage("Couldn't save that profile. Try again.");
        return false;
      } catch (error) {
        console.error("LifeMap profile save failed", error);
        setToastMessage(SECURE_SAVE_ERROR);
        return false;
      }
    }

    setCollections((current) => ({
      ...current,
      familyMembers: current.familyMembers.map((currentMember) =>
        currentMember.id === member.id ? member : currentMember,
      ),
    }));
    return true;
  }

  // Cabinet: direct manual add (icon grid → modal, no AI). Mirrors the Important
  // Date save path, with the per-user field-crypto guard used by every vault
  // write (see materializeSuggestions) so `detail` encrypts at rest.
  async function handleAddDocument({
    file,
    item,
  }: DocumentSaveInput): Promise<boolean> {
    if (isSupabaseConfigured && session) {
      if (!file) {
        setToastMessage("Attach a PDF or photo before saving.");
        return false;
      }

      const userId = session.user.id;
      const client = getSupabase();
      let savedItem: VaultItem | undefined;
      let uploadedFile: VaultItemFile | undefined;
      try {
        const crypto = await ensureFieldCrypto(session.access_token);
        const result = await upsertVaultItem(
          userId,
          item,
          client as unknown as FamilyDataClient,
          crypto,
        );
        if (!result.ok) {
          setToastMessage("Couldn't save that document. Try again.");
          return false;
        }

        savedItem = result.item;
        const prepared = await prepareEncryptedVaultFile({
          accessToken: session.access_token,
          file,
          userId,
          vaultItemId: savedItem.id,
        });
        if (!prepared.ok) {
          await deleteFamilyRow(
            userId,
            "vault_items",
            savedItem.id,
            client as unknown as FamilyDataClient,
          );
          setToastMessage(prepared.error);
          return false;
        }

        const upload = await uploadPreparedVaultFile(
          client as unknown as DocumentStorageClient,
          prepared.prepared,
        );
        if (!upload.ok) {
          await deleteFamilyRow(
            userId,
            "vault_items",
            savedItem.id,
            client as unknown as FamilyDataClient,
          );
          setToastMessage(upload.error);
          return false;
        }

        uploadedFile = upload.uploaded.file;
        const fileResult = await upsertVaultItemFile(
          userId,
          uploadedFile,
          client as unknown as FamilyDataClient,
        );
        if (!fileResult.ok) {
          const cleanup = await removeVaultFileObjects(
            client as unknown as DocumentStorageClient,
            [uploadedFile],
          );
          if (!cleanup.ok) {
            console.warn("LifeMap document upload cleanup failed", cleanup.error);
          }
          await deleteFamilyRow(
            userId,
            "vault_items",
            savedItem.id,
            client as unknown as FamilyDataClient,
          );
          setToastMessage("Couldn't save that document file. Try again.");
          return false;
        }

        const saved = { ...savedItem, files: [fileResult.item] };
        setCollections((current) => ({
          ...current,
          vaultItems: [saved, ...current.vaultItems],
        }));
        setToastMessage("Document saved securely.");
        return true;
      } catch (error) {
        console.error("LifeMap document save failed", error);
        if (uploadedFile) {
          const cleanup = await removeVaultFileObjects(
            client as unknown as DocumentStorageClient,
            [uploadedFile],
          );
          if (!cleanup.ok) {
            console.warn("LifeMap document upload cleanup failed", cleanup.error);
          }
        }
        if (savedItem) {
          await deleteFamilyRow(
            userId,
            "vault_items",
            savedItem.id,
            client as unknown as FamilyDataClient,
          );
        }
        setToastMessage(SECURE_SAVE_ERROR);
        return false;
      }
    }
    // Demo / no-Supabase mode: keep it local.
    setCollections((current) => ({
      ...current,
      vaultItems: [item, ...current.vaultItems],
    }));
    return true;
  }

  async function handleOpenVaultFile(file: VaultItemFile): Promise<void> {
    if (!isSupabaseConfigured || !session) {
      setToastMessage("Sign in to open stored files.");
      return;
    }

    try {
      const result = await downloadVaultFile({
        accessToken: session.access_token,
        client: getSupabase() as unknown as DocumentStorageClient,
        file,
      });
      if (!result.ok) {
        setToastMessage(result.error);
        return;
      }

      const url = URL.createObjectURL(result.download.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.download.fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("LifeMap file open failed", error);
      setToastMessage("Couldn't open that file. Try again.");
    }
  }

  // Important Dates: remove a logged date (real mode deletes the row first).
  async function handleDeleteImportantDate(id: string): Promise<void> {
    if (isSupabaseConfigured && session) {
      const userId = session.user.id;
      const client = getSupabase() as unknown as FamilyDataClient;
      const result = await deleteFamilyRow(userId, "family_events", id, client);
      if (!result.ok) {
        setToastMessage("Couldn't remove that date. Try again.");
        return;
      }
    }
    setCollections((current) => ({
      ...current,
      familyEvents: current.familyEvents.filter((event) => event.id !== id),
    }));
  }

  // Tap a member avatar -> their profile. Scope subsequent adds (document/date)
  // to them by seeding the add owner; the quick-add modals read presetOwner.
  function openMember(member: FamilyMember) {
    setSelectedMemberId(member.id);
    setAddSheetOwner(member.name);
    setView("member");
  }

  function openOnboardingReplay(returnView: OnboardingReturnView) {
    setOnboardingReturnView(returnView);
    setView("onboarding");
  }

  function closeOnboardingReplay() {
    setView(onboardingReturnView ?? "settings");
    setOnboardingReturnView(undefined);
  }

  async function handleAddPerson(person: OnboardingPerson): Promise<void> {
    await persistOnboardingPeople([person]);
    setQuickAdd(undefined);
  }

  // Today map-hero: tapping a trunk node checks the task off (or un-checks it).
  function togglePriorityDone(id: string) {
    setPriorityActionStates((current) => {
      const next = { ...current };
      if (next[id] === "completed") {
        delete next[id];
      } else {
        next[id] = "completed";
      }
      return next;
    });
  }

  if (isSupabaseConfigured && sessionLoading) {
    return (
      <main className="login-shell">
        <div className="ambient-field" aria-hidden="true" />
        <section className="login-panel" aria-busy="true">
          <span className="spinner" aria-hidden="true" />
          <p>Loading your map…</p>
        </section>
      </main>
    );
  }

  if (isSupabaseConfigured && recovering) {
    return (
      <SetNewPasswordScreen
        onDone={() => {
          clearRecovery();
          setToastMessage("Password updated.");
        }}
      />
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />;
  }

  if (!isSupabaseConfigured && !isLoggedIn) {
    return (
      <main className="login-shell">
        <div className="ambient-field" aria-hidden="true" />
        <div className="theme-toggle-floating">
          <ThemeToggle />
        </div>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-brand-row">
            <span className="brand-mark login-mark">
              <Map size={22} />
            </span>
            <span>Private household operating system</span>
          </div>
          <h1 id="login-title">LifeMap</h1>
          <p>Find the next move. Keep private details tucked away.</p>
          <button
            className="primary-button login-button"
            type="button"
            onClick={() => setIsLoggedIn(true)}
          >
            Login as Alex Kim
            <ChevronRight size={16} />
          </button>
          <span>
            Demo login only. Real authentication comes after the MVP works.
          </span>
        </section>
      </main>
    );
  }

  if (view === "onboarding" && !onboardingReturnView) {
    return (
      <OnboardingView
        initialName={session?.user.user_metadata?.first_name ?? ""}
        onComplete={(result) => completeOnboarding(result)}
        onSkip={() => completeOnboarding()}
      />
    );
  }

  return (
    <>
      <main
        ref={appShellRef}
        className={`app-shell view-${view} analyze-${analyzeStatus}`}
      >
        <div className="ambient-field" aria-hidden="true" />
        <aside
          className="sidebar app-nav-shell"
          aria-label="App navigation"
        >
          <button
            aria-label="Map home"
            className="brand brand-button"
            type="button"
            onClick={() => setView("today")}
          >
            <span className="brand-mark">
              <Map size={20} />
            </span>
            <span>Your map</span>
          </button>

          <nav className="nav-list bottom-nav" aria-label="Household sections">
            <button
              className={
                view === "today" ||
                view === "bucket" ||
                view === "review"
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("today")}
            >
              <Sparkles size={18} />
              <span>Home</span>
            </button>
            <button
              className={
                view === "vault" || view === "calendar" || view === "dates"
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("vault")}
            >
              <Archive size={18} />
              <span>Cabinet</span>
            </button>
            <button
              className={
                view === "more" ||
                view === "family" ||
                view === "member" ||
                view === "setup" ||
                view === "launchPlan" ||
                view === "howItWorks"
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("more")}
            >
              <UsersRound size={18} />
              <span>Family</span>
            </button>
            <button
              className={
                view === "settings" ||
                view === "privacy" ||
                (view === "onboarding" &&
                  onboardingReturnView === "settings")
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("settings")}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>

          <div className="area-list" aria-label="Household areas">
            {samples.householdAreas.map((area) => (
              <button className="area-row" key={area.label} type="button">
                <span>{area.label}</span>
                <span>{area.count}</span>
              </button>
            ))}
          </div>

          <section className="security-panel" aria-label="Security status">
            <LockKeyhole size={18} />
            <div>
              <strong>Private by default</strong>
              <span>Drafts wait for approval.</span>
            </div>
          </section>
          {isSupabaseConfigured && session ? (
            <button
              aria-label={
                session.user.email
                  ? `Sign out ${session.user.email}`
                  : "Sign out"
              }
              className="secondary-button sign-out-button"
              type="button"
              onClick={() => getSupabase().auth.signOut()}
            >
              Sign out
            </button>
          ) : null}
        </aside>

        {view === "onboarding" && onboardingReturnView ? (
          <section
            className="workspace onboarding-replay-workspace"
            aria-label="Welcome tour"
          >
            <button
              className="member-back onboarding-replay-back"
              type="button"
              onClick={closeOnboardingReplay}
            >
              <ChevronLeft size={16} />
              Back to Settings
            </button>
            <OnboardingView
              initialName={session?.user.user_metadata?.first_name ?? ""}
              variant="embedded"
              onComplete={(result) => completeOnboarding(result)}
              onSkip={closeOnboardingReplay}
            />
          </section>
        ) : view === "today" ? (
          <TodayView
            approvalCount={selectedApprovals.length}
            brief={dailyBrief}
            error={briefError}
            identity={identity}
            map={map}
            priorityActionStates={priorityActionStates}
            setupBuckets={activeSetupBuckets}
            setupProfile={setupProfile}
            status={briefStatus}
            upcomingDates={todayUpcomingDates}
            onGenerateBrief={handleGenerateBrief}
            onOpenBrainDump={openCapture}
            onOpenCabinet={() => setView("vault")}
            onOpenFamilyMap={() => setView("more")}
            onOpenImportantDates={() => setView("dates")}
            onOpenReview={() => setView("review")}
            onOpenPriority={setSelectedPriority}
            onTogglePriorityDone={togglePriorityDone}
            onOpenSetup={() => setView("setup")}
            onOpenSetupBucket={(bucket) => {
              setSelectedSetupBucketId(bucket.id);
              setView("bucket");
            }}
          />
        ) : view === "bucket" && selectedSetupBucket ? (
          <BucketDetailView
            bucket={selectedSetupBucket}
            profile={setupProfile}
            onBack={() => setView("today")}
            onOpenCalendar={() => setView("calendar")}
            onOpenCapture={openCapture}
            onOpenVault={() => setView("vault")}
          />
        ) : view === "member" && selectedMember ? (
          <MemberProfileView
            member={selectedMember}
            vaultItems={collections.vaultItems}
            familyEvents={collections.familyEvents}
            onBack={() => setView("more")}
            onAddDocument={(docTypeKey = "other") => {
              setAddSheetOwner(selectedMember.name);
              setQuickAddDocTypeKey(docTypeKey);
              setQuickAdd("document");
            }}
            onAddDate={(category = "custom") => {
              setAddSheetOwner(selectedMember.name);
              setQuickAddDateCategory(category);
              setQuickAdd("date");
            }}
            onUpdateMember={handleUpdateFamilyMember}
          />
        ) : view === "capture" ? (
          <CaptureWorkspace
            analyzeError={analyzeError}
            analyzeStatus={analyzeStatus}
            captureRoute={captureRoute}
            examples={sampleIntakes}
            intake={intake}
            map={map}
            onAnalyze={handleAnalyze}
            onClose={() => {
              setCaptureRoute(undefined);
              setView("today");
            }}
            onIntakeChange={(nextIntake) => {
              setIntake(nextIntake);
              if (analyzeStatus !== "loading") {
                setAnalyzeStatus("idle");
                setAnalyzeError(undefined);
              }
            }}
            onLoadExample={loadSampleIntake}
            onOpenCalendar={() => setView("calendar")}
            onOpenToday={() => setView("today")}
            onOpenVault={() => setView("vault")}
            onReview={() => setView("review")}
            onRoute={followCaptureRoute}
          />
        ) : view === "calendar" ? (
          <CalendarView
            analysis={map}
            dismissedSuggestionIds={dismissedSuggestionIds}
            familyEvents={collections.familyEvents}
            recurringCareItems={collections.recurringCareItems}
            savedSuggestionIds={savedSuggestionIds}
            onDismissSuggestion={dismissSuggestion}
            onOpenCapture={() => openCapture()}
            onSaveSuggestion={saveSuggestion}
            onSaveSuggestions={saveSuggestions}
          />
        ) : view === "vault" ? (
          <VaultView
            familyMembers={collections.familyMembers}
            vaultItems={collections.vaultItems}
            canUploadFiles={isSupabaseConfigured && Boolean(session)}
            onOpenCapture={() => openCapture()}
            onAddDocument={handleAddDocument}
            onOpenFile={handleOpenVaultFile}
          />
        ) : view === "dates" ? (
          <ImportantDatesView
            familyEvents={collections.familyEvents}
            familyMembers={collections.familyMembers}
            onBack={() => setView("today")}
            onSaveDate={handleSaveImportantDate}
            onDeleteDate={handleDeleteImportantDate}
          />
        ) : view === "family" ? (
          <>
            <section
              className="workspace family-workspace"
              aria-labelledby="page-title"
            >
              <header className="topbar">
                <div>
                  <h1 id="page-title">Family admin map</h1>
                  <p>
                    Paste messy family admin and LifeMap turns it into your map.
                  </p>
                </div>
              </header>

              <div className="work-grid">
                <section
                  className="panel intake-panel"
                  aria-labelledby="intake-title"
                >
                  <div className="panel-heading">
                    <div>
                      <h2 id="intake-title">Paste anything</h2>
                      <span>Email, notes, forms, travel plans</span>
                    </div>
                    <FileText size={18} />
                  </div>
                  <div className="sample-strip" aria-label="Sample intakes">
                    <span>Try a sample</span>
                    <div>
                      {sampleIntakes.map((sample) => (
                        <button
                          className="sample-button"
                          key={sample.label}
                          type="button"
                          onClick={() => loadSampleIntake(sample.rawIntake)}
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    aria-label="Messy forwarded family admin intake"
                    value={intake}
                    wrap="soft"
                    onChange={(event) => setIntake(event.target.value)}
                  />
                  <div className="intake-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openCapture()}
                    >
                      <Inbox size={16} />
                      Open LifeMap AI
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={analyzeStatus === "loading"}
                      onClick={handleAnalyze}
                    >
                      {analyzeStatus === "loading" ? (
                        <>
                          <span className="spinner" aria-hidden="true" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Analyze intake
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                  <AnalyzeNotice status={analyzeStatus} error={analyzeError} />
                </section>

                {showFullMap ? (
                  <section
                    className="panel map-panel"
                    aria-labelledby="map-title"
                  >
                    <div className="panel-heading">
                      <div>
                        <h2 id="map-title">Extracted map</h2>
                        <span>{map.sourceEvidence.length} source links</span>
                      </div>
                      <ShieldCheck size={18} />
                    </div>

                    <SourceEvidenceRow sources={map.sourceEvidence} />

                    <div className="map-section">
                      <h3>What is due</h3>
                      <div className="due-list">
                        {map.dueItems.map((item) => (
                          <article className="due-row" key={item.title}>
                            <Clock3 size={18} />
                            <div>
                              <strong>{item.title}</strong>
                              <span>{item.dueDate}</span>
                              <small>{item.sourceQuote}</small>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="split-map">
                      <div className="map-section">
                        <h3>What is missing</h3>
                        <ul className="plain-list">
                          {map.missingInfo.map((item) => (
                            <li key={item.id} title={item.sourceQuote}>
                              <strong>{item.label}</strong>
                              <span>{item.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="map-section">
                        <h3>Waiting on</h3>
                        {map.waitingOn.map((party) => (
                          <div className="waiting-card" key={party.id}>
                            <UserRoundCheck size={18} />
                            <div>
                              <strong>{party.name}</strong>
                              <span>{party.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="map-section">
                      <h3>Next 3 actions</h3>
                      <ol className="action-list">
                        {map.nextActions.map((action) => (
                          <li key={action.id}>
                            <Check size={16} />
                            <span>{action.label}</span>
                            <small>{action.owner}</small>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </section>
                ) : (
                  <button
                    className="see-full-map"
                    type="button"
                    onClick={() => setShowFullMap(true)}
                  >
                    <span>Click here to see the full map</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </section>

            {showFullMap ? (
              <ApprovalQueue
                disabledApprovals={disabledApprovals}
                editedApprovals={editedApprovals}
                selectedCount={selectedApprovals.length}
                stagedRun={stagedRun}
                sentDraftIds={sentDraftIds}
                sendingDraftId={sendingDraftId}
                variant="rail"
                onReview={() => setIsReviewOpen(true)}
                onSave={saveApprovalBody}
                onToggle={toggleApproval}
                onSendDraft={handleSendDraft}
              />
            ) : null}
          </>
        ) : view === "review" ? (
          <section
            className="workspace approval-workspace notebook"
            aria-labelledby="review-title"
          >
            <header className="notebook-head">
              <h1 id="review-title" className="notebook-title">
                Review
              </h1>
              <p className="notebook-sub">Only items waiting for your OK.</p>
            </header>
            {recordsLoadFailed ? (
              <div className="analyze-notice error" role="alert">
                <span>
                  We couldn't load your saved records, so this list may be
                  incomplete — it doesn't mean your data is gone.
                </span>
                <button
                  className="notebook-link"
                  type="button"
                  onClick={() => void loadFamilyRecords()}
                >
                  <RotateCcw size={14} />
                  Try again
                </button>
              </div>
            ) : null}
            <ApprovalQueue
              disabledApprovals={disabledApprovals}
              editedApprovals={editedApprovals}
              selectedCount={selectedApprovals.length}
              stagedRun={stagedRun}
              sentDraftIds={sentDraftIds}
              sendingDraftId={sendingDraftId}
              variant="panel"
              onReview={() => setIsReviewOpen(true)}
              onSave={saveApprovalBody}
              onToggle={toggleApproval}
              onSendDraft={handleSendDraft}
            />
            <h2 className="notebook-section-title" id="messages-title">
              Suggested messages
            </h2>
            <div className="notebook-list" aria-labelledby="messages-title">
              {dailyBrief.suggestedMessages.length > 0 ? (
                dailyBrief.suggestedMessages.map((message) => (
                  <div className="notebook-row" key={message.id}>
                    <span className="notebook-when">
                      {message.recipient.split(" ")[0]}
                    </span>
                    <span className="notebook-row-main">
                      <span className="notebook-row-title">
                        {message.subject}
                      </span>
                      <span className="notebook-row-sub">{message.body}</span>
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState
                  actionLabel="Capture something"
                  message="No drafts yet. Capture a message and I'll draft a reply for your OK."
                  onAction={() => openCapture()}
                />
              )}
            </div>
          </section>
        ) : view === "launchPlan" ? (
          <LaunchPlanView onBack={() => setView("more")} />
        ) : view === "privacy" ? (
          <PrivacyView onBack={() => setView("settings")} />
        ) : view === "howItWorks" ? (
          <HowItWorksView onBack={() => setView("more")} />
        ) : view === "setup" ? (
          <GuidedSetupView
            activeBucketIds={setupBucketIds}
            profile={setupProfile}
            onBack={() => setView("more")}
            onCreateBuckets={setSetupBucketIds}
            onOpenCalendar={() => setView("calendar")}
            onOpenCapture={() => openCapture()}
            onOpenToday={() => setView("today")}
            onOpenVault={() => setView("vault")}
            onProfileChange={setSetupProfile}
          />
        ) : view === "settings" ? (
          <MoreView
            mode="settings"
            isSupabaseConfigured={isSupabaseConfigured}
            sessionEmail={session?.user.email}
            displayName={displayName}
            onSetName={handleSetName}
            onOpenFamilyMap={() => setView("family")}
            onOpenCapture={() => openCapture()}
            onOpenCalendar={() => setView("calendar")}
            onOpenVault={() => setView("vault")}
            onOpenImportantDates={() => setView("dates")}
            onOpenSetup={() => setView("setup")}
            onOpenLaunchPlan={() => setView("launchPlan")}
            onOpenApprovals={() => setView("review")}
            onOpenOnboarding={() => openOnboardingReplay("settings")}
            onOpenHowItWorks={() => setView("howItWorks")}
            onOpenPrivacy={() => setView("privacy")}
            onOpenFeedback={() => setFeedbackOpen(true)}
            onResetDemo={handleResetDemo}
            onClearMap={() => {
              void handleClearRealAccount();
            }}
            onSignOut={() => getSupabase().auth.signOut()}
          />
        ) : (
          <FamilyDashboard
            familyEvents={collections.familyEvents}
            familyMembers={collections.familyMembers}
            vaultItems={collections.vaultItems}
            onAddMember={() => setQuickAdd("person")}
            onOpenMember={openMember}
          />
        )}
      </main>
      {isReviewOpen ? (
        <ReviewDialog
          approvals={selectedApprovals}
          onClose={() => setIsReviewOpen(false)}
          onStage={stageSelectedApprovals}
        />
      ) : null}
      {isBriefOpen ? (
        <DailyBriefDialog
          brief={dailyBrief}
          onClose={() => setIsBriefOpen(false)}
          onOpenApprovals={() => {
            setIsBriefOpen(false);
            setView("review");
          }}
        />
      ) : null}
      {selectedPriority ? (
        <PriorityActionDialog
          priority={selectedPriority}
          onAddToCalendar={() =>
            routeSelectedPriority(
              "calendar",
              "Calendar suggestions stay review-gated.",
            )
          }
          onClose={() => setSelectedPriority(undefined)}
          onComplete={completeSelectedPriority}
          onDraftMessage={() =>
            routeSelectedPriority("review", "Drafts wait in Review.")
          }
          onSaveToVault={() =>
            routeSelectedPriority("vault", "Supporting info routed to Cabinet.")
          }
          onSnooze={snoozeSelectedPriority}
        />
      ) : null}
      {toastMessage ? (
        <Toast
          message={toastMessage}
          onClose={dismissToast}
          onUndo={
            toastUndo
              ? () => {
                  toastUndo();
                  dismissToast();
                }
              : undefined
          }
        />
      ) : null}
      {session || isLoggedIn ? (
        <FeedbackPanel
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      ) : null}
      {quickAdd === "document" ? (
        <AddDocumentModal
          docType={
            DOCUMENT_TYPES.find((type) => type.key === quickAddDocTypeKey) ??
            DOCUMENT_TYPES.find((type) => type.key === "other") ??
            DOCUMENT_TYPES[0]
          }
          familyMembers={collections.familyMembers}
          canUploadFiles={isSupabaseConfigured && Boolean(session)}
          requiresFileUpload={isSupabaseConfigured && Boolean(session)}
          presetOwner={addSheetOwner}
          onClose={() => {
            setQuickAdd(undefined);
            setQuickAddDocTypeKey("other");
          }}
          onSave={async (input) => {
            const saved = await handleAddDocument(input);
            if (saved) {
              setQuickAdd(undefined);
              setQuickAddDocTypeKey("other");
            }
            return saved;
          }}
        />
      ) : null}
      {quickAdd === "date" ? (
        <AddDateModal
          category={quickAddDateCategory}
          familyMembers={collections.familyMembers}
          presetOwner={addSheetOwner}
          onClose={() => {
            setQuickAdd(undefined);
            setQuickAddDateCategory("custom");
          }}
          onSave={(event) => {
            handleSaveImportantDate(event);
            setQuickAdd(undefined);
            setQuickAddDateCategory("custom");
          }}
        />
      ) : null}
      {quickAdd === "person" ? (
        <AddPersonModal
          onClose={() => setQuickAdd(undefined)}
          onSave={handleAddPerson}
        />
      ) : null}
    </>
  );
}

function CaptureWorkspace({
  analyzeError,
  analyzeStatus,
  captureRoute,
  examples,
  intake,
  map,
  onAnalyze,
  onClose,
  onIntakeChange,
  onLoadExample,
  onOpenCalendar,
  onOpenToday,
  onOpenVault,
  onReview,
  onRoute,
}: {
  analyzeError?: string;
  analyzeStatus: "idle" | "loading" | "success" | "error" | "fallback";
  captureRoute?: CaptureRoute;
  examples: typeof sampleIntakes;
  intake: string;
  map: LifeMapAnalysis;
  onAnalyze: () => void;
  onClose: () => void;
  onIntakeChange: (intake: string) => void;
  onLoadExample: (rawIntake: string) => void;
  onOpenCalendar: () => void;
  onOpenToday: () => void;
  onOpenVault: () => void;
  onReview: () => void;
  onRoute: () => void;
}) {
  const hasIntake = intake.trim().length > 0;
  const calendarItems = buildCalendarEventsFromAnalysis(map);
  const vaultItems = buildVaultItemsFromAnalysis(map);
  const approvalItems = buildApprovalQueue(map);
  const reliefTargets = [
    {
      id: "today",
      label: "Next moves",
      detail:
        map.nextActions.length > 0
          ? "Start with the first clear action."
          : "See the calm summary.",
      count: map.nextActions.length,
      icon: CheckCircle2,
      onClick: onOpenToday,
    },
    {
      id: "calendar",
      label: "Put on calendar",
      detail:
        calendarItems.length > 0
          ? "Save dates and appointments."
          : "No dated items found.",
      count: calendarItems.length,
      icon: CalendarDays,
      onClick: onOpenCalendar,
    },
    {
      id: "review",
      label: "Needs approval",
      detail:
        approvalItems.length > 0
          ? "Drafts and reminders wait here."
          : "Nothing needs approval.",
      count: approvalItems.length,
      icon: MessageSquare,
      onClick: onReview,
    },
    {
      id: "vault",
      label: "Save privately",
      detail:
        vaultItems.length > 0
          ? "Keep records and missing details."
          : "No private records found.",
      count: vaultItems.length,
      icon: LockKeyhole,
      onClick: onOpenVault,
    },
  ];
  const captureTypeOptions = captureTypeGuides.map((guide) => ({
    ...guide,
    sample: examples.find((example) => example.label === guide.sampleLabel),
  }));

  return (
    <section
      aria-labelledby="capture-sheet-title"
      className="workspace notebook capture-workspace"
    >
      <header className="notebook-head">
        <div className="notebook-head-row">
          <h1 id="capture-sheet-title" className="notebook-title">
            Brain dump
          </h1>
          <button
            aria-label="Back to Today"
            className="notebook-link quiet"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="notebook-sub">
          Drop the messy stuff. It gets sorted into next moves, calendar items,
          private records, and approval-gated messages.
        </p>
      </header>

      <div className="capture-chat">
        <div className="chat-bubble ai">
          <span className="chat-avatar" aria-hidden="true">
            <Sparkles size={14} />
          </span>
          <p>
            Paste anything cluttering your head. I&apos;ll pull out what needs a
            date, what needs saving, what needs a message, and what can wait.
            Nothing moves without you.
          </p>
        </div>

        {analyzeStatus !== "idle" && hasIntake ? (
          <div className="chat-bubble user">
            <p>{intake.trim().slice(0, 500)}</p>
          </div>
        ) : null}

        {analyzeStatus === "loading" ? (
          <div className="chat-bubble ai chat-typing">
            <span className="chat-avatar" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            <span className="chat-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="sr-only">Reading your note…</span>
          </div>
        ) : null}

        {analyzeStatus === "success" ? (
          <div className="chat-bubble ai">
            <span className="chat-avatar" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            <div className="capture-result">
              <span className="capture-result-eyebrow">
                Sorted into relief steps
              </span>
              <p className="capture-result-summary">
                I found {map.nextActions.length}{" "}
                {pluralize("next move", map.nextActions.length)},{" "}
                {calendarItems.length}{" "}
                {pluralize("calendar item", calendarItems.length)},{" "}
                {approvalItems.length}{" "}
                {pluralize("approval", approvalItems.length)}, and{" "}
                {vaultItems.length}{" "}
                {pluralize("private record", vaultItems.length)}.
              </p>
              <div
                aria-label="Sorted LifeMap results"
                className="capture-relief-grid"
              >
                {reliefTargets.map(
                  ({ id, label, detail, count, icon: Icon, onClick }) => (
                    <button
                      className={`capture-relief-card capture-relief-card-${id}`}
                      disabled={id !== "today" && count === 0}
                      key={id}
                      type="button"
                      onClick={onClick}
                    >
                      <span className="capture-relief-icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <span className="capture-relief-count">{count}</span>
                      <span className="capture-relief-label">{label}</span>
                      <span className="capture-relief-detail">{detail}</span>
                    </button>
                  ),
                )}
              </div>
              {map.missingInfo.length > 0 ? (
                <div className="capture-result-group">
                  <span className="capture-result-label">
                    Clarify {map.missingInfo.length}{" "}
                    {pluralize("thing", map.missingInfo.length)}
                  </span>
                  <div className="capture-pills">
                    {map.missingInfo.slice(0, 4).map((info) => (
                      <span className="capture-pill" key={info.label}>
                        {info.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {captureRoute ? (
                <div className="capture-suggested-route">
                  <span>{captureRoute.message}</span>
                  <button
                    className="notebook-link"
                    type="button"
                    onClick={onRoute}
                  >
                    {captureRoute.buttonLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {analyzeStatus === "fallback" || analyzeStatus === "error" ? (
          <div className="chat-bubble ai">
            <span className="chat-avatar" aria-hidden="true">
              <Sparkles size={14} />
            </span>
            <CaptureAnalyzeNotice
              error={analyzeError}
              map={map}
              status={analyzeStatus}
              onRetry={onAnalyze}
            />
          </div>
        ) : null}
      </div>

      <h2 className="capture-composer-eyebrow" id="ai-intake-title">
        Paste anything
      </h2>
      <div className="capture-composer">
        <textarea
          aria-label="Paste email, screenshot notes, forms, travel plans, or family admin"
          className="capture-input"
          placeholder="Paste anything here…"
          value={intake}
          wrap="soft"
          onChange={(event) => onIntakeChange(event.target.value)}
        />
        <button
          aria-label="Analyze intake"
          className="capture-send"
          type="button"
          disabled={analyzeStatus === "loading" || !hasIntake}
          onClick={onAnalyze}
        >
          {analyzeStatus === "loading" ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
      {analyzeStatus === "success" ? null : (
        <section aria-labelledby="capture-type-title">
          <h2 className="notebook-section-title" id="capture-type-title">
            Choose what this is
          </h2>
          <p className="notebook-sub">
            Start from a category to prefill an example, or just paste above.
          </p>
          <div className="notebook-list">
            {captureTypeOptions.map((option) => (
              <button
                aria-label={`Use ${option.title.toLowerCase()} template`}
                className="notebook-row"
                disabled={!option.sample}
                key={option.title}
                type="button"
                onClick={() => {
                  if (option.sample) {
                    onLoadExample(option.sample.rawIntake);
                  }
                }}
              >
                <span className="notebook-row-main">
                  <span className="notebook-row-title">{option.title}</span>
                  <span className="notebook-row-sub">{option.description}</span>
                </span>
                <ChevronRight className="notebook-chev" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function CaptureAnalyzeNotice({
  status,
  error,
  map,
  onRetry,
}: {
  status: "idle" | "loading" | "success" | "error" | "fallback";
  error?: string;
  map: LifeMapAnalysis;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <p className="analyze-notice" aria-live="polite">
        LifeMap AI is turning this into your map...
      </p>
    );
  }

  if (status === "success") {
    return (
      <div className="capture-success-card" role="status" aria-live="polite">
        <CheckCircle2 size={18} />
        <p>
          I found {map.dueItems.length} due{" "}
          {pluralize("item", map.dueItems.length)}, {map.missingInfo.length}{" "}
          missing {pluralize("record", map.missingInfo.length)},{" "}
          {map.waitingOn.length} {pluralize("person", map.waitingOn.length)}{" "}
          waiting, and {map.nextActions.length} next{" "}
          {pluralize("action", map.nextActions.length)}.
        </p>
      </div>
    );
  }

  if (status === "fallback") {
    return (
      <div className="analyze-notice error" role="status" aria-live="polite">
        <span>{error}</span>
        <span>Showing the local parser so the workflow still works.</span>
        <button className="notebook-link" type="button" onClick={onRetry}>
          <RotateCcw size={14} />
          Try AI again
        </button>
      </div>
    );
  }

  if (status === "error") {
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    return (
      <div className="analyze-notice error" role="alert" aria-live="assertive">
        <span>
          {offline
            ? "You appear to be offline. Reconnect, then try again."
            : (error ?? "LifeMap couldn't analyze that. Please try again.")}
        </span>
        <button className="notebook-link" type="button" onClick={onRetry}>
          <RotateCcw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return null;
}

function FamilyDashboard({
  familyMembers,
  familyEvents,
  vaultItems,
  onAddMember,
  onOpenMember,
}: {
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];
  vaultItems: VaultItem[];
  onAddMember: () => void;
  onOpenMember: (member: FamilyMember) => void;
}) {
  const now = new Date();
  const people = familyMembers.filter((member) => member.profileType !== "pet");
  const pets = familyMembers.filter((member) => member.profileType === "pet");
  const sharedRecords = vaultItems.filter((item) => item.owner === "Whole family");
  const householdDates = familyEvents.filter(
    (event) => event.owner === "Family" || event.owner === "Whole family",
  );
  const emergencyMembers = familyMembers.filter(
    (member) => member.careNotes.length > 0,
  );
  const sharedBasicsCount = sharedRecords.length + householdDates.length;

  return (
    <section
      className="workspace more-workspace family-dashboard"
      aria-labelledby="family-dashboard-title"
    >
      <header className="topbar compact-topbar family-dashboard-header">
        <div>
          <span className="workspace-kicker">
            <UsersRound size={14} />
            Household dashboard
          </span>
          <h1 id="family-dashboard-title">Family dashboard</h1>
          <p>People, pets, care notes, and shared basics.</p>
        </div>
      </header>

      <div className="family-dashboard-stack">
        <section
          className="family-members-panel"
          aria-labelledby="family-members-title"
        >
          <div className="family-dashboard-section-head">
            <div>
              <span>Roster</span>
              <h2 id="family-members-title">People and pets</h2>
              <p>
                {formatCount(people.length, "person")} ·{" "}
                {formatCount(pets.length, "pet")} ·{" "}
                {sharedBasicsCount} shared {pluralize("basic", sharedBasicsCount)}
              </p>
            </div>
            <button type="button" onClick={onAddMember}>
              Add person or pet
            </button>
          </div>

          <div className="family-member-grid">
            {familyMembers.map((member) => {
              const stuff = memberStuff(member, vaultItems, familyEvents, now);
              return (
                <button
                  aria-label={`Open ${member.name}'s profile`}
                  className="family-member-card"
                  key={member.id}
                  type="button"
                  onClick={() => onOpenMember(member)}
                >
                  <span
                    className={`calm-av calm-av-${memberAccent(member.id)}`}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <span className="family-member-copy">
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                    <small>
                      {stuff.documents.length}{" "}
                      {pluralize("record", stuff.documents.length)} ·{" "}
                      {stuff.dates.length} {pluralize("date", stuff.dates.length)}
                    </small>
                  </span>
                  <span className="family-member-meta">Open</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="family-dashboard-panel family-household-panel"
          aria-labelledby="family-shared-title"
        >
          <div className="family-dashboard-section-head">
            <div>
              <span>Shared household</span>
              <h2 id="family-shared-title">Shared basics</h2>
            </div>
          </div>
          <div className="family-household-grid">
            <article className="family-household-card">
              <h3>Shared records</h3>
              {sharedRecords.length > 0 ? (
                <ul>
                  {sharedRecords.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Add insurance cards, IDs, or household documents to the
                  Cabinet and mark them for the whole family.
                </p>
              )}
            </article>
            <article className="family-household-card">
              <h3>Emergency basics</h3>
              {emergencyMembers.length > 0 ? (
                <ul>
                  {emergencyMembers.slice(0, 3).map((member) => (
                    <li key={member.id}>
                      <strong>{member.name}</strong>
                      <span>{member.careNotes[0]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Add allergies, medications, school contacts, or pet care notes
                  inside each profile.
                </p>
              )}
            </article>
            <article className="family-household-card">
              <h3>Household dates</h3>
              {householdDates.length > 0 ? (
                <ul>
                  {householdDates.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <strong>{event.title}</strong>
                      <span>{event.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Shared school, travel, renewal, and family dates appear here
                  once saved.
                </p>
              )}
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

function MoreView({
  mode,
  isSupabaseConfigured,
  sessionEmail,
  displayName = "",
  onSetName,
  onOpenFamilyMap,
  onOpenCapture,
  onOpenCalendar,
  onOpenVault,
  onOpenImportantDates,
  onOpenSetup,
  onOpenLaunchPlan,
  onOpenApprovals,
  onOpenOnboarding,
  onOpenHowItWorks,
  onOpenPrivacy,
  onOpenFeedback,
  onResetDemo,
  onClearMap,
  onSignOut,
}: {
  mode: "family" | "settings";
  isSupabaseConfigured: boolean;
  sessionEmail?: string;
  displayName?: string;
  onSetName?: (value: string) => void;
  onOpenFamilyMap: () => void;
  onOpenCapture: () => void;
  onOpenCalendar: () => void;
  onOpenVault: () => void;
  onOpenImportantDates: () => void;
  onOpenSetup: () => void;
  onOpenLaunchPlan: () => void;
  onOpenApprovals: () => void;
  onOpenOnboarding: () => void;
  onOpenHowItWorks: () => void;
  onOpenPrivacy: () => void;
  onOpenFeedback: () => void;
  onResetDemo: () => void;
  onClearMap?: () => void;
  onSignOut: () => void;
}) {
  const [clearMapConfirmOpen, setClearMapConfirmOpen] = useState(false);
  const isSettings = mode === "settings";
  const showFounderTools = import.meta.env.DEV;
  return (
    <section className="workspace more-workspace" aria-labelledby="more-title">
      <header className="topbar compact-topbar">
        <div>
          <span className="workspace-kicker">
            {isSettings ? <Settings size={14} /> : <UsersRound size={14} />}
            {isSettings ? "Preferences" : "Household view"}
          </span>
          <h1 id="more-title">{isSettings ? "Settings" : "Family"}</h1>
          <p>
            {isSettings
              ? "Theme, account, privacy, and safety controls."
              : "View the people, records, dates, and setup that shape your household map."}
          </p>
        </div>
      </header>

      <div className="more-list">
        {isSettings ? (
          <section
            aria-labelledby="more-appearance-title"
            className="more-section"
          >
            <div className="more-section-heading">
              <span>Appearance</span>
              <h2 id="more-appearance-title">Theme</h2>
              <p>Choose how LifeMap looks.</p>
            </div>
            <div className="more-appearance-row">
              <span className="more-row-copy">
                <strong>Light / Dark</strong>
                <span>Tap to toggle the app theme.</span>
              </span>
              <ThemeToggle />
            </div>
            {isSupabaseConfigured && sessionEmail && onSetName ? (
              <div className="settings-name-field">
                <label htmlFor="settings-name-input">Your name</label>
                <input
                  id="settings-name-input"
                  type="text"
                  value={displayName}
                  placeholder="What should we call you?"
                  onChange={(e) => onSetName(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span>Used for your greeting.</span>
              </div>
            ) : null}
          </section>
        ) : null}
        {isSettings ? (
          <section
            aria-labelledby="more-setup-title"
            className="more-section settings-welcome-section"
          >
            <div className="more-section-heading">
              <span>Welcome</span>
              <h2 id="more-setup-title">Welcome and setup</h2>
              <p>Replay setup anytime.</p>
            </div>
            <article className="settings-welcome-card">
              <div className="settings-welcome-copy">
                <span className="settings-welcome-icon" aria-hidden="true">
                  <Sparkles size={19} />
                </span>
                <div>
                  <h3>Welcome tour.</h3>
                  <p>A quick walkthrough of the basics.</p>
                </div>
              </div>
              <div className="settings-welcome-actions">
                <button
                  aria-label="Replay the welcome tour"
                  className="settings-welcome-primary"
                  type="button"
                  onClick={onOpenOnboarding}
                >
                  Replay welcome
                  <ChevronRight size={15} />
                </button>
                <button
                  aria-label="Open guided setup"
                  type="button"
                  onClick={onOpenSetup}
                >
                  Update setup
                </button>
                <button
                  aria-label="Open how LifeMap works"
                  type="button"
                  onClick={onOpenHowItWorks}
                >
                  How it works
                </button>
              </div>
            </article>
          </section>
        ) : null}
        {isSettings && showFounderTools ? (
          <section
            aria-labelledby="more-dev-title"
            className="more-section settings-dev-tools"
          >
            <div className="more-section-heading">
              <span>Development</span>
              <h2 id="more-dev-title">Prototype tools</h2>
            </div>
            <button
              aria-label="Open family admin map"
              className="more-row"
              type="button"
              onClick={onOpenFamilyMap}
            >
              <span className="more-row-icon">
                <Sparkles size={18} />
              </span>
              <span className="more-row-copy">
                <strong>Family admin map</strong>
                <span>Advanced extraction workspace for QA and demos.</span>
              </span>
              <ChevronRight className="more-row-chevron" size={18} />
            </button>
            <button
              aria-label="Open launch plan"
              className="more-row"
              type="button"
              onClick={onOpenLaunchPlan}
            >
              <span className="more-row-icon">
                <ListChecks size={18} />
              </span>
              <span className="more-row-copy">
                <strong>Launch Plan</strong>
                <span>Founder readiness checklist and demo progress.</span>
              </span>
              <ChevronRight className="more-row-chevron" size={18} />
            </button>
          </section>
        ) : null}
        {!isSettings ? (
          <>
        <section
          aria-labelledby="more-start-title"
          className="more-section more-section-primary"
        >
          <div className="more-section-heading">
            <span>Whole household</span>
            <h2 id="more-start-title">Family map</h2>
            <p>See and shape the people, pets, records, and dates LifeMap carries.</p>
          </div>
          <button
            aria-label="Open how LifeMap works"
            className="more-row"
            type="button"
            onClick={onOpenHowItWorks}
          >
            <span className="more-row-icon">
              <Map size={18} />
            </span>
            <span className="more-row-copy">
              <strong>How LifeMap works</strong>
              <span>The loop in three steps, plus what each tab is for.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Open guided setup"
            className="more-row"
            type="button"
            onClick={onOpenSetup}
          >
            <span className="more-row-icon">
              <UsersRound size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Guided setup</strong>
              <span>
                Pick family, pets, records, travel, and life logistics.
              </span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Replay the welcome tour"
            className="more-row"
            type="button"
            onClick={onOpenOnboarding}
          >
            <span className="more-row-icon">
              <Sparkles size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Welcome tour</strong>
              <span>Replay the first-run walkthrough.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
        </section>

        <section aria-labelledby="more-build-title" className="more-section">
          <div className="more-section-heading">
            <span>Family logistics</span>
            <h2 id="more-build-title">Shared context</h2>
          </div>
          <button
            aria-label="Open brain dump capture"
            className="more-row"
            type="button"
            onClick={onOpenCapture}
          >
            <span className="more-row-icon">
              <Inbox size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Brain dump capture</strong>
              <span>
                Paste messy context and route it to calendar, cabinet, or review.
              </span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Open calendar"
            className="more-row"
            type="button"
            onClick={onOpenCalendar}
          >
            <span className="more-row-icon">
              <CalendarDays size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Calendar</strong>
              <span>Due dates, reminders, and what LifeMap put on a date.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Open cabinet"
            className="more-row"
            type="button"
            onClick={onOpenVault}
          >
            <span className="more-row-icon">
              <Archive size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Cabinet</strong>
              <span>IDs, records, and documents kept behind one door.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Open important dates"
            className="more-row"
            type="button"
            onClick={onOpenImportantDates}
          >
            <span className="more-row-icon">
              <CalendarHeart size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Important dates</strong>
              <span>
                Birthdays, renewals, and dates you never want to forget.
              </span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          {showFounderTools ? (
            <>
              <button
                aria-label="Open family admin map"
                className="more-row"
                type="button"
                onClick={onOpenFamilyMap}
              >
                <span className="more-row-icon">
                  <Sparkles size={18} />
                </span>
                <span className="more-row-copy">
                  <strong>Family admin map</strong>
                  <span>See the full extracted household map and approvals.</span>
                </span>
                <ChevronRight className="more-row-chevron" size={18} />
              </button>
              <button
                aria-label="Open launch plan"
                className="more-row"
                type="button"
                onClick={onOpenLaunchPlan}
              >
                <span className="more-row-icon">
                  <ListChecks size={18} />
                </span>
                <span className="more-row-copy">
                  <strong>Launch Plan</strong>
                  <span>Founder readiness checklist and demo progress.</span>
                </span>
                <ChevronRight className="more-row-chevron" size={18} />
              </button>
            </>
          ) : null}
        </section>
          </>
        ) : null}

        {isSettings ? (
          <section aria-labelledby="more-account-title" className="more-section">
          <div className="more-section-heading">
            <span>Safety</span>
            <h2 id="more-account-title">Account and privacy</h2>
            <p>Privacy, approvals, and account controls.</p>
          </div>
          <button
            aria-label="Open privacy and security"
            className="more-row"
            type="button"
            onClick={onOpenPrivacy}
          >
            <span className="more-row-icon">
              <ShieldCheck size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Privacy &amp; security</strong>
              <span>Data, AI, email, and private details.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Open approvals and permissions"
            className="more-row"
            type="button"
            onClick={onOpenApprovals}
          >
            <span className="more-row-icon">
              <LockKeyhole size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Approvals &amp; permissions</strong>
              <span>Items waiting for your OK.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          <button
            aria-label="Send feedback"
            className="more-row"
            type="button"
            onClick={onOpenFeedback}
          >
            <span className="more-row-icon">
              <MessageSquare size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Send feedback</strong>
              <span>Tell the LifeMap team what feels off or missing.</span>
            </span>
            <ChevronRight className="more-row-chevron" size={18} />
          </button>
          {isSupabaseConfigured ? (
            <>
              <button className="more-row" type="button" onClick={onSignOut}>
                <span className="more-row-icon">
                  <UserRoundCheck size={18} />
                </span>
                <span className="more-row-copy">
                  <strong>Sign out</strong>
                  <span>{sessionEmail ?? "Signed in with Supabase"}</span>
                </span>
                <ChevronRight className="more-row-chevron" size={18} />
              </button>
              {onClearMap ? (
                <button
                  aria-label="Clear my map · start fresh"
                  className="more-row more-row-danger"
                  type="button"
                  onClick={() => setClearMapConfirmOpen(true)}
                >
                  <span className="more-row-icon">
                    <Trash2 size={18} />
                  </span>
                  <span className="more-row-copy">
                    <strong>Clear my map · start fresh</strong>
                    <span>
                      Permanently delete your records and start with a blank
                      LifeMap.
                    </span>
                  </span>
                  <ChevronRight className="more-row-chevron" size={18} />
                </button>
              ) : null}
            </>
          ) : (
            <>
              <article className="more-row more-row-static">
                <span className="more-row-icon">
                  <ShieldCheck size={18} />
                </span>
                <span className="more-row-copy">
                  <strong>Browser-only demo</strong>
                  <span>Demo data is stored in this browser only.</span>
                </span>
              </article>
              <button
                aria-label="Reset demo"
                className="more-row"
                type="button"
                onClick={onResetDemo}
              >
                <span className="more-row-icon">
                  <RotateCcw size={18} />
                </span>
                <span className="more-row-copy">
                  <strong>Reset demo</strong>
                  <span>Clear this browser's demo data and start fresh.</span>
                </span>
                <ChevronRight className="more-row-chevron" size={18} />
              </button>
            </>
          )}
        </section>
        ) : null}
      </div>
      {clearMapConfirmOpen && onClearMap ? (
        <ModalBackdrop onClose={() => setClearMapConfirmOpen(false)}>
          <section
            aria-labelledby="clear-map-dialog-title"
            aria-modal="true"
            className="review-dialog action-dialog"
            role="dialog"
            tabIndex={-1}
          >
            <div className="review-dialog-top">
              <div>
                <h2 id="clear-map-dialog-title">Clear my map?</h2>
                <p>
                  This permanently deletes your family members, events, vault
                  items, and recurring care — plus your intake, analysis, and
                  daily brief. This can&apos;t be undone.
                </p>
              </div>
            </div>
            <div className="action-dialog-buttons">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setClearMapConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  setClearMapConfirmOpen(false);
                  onClearMap();
                }}
              >
                Clear my map
              </button>
            </div>
          </section>
        </ModalBackdrop>
      ) : null}
    </section>
  );
}

function DailyBriefDialog({
  brief,
  onClose,
  onOpenApprovals,
}: {
  brief: DailyBrief;
  onClose: () => void;
  onOpenApprovals: () => void;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="daily-brief-dialog-title"
        aria-modal="true"
        className="review-dialog action-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="daily-brief-dialog-title">Daily Brief details</h2>
            <p>
              A calmer view of what matters today, what is open, and what can
              wait.
            </p>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="brief-detail-grid">
          <article className="brief-detail-card primary-brief-detail">
            <span>Today</span>
            <h3>{brief.todaySummary}</h3>
            <p>{brief.groundingNote}</p>
          </article>
          <BriefDetailList
            emptyText="No top priorities right now."
            items={brief.topPriorities.map((priority) => ({
              id: priority.id,
              title: priority.label,
              detail: priority.reason,
            }))}
            title="Top 3"
          />
          <BriefDetailList
            emptyText="No blocked loops in the current map."
            items={brief.openLoops.map((loop) => ({
              id: loop.id,
              title: loop.label,
              detail: loop.blockedBy,
            }))}
            title="Open loops"
          />
          <BriefDetailList
            emptyText="Nothing has been marked as waitable yet."
            items={brief.canWait.map((item) => ({
              id: item.id,
              title: item.label,
              detail: item.reason,
            }))}
            title="Can wait"
          />
        </div>

        <div className="review-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Back to Today
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={onOpenApprovals}
          >
            Review approvals
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </ModalBackdrop>
  );
}

function BriefDetailList({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: Array<{ id: string; title: string; detail: string }>;
  title: string;
}) {
  return (
    <article className="brief-detail-card">
      <span>{title}</span>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </article>
  );
}

function PriorityActionDialog({
  priority,
  onAddToCalendar,
  onClose,
  onComplete,
  onDraftMessage,
  onSaveToVault,
  onSnooze,
}: {
  priority: BriefPriority;
  onAddToCalendar: () => void;
  onClose: () => void;
  onComplete: () => void;
  onDraftMessage: () => void;
  onSaveToVault: () => void;
  onSnooze: () => void;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="priority-action-dialog-title"
        aria-modal="true"
        className="review-dialog action-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="priority-action-dialog-title">{priority.label}</h2>
            <p>{priority.reason}</p>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="priority-action-grid">
          <button
            className="priority-action-button"
            type="button"
            onClick={onComplete}
          >
            <CheckCircle2 size={18} />
            <span>
              <strong>Mark complete</strong>
              <small>Clear it from today's mental load.</small>
            </span>
          </button>
          <button
            className="priority-action-button"
            type="button"
            onClick={onSnooze}
          >
            <Clock3 size={18} />
            <span>
              <strong>Snooze to tomorrow</strong>
              <small>Keep it visible without making today louder.</small>
            </span>
          </button>
          <button
            className="priority-action-button"
            type="button"
            onClick={onSaveToVault}
          >
            <ShieldCheck size={18} />
            <span>
              <strong>Save info to Cabinet</strong>
              <small>Move supporting details into the source of truth.</small>
            </span>
          </button>
          <button
            className="priority-action-button"
            type="button"
            onClick={onAddToCalendar}
          >
            <CalendarDays size={18} />
            <span>
              <strong>Add to Calendar</strong>
              <small>Stage a time-based suggestion for review.</small>
            </span>
          </button>
          <button
            className="priority-action-button wide"
            type="button"
            onClick={onDraftMessage}
          >
            <MessageSquare size={18} />
            <span>
              <strong>Draft a message</strong>
              <small>
                LifeMap prepares it, but you approve before anything sends.
              </small>
            </span>
          </button>
        </div>
      </section>
    </ModalBackdrop>
  );
}

function Toast({
  message,
  onUndo,
  onClose,
}: {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="lifemap-toast" role="status" aria-live="polite">
      <Sparkles size={16} />
      <span>{message}</span>
      {onUndo ? (
        <>
          <button className="lifemap-toast-undo" type="button" onClick={onUndo}>
            Undo
          </button>
          <button
            aria-label="Dismiss notification"
            className="lifemap-toast-close"
            type="button"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </>
      ) : null}
    </div>
  );
}

function AnalyzeNotice({
  status,
  error,
}: {
  status: "idle" | "loading" | "success" | "error" | "fallback";
  error?: string;
}) {
  if (status === "loading") {
    return (
      <p className="analyze-notice" aria-live="polite">
        Analyzing with LifeMap AI...
      </p>
    );
  }

  if (status === "success") {
    return (
      <p className="analyze-notice success" aria-live="polite">
        AI map updated. Review before sending anything.
      </p>
    );
  }

  if (status === "fallback") {
    return (
      <p className="analyze-notice error" aria-live="polite">
        <span>{error}</span>
        <span>Showing the local demo parser so the workflow still works.</span>
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="analyze-notice error" aria-live="polite">
        {error}
      </p>
    );
  }

  return null;
}

function ApprovalQueue({
  disabledApprovals,
  editedApprovals,
  selectedCount,
  stagedRun,
  sentDraftIds,
  sendingDraftId,
  variant,
  onReview,
  onSave,
  onToggle,
  onSendDraft,
}: {
  disabledApprovals: Set<string>;
  editedApprovals: ApprovalItem[];
  selectedCount: number;
  stagedRun?: StagedRun;
  sentDraftIds: Set<string>;
  sendingDraftId?: string;
  variant: "rail" | "panel";
  onReview: () => void;
  onSave: (id: string, body: string) => void;
  onToggle: (id: string) => void;
  onSendDraft: (item: ApprovalItem, to: string) => void;
}) {
  const Component = variant === "rail" ? "aside" : "section";
  const pausedCount = editedApprovals.length - selectedCount;
  const reviewButtonLabel =
    selectedCount === 0 ? "Choose one" : `Approve ${selectedCount}`;

  return (
    <Component
      aria-label="Approval queue"
      className={variant === "rail" ? "approval-rail" : "approval-queue"}
    >
      <div className="rail-heading">
        <h2>{stagedRun ? "Approved" : "Needs your OK"}</h2>
      </div>
      {stagedRun ? null : <p className="rail-copy">Nothing acts without you.</p>}
      {stagedRun ? (
        <StagedSummary run={stagedRun} />
      ) : (
        <>
          <ApprovalFlowGuide
            pausedCount={pausedCount}
            selectedCount={selectedCount}
          />
          <div className="approval-list">
            {editedApprovals.length > 0 ? (
              editedApprovals.map((item) => (
                <ApprovalCard
                  approved={!disabledApprovals.has(item.id)}
                  item={item}
                  key={item.id}
                  sent={sentDraftIds.has(item.id)}
                  sending={sendingDraftId === item.id}
                  onSave={(body) => onSave(item.id, body)}
                  onToggle={() => onToggle(item.id)}
                  onSend={(to) => onSendDraft(item, to)}
                />
              ))
            ) : (
              <p className="notebook-empty">
                Nothing to review yet.
              </p>
            )}
          </div>
          <button
            className="notebook-cta"
            disabled={selectedCount === 0}
            type="button"
            onClick={onReview}
          >
            <Send size={15} />
            {reviewButtonLabel}
          </button>
        </>
      )}
    </Component>
  );
}

function ApprovalFlowGuide({
  pausedCount,
  selectedCount,
}: {
  pausedCount: number;
  selectedCount: number;
}) {
  return (
    <section className="approval-flow-card" aria-label="Approval status">
      <div className="approval-flow-metrics">
        <strong>{formatReadyCount(selectedCount)}</strong>
        <span>{formatPausedCount(pausedCount)}</span>
      </div>
    </section>
  );
}

function ApprovalCard({
  item,
  approved,
  sent,
  sending,
  onSave,
  onToggle,
  onSend,
}: {
  item: ApprovalItem;
  approved: boolean;
  sent: boolean;
  sending: boolean;
  onSave: (body: string) => void;
  onToggle: () => void;
  onSend: (to: string) => void;
}) {
  const Icon = item.kind === "draft" ? MessageSquare : Bell;
  const [draftBody, setDraftBody] = useState(item.body);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraftBody(item.body);
    setIsEditing(false);
  }, [item.body, item.id]);

  function saveDraftBody() {
    const nextBody = draftBody.trim() || item.body;
    onSave(nextBody);
    setDraftBody(nextBody);
    setIsEditing(false);
  }

  return (
    <article
      className={approved ? "notebook-approval" : "notebook-approval paused"}
    >
      <div className="notebook-approval-head">
        <span className="notebook-approval-icon">
          <Icon size={15} />
        </span>
        <span className="notebook-approval-titles">
          <span className="notebook-row-title">{item.title}</span>
          {item.recipient ? (
            <span className="notebook-row-sub">To {item.recipient}</span>
          ) : null}
        </span>
        <button
          aria-checked={approved}
          aria-label={
            approved
              ? `Hold ${item.title} for now`
              : `Allow ${item.title} for approval`
          }
          className="notebook-switch"
          role="switch"
          type="button"
          onClick={onToggle}
        >
          <span />
        </button>
      </div>
      {isEditing ? (
        <div className="notebook-approval-edit">
          <label
            className="notebook-send-label"
            htmlFor={`draft-body-${item.id}`}
          >
            Body
          </label>
          <textarea
            aria-label={`Draft body for ${item.title}`}
            className="notebook-textarea"
            id={`draft-body-${item.id}`}
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
          />
          <div className="notebook-approval-actions">
            <button
              className="notebook-link quiet"
              type="button"
              onClick={() => {
                setDraftBody(item.body);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              aria-label={`Save ${item.title}`}
              className="notebook-link"
              type="button"
              onClick={saveDraftBody}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="notebook-approval-body">{item.body}</p>
      )}
      <div className="notebook-approval-foot">
        {isEditing ? null : (
          <button
            aria-label={`Edit ${item.title}`}
            className="notebook-link"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        )}
      </div>
      {item.kind === "draft" ? (
        <SendDraftControl
          item={item}
          sent={sent}
          sending={sending}
          onSend={onSend}
        />
      ) : null}
    </article>
  );
}

function SendDraftControl({
  item,
  sent,
  sending,
  onSend,
}: {
  item: ApprovalItem;
  sent: boolean;
  sending: boolean;
  onSend: (to: string) => void;
}) {
  const [to, setTo] = useState(item.recipientEmail ?? "");
  const [confirming, setConfirming] = useState(false);
  const valid = /.+@.+\..+/.test(to);

  if (sent) {
    return <p className="notebook-sent">Sent ✓</p>;
  }

  return (
    <div className="notebook-send">
      <label className="notebook-send-label">
        Recipient email
        <input
          className="notebook-input"
          type="email"
          value={to}
          placeholder="name@example.com"
          onChange={(event) => setTo(event.target.value)}
        />
      </label>
      <button
        className="notebook-btn"
        disabled={!valid || sending}
        type="button"
        onClick={() => setConfirming(true)}
      >
        <Send size={14} />
        {sending ? "Sending…" : "Send email"}
      </button>
      {confirming ? (
        <div
          className="notebook-send-confirm"
          role="dialog"
          aria-label="Confirm send"
        >
          <p>
            Send to <strong>{to}</strong>? Replies come back to you.
          </p>
          <div className="notebook-approval-actions">
            <button
              className="notebook-link quiet"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              className="notebook-link"
              type="button"
              onClick={() => {
                setConfirming(false);
                onSend(to);
              }}
            >
              Confirm send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceEvidenceRow({ sources }: { sources: SourceEvidence[] }) {
  const [openId, setOpenId] = useState<string>();
  const open = sources.find((source) => source.id === openId);
  return (
    <section className="evidence-row" aria-label="Source evidence">
      <div className="evidence-chips">
        {sources.map((source) => (
          <button
            aria-expanded={source.id === openId}
            className={
              source.id === openId ? "evidence-chip open" : "evidence-chip"
            }
            data-quote={source.quote}
            key={source.id}
            type="button"
            onClick={() =>
              setOpenId((current) =>
                current === source.id ? undefined : source.id,
              )
            }
          >
            <CheckCircle2 size={13} />
            {source.label}
          </button>
        ))}
      </div>
      {open ? <p className="evidence-quote">“{open.quote}”</p> : null}
    </section>
  );
}

function StagedSummary({ run }: { run: StagedRun }) {
  const draftCount = run.approvals.filter(
    (approval) => approval.kind === "draft",
  ).length;
  const reminderCount = run.approvals.length - draftCount;

  return (
    <section className="staged-summary" aria-label="Demo staged approvals">
      <div className="staged-summary-top">
        <span className="staged-icon">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <h3>Approved for now</h3>
          <p>
            {formatCount(run.approvals.length, "item")} at {run.stagedAt}.
          </p>
        </div>
      </div>
      <div className="staged-meta" aria-label="Staged item types">
        <span>{formatCount(draftCount, "draft")}</span>
        <span>{formatCount(reminderCount, "reminder")}</span>
      </div>
      <ul className="staged-list">
        {run.approvals.map((approval) => (
          <li key={approval.id}>
            <span>{approval.kind === "draft" ? "Draft" : "Reminder"}</span>
            <strong>{approval.title}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatReadyCount(count: number) {
  return `${count} ready`;
}

function formatPausedCount(count: number) {
  return `${count} held`;
}

function ReviewDialog({
  approvals,
  onClose,
  onStage,
}: {
  approvals: ApprovalItem[];
  onClose: () => void;
  onStage: () => void;
}) {
  const itemLabel = approvals.length === 1 ? "item" : "items";

  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="review-dialog-title"
        aria-modal="true"
        className="review-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="review-dialog-title">Approve these actions</h2>
            <p>
              {approvals.length} {itemLabel} selected. Nothing sends unless you
              use Send email on a draft.
            </p>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="review-list">
          {approvals.map((approval) => (
            <article className="review-item" key={approval.id}>
              <span
                className={
                  approval.kind === "draft"
                    ? "queue-status"
                    : "queue-status scheduled"
                }
              >
                {approval.kind === "draft" ? "Draft message" : "Reminder"}
              </span>
              <h3>{approval.title}</h3>
              {approval.recipient ? (
                <p className="recipient">To {approval.recipient}</p>
              ) : null}
              <p>{approval.body}</p>
            </article>
          ))}
        </div>

        <div className="review-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Back to queue
          </button>
          <button className="primary-button" type="button" onClick={onStage}>
            Approve for now
            <CheckCircle2 size={16} />
          </button>
        </div>
      </section>
    </ModalBackdrop>
  );
}

export default App;
