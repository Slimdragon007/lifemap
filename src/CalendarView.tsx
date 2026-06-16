import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildCalendarEventsFromAnalysis,
  calendarLayers,
  familyEvents,
  recurringCareItems,
  type CalendarLayer,
} from "./familyOS";
import type { LifeMapAnalysis } from "./lifemap";
import GoogleConnection from "./GoogleConnection";

type CalendarViewProps = {
  analysis: LifeMapAnalysis;
  savedSuggestionIds: Set<string>;
  dismissedSuggestionIds: Set<string>;
  onSaveSuggestion: (id: string) => void;
  onSaveSuggestions: (ids: string[]) => void;
  onDismissSuggestion: (id: string) => void;
};

function CalendarView({
  analysis,
  savedSuggestionIds,
  dismissedSuggestionIds,
  onSaveSuggestion,
  onSaveSuggestions,
  onDismissSuggestion,
}: CalendarViewProps) {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayer>>(
    () => new Set(calendarLayers.map((layer) => layer.id)),
  );
  const analysisEvents = useMemo(
    () => buildCalendarEventsFromAnalysis(analysis),
    [analysis],
  );
  const visibleAnalysisEvents = useMemo(
    () =>
      analysisEvents.filter((event) => !dismissedSuggestionIds.has(event.id)),
    [analysisEvents, dismissedSuggestionIds],
  );
  const pendingAnalysisEvents = useMemo(
    () =>
      visibleAnalysisEvents.filter(
        (event) => !savedSuggestionIds.has(event.id),
      ),
    [savedSuggestionIds, visibleAnalysisEvents],
  );
  const allEvents = useMemo(
    () => [...visibleAnalysisEvents, ...familyEvents],
    [visibleAnalysisEvents],
  );

  const visibleEvents = useMemo(
    () =>
      allEvents
        .filter((event) => activeLayers.has(event.layer))
        .sort(
          (a, b) =>
            sortableDate(a.date).localeCompare(sortableDate(b.date)) ||
            a.time.localeCompare(b.time),
        ),
    [activeLayers, allEvents],
  );

  function toggleLayer(layer: CalendarLayer) {
    setActiveLayers((current) => {
      const next = new Set(current);
      if (next.has(layer) && next.size > 1) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }

  return (
    <section
      className="workspace calendar-workspace"
      aria-labelledby="calendar-title"
    >
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <CalendarDays size={14} />
            Family time map
          </span>
          <h1 id="calendar-title">Calendar</h1>
          <p>School, health, pets, meals, travel, and admin in one view.</p>
          <GoogleConnection />
        </div>
        <div className="status-strip" aria-label="Calendar summary">
          <span className="status-pill urgent">
            {visibleEvents.length} visible
          </span>
          <span className="status-pill calm">
            {recurringCareItems.length} recurring
          </span>
          <span className="status-pill warning">
            {visibleAnalysisEvents.length} from AI
          </span>
        </div>
      </header>

      <div className="calendar-grid">
        <section className="panel calendar-main" aria-labelledby="week-title">
          <div className="panel-heading">
            <div>
              <h2 id="week-title">This family week</h2>
              <span>Layered schedule</span>
            </div>
            <Sparkles size={18} />
          </div>

          {pendingAnalysisEvents.length > 0 ? (
            <section
              className="suggestion-review-bar"
              aria-label="Calendar suggestions"
            >
              <div>
                <strong>
                  LifeMap found {pendingAnalysisEvents.length} calendar{" "}
                  {pendingAnalysisEvents.length === 1 ? "item" : "items"}.
                </strong>
                <span>Review before these become saved family records.</span>
              </div>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() =>
                  onSaveSuggestions(
                    pendingAnalysisEvents.map((event) => event.id),
                  )
                }
              >
                Save all
              </button>
            </section>
          ) : null}

          <div className="layer-toolbar" aria-label="Calendar layers">
            <span>
              <Filter size={14} />
              Layers
            </span>
            {calendarLayers.map((layer) => (
              <button
                aria-pressed={activeLayers.has(layer.id)}
                className={
                  activeLayers.has(layer.id)
                    ? `layer-chip active layer-${layer.id}`
                    : `layer-chip layer-${layer.id}`
                }
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="event-timeline">
            {visibleEvents.map((event) => (
              <EventCard
                event={event}
                isSaved={savedSuggestionIds.has(event.id)}
                onDismissSuggestion={onDismissSuggestion}
                onSaveSuggestion={onSaveSuggestion}
                key={event.id}
              />
            ))}
          </div>
        </section>

        <aside
          className="panel recurring-panel"
          aria-labelledby="recurring-title"
        >
          <div className="panel-heading">
            <div>
              <h2 id="recurring-title">Recurring loops</h2>
              <span>Maintenance parents should not have to remember</span>
            </div>
            <CalendarDays size={18} />
          </div>
          <div className="recurring-list">
            {recurringCareItems.map((item) => (
              <article className="recurring-card" key={item.id}>
                <span className={`care-dot care-${item.category}`} />
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.cadence} · {item.owner}
                  </p>
                  <small>Next due {formatShortDate(item.nextDue)}</small>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function EventCard({
  event,
  isSaved,
  onSaveSuggestion,
  onDismissSuggestion,
}: {
  event: ReturnType<typeof buildCalendarEventsFromAnalysis>[number];
  isSaved: boolean;
  onSaveSuggestion: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
}) {
  const isGenerated = event.id.startsWith("ai-event-");

  return (
    <article
      className={
        isGenerated
          ? `event-card generated-event layer-${event.layer}`
          : `event-card layer-${event.layer}`
      }
    >
      <div className="event-date">
        <span>{formatMonth(event.date)}</span>
        <strong>{formatDay(event.date)}</strong>
      </div>
      <div>
        <div className="event-card-top">
          <h3>{event.title}</h3>
          <span>{event.owner}</span>
        </div>
        {isGenerated ? (
          <span className="generated-label">
            {isSaved ? "Saved to LifeMap" : "Needs review"}
          </span>
        ) : null}
        <p>
          <Clock3 size={14} />
          {event.time}
        </p>
        <small>Source: {event.source}</small>
        {event.needsPrep ? (
          <div className="prep-note">
            <CheckCircle2 size={14} />
            {event.needsPrep}
          </div>
        ) : null}
        {isGenerated && !isSaved ? (
          <div className="suggestion-actions">
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => onSaveSuggestion(event.id)}
            >
              Save
            </button>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => onDismissSuggestion(event.id)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function sortableDate(date: string): string {
  return date === "undated" ? "9999-12-31" : date;
}

function displayDate(date: string): Date | undefined {
  if (date === "undated") {
    return undefined;
  }

  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatMonth(date: string): string {
  const parsed = displayDate(date);
  if (!parsed) {
    return "Needs";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatDay(date: string): string {
  const parsed = displayDate(date);
  if (!parsed) {
    return "date";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
  });
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default CalendarView;
