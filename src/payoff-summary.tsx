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

// The payoff moment: right after a dump is analyzed, show what was handled as a
// trustworthy plan (not a reward), let the user approve it all in one tap, then
// a calm "that's off your plate" exhale -> back to Today. The relief comes from
// trusting the sort (Masicampo & Baumeister 2011), so this leads with the
// concrete plan, never a celebration or a streak.

type PayoffGroup = {
  icon: LucideIcon;
  label: string;
  note?: string;
  items: string[];
};

type PayoffSummaryProps = {
  map: LifeMapAnalysis;
  onApproveAll: () => void;
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
  const [approved, setApproved] = useState(false);

  const groups: PayoffGroup[] = [
    map.draftMessages.length > 0
      ? {
          icon: Mail,
          label: `Drafted ${map.draftMessages.length} ${plural(map.draftMessages.length, "reply", "replies")}`,
          note: "ready to send",
          items: map.draftMessages.slice(0, 3).map((draft) => draft.subject),
        }
      : null,
    map.dueItems.length > 0
      ? {
          icon: CalendarDays,
          label: `Added ${map.dueItems.length} ${plural(map.dueItems.length, "date", "dates")}`,
          note: "on your calendar",
          items: map.dueItems.slice(0, 3).map((item) => item.title),
        }
      : null,
    map.reminders.length > 0
      ? {
          icon: Bell,
          label: `Set ${map.reminders.length} ${plural(map.reminders.length, "reminder", "reminders")}`,
          items: map.reminders.slice(0, 3).map((reminder) => reminder.title),
        }
      : null,
    map.nextActions.length > 0
      ? {
          icon: Check,
          label: `Teed up ${map.nextActions.length} for Today`,
          items: map.nextActions.slice(0, 3).map((action) => action.label),
        }
      : null,
  ].filter((group): group is PayoffGroup => group !== null);

  if (approved) {
    return (
      <section className="payoff payoff-exhaled" aria-live="polite">
        <span className="payoff-check" aria-hidden="true">
          <Check size={20} strokeWidth={3} />
        </span>
        <h2>That's off your plate.</h2>
        <p>It's handled. Come back when your head fills up again.</p>
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
          Nothing to file from that one. Paste a bit more and I'll sort it.
        </p>
      </section>
    );
  }

  return (
    <section className="payoff" aria-labelledby="payoff-title">
      <header className="payoff-head">
        <span className="payoff-spark" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <h2 id="payoff-title">Done. Here&apos;s what I handled.</h2>
      </header>
      <ul className="payoff-groups">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <li className="payoff-group" key={group.label}>
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
          onClick={() => {
            onApproveAll();
            setApproved(true);
          }}
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
