import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  LockKeyhole,
  Map,
  ListChecks,
  MessageSquare,
  Sparkles,
  Send,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { analyzeWithAi, generateBriefWithAi } from "./api";
import {
  buildDailyBriefFromAnalysis,
  type BriefPriority,
  type DailyBrief,
} from "./dailyBrief";
import {
  buildApprovalQueue,
  type ApprovalItem,
  type LifeMapAnalysis,
} from "./lifemap";
import { loadStoredDemoState, saveStoredDemoState } from "./storage";
import CalendarView from "./CalendarView";
import AuthScreen from "./AuthScreen";
import BucketDetailView from "./BucketDetailView";
import LaunchPlanView from "./LaunchPlanView";
import GuidedSetupView from "./GuidedSetupView";
import { useSession } from "./useSession";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import TodayView from "./TodayView";
import VaultView from "./VaultView";
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
  type SetupProfile,
} from "./setupBuckets";

const starterIntake = presentationIntake;

const householdAreas = [
  { label: "School", count: 4 },
  { label: "Medical", count: 3 },
  { label: "Bills", count: 2 },
  { label: "Travel", count: 1 },
];

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

type StagedRun = {
  approvals: ApprovalItem[];
  stagedAt: string;
};

type AppView =
  | "today"
  | "capture"
  | "calendar"
  | "vault"
  | "review"
  | "more"
  | "family"
  | "setup"
  | "bucket"
  | "launchPlan";

type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";
type PriorityActionState = "completed" | "snoozed";
type CaptureRoute = {
  destination: "vault" | "calendar" | "review";
  buttonLabel: string;
  message: string;
};

