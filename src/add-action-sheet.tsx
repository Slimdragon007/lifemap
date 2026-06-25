import { Brain, CalendarPlus, FileText, UserPlus } from "lucide-react";
import ModalBackdrop from "./modal-backdrop";

export type QuickAddKind = "document" | "date" | "person" | "brainDump";

const TILES: ReadonlyArray<{
  kind: QuickAddKind;
  label: string;
  hint: string;
  icon: typeof FileText;
}> = [
  {
    kind: "document",
    label: "Document",
    hint: "Passport, card…",
    icon: FileText,
  },
  {
    kind: "date",
    label: "Date",
    hint: "Birthday, renewal",
    icon: CalendarPlus,
  },
  {
    kind: "person",
    label: "Person",
    hint: "Kid, partner, pet",
    icon: UserPlus,
  },
  {
    kind: "brainDump",
    label: "Brain dump",
    hint: "Type anything",
    icon: Brain,
  },
];

export function AddActionSheet({
  owner,
  onPick,
  onClose,
}: {
  owner?: string;
  onPick: (kind: QuickAddKind) => void;
  onClose: () => void;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="add-sheet-title"
        aria-modal="true"
        className="add-sheet"
        role="dialog"
        tabIndex={-1}
      >
        <p className="add-sheet-eyebrow" id="add-sheet-title">
          {owner ? `Add for ${owner}` : "Add something"}
        </p>
        <div className="add-sheet-grid">
          {TILES.map(({ kind, label, hint, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              className="add-sheet-tile"
              onClick={() => onPick(kind)}
            >
              <span className="add-sheet-tile-icon" aria-hidden="true">
                <Icon size={19} />
              </span>
              <span className="add-sheet-tile-label">{label}</span>
              <span className="add-sheet-tile-hint">{hint}</span>
            </button>
          ))}
        </div>
      </section>
    </ModalBackdrop>
  );
}

export default AddActionSheet;
