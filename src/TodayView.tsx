import {
  Archive,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  HeartPulse,
  Home,
  Inbox,
  MessageSquare,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { BriefPriority, DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import type { RecommendedBucket, SetupProfile } from "./setupBuckets";

type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";
type PriorityActionState = "completed" | "snoozed";

type TodayViewProps = {
  brief: DailyBrief;
  map: LifeMapAnalysis;
  approvalCount: number;
  status: BriefStatus;
  error?: string;
  captureExamples: Array<{ label: string; rawIntake: string }>;
  priorityActionStates: Partial<Record<string, PriorityActionState>>;
  setupBuckets: RecommendedBucket[];
  setupProfile: SetupProfile;
  onGenerateBrief: () => void;
  onOpenBrief: () => void;
  onOpenCalendar: () => void;
  onOpenBrainDump: (rawIntake?: string) => void;
  onOpenVault: () => void;
  onOpenFamilyMap: () => void;
  onOpenSetupBucket: (bucket: RecommendedBucket) => void;
  onOpenApprovals: () => void;
  onOpenPriority: (priority: BriefPriority) => void;
};

function TodayView({
  brief,
  map,
  approvalCount,
  status,
  error,
  captureExamples,
  priorityActionStates,
  setupBuckets,
  setupProfile,
  onGenerateBrief,
  onOpenBrief,
  onOpenCalendar,
  onOpenBrainDump,
  onOpenVault,
  onOpenFamilyMap,
  onOpenSetupBucket,
  onOpenApprovals,
  onOpenPriority,
}: TodayViewProps) {
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
  const lifeAreas =
    setupBuckets.length > 0
      ? setupBuckets.map((bucket) => ({
          ...getSetupLifeArea(bucket, setupProfile),
          onClick: () => onOpenSetupBucket(bucket),
        }))
      : [
          {
            id: "vault",
            label: "Vault",
            meta: "24 items",
            icon: ShieldCheck,
            onClick: onOpenVault,
          },
          {
            id: "travel",
            label: "Travel",
            meta: "3 trips",
            icon: Plane,
            onClick: onOpenCalendar,
          },
          {
            id: "health",
            label: "Health",
            meta: "2 updates",
            icon: HeartPulse,
            onClick: onOpenVault,
          },
          {
            id: "home",
            label: "Home",
            meta: "5 tasks",
            icon: Home,
            onClick: onOpenFamilyMap,
          },
        ];

  return (
    <section className="workspace today-workspace atlas-today" aria-labelledby="today-title">
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
            <span className="atlas-avatar" aria-label="Alex Kim">
              AK
            </span>
          </div>
        </div>
        <div className="atlas-title-row">
          <div>
            <h1 id="today-title">Today</h1>
            <p>{todayDate}</p>
          </div>
          <button
            aria-label="Open LifeMap tools"
            className="atlas-icon-button"
            type="button"
            onClick={onOpenFamilyMap}
          >
            <Archive size={15} />
          </button>
        </div>
      </header>

      <div className="atlas-stack">
        <section className="atlas-ai-card panel" aria-labelledby="lifemap-ai-title">
          <div className="atlas-ai-card-copy">
            <span className="atlas-capture-label">LifeMap AI</span>
            <h2 id="lifemap-ai-title">Paste anything messy.</h2>
            <p>
              School forms, doctor notes, passport tasks, pet vaccines, travel
              plans. I will turn it into the next three moves.
            </p>
          </div>
          <button
            className="atlas-ai-primary"
            type="button"
            onClick={() => onOpenBrainDump()}
          >
            Capture anything
            <ChevronRight size={15} />
          </button>
          <div className="atlas-ai-examples" aria-label="LifeMap AI examples">
            {captureExamples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => onOpenBrainDump(example.rawIntake)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </section>

        <section className="atlas-brief-card panel" aria-label="Daily Brief">
          <div className="atlas-card-topline">
            <div className="atlas-card-title">
              <Sparkles size={16} />
              <h2>Daily Brief</h2>
            </div>
            <span>
              <Sparkles size={13} />
              AI
            </span>
          </div>
          <div className="atlas-brief-copy">
            <p>{brief.todaySummary}</p>
            <p>{formatEventLine(brief.openLoops.length || 1)}</p>
            <p>
              {brief.conflicts.length > 0
                ? `${brief.conflicts.length} conflict needs a decision.`
                : "Everyone is on track."}
            </p>
          </div>
          <button className="atlas-link-button" type="button" onClick={onOpenBrief}>
            View full brief
            <ChevronRight size={14} />
          </button>
          <p className="grounding-note">{brief.groundingNote}</p>
          <BriefNotice status={status} error={error} onOpenBrainDump={onOpenBrainDump} />
        </section>

        <section className="atlas-section" aria-labelledby="priorities-title">
          <h2 id="priorities-title">Top Priorities</h2>
          <div className="atlas-priority-list">
            {topPriorities.map((priority, index) => {
              const visual = getPriorityVisual(priority.label, priority.reason, index);
              const Icon = visual.icon;
              const actionState = priorityActionStates[priority.id];
              const statusLabel =
                actionState === "completed"
                  ? "Done"
                  : actionState === "snoozed"
                    ? "Tomorrow"
                    : visual.status;
              const statusTone =
                actionState === "completed"
                  ? "done"
                  : actionState === "snoozed"
                    ? "snoozed"
                    : visual.tone;
              return (
                <button
                  aria-label={`Open priority ${priority.label}`}
                  className={
                    actionState
                      ? `atlas-priority-card priority-${actionState}`
                      : "atlas-priority-card"
                  }
                  key={priority.id}
                  type="button"
                  onClick={() => onOpenPriority(priority)}
                >
                  <span className="atlas-priority-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <span>{visual.category}</span>
                    <strong>{priority.label}</strong>
                    <small>{priority.reason}</small>
                  </div>
                  <span className={`atlas-status-badge ${statusTone}`}>
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="atlas-section atlas-lifemap-section" aria-labelledby="lifemap-title">
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

        <section className="atlas-quiet-panel panel" aria-labelledby="loops-title">
          <div className="panel-heading">
            <div>
              <h2 id="loops-title">Open loops</h2>
              <span>{brief.openLoops.length} waiting for clarity</span>
            </div>
            <Sparkles size={18} />
          </div>
          {brief.openLoops.length > 0 ? (
            <ul className="plain-list">
              {brief.openLoops.map((loop) => (
                <li key={loop.id}>
                  <strong>{loop.label}</strong>
                  <span>{loop.blockedBy}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No major blockers in the current map.</p>
          )}
        </section>

        <section className="atlas-quiet-panel panel command-panel" aria-label="LifeMap loop">
          <div className="loop-steps">
            <button type="button" onClick={() => onOpenBrainDump()}>
              <Inbox size={18} />
              <span>LifeMap AI</span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={onOpenFamilyMap}>
              <Sparkles size={18} />
              <span>More tools</span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={onOpenApprovals}>
              <CheckCircle2 size={18} />
              <span>{approvalCount} to review</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </section>

        <section className="atlas-quiet-panel panel message-panel" aria-labelledby="messages-title">
          <div className="panel-heading">
            <div>
              <h2 id="messages-title">Suggested messages</h2>
              <span>Nothing sends without approval</span>
            </div>
            <MessageSquare size={18} />
          </div>
          {brief.suggestedMessages.length > 0 ? (
            <div className="message-stack">
              {brief.suggestedMessages.map((message) => (
                <article className="message-preview" key={message.id}>
                  <span>To {message.recipient}</span>
                  <strong>{message.subject}</strong>
                  <p>{message.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-note">
              Drafts from the family map will appear here for approval.
            </p>
          )}
        </section>

        <section className="atlas-quiet-panel panel metrics-panel" aria-label="Current map stats">
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
        </section>
      </div>
    </section>
  );
}

function formatEventLine(count: number) {
  return `${count} ${count === 1 ? "event" : "events"} coming up.`;
}

function getSetupLifeArea(bucket: RecommendedBucket, profile: SetupProfile) {
  switch (bucket.id) {
    case "family-profiles": {
      const profileCount = profile.adults + profile.children + profile.pets;
      return {
        id: bucket.id,
        label: "Profiles",
        meta: formatTileCount(profileCount, "profile"),
        icon: UsersRound,
      };
    }
    case "school-command":
      return {
        id: bucket.id,
        label: "School",
        meta: formatTileCount(Math.max(1, profile.children), "kid"),
        icon: FileText,
      };
    case "vault-records":
      return {
        id: bucket.id,
        label: "Records",
        meta: "IDs + cards",
        icon: ShieldCheck,
      };
    case "pet-care":
      return {
        id: bucket.id,
        label: "Pets",
        meta: formatTileCount(Math.max(1, profile.pets), "pet"),
        icon: HeartPulse,
      };
    case "travel-command":
      return {
        id: bucket.id,
        label: "Travel",
        meta: "Trips + TSA",
        icon: Plane,
      };
    case "health-loop":
      return {
        id: bucket.id,
        label: "Health",
        meta: "Meds + visits",
        icon: HeartPulse,
      };
    case "meal-loop":
      return {
        id: bucket.id,
        label: "Meals",
        meta: "Lunches",
        icon: FileText,
      };
    case "home-admin":
      return {
        id: bucket.id,
        label: "Home",
        meta: "Admin loops",
        icon: Home,
      };
    case "money-admin":
      return {
        id: bucket.id,
        label: "Money",
        meta: "Renewals",
        icon: Archive,
      };
  }
}

function formatTileCount(count: number, label: string) {
  return `${count} ${count === 1 ? label : `${label}s`}`;
}

function getPriorityVisual(label: string, reason: string, index: number) {
  const text = `${label} ${reason}`.toLowerCase();

  if (text.includes("passport") || text.includes("travel") || text.includes("flight")) {
    return {
      category: "Travel",
      icon: Plane,
      status: "Due soon",
      tone: "due",
    };
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
    return {
      category: "Health",
      icon: HeartPulse,
      status: "Upcoming",
      tone: "upcoming",
    };
  }

  if (text.includes("home") || text.includes("bill") || text.includes("insurance")) {
    return {
      category: "Home",
      icon: Home,
      status: "Due soon",
      tone: "due",
    };
  }

  return {
    category: index === 1 ? "Travel" : "School",
    icon: index === 1 ? Plane : FileText,
    status: index === 2 ? "Upcoming" : "Due soon",
    tone: index === 2 ? "upcoming" : "due",
  };
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
        <span>LifeMap is using the current map while AI refresh is unavailable.</span>
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
