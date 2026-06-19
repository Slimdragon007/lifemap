import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Mail,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { LifeMapAnalysis } from "./lifemap";

// The payoff moment: right after a dump is analyzed, show what was PREPARED as a
// trustworthy plan (not a reward), let the user confirm it, then write it and only
// then show a calm "that's off your plate" exhale -> back to Today. The relief
// comes from trusting the sort (Masicampo & Baumeister 2011), so this leads with
// the concrete plan, never a celebration or a streak. The exhale only fires after
// the save actually succeeds (confirm-first, honest-on-failure).

type PayoffGroupKind = "drafts" | "dates" | "reminders" | "actions";

type PayoffGroup = {
  kind: PayoffGroupKind;
  icon: LucideIcon;
  label: string;
  note?: string;
  items: string[];
};

type PayoffStage = "summary" | "confirm" | "saving" | "exhaled" | "error";

type PayoffSummaryProps = {
  map: LifeMapAnalysis;
  // Stages drafts/reminders and persists the calendar dates. Resolves true only
  // when the save actually succeeded (true in demo mode, which stages only).
  onApproveAll: () => Promise<boolean>;
  onTweak: () => void;
  onDone: () => void;
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function PayoffSummary({
  map,
  onApproveAll,
  onTweak,
  onDone,
}: PayoffSummaryProps) {
  const [stage, setStage] = useState<PayoffStage>("summary");

  const groupCandidates: Array<PayoffGroup | null> = [
    map.draftMessages.length > 0
      ? {
          kind: "drafts" as const,
          icon: Mail,
          label: `Drafted ${map.draftMessages.length} ${plural(map.draftMessages.length, "reply", "replies")}`,
          note: "ready to send",
          items: map.draftMessages.slice(0, 3).map((draft) => draft.subject),
        }
      : null,
    map.dueItems.length > 0
      ? {
          kind: "dates" as const,
          icon: CalendarDays,
          label: `Added ${map.dueItems.length} ${plural(map.dueItems.length, "date", "dates")}`,
          note: "on your calendar",
          items: map.dueItems.slice(0, 3).map((item) => item.title),
        }
      : null,
    map.reminders.length > 0
      ? {
          kind: "reminders" as const,
          icon: Bell,
          label: `Set ${map.reminders.length} ${plural(map.reminders.length, "reminder", "reminders")}`,
          items: map.reminders.slice(0, 3).map((reminder) => reminder.title),
        }
      : null,
    map.nextActions.length > 0
      ? {
          kind: "actions" as const,
          icon: Check,
          label: `Teed up ${map.nextActions.length} for Today`,
          items: map.nextActions.slice(0, 3).map((action) => action.label),
        }
      : null,
  ];
  const groups: PayoffGroup[] = groupCandidates.filter(
    (group): group is PayoffGroup => group !== null,
  );

  // Honest confirm line: name what actually lands. Dates persist to the calendar;
  // drafts only stage for review (never auto-sent).
  const confirmParts: string[] = [];
  if (map.dueItems.length > 0) {
    confirmParts.push(
      `file ${map.dueItems.length} ${plural(map.dueItems.length, "date", "dates")} to your calendar`,
    );
  }
  if (map.draftMessages.length > 0) {
    confirmParts.push(
      `stage ${map.draftMessages.length} ${plural(map.draftMessages.length, "draft", "drafts")} for review`,
    );
  }
  const confirmLine =
    confirmParts.length > 0
      ? `This will ${confirmParts.join(" and ")}. Nothing sends.`
      : "Add these to Today? Nothing sends.";

  async function runApprove() {
    setStage("saving");
    const ok = await onApproveAll();
    setStage(ok ? "exhaled" : "error");
  }

  if (stage === "exhaled") {
    // role=status on the dynamically-inserted exhale (after a user action) is
    // announced reliably, without duplicating the visible copy into a separate
    // hidden live region.
    return (
      <section
        className="payoff payoff-exhaled"
        role="status"
        aria-live="polite"
      >
        <span className="payoff-check" aria-hidden="true">
          <Check size={20} strokeWidth={3} />
        </span>
        <h2>That&apos;s off your plate.</h2>
        <p>It&apos;s handled. Come back when your head fills up again.</p>
        <button className="payoff-primary" type="button" onClick={onDone}>
          Done
          <ChevronRight size={16} />
        </button>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="payoff">
        <p className="payoff-empty">
          Nothing to file from that one. Paste a bit more and I&apos;ll sort it.
        </p>
      </section>
    );
  }

  const groupList = (
    <ul className="payoff-groups">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <li className="payoff-group" key={group.kind}>
            <span className="payoff-group-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <div className="payoff-group-body">
              <span className="payoff-group-label">
                {group.label}
                {group.note ? (
                  <span className="payoff-group-note"> · {group.note}</span>
                ) : null}
              </span>
              {group.items.length > 0 ? (
                <span className="payoff-group-items">
                  {group.items.join(" · ")}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (stage === "confirm" || stage === "saving" || stage === "error") {
    const saving = stage === "saving";
    return (
      <section
        className="payoff"
        aria-labelledby="payoff-title"
        aria-busy={saving}
      >
        {saving ? (
          <span className="sr-only" role="status" aria-live="polite">
            Saving your plan.
          </span>
        ) : null}
        <header className="payoff-head">
          <span className="payoff-spark" aria-hidden="true">
            <Sparkles size={16} />
          </span>
          <h2 id="payoff-title">Ready when you are.</h2>
        </header>
        {groupList}
        <p className="payoff-confirm-line">{confirmLine}</p>
        {stage === "error" ? (
          <p className="payoff-error" role="alert">
            Couldn&apos;t save everything. Try again.
          </p>
        ) : null}
        <div className="payoff-actions">
          <button
            className="payoff-primary"
            type="button"
            disabled={saving}
            onClick={runApprove}
          >
            {saving ? "Saving…" : stage === "error" ? "Try again" : "Confirm"}
          </button>
          {!saving ? (
            <button
              className="payoff-tweak"
              type="button"
              onClick={() => setStage("summary")}
            >
              Back
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  // stage === "summary"
  return (
    <section className="payoff" aria-labelledby="payoff-title">
      <header className="payoff-head">
        <span className="payoff-spark" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <h2 id="payoff-title">Here&apos;s what I&apos;ve got ready.</h2>
      </header>
      {groupList}
      {map.missingInfo.length > 0 ? (
        <p className="payoff-missing">
          {map.missingInfo.length}{" "}
          {plural(map.missingInfo.length, "thing", "things")} I still need from
          you.
        </p>
      ) : null}
      <div className="payoff-actions">
        <button
          className="payoff-primary"
          type="button"
          onClick={() => setStage("confirm")}
        >
          Approve all
        </button>
        <button className="payoff-tweak" type="button" onClick={onTweak}>
          tweak
        </button>
      </div>
    </section>
  );
}

export default PayoffSummary;
