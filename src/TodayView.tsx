import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { STARTER_LIFE_AREAS, getSetupLifeArea } from "./lifeAreas";
import type { BriefPriority, DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import type { RecommendedBucket, SetupProfile } from "./setupBuckets";
import type { ViewerIdentity } from "./viewer";

type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";
type PriorityActionState = "completed" | "snoozed";

type TodayViewProps = {
  brief: DailyBrief;
  map: LifeMapAnalysis;
  identity: ViewerIdentity;
  approvalCount: number;
  status: BriefStatus;
  error?: string;
  captureExamples: Array<{ label: string; rawIntake: string }>;
  priorityActionStates: Partial<Record<string, PriorityActionState>>;
  setupBuckets: RecommendedBucket[];
  setupProfile: SetupProfile;
  onGenerateBrief: () => void;
  onOpenBrief: () => void;
  onOpenBrainDump: (rawIntake?: string) => void;
  onOpenFamilyMap: () => void;
  onOpenSetup: () => void;
  onOpenSetupBucket: (bucket: RecommendedBucket) => void;
  onOpenApprovals: () => void;
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
  setupBuckets,
  setupProfile,
  onGenerateBrief,
  onOpenBrief,
  onOpenBrainDump,
  onOpenSetup,
  onOpenSetupBucket,
  onOpenApprovals,
  onOpenPriority,
  onTogglePriorityDone,
}: TodayViewProps) {
  const [showMore, setShowMore] = useState(false);

  const todayDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const topPriorities =
    brief.topPriorities.length > 0
      ? brief.topPriorities.slice(0, 3)
      : [
          {
            id: "capture-empty",
            label: "Capture something messy",
            reason: "LifeMap will turn it into your next calm move.",
          },
        ];

  // Everything beyond the three things lives behind "show more": open loops
  // first (what is waiting on clarity), then the items that can wait.
  const extras = [
    ...brief.openLoops.map((loop) => ({
      id: loop.id,
      label: loop.label,
      detail: loop.blockedBy,
      when: "waiting",
    })),
    ...brief.canWait.map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.reason,
      when: "later",
    })),
  ];

  const waiting = brief.openLoops[0] ?? null;

  // "Your LifeMap" area tiles — kept on Today (Slim likes the icon tiles for
  // picking a capture area). Icons come from the shared mapping in lifeAreas.ts.
  const lifeAreas =
    setupBuckets.length > 0
      ? setupBuckets.map((bucket) => ({
          ...getSetupLifeArea(bucket, setupProfile),
          isLit: true,
          onClick: () => onOpenSetupBucket(bucket),
        }))
      : STARTER_LIFE_AREAS.map((area) => ({
          ...area,
          isLit: false,
          onClick: onOpenSetup,
        }));

  const doneCount = topPriorities.filter(
    (priority) => priorityActionStates[priority.id] === "completed",
  ).length;
  const litCount = lifeAreas.filter((area) => area.isLit).length;

  return (
    <section
      className="workspace today-workspace atlas-today"
      aria-labelledby="today-title"
    >
      <header className="atlas-header">
        <div className="atlas-brand-line">
          <span className="atlas-wordmark">LifeMap</span>
          <div className="atlas-header-actions" aria-label="Today controls">
            <button
              aria-label="Refresh Daily Brief"
              className="atlas-icon-button"
              type="button"
              disabled={status === "loading"}
              onClick={onGenerateBrief}
            >
              {status === "loading" ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <RefreshCw size={15} />
              )}
            </button>
            <button
              aria-label="Review notifications"
              className="atlas-icon-button atlas-notification-button"
              type="button"
              onClick={onOpenApprovals}
            >
              <Bell size={15} />
              {approvalCount > 0 ? <span aria-hidden="true" /> : null}
            </button>
            <span className="atlas-avatar" aria-label={identity.name}>
              {identity.initials}
            </span>
          </div>
        </div>
        <div className="atlas-title-row">
          <div>
            <h1 id="today-title">Today</h1>
            <p>{todayDate}</p>
          </div>
        </div>
      </header>

      <div className="lowstim-today">
        <p className="lowstim-brief">
          {brief.todaySummary?.trim()
            ? brief.todaySummary
            : "Welcome to LifeMap. Capture your first messy note below — an email, a school form, a to-do — and it becomes your map."}
        </p>

        <div className="atlas-trunk-head">
          <span className="atlas-eyebrow">Now · tap to check off</span>
          <span className="atlas-progress">
            {doneCount} of {topPriorities.length} done
          </span>
        </div>
        <h2 className="sr-only">Top Priorities</h2>
        <div className="atlas-trunk">
          <span className="atlas-spine" aria-hidden="true" />
          {topPriorities.map((priority, index) => {
            const isDone = priorityActionStates[priority.id] === "completed";
            const isNeeds = index === 0 && !isDone;
            const className = [
              "atlas-task",
              isNeeds ? "needs" : "",
              isDone ? "done" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div className={className} key={priority.id}>
                <button
                  aria-label={
                    isDone
                      ? `Mark ${priority.label} not done`
                      : `Check off ${priority.label}`
                  }
                  aria-pressed={isDone}
                  className="atlas-node"
                  type="button"
                  onClick={() => onTogglePriorityDone(priority.id)}
                >
                  {isDone ? <Check size={13} strokeWidth={3} /> : null}
                </button>
                <button
                  aria-label={`Open priority ${priority.label}`}
                  className="atlas-task-card"
                  type="button"
                  onClick={() => onOpenPriority(priority)}
                >
                  <span className="atlas-task-text">{priority.label}</span>
                  {isNeeds ? (
                    <span className="atlas-needs-pill">Needs you</span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>

        {extras.length > 0 ? (
          <>
            <button
              aria-expanded={showMore}
              className={`lowstim-showmore${showMore ? " open" : ""}`}
              type="button"
              onClick={() => setShowMore((value) => !value)}
            >
              <span>
                {showMore
                  ? "Show less"
                  : `Show ${extras.length} more this week`}
              </span>
              <ChevronDown className="lowstim-chev" size={14} />
            </button>
            <div className="lowstim-more" hidden={!showMore}>
              <div className="lowstim-list">
                {extras.map((item) => (
                  <button
                    className="lowstim-item lowstim-item-quiet"
                    key={item.id}
                    type="button"
                    onClick={onOpenBrief}
                  >
                    <span className="lowstim-when">{item.when}</span>
                    <span className="lowstim-entry">
                      <span className="lowstim-text">{item.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <button
          className="lowstim-capture"
          type="button"
          onClick={() => onOpenBrainDump()}
        >
          Capture anything
          <ChevronRight size={15} />
        </button>

        <section
          className="atlas-section atlas-lifemap-section"
          aria-labelledby="lifemap-title"
        >
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow" id="lifemap-title">
              Your LifeMap · tap to light up
            </span>
            <span className="atlas-progress">
              {litCount} of {lifeAreas.length} active
            </span>
          </div>
          <div className="atlas-branch-panel">
            <div className="atlas-branch">
              <span className="atlas-branch-line" aria-hidden="true" />
              {lifeAreas.map(({ id, label, icon: Icon, isLit, onClick }) => (
                <button
                  className={`atlas-station${isLit ? " lit" : ""}`}
                  key={id}
                  type="button"
                  onClick={onClick}
                >
                  <span className="atlas-station-dot">
                    <Icon size={17} />
                  </span>
                  <strong>{label}</strong>
                  <span>{isLit ? "On your map" : "Set up"}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {brief.groundingNote?.trim() ? (
          <div className="lowstim-briefmeta">
            <button
              className="atlas-link-button"
              type="button"
              onClick={onOpenBrief}
            >
              View full brief
              <ChevronRight size={14} />
            </button>
            <p className="grounding-note">{brief.groundingNote}</p>
          </div>
        ) : null}

        {waiting ? (
          <p className="lowstim-foot">
            Waiting on <b>{waiting.label}</b> — {waiting.blockedBy}
            <br />
            Nothing else needs you today.
          </p>
        ) : brief.todaySummary?.trim() ? (
          <p className="lowstim-foot">Nothing else needs you today.</p>
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
    return (
      <p className="analyze-notice success" aria-live="polite">
        Daily Brief refreshed. Review actions before anything leaves LifeMap.
      </p>
    );
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
