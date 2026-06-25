import {
  Bell,
  CalendarHeart,
  Check,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { STARTER_LIFE_AREAS, getSetupLifeArea } from "./lifeAreas";
import type { BriefPriority, DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import type { RecommendedBucket, SetupProfile } from "./setupBuckets";
import type { ViewerIdentity } from "./viewer";
import { dateCategoryMeta } from "./dateCategories";
import { relativeDayLabel, type UpcomingDate } from "./importantDates";

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
  upcomingDates: UpcomingDate[];
  priorityActionStates: Partial<Record<string, PriorityActionState>>;
  setupBuckets: RecommendedBucket[];
  setupProfile: SetupProfile;
  onGenerateBrief: () => void;
  onOpenBrief: () => void;
  onOpenBrainDump: (rawIntake?: string) => void;
  onOpenFeedback: () => void;
  onOpenFamilyMap: () => void;
  onOpenImportantDates: () => void;
  onOpenSetup: () => void;
  onOpenSetupBucket: (bucket: RecommendedBucket) => void;
  onOpenApprovals: () => void;
  onOpenPriority: (priority: BriefPriority) => void;
  onTogglePriorityDone: (id: string) => void;
};

const COACH_KEY = "lm-coach-seen";

function readCoachSeen(): boolean {
  try {
    return localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return false;
  }
}

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
  upcomingDates,
  onGenerateBrief,
  onOpenBrief,
  onOpenBrainDump,
  onOpenFeedback,
  onOpenImportantDates,
  onOpenSetup,
  onOpenSetupBucket,
  onOpenApprovals,
  onOpenPriority,
  onTogglePriorityDone,
}: TodayViewProps) {
  const [showMore, setShowMore] = useState(false);
  const [coachSeen, setCoachSeen] = useState(readCoachSeen);

  const greeting = greetingForHour(new Date().getHours());

  // First-run orientation: shown once to anyone who hasn't dismissed it, then
  // gone for good. (Gating on empty data doesn't work — new accounts still get
  // a seeded sample brief, so an "empty brief" almost never occurs.)
  const showCoach = !coachSeen;
  function dismissCoach() {
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* ignore */
    }
    setCoachSeen(true);
  }

  // No real priorities yet -> first-run/empty state. Reuse this signal (rather
  // than re-deriving "real vs seeded data") to surface a persistent, always-
  // available "add your first thing" CTA, independent of the one-time coach.
  const isEmptyBrief = brief.topPriorities.length === 0;

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
            <button
              aria-label="Send feedback"
              className="atlas-icon-button"
              type="button"
              onClick={onOpenFeedback}
            >
              <MessageCircle size={15} />
            </button>
            <ThemeToggle />
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
        {showCoach ? (
          <section className="calm-coach" aria-label="Getting started">
            <span className="atlas-eyebrow">New here?</span>
            <p className="calm-coach-lead">
              LifeMap turns the mental load off your plate.
            </p>
            <ul className="calm-coach-steps">
              <li>
                Tap <strong>Add</strong> to dump anything — the AI sorts it
              </li>
              <li>The AI sorts it into calendar, vault &amp; reminders</li>
              <li>You only see what needs your yes</li>
            </ul>
            <div className="calm-coach-actions">
              <button
                className="calm-coach-cta"
                type="button"
                onClick={() => {
                  dismissCoach();
                  onOpenBrainDump();
                }}
              >
                Capture your first thing
                <ChevronRight size={15} />
              </button>
              <button
                className="calm-coach-dismiss"
                type="button"
                onClick={dismissCoach}
              >
                Got it
              </button>
            </div>
          </section>
        ) : null}

        {/* ── Section 2 · Needs you ───────────────────────────────────── */}
        <section
          className="calm-section calm-needs"
          aria-labelledby="needs-title"
        >
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow" id="needs-title">
              Needs you
            </span>
            {doneCount > 0 ? (
              <span className="atlas-progress">
                {doneCount} of {topPriorities.length} done
              </span>
            ) : null}
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

          {isEmptyBrief ? (
            <button
              className="calm-first-add"
              type="button"
              onClick={() => onOpenBrainDump()}
            >
              <Plus size={16} />
              <span>Add your first thing</span>
              <ChevronRight size={15} />
            </button>
          ) : null}

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

        {/* ── Section · Upcoming important dates ──────────────────────── */}
        <section
          className="calm-section calm-upcoming"
          aria-labelledby="upcoming-title"
        >
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow" id="upcoming-title">
              Upcoming
            </span>
          </div>
          {upcomingDates.length > 0 ? (
            <ul className="calm-upcoming-list">
              {upcomingDates.map(({ event, daysUntil }) => {
                const Icon = dateCategoryMeta(
                  event.eventCategory ?? "custom",
                ).icon;
                return (
                  <li key={event.id} className="calm-upcoming-row">
                    <span className="calm-upcoming-icon">
                      <Icon size={16} />
                    </span>
                    <span className="calm-upcoming-copy">
                      <span className="calm-upcoming-text">{event.title}</span>
                      <span className="calm-upcoming-meta">
                        {relativeDayLabel(daysUntil)}
                        {event.owner ? ` · ${event.owner}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="calm-upcoming-empty">
              No dates coming up. Add one you never want to forget.
            </p>
          )}
          <button
            className="calm-upcoming-add"
            type="button"
            onClick={onOpenImportantDates}
          >
            <Plus size={15} />
            <span>Add a date</span>
            <CalendarHeart size={14} aria-hidden="true" />
          </button>
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
            {litCount > 0 ? (
              <span className="atlas-progress">
                {litCount} of {lifeAreas.length} areas active
              </span>
            ) : null}
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

          <BriefNotice
            status={status}
            error={error}
            onOpenBrainDump={onOpenBrainDump}
          />
        </section>
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
