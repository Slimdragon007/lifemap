import { ChevronRight, Inbox, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { classifyBrainDumpWithAi } from "./api";
import {
  RECOMMENDATIONS,
  classifyBrainDump,
  type LoadItem,
  type MentalLoadResult,
  type Recommendation,
} from "./mentalLoad";

const sampleDump = `ok brain dump time
- pay the electric bill, it's due today
- I'm really worried about Casey's doctor appointment results
- call mom back, haven't talked in weeks
- should I switch the kids' school or not
- groceries: milk, eggs, coffee
- someday I want to learn the piano
- finish the new landing page for the app`;

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  "do-now": "Do now",
  schedule: "Schedule",
  delegate: "Delegate",
  automate: "Automate",
  clarify: "Clarify",
  drop: "Drop",
  park: "Park for later",
};

type ClassifyStatus = "idle" | "loading" | "success" | "fallback" | "error";

type BrainDumpComposerProps = {
  onClose?: () => void;
  onReview?: () => void;
};

export function BrainDumpComposer({
  onClose,
  onReview,
}: BrainDumpComposerProps) {
  const [dump, setDump] = useState(sampleDump);
  const [result, setResult] = useState<MentalLoadResult>();
  const [status, setStatus] = useState<ClassifyStatus>("idle");
  const [error, setError] = useState<string>();

  const grouped = useMemo(
    () => groupByRecommendation(result?.items ?? []),
    [result],
  );

  async function handleClassify() {
    setStatus("loading");
    setError(undefined);

    const response = await classifyBrainDumpWithAi(dump);
    if (response.ok) {
      setResult(response.result);
      setStatus("success");
      return;
    }

    // Graceful degradation: the deterministic local classifier keeps the
    // workflow usable when the AI call fails (matches the family-map fallback).
    setResult(classifyBrainDump(dump));
    setError(response.error);
    setStatus("fallback");
  }

  const totalItems = result?.items.length ?? 0;
  const heaviest = useMemo(
    () =>
      Math.max(0, ...(result?.items ?? []).map((item) => item.emotionalWeight)),
    [result],
  );

  return (
    <div className="brain-dump-composer">
      <header className="composer-header">
        <div>
          <span className="workspace-kicker">
            <Inbox size={14} />
            AI intake
          </span>
          <h1 id="inbox-title">Brain dump</h1>
          <p>
            Paste anything messy; I'll turn it into tasks, dates, and drafts.
          </p>
          <span className="storage-note">
            Messy is fine, no punctuation needed.
          </span>
        </div>
        <div className="status-strip" aria-label="Mental load summary">
          <span className="status-pill calm">{totalItems} captured</span>
          {heaviest >= 4 ? (
            <span className="status-pill urgent">heavy load</span>
          ) : null}
        </div>
        {onClose ? (
          <button className="sheet-close" type="button" onClick={onClose}>
            Close
          </button>
        ) : null}
      </header>

      <div className="composer-grid">
        <section className="panel intake-panel" aria-labelledby="dump-title">
          <div className="panel-heading">
            <div>
              <h2 id="dump-title">What's on your mind?</h2>
              <span>Source: pasted intake</span>
            </div>
            <Sparkles size={18} />
          </div>
          <textarea
            aria-label="Brain dump of everything on your mind"
            value={dump}
            wrap="soft"
            onChange={(event) => setDump(event.target.value)}
          />
          <div className="intake-actions">
            <button
              className="primary-button"
              type="button"
              disabled={status === "loading" || dump.trim().length === 0}
              onClick={handleClassify}
            >
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Sorting...
                </>
              ) : (
                <>
                  Sort my mental load
                  <ChevronRight size={16} />
                </>
              )}
            </button>
            {totalItems > 0 && onReview ? (
              <button
                className="secondary-button"
                type="button"
                onClick={onReview}
              >
                Review items
              </button>
            ) : null}
          </div>
          {status === "fallback" ? (
            <p className="analyze-notice error" aria-live="polite">
              <span>{error}</span>
              <span>Showing the local classifier so you can still work.</span>
            </p>
          ) : null}
          {status === "success" ? (
            <p className="analyze-notice success" aria-live="polite">
              Sorted into {totalItems} items. Nothing is sent or scheduled.
            </p>
          ) : null}
        </section>

        <section className="panel map-panel" aria-labelledby="sorted-title">
          <div className="panel-heading">
            <div>
              <h2 id="sorted-title">Your sorted load</h2>
              <span>{totalItems} items</span>
            </div>
            <Inbox size={18} />
          </div>

          {totalItems === 0 ? (
            <p className="empty-note">
              Dump your thoughts and press “Sort my mental load”.
            </p>
          ) : (
            <div className="load-groups">
              {grouped.map(({ recommendation, items }) => (
                <div className="map-section" key={recommendation}>
                  <h3>{RECOMMENDATION_LABELS[recommendation]}</h3>
                  <ul className="plain-list">
                    {items.map((item) => (
                      <li key={item.id} title={item.sourceQuote}>
                        <span className="load-item-top">
                          <strong>{item.title}</strong>
                          <span className={`type-badge type-${item.type}`}>
                            {item.type}
                          </span>
                        </span>
                        <span>{weightLabel(item.emotionalWeight)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BrainDumpView() {
  return (
    <section className="workspace" aria-labelledby="inbox-title">
      <BrainDumpComposer />
    </section>
  );
}

function groupByRecommendation(
  items: LoadItem[],
): Array<{ recommendation: Recommendation; items: LoadItem[] }> {
  return RECOMMENDATIONS.map((recommendation) => ({
    recommendation,
    items: items.filter((item) => item.recommendation === recommendation),
  })).filter((group) => group.items.length > 0);
}

function weightLabel(weight: number): string {
  if (weight >= 4) return "Heavy on your mind";
  if (weight >= 2) return "Some weight";
  return "Light";
}

export default BrainDumpView;
