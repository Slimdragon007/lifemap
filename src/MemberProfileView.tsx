import { CalendarPlus, ChevronLeft, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  DateCategory,
  FamilyEvent,
  FamilyMember,
  VaultItem,
} from "./familyOS";
import { memberAccent, memberStuff } from "./familyToday";
import { VAULT_CATEGORY_LABEL } from "./documentTypes";
import { dateCategoryMeta } from "./dateCategories";
import { relativeDayLabel } from "./importantDates";
import {
  addProfileField,
  addProfileSection,
  profileFieldsForMember,
  profileSectionsForMember,
  type ProfileSection,
} from "./profileSections";

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
  onAddDocument: (docTypeKey?: string) => void;
  onAddDate: (category?: DateCategory) => void;
  onUpdateMember: (member: FamilyMember) => boolean | Promise<boolean>;
};

function MemberProfileView({
  member,
  vaultItems,
  familyEvents,
  onBack,
  onAddDocument,
  onAddDate,
  onUpdateMember,
}: MemberProfileViewProps) {
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [activeFieldSectionId, setActiveFieldSectionId] = useState<string>();
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [isFieldPrivate, setIsFieldPrivate] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [savingFieldSectionId, setSavingFieldSectionId] = useState<string>();
  const [savedSectionId, setSavedSectionId] = useState<string>();
  const [profileMessage, setProfileMessage] = useState("");
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const stuff = memberStuff(member, vaultItems, familyEvents, new Date());
  const sections = profileSectionsForMember(member);
  const fieldsBySection = useMemo(() => {
    const groupedFields = new Map<string, ReturnType<typeof profileFieldsForMember>>();
    for (const field of profileFieldsForMember(member)) {
      const fields = groupedFields.get(field.sectionId) ?? [];
      fields.push(field);
      groupedFields.set(field.sectionId, fields);
    }
    return groupedFields;
  }, [member]);

  // Group this person's documents by what was uploaded (category), so the
  // profile reads as "their things, sorted" rather than one flat pile.
  const grouped = new Map<VaultItem["category"], VaultItem[]>();
  for (const doc of stuff.documents) {
    const list = grouped.get(doc.category) ?? [];
    list.push(doc);
    grouped.set(doc.category, list);
  }

  const isEmpty = stuff.documents.length === 0 && stuff.dates.length === 0;

  useEffect(() => {
    if (!savedSectionId) {
      return;
    }
    const savedSection = sections.find((section) => section.id === savedSectionId);
    const element = sectionRefs.current.get(savedSectionId);
    if (!savedSection || !element) {
      return;
    }

    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus({ preventScroll: true });
    });
  }, [savedSectionId, sections]);

  async function handleSaveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSectionName = sectionName.trim();
    if (!nextSectionName || isSavingSection) {
      return;
    }
    setIsSavingSection(true);
    try {
      const nextMember = addProfileSection(member, nextSectionName);
      const savedSection = profileSectionsForMember(nextMember).find(
        (section) =>
          section.name.toLocaleLowerCase() ===
          nextSectionName.toLocaleLowerCase(),
      );
      const saved = await onUpdateMember(nextMember);
      if (saved) {
        setSectionName("");
        setIsAddingSection(false);
        setSavedSectionId(savedSection?.id);
        setProfileMessage(`${nextSectionName} was added to ${member.name}.`);
      }
    } catch {
      // Keep the form open so the typed profile detail is not lost.
    } finally {
      setIsSavingSection(false);
    }
  }

  async function handleSaveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLabel = fieldLabel.trim();
    const nextValue = fieldValue.trim();
    if (
      !activeFieldSectionId ||
      !nextLabel ||
      !nextValue ||
      savingFieldSectionId
    ) {
      return;
    }
    setSavingFieldSectionId(activeFieldSectionId);
    try {
      const nextMember = addProfileField(member, {
        sectionId: activeFieldSectionId,
        label: nextLabel,
        value: nextValue,
        private: isFieldPrivate,
      });
      const saved = await onUpdateMember(nextMember);
      if (saved) {
        const sectionName =
          sections.find((section) => section.id === activeFieldSectionId)
            ?.name ?? "this section";
        setActiveFieldSectionId(undefined);
        setFieldLabel("");
        setFieldValue("");
        setIsFieldPrivate(false);
        setProfileMessage(`${nextLabel} was saved in ${sectionName}.`);
      }
    } catch {
      // Keep the form open so the typed profile detail is not lost.
    } finally {
      setSavingFieldSectionId(undefined);
    }
  }

  function openFieldForm(sectionId: string) {
    setActiveFieldSectionId(sectionId);
    setFieldLabel("");
    setFieldValue("");
    setIsFieldPrivate(false);
  }

  function cancelSectionForm() {
    setIsAddingSection(false);
    setSectionName("");
  }

  function cancelFieldForm() {
    setActiveFieldSectionId(undefined);
    setFieldLabel("");
    setFieldValue("");
    setIsFieldPrivate(false);
  }

  function setSectionRef(sectionId: string, element: HTMLElement | null) {
    if (element) {
      sectionRefs.current.set(sectionId, element);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }

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
          aria-label="Back to Family"
        >
          <ChevronLeft size={16} />
          <span>Family</span>
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
        <section className="calm-section" aria-labelledby="profile-categories-title">
          <div className="atlas-trunk-head">
            <span className="atlas-eyebrow">Profile shelf</span>
            <h2 id="profile-categories-title">{member.name}&apos;s info</h2>
          </div>
          <div className="profile-add-section">
            {isAddingSection ? (
              <form className="profile-inline-form" onSubmit={handleSaveSection}>
                <label>
                  <span>Section name</span>
                  <input
                    value={sectionName}
                    onChange={(event) => setSectionName(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={isSavingSection}>
                  Save section
                </button>
                <button
                  type="button"
                  className="profile-inline-secondary"
                  onClick={cancelSectionForm}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setIsAddingSection(true)}>
                Add section
              </button>
            )}
          </div>
          {profileMessage ? (
            <p className="profile-save-note" role="status">
              {profileMessage}
            </p>
          ) : null}

          <div className="profile-section-grid">
            {sections.map((section) => (
              <ProfileSectionCard
                key={section.id}
                section={section}
                isNew={section.id === savedSectionId}
                setCardRef={(element) => setSectionRef(section.id, element)}
                fields={fieldsBySection.get(section.id) ?? []}
                isAddingField={activeFieldSectionId === section.id}
                fieldLabel={fieldLabel}
                fieldValue={fieldValue}
                isFieldPrivate={isFieldPrivate}
                isSavingField={savingFieldSectionId === section.id}
                onAddDocument={onAddDocument}
                onAddDate={onAddDate}
                onOpenFieldForm={() => openFieldForm(section.id)}
                onFieldLabelChange={setFieldLabel}
                onFieldValueChange={setFieldValue}
                onFieldPrivateChange={setIsFieldPrivate}
                onSaveField={handleSaveField}
                onCancelField={cancelFieldForm}
              />
            ))}
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

type ProfileSectionCardProps = {
  section: ProfileSection;
  isNew: boolean;
  setCardRef: (element: HTMLElement | null) => void;
  fields: ReturnType<typeof profileFieldsForMember>;
  isAddingField: boolean;
  fieldLabel: string;
  fieldValue: string;
  isFieldPrivate: boolean;
  isSavingField: boolean;
  onAddDocument: (docTypeKey?: string) => void;
  onAddDate: (category?: DateCategory) => void;
  onOpenFieldForm: () => void;
  onFieldLabelChange: (value: string) => void;
  onFieldValueChange: (value: string) => void;
  onFieldPrivateChange: (value: boolean) => void;
  onSaveField: (event: FormEvent<HTMLFormElement>) => void;
  onCancelField: () => void;
};

function ProfileSectionCard({
  section,
  isNew,
  setCardRef,
  fields,
  isAddingField,
  fieldLabel,
  fieldValue,
  isFieldPrivate,
  isSavingField,
  onAddDocument,
  onAddDate,
  onOpenFieldForm,
  onFieldLabelChange,
  onFieldValueChange,
  onFieldPrivateChange,
  onSaveField,
  onCancelField,
}: ProfileSectionCardProps) {
  const headingId = `profile-section-${section.id}`;
  const primaryAction = profileSectionPrimaryAction(section);
  return (
    <article
      className={isNew ? "profile-section-card new-section" : "profile-section-card"}
      ref={setCardRef}
      role="region"
      aria-labelledby={headingId}
      tabIndex={-1}
    >
      <div className="profile-section-head">
        <h3 id={headingId}>{section.name}</h3>
        {primaryAction.type === "document" ? (
          <button
            type="button"
            aria-label={`${primaryAction.label} to ${section.name}`}
            onClick={() => onAddDocument(primaryAction.docTypeKey)}
          >
            {primaryAction.label}
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Add field to ${section.name}`}
            onClick={onOpenFieldForm}
          >
            Add field
          </button>
        )}
      </div>

      {fields.length > 0 ? (
        <dl className="profile-field-list">
          {fields.map((field) => (
            <div className="profile-field-row" key={field.id}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="member-empty-hint">No details yet.</p>
      )}

      {isAddingField ? (
        <form className="profile-inline-form" onSubmit={onSaveField}>
          <label>
            <span>Field label</span>
            <input
              value={fieldLabel}
              onChange={(event) => onFieldLabelChange(event.target.value)}
            />
          </label>
          <label>
            <span>Field value</span>
            <input
              value={fieldValue}
              onChange={(event) => onFieldValueChange(event.target.value)}
            />
          </label>
          <label className="profile-checkbox">
            <input
              type="checkbox"
              checked={isFieldPrivate}
              onChange={(event) => onFieldPrivateChange(event.target.checked)}
            />
            <span>Keep private until revealed</span>
          </label>
          <button type="submit" disabled={isSavingField}>
            Save field
          </button>
          <button
            type="button"
            className="profile-inline-secondary"
            onClick={onCancelField}
          >
            Cancel
          </button>
        </form>
      ) : null}

      <div className="profile-section-actions">
        <SectionShortcuts
          section={section}
          onAddDocument={onAddDocument}
          onAddDate={onAddDate}
        />
      </div>
    </article>
  );
}

function profileSectionPrimaryAction(
  section: ProfileSection,
):
  | { type: "field" }
  | { type: "document"; label: string; docTypeKey: string } {
  if (section.id === "documents" || section.kind === "documents") {
    return { type: "document", label: "Add document", docTypeKey: "other" };
  }
  if (section.id === "ids" || section.kind === "ids") {
    return { type: "document", label: "Add ID", docTypeKey: "id" };
  }
  if (section.id === "insurance" || section.kind === "insurance") {
    return {
      type: "document",
      label: "Add insurance card",
      docTypeKey: "insurance",
    };
  }
  if (section.id === "vaccines" || section.kind === "vaccines") {
    return { type: "document", label: "Add vaccine", docTypeKey: "vaccine" };
  }
  return { type: "field" };
}

function SectionShortcuts({
  section,
  onAddDocument,
  onAddDate,
}: {
  section: ProfileSection;
  onAddDocument: (docTypeKey?: string) => void;
  onAddDate: (category?: DateCategory) => void;
}) {
  if (section.id === "health" || section.kind === "health") {
    return (
      <>
        <button type="button" onClick={() => onAddDocument("medical")}>
          <FileText size={15} />
          Add health document
        </button>
        <button type="button" onClick={() => onAddDocument("vaccine")}>
          <FileText size={15} />
          Add vaccine
        </button>
      </>
    );
  }

  if (section.id === "school" || section.kind === "school") {
    return (
      <>
        <button type="button" onClick={() => onAddDate("school")}>
          <CalendarPlus size={15} />
          Add school date
        </button>
        <button type="button" onClick={() => onAddDocument("school-form")}>
          <FileText size={15} />
          Add school document
        </button>
      </>
    );
  }

  if (section.id === "travel" || section.kind === "travel") {
    return (
      <button type="button" onClick={() => onAddDocument("travel")}>
        <FileText size={15} />
        Add travel document
      </button>
    );
  }

  return null;
}

export default MemberProfileView;
