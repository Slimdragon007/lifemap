import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
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
  // Optional contextual openers for the views demoted out of the bottom-nav.
  // Appended (optional) so the 19-prop contract that TodayView.test asserts
  // stays unchanged; App.tsx wires them to setView("calendar"/"vault").
  onOpenCalendar?: () => void;
  onOpenVault?: () => void;
};

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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
  onOpenCalendar,
  onOpenVault,
}: TodayViewProps) {
  const [showMore, setShowMore] = useState(false);

  const greeting = greetingForHour(new Date().getHours());

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

  // "Handled today" — quiet, filed rows that need nothing from you right now.
  // Open loops first (waiting on clarity), then the items that can wait.
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

  // The calm "you're handled" status line: prefer the AI brief summary; otherwise
  // narrate progress so the greeting always lands on something reassuring.
  const statusLine = brief.todaySummary?.trim()
    ? brief.todaySummary
    : approvalCount > 0
      ? `${approvalCount} thing${approvalCount === 1 ? "" : "s"} need a quick yes from you.`
      : doneCount > 0
        ? `${doneCount} of ${topPriorities.length} handled — you're on top of today.`
        : "You're handled. Capture anything new before it turns into background stress.";

  return (
    <section
      className="workspace today-workspace atlas-today calm-today"
      aria-labelledby="today-title"
    >
      {/* ── Section 1 · Greeting / status ─────────────────────────────── */}
      <header className="atlas-header calm-greeting">
        <div className="atlas-brand-line">
          <h1 className="atlas-eyebrow calm-today-label" id="today-title">
            Today
          </h1>
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
        <div className="calm-greeting-copy">
          <p className="calm-greeting-title">
            {greeting}, {identity.name}
          </p>
          <p className="calm-status-line">{statusLine}</p>
        </div>
      </header>

      <div className="lowstim-today calm-spine">
        {/* ── Section 2 · Needs you ───────────────────────────────────── */}
        <section
          className="calm-section calm-needs"
          aria-labelledby="needs-title"
        >
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow" id="needs-title">
              Needs you{approvalCount > 0 ? ` (${approvalCount})` : ""}
            </span>
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

          {approvalCount > 0 ? (
            <button
              className="calm-approvals-opener"
              type="button"
              onClick={onOpenApprovals}
            >
              <span>Review {approvalCount} waiting for your yes</span>
              <ChevronRight size={15} />
            </button>
          ) : null}
        </section>

        {/* ── Section 3 · Handled today ───────────────────────────────── */}
        <section
          className="calm-section calm-handled"
          aria-labelledby="handled-title"
        >
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow" id="handled-title">
              Handled today
            </span>
            <span className="atlas-progress">
              {litCount} of {lifeAreas.length} areas active
            </span>
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

          {brief.todaySummary?.trim() ? (
            <p className="lowstim-foot">Nothing else needs you today.</p>
          ) : null}

          <BriefNotice
            status={status}
            error={error}
            onOpenBrainDump={onOpenBrainDump}
          />

          {/* Quiet contextual entry to the views demoted out of the bottom-nav
              (the primary nav is now Today · + · Settings). Calendar + Vault
              stay one tap away here; Review folds into "Needs you" above. */}
          {onOpenCalendar || onOpenVault ? (
            <nav className="calm-quiet-links" aria-label="More LifeMap views">
              {onOpenCalendar ? (
                <button
                  className="calm-quiet-link"
                  type="button"
                  onClick={onOpenCalendar}
                >
                  <CalendarDays size={14} />
                  <span>Calendar</span>
                </button>
              ) : null}
              {onOpenCalendar && onOpenVault ? (
                <span className="calm-quiet-dot" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {onOpenVault ? (
                <button
                  className="calm-quiet-link"
                  type="button"
                  onClick={onOpenVault}
                >
                  <Archive size={14} />
                  <span>Vault</span>
                </button>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>

      {/* ── Section 4 · Pinned "+" dump bar ───────────────────────────── */}
      <div className="calm-dumpbar">
        <button
          className="lowstim-capture calm-dumpbar-button"
          type="button"
          onClick={() => onOpenBrainDump()}
        >
          <span className="calm-dumpbar-plus" aria-hidden="true">
            <Plus size={16} strokeWidth={2.5} />
          </span>
          Capture anything
        </button>
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
