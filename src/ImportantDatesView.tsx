import { CalendarHeart, ChevronLeft, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import ModalBackdrop from "./modal-backdrop";
import { DATE_CATEGORIES, dateCategoryMeta } from "./dateCategories";
import { upcomingDates, relativeDayLabel } from "./importantDates";
import type { DateCategory, FamilyEvent, FamilyMember } from "./familyOS";

const OTHER_OWNER = "__other__";

export type ImportantDatesViewProps = {
  familyEvents: FamilyEvent[];
  familyMembers: FamilyMember[];
  onBack: () => void;
  onSaveDate: (event: FamilyEvent) => void;
  onDeleteDate: (id: string) => void;
};

function ImportantDatesView({
  familyEvents,
  familyMembers,
  onBack,
  onSaveDate,
  onDeleteDate,
}: ImportantDatesViewProps) {
  const [activeCategory, setActiveCategory] = useState<DateCategory>();
  // All logged Important Dates sorted by next occurrence; past one-offs age out naturally.
  const savedDates = upcomingDates(familyEvents, new Date(), Infinity);

  return (
    <section
      className="workspace dates-workspace"
      aria-labelledby="dates-title"
    >
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <CalendarHeart size={14} />
            Never forget
          </span>
          <h1 id="dates-title">Important dates</h1>
          <p>
            Tap a category to log a date. LifeMap surfaces it on Today ahead of
            time.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ChevronLeft size={15} />
          Settings
        </button>
      </header>

      {/* Category icon grid */}
      <section className="dates-grid" aria-label="Add an important date">
        {DATE_CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="dates-tile"
            type="button"
            onClick={() => setActiveCategory(id)}
            aria-label={`Add a ${label.toLowerCase()} date`}
          >
            <span className="dates-tile-icon">
              <Icon size={20} />
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </section>

      {/* Saved dates */}
      <section className="dates-saved" aria-labelledby="dates-saved-title">
        <span className="atlas-eyebrow" id="dates-saved-title">
          Saved dates
        </span>
        {savedDates.length === 0 ? (
          <p className="notebook-empty">
            No dates yet. Pick a category above to add the first date you never
            want to forget.
          </p>
        ) : (
          <ul className="dates-list">
            {savedDates.map(({ event, daysUntil: days }) => {
              const meta = dateCategoryMeta(event.eventCategory ?? "custom");
              const Icon = meta.icon;
              return (
                <li key={event.id} className="dates-row">
                  <span className="dates-row-icon">
                    <Icon size={18} />
                  </span>
                  <span className="dates-row-copy">
                    <strong>{event.title}</strong>
                    <span>
                      {relativeDayLabel(days)}
                      {event.owner ? ` · ${event.owner}` : ""}
                      {event.isAnnual ? " · every year" : ""}
                    </span>
                  </span>
                  <button
                    className="dates-row-delete"
                    type="button"
                    onClick={() => onDeleteDate(event.id)}
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeCategory ? (
        <AddDateModal
          category={activeCategory}
          familyMembers={familyMembers}
          onClose={() => setActiveCategory(undefined)}
          onSave={(event) => {
            onSaveDate(event);
            setActiveCategory(undefined);
          }}
        />
      ) : null}
    </section>
  );
}

export function AddDateModal({
  category,
  familyMembers,
  presetOwner,
  onClose,
  onSave,
}: {
  category: DateCategory;
  familyMembers: FamilyMember[];
  presetOwner?: string;
  onClose: () => void;
  onSave: (event: FamilyEvent) => void;
}) {
  const meta = dateCategoryMeta(category);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [whoFor, setWhoFor] = useState(presetOwner ?? "");
  const [otherOwner, setOtherOwner] = useState("");
  const [isAnnual, setIsAnnual] = useState(category === "birthday");

  const owner = whoFor === OTHER_OWNER ? otherOwner.trim() : whoFor.trim();
  const canSave = title.trim().length > 0 && date.trim().length > 0;

  function handleSubmit(eventArg: FormEvent) {
    eventArg.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      time: "",
      layer: meta.layer,
      owner,
      source: "important-dates",
      eventCategory: category,
      isAnnual,
    });
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="add-date-title"
        aria-modal="true"
        className="review-dialog add-date-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="add-date-title">Add a {meta.label.toLowerCase()}</h2>
            <p>A date you never want to forget.</p>
          </div>
        </div>
        <form className="add-date-form" onSubmit={handleSubmit}>
          <label className="add-date-field">
            <span>What is it?</span>
            <input
              type="text"
              value={title}
              autoFocus
              placeholder={`${meta.label}…`}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="add-date-field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="add-date-field">
            <span>Who is it for?</span>
            <select value={whoFor} onChange={(e) => setWhoFor(e.target.value)}>
              <option value="">Everyone</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.name}>
                  {member.name}
                </option>
              ))}
              <option value={OTHER_OWNER}>Other…</option>
            </select>
          </label>
          {whoFor === OTHER_OWNER ? (
            <label className="add-date-field">
              <span>Name</span>
              <input
                type="text"
                value={otherOwner}
                placeholder="Who is it for?"
                onChange={(e) => setOtherOwner(e.target.value)}
              />
            </label>
          ) : null}
          <label className="add-date-toggle">
            <input
              type="checkbox"
              checked={isAnnual}
              onChange={(e) => setIsAnnual(e.target.checked)}
            />
            <span>Repeats every year</span>
          </label>
          <div className="action-dialog-buttons">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!canSave}
            >
              Save date
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

export default ImportantDatesView;
