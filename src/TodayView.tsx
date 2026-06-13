import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Inbox,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";

type BriefStatus = "idle" | "loading" | "success" | "fallback" | "error";

type TodayViewProps = {
  brief: DailyBrief;
  map: LifeMapAnalysis;
  approvalCount: number;
  status: BriefStatus;
  error?: string;
  isDemoMode: boolean;
  onGenerateBrief: () => void;
  onOpenBrainDump: () => void;
  onOpenFamilyMap: () => void;
  onOpenApprovals: () => void;
};

function TodayView({
  brief,
  map,
  approvalCount,
  status,
  error,
  isDemoMode,
  onGenerateBrief,
  onOpenBrainDump,
  onOpenFamilyMap,
  onOpenApprovals,
}: TodayViewProps) {
  return (
    <section className="workspace today-workspace" aria-labelledby="today-title">
      <header className="topbar today-topbar">
        <div>
          <span className="workspace-kicker">
            <Sparkles size={14} />
            Your AI chief of staff for real life
          </span>
          <h1 id="today-title">Today</h1>
          <p>{brief.todaySummary}</p>
          <span className="storage-note">
            {isDemoMode
              ? "Demo data is stored in this browser only."
              : "Signed in data is protected by Supabase row-level security."}
          </span>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={status === "loading"}
          onClick={onGenerateBrief}
        >
          {status === "loading" ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Briefing...
            </>
          ) : (
            <>
              Refresh Daily Brief
              <RefreshCw size={16} />
            </>
          )}
        </button>
      </header>

      <div className="today-grid">
        <section className="today-hero panel" aria-label="Daily Brief">
          <div className="brief-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="panel-heading">
            <div>
              <h2>Daily Brief</h2>
              <span>Top three moves, grounded in your map</span>
            </div>
            <Clock3 size={18} />
          </div>
          <ol className="priority-list">
            {brief.topPriorities.length > 0 ? (
              brief.topPriorities.map((priority) => (
                <li key={priority.id}>
                  <strong>{priority.label}</strong>
                  <span>{priority.reason}</span>
                </li>
              ))
            ) : (
              <li>
                <strong>Capture something messy</strong>
                <span>LifeMap will turn it into your next actions.</span>
              </li>
            )}
          </ol>
          <p className="grounding-note">{brief.groundingNote}</p>
          <BriefNotice status={status} error={error} />
        </section>

        <section className="panel loop-panel" aria-labelledby="loops-title">
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

        <section className="panel command-panel" aria-label="LifeMap loop">
          <div className="loop-steps">
            <button type="button" onClick={onOpenBrainDump}>
              <Inbox size={18} />
              <span>Inbox</span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={onOpenFamilyMap}>
              <Sparkles size={18} />
              <span>Organized map</span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={onOpenApprovals}>
              <CheckCircle2 size={18} />
              <span>{approvalCount} approvals</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </section>

        <section className="panel message-panel" aria-labelledby="messages-title">
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

        <section className="panel metrics-panel" aria-label="Current map stats">
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

function BriefNotice({
  status,
  error,
}: {
  status: BriefStatus;
  error?: string;
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
      <p className="analyze-notice error" aria-live="polite">
        <span>{error}</span>
        <span>Showing a local brief so the daily loop still works.</span>
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

export default TodayView;
