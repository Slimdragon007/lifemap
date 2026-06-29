import {
  Check,
  ChevronRight,
  Files,
  Lightbulb,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { BriefPriority, DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import type { RecommendedBucket, SetupProfile } from "./setupBuckets";
import type { ViewerIdentity } from "./viewer";
import type { UpcomingDate } from "./importantDates";

type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";
type PriorityActionState = "completed" | "snoozed";

type TodayViewProps = {
  brief: DailyBrief;
  map: LifeMapAnalysis;
  identity: ViewerIdentity;
  approvalCount: number;
  status: BriefStatus;
  error?: string;
  upcomingDates: UpcomingDate[];
  priorityActionStates: Partial<Record<string, PriorityActionState>>;
  setupBuckets: RecommendedBucket[];
  setupProfile: SetupProfile;
  onGenerateBrief: () => void;
  onOpenBrainDump: (rawIntake?: string) => void;
  onOpenCabinet: () => void;
  onOpenFamilyMap: () => void;
  onOpenImportantDates: () => void;
  onOpenReview: () => void;
  onOpenSetup: () => void;
  onOpenSetupBucket: (bucket: RecommendedBucket) => void;
  onOpenPriority: (priority: BriefPriority) => void;
  onTogglePriorityDone: (id: string) => void;
};

function TodayView({
  brief,
  identity,
  approvalCount,
  status,
  error,
  priorityActionStates,
  onGenerateBrief,
  onOpenBrainDump,
  onOpenFamilyMap,
  onOpenReview,
  onOpenPriority,
  onTogglePriorityDone,
}: TodayViewProps) {
  const isEmptyBrief = brief.topPriorities.length === 0;

  const topPriorities =
    brief.topPriorities.length > 0
      ? brief.topPriorities.slice(0, 3)
      : [
          {
            id: "capture-empty",
            label: "Capture something messy",
            reason: "Your map will turn it into the next calm move.",
          },
        ];

  const focusPriority = topPriorities[0];

  const doneCount = topPriorities.filter(
    (priority) => priorityActionStates[priority.id] === "completed",
  ).length;

  const approvalSummary = `${approvalCount} ${
    approvalCount === 1 ? "item needs" : "items need"
  } your OK`;

  const statusLine =
    doneCount > 0
      ? `${doneCount} of ${topPriorities.length} handled.`
      : approvalCount > 0
        ? `${approvalCount} waiting, whenever you're ready.`
        : "Drop the loose stuff here. It will get sorted.";

  return (
    <section
      className="workspace today-workspace atlas-today calm-today home-flow"
      aria-labelledby="today-title"
    >
      <header className="atlas-header calm-greeting">
        <div className="atlas-brand-line">
          <h1 className="atlas-eyebrow calm-today-label" id="today-title">
            Today
          </h1>
          <div className="atlas-header-actions" aria-label="Today controls">
            <button
              aria-label="Refresh Daily Brief"
              className="home-refresh-button"
              type="button"
              disabled={status === "loading"}
              onClick={onGenerateBrief}
            >
              {status === "loading" ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <RefreshCw size={13} />
              )}
              <span>Update</span>
            </button>
            <span className="atlas-avatar" aria-label={identity.name}>
              {identity.initials}
            </span>
          </div>
        </div>
        <div className="calm-greeting-copy">
          <p className="calm-greeting-title">
            One thing at a time.
          </p>
          <p className="calm-status-line">{statusLine}</p>
        </div>
      </header>

      <div className="home-flow-stack">
        <section
          className="home-focus-card home-focus-hero"
          aria-labelledby="focus-title"
        >
          <div className="home-focus-icon" aria-hidden="true">
            <Lightbulb size={21} />
          </div>
          <div className="home-focus-copy">
            <span className="atlas-eyebrow">One thing</span>
            <h2 id="focus-title">{focusPriority.label}</h2>
            <p>{focusPriority.reason}</p>
          </div>
          <div className="home-focus-actions">
            <button
              className="home-focus-primary"
              aria-label={
                isEmptyBrief
                  ? "Start here"
                  : `Open priority ${focusPriority.label}`
              }
              type="button"
              onClick={() =>
                isEmptyBrief ? onOpenBrainDump() : onOpenPriority(focusPriority)
              }
            >
              {isEmptyBrief ? "Start here" : "Open"}
              <ChevronRight size={15} />
            </button>
            {!isEmptyBrief ? (
              <button
                aria-label={
                  priorityActionStates[focusPriority.id] === "completed"
                    ? `Mark ${focusPriority.label} not done`
                    : `Check off ${focusPriority.label}`
                }
                aria-pressed={
                  priorityActionStates[focusPriority.id] === "completed"
                }
                className="home-focus-check"
                type="button"
                onClick={() => onTogglePriorityDone(focusPriority.id)}
              >
                <Check size={15} />
              </button>
            ) : null}
          </div>
        </section>

        <section
          className="home-blender home-drop-compact"
          aria-labelledby="blender-title"
        >
          <div className="home-blender-mark" aria-hidden="true">
            <Files size={22} />
          </div>
          <div className="home-blender-copy">
            <span className="atlas-eyebrow">Smart drop</span>
            <h2 id="blender-title">Drop anything here.</h2>
            <p>
              Paste the loose thing once. LifeMap decides whether it belongs on
              Home, in Cabinet, with a person, or in Review.
            </p>
          </div>
          <button
            className="home-blender-button"
            type="button"
            onClick={() => onOpenBrainDump()}
          >
            <Plus size={16} />
            Drop a thought or file
            <ChevronRight size={15} />
          </button>
        </section>

        <section
          className="home-family-entry"
          aria-labelledby="home-family-title"
        >
          <div className="home-family-icon" aria-hidden="true">
            <UsersRound size={19} />
          </div>
          <div className="home-family-copy">
            <span className="atlas-eyebrow">People & pets</span>
            <h2 id="home-family-title">Open someone’s profile.</h2>
            <p>
              Family is the roster. Pick a person or pet, then customize what
              lives on that profile.
            </p>
          </div>
          <button
            aria-label="Open Family dashboard"
            className="home-family-button"
            type="button"
            onClick={onOpenFamilyMap}
          >
            Open Family
            <ChevronRight size={15} />
          </button>
        </section>

        {approvalCount > 0 ? (
          <section className="home-review-entry" aria-label="Review safety gate">
            <div className="home-review-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </div>
            <div className="home-review-copy">
              <span className="atlas-eyebrow">Safety gate</span>
              <h2>{approvalSummary}</h2>
              <p>Nothing sends or changes until you approve it.</p>
            </div>
            <button
              aria-label={`Needs your OK. Open Review, ${approvalSummary}`}
              className="home-review-button"
              type="button"
              onClick={onOpenReview}
            >
              Needs your OK
              <ChevronRight size={15} />
            </button>
          </section>
        ) : null}

        <BriefNotice
          status={status}
          error={error}
          onOpenBrainDump={onOpenBrainDump}
        />
      </div>
    </section>
  );
}

function BriefNotice({
  status,
  error,
  onOpenBrainDump,
}: {
  status: BriefStatus;
  error?: string;
  onOpenBrainDump: () => void;
}) {
  if (status === "success") {
    return null;
  }

  if (status === "fallback") {
    return (
      <div className="analyze-notice fallback" role="status" aria-live="polite">
        <span>
          LifeMap is using the current map while AI refresh is unavailable.
        </span>
        <span>You can still review priorities or capture a new update.</span>
        <button type="button" onClick={() => onOpenBrainDump()}>
          Capture a new update
        </button>
      </div>
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

export default TodayView;