function App() {
  const [initialState] = useState(loadStoredDemoState);
  const [isLoggedIn, setIsLoggedIn] = useState(
    initialState.isLoggedIn ?? false,
  );
  const [intake, setIntake] = useState(initialState.intake ?? starterIntake);
  const [map, setMap] = useState(initialState.analysis ?? presentationAnalysis);
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
  const [analyzeStatus, setAnalyzeStatus] = useState<
    "idle" | "loading" | "success" | "error" | "fallback"
  >("idle");
  const [analyzeError, setAnalyzeError] = useState<string>();
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(
    initialState.dailyBrief ?? presentationBrief,
  );
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("idle");
  const [briefError, setBriefError] = useState<string>();
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<BriefPriority>();
  const [priorityActionStates, setPriorityActionStates] = useState<
    Partial<Record<string, PriorityActionState>>
  >({});
  const [toastMessage, setToastMessage] = useState<string>();
  const [view, setView] = useState<AppView>("today");
  const [selectedSetupBucketId, setSelectedSetupBucketId] =
    useState<SetupBucketId>();
  const selectedSetupBucket = useMemo(
    () =>
      activeSetupBuckets.find((bucket) => bucket.id === selectedSetupBucketId),
    [activeSetupBuckets, selectedSetupBucketId],
  );
  const [captureRoute, setCaptureRoute] = useState<CaptureRoute>();
  const [remoteLoadedFor, setRemoteLoadedFor] = useState<string>();
  const { session, loading: sessionLoading } = useSession();
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
    ],
  );

  useEffect(() => {
    saveStoredDemoState(storedState);
  }, [storedState]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(undefined), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      return;
    }

    let active = true;
    const userId = session.user.id;
    setRemoteLoadedFor(undefined);

    loadRemoteState(userId, getSupabase() as unknown as RemoteStateClient).then(
      (remoteState) => {
        if (!active) {
          return;
        }

        applyStoredState(remoteState);
        setRemoteLoadedFor(userId);
      },
    );

    return () => {
      active = false;
    };
  }, [session]);

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
      );
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [remoteLoadedFor, session, storedState]);

  function applyStoredState(state: StoredDemoState) {
    if (state.intake) {
      setIntake(state.intake);
    }

    if (state.analysis) {
      setMap(state.analysis);
      if (!state.dailyBrief) {
        setDailyBrief(buildDailyBriefFromAnalysis(state.analysis));
      }
    }

    if (state.disabledApprovalIds) {
      setDisabledApprovals(new Set(state.disabledApprovalIds));
    }

    if (state.approvalBodyEdits) {
      setApprovalBodyEdits(state.approvalBodyEdits);
    }

    if (state.savedSuggestionIds) {
      setSavedSuggestionIds(new Set(state.savedSuggestionIds));
    }

    if (state.dismissedSuggestionIds) {
      setDismissedSuggestionIds(new Set(state.dismissedSuggestionIds));
    }

    if (state.dailyBrief) {
      setDailyBrief(state.dailyBrief);
    }

    if (state.setupProfile) {
      setSetupProfile(normalizeSetupProfile(state.setupProfile));
    }

    if (state.setupBucketIds) {
      setSetupBucketIds(normalizeSetupBucketIds(state.setupBucketIds));
    }
  }

  function saveSuggestion(id: string) {
    setSavedSuggestionIds((current) => new Set(current).add(id));
    setDismissedSuggestionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function saveSuggestions(ids: string[]) {
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

  function dismissSuggestion(id: string) {
    setDismissedSuggestionIds((current) => new Set(current).add(id));
    setSavedSuggestionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
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

  if (isSupabaseConfigured && !session) {
    return <AuthScreen />;
  }

  if (!isSupabaseConfigured && !isLoggedIn) {
    return (
      <main className="login-shell">
        <div className="ambient-field" aria-hidden="true" />
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-brand-row">
            <span className="brand-mark login-mark">
              <Map size={22} />
            </span>
            <span>Private household operating system</span>
          </div>
          <h1 id="login-title">LifeMap</h1>
          <p>
            Turn real-life logistics into a calm map of what is due, what is
            missing, who you are waiting on, and what needs approval.
          </p>
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

  return (
    <>
      <main className={`app-shell view-${view} analyze-${analyzeStatus}`}>
        <div className="ambient-field" aria-hidden="true" />
        <aside className="sidebar app-nav-shell" aria-label="LifeMap navigation">
          <button
            aria-label="LifeMap home"
            className="brand brand-button"
            type="button"
            onClick={() => setView("today")}
          >
            <span className="brand-mark">
              <Map size={20} />
            </span>
            <span>LifeMap</span>
          </button>

          <nav className="nav-list bottom-nav" aria-label="Household sections">
            <button
              className={
                view === "today" || view === "bucket"
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("today")}
            >
              <Sparkles size={18} />
              <span>Today</span>
            </button>
            <button
              className={view === "calendar" ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={18} />
              <span>Calendar</span>
            </button>
            <button
              aria-label="Capture"
              className={
                view === "capture"
                  ? "nav-capture-button active"
                  : "nav-capture-button"
              }
              type="button"
              onClick={() => openCapture()}
            >
              <Inbox size={22} />
              <span>Capture</span>
            </button>
            <button
              className={view === "vault" ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setView("vault")}
            >
              <Archive size={18} />
              <span>Vault</span>
            </button>
            <button
              className={view === "review" ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setView("review")}
            >
              <Bell size={18} />
              <span>Review</span>
            </button>
            <button
              className={
                view === "more" ||
                view === "family" ||
                view === "setup" ||
                view === "launchPlan"
                  ? "nav-item active"
                  : "nav-item"
              }
              type="button"
              onClick={() => setView("more")}
            >
              <Map size={18} />
              <span>More</span>
            </button>
          </nav>

          <div className="area-list" aria-label="Household areas">
            {householdAreas.map((area) => (
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

        {view === "today" ? (
          <TodayView
            approvalCount={selectedApprovals.length}
            brief={dailyBrief}
            error={briefError}
            map={map}
            priorityActionStates={priorityActionStates}
            setupBuckets={activeSetupBuckets}
            setupProfile={setupProfile}
            status={briefStatus}
            captureExamples={sampleIntakes}
            onGenerateBrief={handleGenerateBrief}
            onOpenApprovals={() => setView("review")}
            onOpenBrief={() => setIsBriefOpen(true)}
            onOpenBrainDump={openCapture}
            onOpenFamilyMap={() => setView("family")}
            onOpenPriority={setSelectedPriority}
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
            onOpenToday={() => setView("today")}
            onOpenVault={() => setView("vault")}
            onReview={() => setView("review")}
            onRoute={followCaptureRoute}
          />
        ) : view === "calendar" ? (
          <CalendarView
            analysis={map}
            dismissedSuggestionIds={dismissedSuggestionIds}
            savedSuggestionIds={savedSuggestionIds}
            onDismissSuggestion={dismissSuggestion}
            onSaveSuggestion={saveSuggestion}
            onSaveSuggestions={saveSuggestions}
          />
        ) : view === "vault" ? (
          <VaultView
            analysis={map}
            dismissedSuggestionIds={dismissedSuggestionIds}
            savedSuggestionIds={savedSuggestionIds}
            onDismissSuggestion={dismissSuggestion}
            onSaveSuggestion={saveSuggestion}
            onSaveSuggestions={saveSuggestions}
          />
        ) : view === "family" ? (
          <>
            <section className="workspace family-workspace" aria-labelledby="page-title">
              <header className="topbar">
                <div>
                  <span className="workspace-kicker">
                    <Sparkles size={14} />
                    LifeMap AI command center
                  </span>
                  <h1 id="page-title">Family admin map</h1>
                  <p>
                    A calm control room for messy family admin: due dates,
                    missing records, waiting-on, next actions, and approvals.
                  </p>
                  <span className="storage-note">
                    Demo data is stored in this browser only.
                  </span>
                </div>
                <div className="status-strip" aria-label="Map health">
                  <StatusPill
                    label={`${map.dueItems.length} due`}
                    tone="urgent"
                  />
                  <StatusPill
                    label={`${map.missingInfo.length} missing`}
                    tone="warning"
                  />
                  <StatusPill
                    label={`${map.nextActions.length} actions`}
                    tone="calm"
                  />
                </div>
              </header>

              <div className="family-loop-bar" aria-label="LifeMap workflow">
                <span>
                  <Inbox size={14} />
                  Capture
                </span>
                <span>
                  <Sparkles size={14} />
                  Organize map
                </span>
                <span>
                  <Bell size={14} />
                  Review approvals
                </span>
                <span>
                  <CheckCircle2 size={14} />
                  Stage next moves
                </span>
              </div>

              <div className="work-grid">
                <section
                  className="panel intake-panel"
                  aria-labelledby="intake-title"
                >
                  <div className="panel-heading">
                    <div>
                      <h2 id="intake-title">Forwarded intake</h2>
                      <span>Source: email</span>
                    </div>
                    <FileText size={18} />
                  </div>
                  <div
                    className="intake-meta"
                    aria-label="Intake analysis stages"
                  >
                    <span className="meta-step active">Capture</span>
                    <span
                      className={
                        analyzeStatus === "loading"
                          ? "meta-step active"
                          : "meta-step"
                      }
                    >
                      Extract
                    </span>
                    <span
                      className={
                        analyzeStatus === "success"
                          ? "meta-step active"
                          : "meta-step"
                      }
                    >
                      Approve
                    </span>
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

                  <div className="evidence-row" aria-label="Source evidence">
                    {map.sourceEvidence.map((source) => (
                      <span
                        className="evidence-chip"
                        key={source.id}
                        title={source.quote}
                      >
                        <CheckCircle2 size={13} />
                        {source.label}
                      </span>
                    ))}
                  </div>

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
              </div>
            </section>

            <ApprovalQueue
              disabledApprovals={disabledApprovals}
              editedApprovals={editedApprovals}
              selectedCount={selectedApprovals.length}
              stagedRun={stagedRun}
              variant="rail"
              onReview={() => setIsReviewOpen(true)}
              onSave={saveApprovalBody}
              onToggle={toggleApproval}
            />
          </>
        ) : view === "review" ? (
          <section className="workspace approval-workspace" aria-labelledby="review-title">
            <header className="topbar">
              <div>
                <span className="workspace-kicker">
                  <Bell size={14} />
                  Approval center
                </span>
                <h1 id="review-title">Review</h1>
                <p>Review drafts and reminders before anything leaves LifeMap.</p>
                <span className="storage-note">
                  Nothing sends automatically.
                </span>
              </div>
            </header>
            <ApprovalQueue
              disabledApprovals={disabledApprovals}
              editedApprovals={editedApprovals}
              selectedCount={selectedApprovals.length}
              stagedRun={stagedRun}
              variant="panel"
              onReview={() => setIsReviewOpen(true)}
              onSave={saveApprovalBody}
              onToggle={toggleApproval}
            />
          </section>
        ) : view === "launchPlan" ? (
          <LaunchPlanView onBack={() => setView("more")} />
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
        ) : (
          <MoreView
            isSupabaseConfigured={isSupabaseConfigured}
            sessionEmail={session?.user.email}
            onOpenFamilyMap={() => setView("family")}
            onOpenCapture={() => openCapture()}
            onOpenSetup={() => setView("setup")}
            onOpenLaunchPlan={() => setView("launchPlan")}
            onSignOut={() => getSupabase().auth.signOut()}
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
            routeSelectedPriority("vault", "Supporting info routed to Vault.")
          }
          onSnooze={snoozeSelectedPriority}
        />
      ) : null}
      {toastMessage ? <Toast message={toastMessage} /> : null}
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
  onOpenToday: () => void;
  onOpenVault: () => void;
  onReview: () => void;
  onRoute: () => void;
}) {
  const hasIntake = intake.trim().length > 0;

  return (
    <section
      aria-labelledby="capture-sheet-title"
      className="workspace capture-workspace"
    >
      <div className="capture-sheet">
        <div className="brain-dump-composer lifemap-ai-composer">
          <header className="composer-header">
            <div>
              <span className="workspace-kicker">
                <Sparkles size={14} />
                LifeMap AI
              </span>
              <h1 id="capture-sheet-title">Ask LifeMap AI</h1>
              <p>
                Paste the messy email, screenshot notes, form, or travel list.
                LifeMap turns it into due items, missing info, waiting-on,
                next actions, reminders, and drafts.
              </p>
              <span className="storage-note">
                Drafts stay approval-gated. Nothing sends automatically.
              </span>
            </div>
            <div className="status-strip" aria-label="Current map summary">
              <span className="status-pill urgent">
                {map.dueItems.length} due
              </span>
              <span className="status-pill warning">
                {map.missingInfo.length} missing
              </span>
              <span className="status-pill calm">
                {map.nextActions.length} actions
              </span>
            </div>
            <button
              aria-label="Back to Today"
              className="sheet-close"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </header>

          <div className="example-chip-row" aria-label="Try an example">
            {examples.map((example) => (
              <button
                className="example-chip"
                key={example.label}
                type="button"
                onClick={() => onLoadExample(example.rawIntake)}
              >
                {example.label}
              </button>
            ))}
          </div>

          <div className="composer-grid">
            <section className="panel intake-panel" aria-labelledby="ai-intake-title">
              <div className="panel-heading">
                <div>
                  <h2 id="ai-intake-title">Paste anything messy</h2>
                  <span>Life admin, school, health, home, pets, or travel</span>
                </div>
                <Inbox size={18} />
              </div>
              <textarea
                aria-label="Messy life admin intake"
                value={intake}
                wrap="soft"
                onChange={(event) => onIntakeChange(event.target.value)}
              />
              <div className="intake-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={analyzeStatus === "loading" || !hasIntake}
                  onClick={onAnalyze}
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
                {analyzeStatus === "success" ? (
                  <button className="secondary-button" type="button" onClick={onReview}>
                    Review drafts
                  </button>
                ) : null}
              </div>
              <CaptureAnalyzeNotice
                error={analyzeError}
                map={map}
                status={analyzeStatus}
              />
              {analyzeStatus === "success" && captureRoute ? (
                <div className="capture-route-card">
                  <p>{captureRoute.message}</p>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={onRoute}
                  >
                    {captureRoute.buttonLabel}
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </section>

            <section
              className="panel map-panel capture-result-panel"
              aria-labelledby="capture-result-title"
            >
              <div className="panel-heading">
                <div>
                  <h2 id="capture-result-title">What LifeMap will organize</h2>
                  <span>Results route into Today, Vault, Calendar, and Review.</span>
                </div>
                <ShieldCheck size={18} />
              </div>
              <div className="capture-summary-grid" aria-label="Current analysis counts">
                <div>
                  <strong>{map.dueItems.length}</strong>
                  <span>due</span>
                </div>
                <div>
                  <strong>{map.missingInfo.length}</strong>
                  <span>missing</span>
                </div>
                <div>
                  <strong>{map.waitingOn.length}</strong>
                  <span>waiting</span>
                </div>
                <div>
                  <strong>{map.nextActions.length}</strong>
                  <span>actions</span>
                </div>
              </div>
              {analyzeStatus === "success" ? (
                <section
                  aria-labelledby="capture-routing-title"
                  className="capture-routing-panel"
                >
                  <div>
                    <h3 id="capture-routing-title">Route this map</h3>
                    <p>
                      LifeMap updated the day plan, saved the records, and
                      staged drafts for approval.
                    </p>
                  </div>
                  <div
                    aria-label="Choose where to open this analysis"
                    className="capture-routing-actions"
                  >
                    <button type="button" onClick={onOpenToday}>
                      <Sparkles size={15} />
                      Go to Today
                    </button>
                    <button type="button" onClick={onOpenVault}>
                      <ShieldCheck size={15} />
                      Go to Vault
                    </button>
                    <button type="button" onClick={onReview}>
                      <Bell size={15} />
                      Review approvals
                    </button>
                  </div>
                </section>
              ) : (
                <ol className="capture-route-list">
                  <li>Today gets the top priorities.</li>
                  <li>Vault keeps records and missing documents.</li>
                  <li>Calendar shows deadlines and appointments.</li>
                  <li>Review holds reminders and drafts for approval.</li>
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function CaptureAnalyzeNotice({
  status,
  error,
  map,
}: {
  status: "idle" | "loading" | "success" | "error" | "fallback";
  error?: string;
  map: LifeMapAnalysis;
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
      <p className="analyze-notice error" aria-live="polite">
        <span>{error}</span>
        <span>Showing the local parser so the workflow still works.</span>
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

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}

function MoreView({
  isSupabaseConfigured,
  sessionEmail,
  onOpenFamilyMap,
  onOpenCapture,
  onOpenSetup,
  onOpenLaunchPlan,
  onSignOut,
}: {
  isSupabaseConfigured: boolean;
  sessionEmail?: string;
  onOpenFamilyMap: () => void;
  onOpenCapture: () => void;
  onOpenSetup: () => void;
  onOpenLaunchPlan: () => void;
  onSignOut: () => void;
}) {
  return (
    <section className="workspace more-workspace" aria-labelledby="more-title">
      <header className="topbar compact-topbar">
        <div>
          <span className="workspace-kicker">
            <Map size={14} />
            LifeMap controls
          </span>
          <h1 id="more-title">More</h1>
          <p>Deep admin tools, privacy notes, and demo controls.</p>
        </div>
      </header>

      <div className="more-list">
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
            <span>Full extraction workspace for emails and forms.</span>
          </span>
          <ChevronRight className="more-row-chevron" size={18} />
        </button>
        <button
          aria-label="Open LifeMap AI capture"
          className="more-row"
          type="button"
          onClick={onOpenCapture}
        >
          <span className="more-row-icon">
            <Inbox size={18} />
          </span>
          <span className="more-row-copy">
            <strong>LifeMap AI capture</strong>
            <span>Paste messy context and turn it into an organized map.</span>
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
            <span>Pick family, pets, travel, and life logistics buckets.</span>
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
            <span>Review MVP readiness, to-dos, and founder demo progress.</span>
          </span>
          <ChevronRight className="more-row-chevron" size={18} />
        </button>
        <article className="more-row more-row-static">
          <span className="more-row-icon">
            <LockKeyhole size={18} />
          </span>
          <span className="more-row-copy">
            <strong>Private by default</strong>
            <span>
              Drafts and reminders stay approval-gated. Nothing sends
              automatically.
            </span>
          </span>
        </article>
        {isSupabaseConfigured ? (
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
        ) : (
          <article className="more-row more-row-static">
            <span className="more-row-icon">
              <ShieldCheck size={18} />
            </span>
            <span className="more-row-copy">
              <strong>Browser-only demo</strong>
              <span>Demo data is stored in this browser only.</span>
            </span>
          </article>
        )}
      </div>
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
    <div className="modal-backdrop">
      <section
        aria-labelledby="daily-brief-dialog-title"
        aria-modal="true"
        className="review-dialog action-dialog"
        role="dialog"
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
          <button className="primary-button" type="button" onClick={onOpenApprovals}>
            Review approvals
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
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
    <div className="modal-backdrop">
      <section
        aria-labelledby="priority-action-dialog-title"
        aria-modal="true"
        className="review-dialog action-dialog"
        role="dialog"
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
          <button className="priority-action-button" type="button" onClick={onComplete}>
            <CheckCircle2 size={18} />
            <span>
              <strong>Mark complete</strong>
              <small>Clear it from today's mental load.</small>
            </span>
          </button>
          <button className="priority-action-button" type="button" onClick={onSnooze}>
            <Clock3 size={18} />
            <span>
              <strong>Snooze to tomorrow</strong>
              <small>Keep it visible without making today louder.</small>
            </span>
          </button>
          <button className="priority-action-button" type="button" onClick={onSaveToVault}>
            <ShieldCheck size={18} />
            <span>
              <strong>Save info to Vault</strong>
              <small>Move supporting details into the source of truth.</small>
            </span>
          </button>
          <button className="priority-action-button" type="button" onClick={onAddToCalendar}>
            <CalendarDays size={18} />
            <span>
              <strong>Add to Calendar</strong>
              <small>Stage a time-based suggestion for review.</small>
            </span>
          </button>
          <button className="priority-action-button wide" type="button" onClick={onDraftMessage}>
            <MessageSquare size={18} />
            <span>
              <strong>Draft a message</strong>
              <small>LifeMap prepares it, but you approve before anything sends.</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="lifemap-toast" role="status" aria-live="polite">
      <Sparkles size={16} />
      <span>{message}</span>
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

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "urgent" | "warning" | "calm";
}) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function ApprovalQueue({
  disabledApprovals,
  editedApprovals,
  selectedCount,
  stagedRun,
  variant,
  onReview,
  onSave,
  onToggle,
}: {
  disabledApprovals: Set<string>;
  editedApprovals: ApprovalItem[];
  selectedCount: number;
  stagedRun?: StagedRun;
  variant: "rail" | "panel";
  onReview: () => void;
  onSave: (id: string, body: string) => void;
  onToggle: (id: string) => void;
}) {
  const Component = variant === "rail" ? "aside" : "section";
  const pausedCount = editedApprovals.length - selectedCount;
  const reviewButtonLabel =
    selectedCount === 0
      ? "Select an item to review"
      : `Review ${selectedCount} selected`;

  return (
    <Component
      aria-label="Approval queue"
      className={variant === "rail" ? "approval-rail" : "panel approval-panel"}
    >
      <div className="rail-heading">
        <h2>Approval queue</h2>
        <span>{stagedRun ? "Step 3 of 3" : "Step 1 of 3"}</span>
      </div>
      <p className="rail-copy">
        Choose what LifeMap should hold for review.
      </p>
      {stagedRun ? (
        <StagedSummary run={stagedRun} />
      ) : (
        <>
          <ApprovalFlowGuide
            pausedCount={pausedCount}
            selectedCount={selectedCount}
          />
          <div className="approval-list">
            {editedApprovals.map((item) => (
              <ApprovalCard
                approved={!disabledApprovals.has(item.id)}
                item={item}
                key={item.id}
                onSave={(body) => onSave(item.id, body)}
                onToggle={() => onToggle(item.id)}
              />
            ))}
          </div>
          <button
            className="send-button"
            disabled={selectedCount === 0}
            type="button"
            onClick={onReview}
          >
            <Send size={16} />
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
    <section className="approval-flow-card" aria-label="Approval flow">
      <div className="approval-flow-steps">
        <span className="active">1 Select</span>
        <ChevronRight size={14} />
        <span>2 Confirm</span>
        <ChevronRight size={14} />
        <span>3 Complete</span>
      </div>
      <div className="approval-flow-metrics">
        <strong>{formatReadyCount(selectedCount)}</strong>
        <span>{formatPausedCount(pausedCount)}</span>
      </div>
      <p>
        {selectedCount === 0
          ? "Turn on at least one item to continue."
          : "Next: confirm the final list, then stage it for action."}
      </p>
    </section>
  );
}

function ApprovalCard({
  item,
  approved,
  onSave,
  onToggle,
}: {
  item: ApprovalItem;
  approved: boolean;
  onSave: (body: string) => void;
  onToggle: () => void;
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
    <article className={approved ? "approval-card approved" : "approval-card"}>
      <div className="approval-card-top">
        <span className="approval-icon">
          <Icon size={17} />
        </span>
        <div className="approval-selection-control">
          <span
            className={
              approved
                ? "approval-selection-state included"
                : "approval-selection-state skipped"
            }
          >
            {approved ? "Will be reviewed next" : "Paused for now"}
          </span>
          <button
            aria-checked={approved}
            aria-label={
              approved
                ? `Skip ${item.title} for now`
                : `Include ${item.title} in review`
            }
            className="switch"
            role="switch"
            type="button"
            onClick={onToggle}
          >
            <span />
          </button>
        </div>
      </div>
      <h3>{item.title}</h3>
      {item.recipient ? <p className="recipient">To {item.recipient}</p> : null}
      {isEditing ? (
        <div className="approval-edit">
          <label className="draft-edit-label" htmlFor={`draft-body-${item.id}`}>
            Body
          </label>
          <textarea
            aria-label={`Draft body for ${item.title}`}
            className="draft-edit-textarea"
            id={`draft-body-${item.id}`}
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
          />
          <div className="edit-actions">
            <button
              className="secondary-button compact-button"
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
              className="primary-button compact-button"
              type="button"
              onClick={saveDraftBody}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>{item.body}</p>
          <button
            aria-label={`Edit ${item.title}`}
            className="edit-button"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        </>
      )}
      <span
        className={
          item.status === "Scheduled"
            ? "queue-status scheduled"
            : "queue-status"
        }
      >
        {item.status}
      </span>
    </article>
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
          <h3>Review complete</h3>
          <p>
            {formatCount(run.approvals.length, "item")} staged at {run.stagedAt}
            .
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
      <p className="staged-note">
        Nothing was sent or scheduled. This is ready for real integrations
        later.
      </p>
    </section>
  );
}

function formatCount(count: number, singularLabel: string) {
  return `${count} ${count === 1 ? singularLabel : `${singularLabel}s`}`;
}

function formatReadyCount(count: number) {
  return `${count} ready to review`;
}

function formatPausedCount(count: number) {
  return `${count} paused`;
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
    <div className="modal-backdrop">
      <section
        aria-labelledby="review-dialog-title"
        aria-modal="true"
        className="review-dialog"
        role="dialog"
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="review-dialog-title">Review selected approvals</h2>
            <p>
              {approvals.length} {itemLabel} selected. Nothing is sent or
              scheduled until real integrations exist.
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
            Approve & stage
            <CheckCircle2 size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
