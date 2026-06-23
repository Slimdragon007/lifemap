import { useEffect, useMemo, useState } from "react";
import {
  buildCalendarEventsFromAnalysis,
  calendarLayers,
  type CalendarLayer,
  type FamilyEvent,
  type RecurringCareItem,
} from "./familyOS";
import type { LifeMapAnalysis } from "./lifemap";
import GoogleConnection from "./GoogleConnection";
import { getGoogleStatus, pushCalendarEvent } from "./api";
import { getAccessToken } from "./supabaseClient";

type PushState = "idle" | "pushing" | "done" | "error";

type CalendarViewProps = {
  analysis: LifeMapAnalysis;
  familyEvents: FamilyEvent[];
  recurringCareItems: RecurringCareItem[];
  savedSuggestionIds: Set<string>;
  dismissedSuggestionIds: Set<string>;
  onSaveSuggestion: (id: string) => void;
  onSaveSuggestions: (ids: string[]) => void;
  onDismissSuggestion: (id: string) => void;
};

function CalendarView({
  analysis,
  familyEvents,
  recurringCareItems,
  savedSuggestionIds,
  dismissedSuggestionIds,
  onSaveSuggestion,
  onSaveSuggestions,
  onDismissSuggestion,
}: CalendarViewProps) {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayer>>(
    () => new Set(calendarLayers.map((layer) => layer.id)),
  );
  const [googleConnected, setGoogleConnected] = useState(false);
  const [pushStates, setPushStates] = useState<Map<string, PushState>>(
    () => new Map(),
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await getAccessToken().catch(() => undefined);
      if (!token) {
        return;
      }
      const status = await getGoogleStatus(token);
      if (active && status.ok) {
        setGoogleConnected(status.connected);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handlePushToGoogle(event: FamilyEvent) {
    setPushStates((current) => new Map(current).set(event.id, "pushing"));
    const token = await getAccessToken().catch(() => undefined);
    if (!token) {
      setPushStates((current) => new Map(current).set(event.id, "error"));
      return;
    }
    const result = await pushCalendarEvent(event, token);
    setPushStates((current) =>
      new Map(current).set(event.id, result.ok ? "done" : "error"),
    );
  }
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
    [visibleAnalysisEvents, familyEvents],
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
    <section className="workspace notebook" aria-labelledby="calendar-title">
      <header className="notebook-head">
        <h1 id="calendar-title" className="notebook-title">
          Calendar
        </h1>
        <p className="notebook-sub">
          Review dated items LifeMap found. Save only the ones you want; Google
          Calendar stays one explicit tap away.
        </p>
        <GoogleConnection />
      </header>

      {pendingAnalysisEvents.length > 0 ? (
        <div className="notebook-callout" aria-label="Calendar suggestions">
          <span className="notebook-callout-copy">
            <strong>Ready to schedule</strong>
            <span>
              {pendingAnalysisEvents.length}{" "}
              {pendingAnalysisEvents.length === 1 ? "item" : "items"} from your
              brain dump can become LifeMap calendar events.
            </span>
          </span>
          <button
            className="notebook-link"
            type="button"
            onClick={() =>
              onSaveSuggestions(pendingAnalysisEvents.map((event) => event.id))
            }
          >
            Save to LifeMap calendar
          </button>
        </div>
      ) : null}

      <details className="notebook-filter-disclosure">
        <summary>
          <span>Filter areas</span>
          <small>
            {activeLayers.size} of {calendarLayers.length} shown
          </small>
        </summary>
        <div className="notebook-filters" aria-label="Calendar layers">
          {calendarLayers.map((layer) => (
            <button
              aria-pressed={activeLayers.has(layer.id)}
              className={
                activeLayers.has(layer.id)
                  ? "notebook-filter active"
                  : "notebook-filter"
              }
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </details>

      <div className="notebook-list">
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <EventRow
              event={event}
              isSaved={savedSuggestionIds.has(event.id)}
              googleConnected={googleConnected}
              pushState={pushStates.get(event.id) ?? "idle"}
              onPushToGoogle={handlePushToGoogle}
              onDismissSuggestion={onDismissSuggestion}
              onSaveSuggestion={onSaveSuggestion}
              key={event.id}
            />
          ))
        ) : (
          <p className="notebook-empty">
            No events yet. Captured dates will appear here.
          </p>
        )}
      </div>

      <h2 className="notebook-section-title">Recurring loops</h2>
      <div className="notebook-list">
        {recurringCareItems.length > 0 ? (
          recurringCareItems.map((item) => (
            <div className="notebook-row entry" key={item.id}>
              <span className="notebook-when">
                {formatShortDate(item.nextDue)}
              </span>
              <span className="notebook-row-main">
                <span className="notebook-row-title">{item.title}</span>
                <span className="notebook-row-sub">
                  {item.cadence} · {item.owner}
                </span>
              </span>
            </div>
          ))
        ) : (
          <p className="notebook-empty">No recurring loops yet.</p>
        )}
      </div>
    </section>
  );
}

function EventRow({
  event,
  isSaved,
  googleConnected,
  pushState,
  onPushToGoogle,
  onSaveSuggestion,
  onDismissSuggestion,
}: {
  event: ReturnType<typeof buildCalendarEventsFromAnalysis>[number];
  isSaved: boolean;
  googleConnected: boolean;
  pushState: PushState;
  onPushToGoogle: (event: FamilyEvent) => void;
  onSaveSuggestion: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
}) {
  const isGenerated = event.id.startsWith("ai-event-");
  const pending = isGenerated && !isSaved;

  return (
    <div
      className={pending ? "notebook-row entry pending" : "notebook-row entry"}
    >
      <span className="notebook-when">{formatWhen(event.date)}</span>
      <span className="notebook-row-main">
        {pending ? (
          <span className="notebook-notch" aria-hidden="true" />
        ) : null}
        <span className="notebook-row-title">{event.title}</span>
        <span className="notebook-row-sub">
          {event.time} · {event.owner} · {event.source}
        </span>
        {event.needsPrep ? (
          <span className="notebook-row-note">{event.needsPrep}</span>
        ) : null}
      </span>
      {pending ? (
        <span className="notebook-row-actions">
          <span className="notebook-tag">Needs review</span>
          <button
            className="notebook-link"
            type="button"
            onClick={() => onSaveSuggestion(event.id)}
          >
            Save
          </button>
          <button
            className="notebook-link quiet"
            type="button"
            onClick={() => onDismissSuggestion(event.id)}
          >
            Dismiss
          </button>
        </span>
      ) : isGenerated && isSaved ? (
        <span className="notebook-row-actions">
          <span className="notebook-tag">Saved to LifeMap</span>
          {googleConnected && pushState === "done" ? (
            <span className="notebook-tag">On your Google Calendar ✓</span>
          ) : googleConnected ? (
            <button
              className="notebook-link"
              type="button"
              disabled={pushState === "pushing"}
              onClick={() => onPushToGoogle(event)}
            >
              {pushState === "pushing"
                ? "Adding…"
                : pushState === "error"
                  ? "Try again"
                  : "Add to Google Calendar"}
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
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

function formatWhen(date: string): string {
  const parsed = displayDate(date);
  if (!parsed) {
    return "No date";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
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
