import type { FamilyMember } from "./familyOS";
import { OTHER_OWNER } from "./shared-types";

type OwnerPickerProps = {
  familyMembers: FamilyMember[];
  whoFor: string;
  otherOwner: string;
  onWhoForChange: (value: string) => void;
  onOtherOwnerChange: (value: string) => void;
  /** Label for the blank/default option (e.g. "Choose…" or "Everyone"). */
  emptyLabel?: string;
  /** Whether to show a "Whole family" option before the member list. */
  showWholeFamily?: boolean;
};

export function OwnerPicker({
  familyMembers,
  whoFor,
  otherOwner,
  onWhoForChange,
  onOtherOwnerChange,
  emptyLabel = "Choose…",
  showWholeFamily = false,
}: OwnerPickerProps) {
  return (
    <>
      <label className="add-date-field">
        <span>Who is it for?</span>
        <select value={whoFor} onChange={(e) => onWhoForChange(e.target.value)}>
          <option value="">{emptyLabel}</option>
          {showWholeFamily ? (
            <option value="Whole family">Whole family</option>
          ) : null}
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
            onChange={(e) => onOtherOwnerChange(e.target.value)}
          />
        </label>
      ) : null}
    </>
  );
}


