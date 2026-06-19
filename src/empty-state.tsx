import { ChevronRight } from "lucide-react";

type EmptyStateProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

// Shared empty-state: a calm one-liner plus a single next action so no screen
// dead-ends. Reuses .notebook-empty for the muted text; .empty-cta is the quiet
// action pill (see styles.css).
function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="notebook-empty">{message}</p>
      <button className="empty-cta" type="button" onClick={onAction}>
        {actionLabel}
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export default EmptyState;
