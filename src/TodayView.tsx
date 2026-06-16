import { Bell, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
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
};

function TodayView({
  brief,
  map,
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
          onClick: () => onOpenSetupBucket(bucket),
        }))
      : STARTER_LIFE_AREAS.map((area) => ({ ...area, onClick: onOpenSetup }));

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
        <p className="lowstim-brief">{brief.todaySummary}</p>

        <h2 className="sr-only">Top Priorities</h2>
        <div className="lowstim-list">
          {topPriorities.map((priority, index) => {
            const actionState = priorityActionStates[priority.id];
            const isFirst = index === 0;
            const whenLabel =
              actionState === "completed"
                ? "Done"
                : actionState === "snoozed"
                  ? "Tomorrow"
                  : getPriorityWhen(priority.label, priority.reason, index);
            const className = [
              "lowstim-item",
              "atlas-priority-card",
              isFirst ? "first" : "",
              actionState ? `priority-${actionState}` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                aria-label={`Open priority ${priority.label}`}
                className={className}
                key={priority.id}
                type="button"
                onClick={() => onOpenPriority(priority)}
              >
                {isFirst ? (
                  <span className="lowstim-dot" aria-hidden="true" />
                ) : (
                  <span className="lowstim-qn" aria-hidden="true">
                    {index + 1}
                  </span>
                )}
                <span className="lowstim-text">{priority.label}</span>
                <span className="lowstim-when">{whenLabel}</span>
              </button>
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
                    <span className="lowstim-qn" aria-hidden="true">
                      ○
                    </span>
                    <span className="lowstim-text">{item.label}</span>
                    <span className="lowstim-when">{item.when}</span>
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
          className="atlas-section atlas-lifemap-section lowstim-areas"
          aria-labelledby="lifemap-title"
        >
          <h2 id="lifemap-title">Your LifeMap</h2>
          <div className="atlas-area-grid">
            {lifeAreas.map(({ id, label, meta, icon: Icon, onClick }) => (
              <button
                className="atlas-area-tile"
                key={id}
                type="button"
                onClick={onClick}
              >
                <Icon size={22} />
                <strong>{label}</strong>
                <span>{meta}</span>
              </button>
            ))}
          </div>
        </section>

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

        <p className="lowstim-foot">
          {waiting ? (
            <>
              Waiting on <b>{waiting.label}</b> — {waiting.blockedBy}
              <br />
              Nothing else needs you today.
            </>
          ) : (
            "Nothing else needs you today."
          )}
        </p>

        <BriefNotice
          status={status}
          error={error}
          onOpenBrainDump={onOpenBrainDump}
        />
      </div>
    </section>
  );
}

function getPriorityWhen(label: string, reason: string, index: number) {
  const text = `${label} ${reason}`.toLowerCase();
  if (
    text.includes("passport") ||
    text.includes("travel") ||
    text.includes("flight")
  ) {
    return "soon";
  }
  if (
    text.includes("doctor") ||
    text.includes("dental") ||
    text.includes("health") ||
    text.includes("medical") ||
    text.includes("medication") ||
    text.includes("vaccine") ||
    text.includes("vet")
  ) {
    return "upcoming";
  }
  if (
    text.includes("home") ||
    text.includes("bill") ||
    text.includes("insurance")
  ) {
    return "soon";
  }
  return index === 2 ? "upcoming" : "soon";
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
