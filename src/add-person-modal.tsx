import { useState, type FormEvent } from "react";
import ModalBackdrop from "./modal-backdrop";
import type { OnboardingPerson, OnboardingRole } from "./onboarding-view";

const ROLE_OPTIONS: ReadonlyArray<{ value: OnboardingRole; label: string }> = [
  { value: "child", label: "Child" },
  { value: "adult", label: "Adult" },
  { value: "pet", label: "Pet" },
];

export function AddPersonModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (person: OnboardingPerson) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<OnboardingRole>("child");

  const canSave = name.trim().length > 0;

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({ name: name.trim(), role });
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="add-person-title"
        aria-modal="true"
        className="review-dialog add-date-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="add-person-title">Add someone</h2>
            <p>A person you carry mental load for. Lands in your family.</p>
          </div>
        </div>
        <form className="add-date-form" onSubmit={handleSubmit}>
          <label className="add-date-field">
            <span>Their name</span>
            <input
              type="text"
              value={name}
              autoFocus
              placeholder="Chloe"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="add-date-field">
            <span>Who are they?</span>
            <div className="person-type-row" role="group" aria-label="Type">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`person-type${role === option.value ? " sel" : ""}`}
                  aria-pressed={role === option.value}
                  onClick={() => setRole(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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
              Add person
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

export default AddPersonModal;
