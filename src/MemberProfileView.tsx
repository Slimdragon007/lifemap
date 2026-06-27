import { Brain, CalendarPlus, ChevronLeft, FileText } from "lucide-react";
import type { FamilyEvent, FamilyMember, VaultItem } from "./familyOS";
import { memberAccent, memberStuff } from "./familyToday";
import { VAULT_CATEGORY_LABEL } from "./documentTypes";
import { dateCategoryMeta } from "./dateCategories";
import { relativeDayLabel } from "./importantDates";

const CATEGORY_LABEL = VAULT_CATEGORY_LABEL;

const TYPE_LABEL: Record<FamilyMember["profileType"], string> = {
  adult: "Adult",
  child: "Child",
  pet: "Pet",
};

export type MemberProfileViewProps = {
  member: FamilyMember;
  vaultItems: VaultItem[];
  familyEvents: FamilyEvent[];
  onBack: () => void;
  onAddDocument: () => void;
  onAddDate: () => void;
  onBrainDump: () => void;
};

function MemberProfileView({
  member,
  vaultItems,
  familyEvents,
  onBack,
  onAddDocument,
  onAddDate,
  onBrainDump,
}: MemberProfileViewProps) {
  const stuff = memberStuff(member, vaultItems, familyEvents, new Date());

  // Group this person's documents by what was uploaded (category), so the
  // profile reads as "their things, sorted" rather than one flat pile.
  const grouped = new Map<VaultItem["category"], VaultItem[]>();
  for (const doc of stuff.documents) {
    const list = grouped.get(doc.category) ?? [];
    list.push(doc);
    grouped.set(doc.category, list);
  }

  const isEmpty = stuff.documents.length === 0 && stuff.dates.length === 0;

  return (
    <section
      className="workspace atlas-today calm-today member-profile"
      aria-labelledby="member-title"
    >
      <header className="atlas-header calm-greeting">
        <button
          type="button"
          className="member-back"
          onClick={onBack}
          aria-label="Back to Today"
        >
          <ChevronLeft size={16} />
          <span>Today</span>
        </button>
        <div className="member-id">
          <span
            className={`calm-av calm-av-${memberAccent(member.id)}`}
            aria-hidden="true"
          >
            {member.initials}
          </span>
          <div className="calm-greeting-copy">
            <p className="calm-greeting-title" id="member-title">
              {member.name}
            </p>
            <p className="calm-status-line">{TYPE_LABEL[member.profileType]}</p>
          </div>
        </div>
      </header>

      <div className="lowstim-today calm-spine">
        <section className="calm-section" aria-label="Add to this profile">
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow">What are we adding?</span>
          </div>
          <div className="add-sheet-grid">
            <button
              type="button"
              className="add-sheet-tile"
              onClick={onAddDocument}
            >
              <span className="add-sheet-tile-icon" aria-hidden="true">
                <FileText size={19} />
              </span>
              <span className="add-sheet-tile-label">Document</span>
              <span className="add-sheet-tile-hint">Passport, card…</span>
            </button>
            <button
              type="button"
              className="add-sheet-tile"
              onClick={onAddDate}
            >
              <span className="add-sheet-tile-icon" aria-hidden="true">
                <CalendarPlus size={19} />
              </span>
              <span className="add-sheet-tile-label">Important date</span>
              <span className="add-sheet-tile-hint">Birthday, renewal</span>
            </button>
            <button
              type="button"
              className="add-sheet-tile"
              onClick={onBrainDump}
            >
              <span className="add-sheet-tile-icon" aria-hidden="true">
                <Brain size={19} />
              </span>
              <span className="add-sheet-tile-label">Brain dump</span>
              <span className="add-sheet-tile-hint">Type anything</span>
            </button>
          </div>
        </section>

        {isEmpty ? (
          <section className="calm-section">
            <div className="member-empty">
              <p>Nothing here yet.</p>
              <p className="member-empty-hint">
                Add {member.name}&apos;s first thing above and it lands on this
                profile, sorted by type.
              </p>
            </div>
          </section>
        ) : (
          <>
            {[...grouped.entries()].map(([category, docs]) => (
              <section key={category} className="calm-section">
                <div className="atlas-trunk-head">
                  <span className="atlas-eyebrow">
                    {CATEGORY_LABEL[category]}
                  </span>
                </div>
                <ul className="member-list">
                  {docs.map((doc) => (
                    <li key={doc.id} className="member-row">
                      <span className="member-row-icon" aria-hidden="true">
                        <FileText size={16} />
                      </span>
                      <span className="member-row-text">{doc.title}</span>
                      <span className="member-row-status">{doc.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {stuff.dates.length > 0 ? (
              <section className="calm-section">
                <div className="atlas-trunk-head">
                  <span className="atlas-eyebrow">Important dates</span>
                </div>
                <ul className="member-list">
                  {stuff.dates.map(({ event, daysUntil }) => {
                    const Icon = dateCategoryMeta(
                      event.eventCategory ?? "custom",
                    ).icon;
                    return (
                      <li key={event.id} className="member-row">
                        <span className="member-row-icon" aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className="member-row-text">{event.title}</span>
                        <span className="member-row-status">
                          {relativeDayLabel(daysUntil)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default MemberProfileView;
