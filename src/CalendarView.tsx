import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  calendarLayers,
  familyEvents,
  recurringCareItems,
  type CalendarLayer,
} from "./familyOS";

function CalendarView() {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayer>>(
    () => new Set(calendarLayers.map((layer) => layer.id)),
  );

  const visibleEvents = useMemo(
    () =>
      familyEvents
        .filter((event) => activeLayers.has(event.layer))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [activeLayers],
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
    <section className="workspace calendar-workspace" aria-labelledby="calendar-title">
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <CalendarDays size={14} />
            Family time map
          </span>
          <h1 id="calendar-title">Calendar</h1>
          <p>School, health, pets, meals, travel, and admin in one view.</p>
          <span className="storage-note">
            Demo calendar is local until calendar sync is connected.
          </span>
        </div>
        <div className="status-strip" aria-label="Calendar summary">
          <span className="status-pill urgent">
            {visibleEvents.length} visible
          </span>
          <span className="status-pill calm">
            {recurringCareItems.length} recurring
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
              <article className={`event-card layer-${event.layer}`} key={event.id}>
                <div className="event-date">
                  <span>{formatMonth(event.date)}</span>
                  <strong>{formatDay(event.date)}</strong>
                </div>
                <div>
                  <div className="event-card-top">
                    <h3>{event.title}</h3>
                    <span>{event.owner}</span>
                  </div>
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
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel recurring-panel" aria-labelledby="recurring-title">
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

function formatMonth(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
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
