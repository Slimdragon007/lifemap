import { ArrowLeft, CheckCircle2, ListChecks, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultCheckedLaunchPlanItemIds,
  launchPlanSections,
  type LaunchPlanStatus,
} from "./launchPlan";

const STORAGE_KEY = "lifemap-launch-plan-state";

const statusLabels: Record<LaunchPlanStatus, string> = {
  ready: "Ready",
  next: "Next",
  queued: "Queued",
};

type LaunchPlanViewProps = {
  onBack: () => void;
};

function LaunchPlanView({ onBack }: LaunchPlanViewProps) {
  const allItems = useMemo(
    () => launchPlanSections.flatMap((section) => section.items),
    [],
  );
  const totalCount = allItems.length;
  const [checkedItemIds, setCheckedItemIds] = useState(loadCheckedItemIds);
  const completedCount = checkedItemIds.size;
  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ checkedItemIds: Array.from(checkedItemIds) }),
    );
  }, [checkedItemIds]);

  function toggleItem(itemId: string) {
    setCheckedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  return (
    <section className="workspace launch-plan-workspace" aria-labelledby="launch-plan-title">
      <header className="topbar launch-plan-topbar">
        <div>
          <span className="workspace-kicker">
            <ListChecks size={14} />
            Founder tracker
          </span>
          <h1 id="launch-plan-title">Launch Plan</h1>
          <p>Review the MVP path, check off what is ready, and keep the next moves visible.</p>
          <span className="storage-note">
            Founder progress is stored in this browser only.
          </span>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          More
        </button>
      </header>

      <section className="launch-progress-panel" aria-label="MVP readiness">
        <div className="launch-progress-copy">
          <span>
            <Target size={15} />
            MVP readiness
          </span>
          <strong>{completedCount} of {totalCount} complete</strong>
          <small>{progress}% ready for the next review pass</small>
        </div>
        <div
          aria-label="Launch plan progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          aria-valuetext={`${completedCount} of ${totalCount} tasks complete`}
          className="launch-progress-track"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="launch-section-grid">
        {launchPlanSections.map((section) => (
          <section
            aria-labelledby={`${section.id}-title`}
            className="launch-plan-section"
            key={section.id}
          >
            <div className="launch-section-heading">
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <div className="launch-task-list">
              {section.items.map((item) => {
                const isChecked = checkedItemIds.has(item.id);
                const chipLabel = isChecked ? "Done" : statusLabels[item.status];
                const chipTone = isChecked ? "done" : item.status;

                return (
                  <label
                    className={isChecked ? "launch-task checked" : "launch-task"}
                    key={item.id}
                  >
                    <input
                      checked={isChecked}
                      type="checkbox"
                      onChange={() => toggleItem(item.id)}
                    />
                    <span className="launch-task-copy">
                      <span className="launch-task-title-row">
                        <strong>{item.title}</strong>
                        <span className={`launch-status-chip ${chipTone}`}>
                          {chipLabel}
                        </span>
                      </span>
                      <span>{item.nextAction}</span>
                    </span>
                    {isChecked ? (
                      <CheckCircle2 className="launch-task-done-icon" size={17} />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function loadCheckedItemIds(): Set<string> {
  const validIds = new Set(
    launchPlanSections.flatMap((section) =>
      section.items.map((item) => item.id),
    ),
  );
  const defaults = new Set(
    defaultCheckedLaunchPlanItemIds.filter((itemId) => validIds.has(itemId)),
  );
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return defaults;
  }

  try {
    const value = JSON.parse(rawValue);
    if (!isRecord(value) || !Array.isArray(value.checkedItemIds)) {
      return defaults;
    }

    return new Set(
      value.checkedItemIds.filter(
        (itemId): itemId is string =>
          typeof itemId === "string" && validIds.has(itemId),
      ),
    );
  } catch {
    return defaults;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default LaunchPlanView;
