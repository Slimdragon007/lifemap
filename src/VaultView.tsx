import { CheckCircle2, ChevronDown, Eye, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildVaultItemsFromAnalysis,
  type FamilyMember,
  type RecurringCareItem,
  type VaultCategory,
  type VaultItem,
} from "./familyOS";
import type { LifeMapAnalysis } from "./lifemap";
import type { ViewerIdentity } from "./viewer";
import ModalBackdrop from "./modal-backdrop";
import EmptyState from "./empty-state";

const vaultFilters: Array<{ id: VaultCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "identity", label: "IDs" },
  { id: "insurance", label: "Insurance" },
  { id: "health", label: "Health" },
  { id: "school", label: "School" },
  { id: "pet", label: "Pets" },
  { id: "travel", label: "Travel" },
];

type VaultViewProps = {
  analysis: LifeMapAnalysis;
  familyMembers: FamilyMember[];
  vaultItems: VaultItem[];
  recurringCareItems: RecurringCareItem[];
  identity: ViewerIdentity;
  savedSuggestionIds: Set<string>;
  dismissedSuggestionIds: Set<string>;
  onSaveSuggestion: (id: string) => void;
  onSaveSuggestions: (ids: string[]) => void;
  onDismissSuggestion: (id: string) => void;
  onOpenCapture: () => void;
};

type VaultFeedback = {
  title: string;
  body: string;
};

function VaultView({
  analysis,
  familyMembers,
  vaultItems,
  recurringCareItems,
  identity,
  savedSuggestionIds,
  dismissedSuggestionIds,
  onSaveSuggestion,
  onSaveSuggestions,
  onDismissSuggestion,
  onOpenCapture,
}: VaultViewProps) {
  const [activeCategory, setActiveCategory] = useState<VaultCategory | "all">(
    "all",
  );
  const [expandedProfileIds, setExpandedProfileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedVaultItem, setSelectedVaultItem] = useState<VaultItem>();
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false);
  const [feedback, setFeedback] = useState<VaultFeedback>();
  const analysisItems = useMemo(
    () => buildVaultItemsFromAnalysis(analysis),
    [analysis],
  );
  const visibleAnalysisItems = useMemo(
    () => analysisItems.filter((item) => !dismissedSuggestionIds.has(item.id)),
    [analysisItems, dismissedSuggestionIds],
  );
  const pendingAnalysisItems = useMemo(
    () =>
      visibleAnalysisItems.filter((item) => !savedSuggestionIds.has(item.id)),
    [savedSuggestionIds, visibleAnalysisItems],
  );
  const allItems = useMemo(
    () => [...visibleAnalysisItems, ...vaultItems],
    [visibleAnalysisItems, vaultItems],
  );
  const visibleItems = useMemo(
    () =>
      activeCategory === "all"
        ? allItems
        : allItems.filter((item) => item.category === activeCategory),
    [activeCategory, allItems],
  );
  function toggleProfile(id: string) {
    setExpandedProfileIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openVaultItem(item: VaultItem) {
    setSelectedVaultItem(item);
    setIsSensitiveVisible(false);
  }

  function saveSuggestion(item: VaultItem) {
    onSaveSuggestion(item.id);
    setFeedback({
      title: `Saved ${item.title} to Vault.`,
      body: "Private details stay hidden until opened.",
    });
  }

  function saveAllSuggestions() {
    onSaveSuggestions(pendingAnalysisItems.map((item) => item.id));
    setFeedback({
      title: `Saved ${pendingAnalysisItems.length} ${
        pendingAnalysisItems.length === 1 ? "record" : "records"
      } to Vault.`,
      body: "They now live in the household source of truth.",
    });
  }

  function dismissSuggestion(item: VaultItem) {
    onDismissSuggestion(item.id);
    setFeedback({
      title: "Suggestion dismissed.",
      body: "LifeMap will keep it out of your household source of truth.",
    });
  }

  return (
    <section className="workspace notebook" aria-labelledby="vault-title">
      <header className="notebook-head">
        <h1 id="vault-title" className="notebook-title">
          Vault
        </h1>
        <p className="notebook-sub">
          Your family's records and emergency info, safe and findable.
        </p>
      </header>

      <h2 className="notebook-section-title">Family profiles</h2>
      <div className="notebook-list">
        {familyMembers.length > 0 ? (
          familyMembers.map((member) => {
            const expanded = expandedProfileIds.has(member.id);
            return (
              <div className="notebook-disclosure" key={member.id}>
                <button
                  aria-expanded={expanded}
                  className="notebook-row"
                  type="button"
                  onClick={() => toggleProfile(member.id)}
                >
                  <span className="notebook-initials" aria-hidden="true">
                    {member.initials}
                  </span>
                  <span className="notebook-row-main">
                    <span className="notebook-row-title">{member.name}</span>
                    <span className="notebook-row-sub">
                      {member.role} ·{" "}
                      {expanded ? "details visible" : "tap to reveal"}
                    </span>
                  </span>
                  <ChevronDown className="notebook-chev" size={16} />
                </button>
                {expanded ? (
                  <div className="notebook-detail">
                    <dl>
                      {member.details.map((detail) => (
                        <div key={`${member.id}-${detail.label}`}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <ul>
                      {member.careNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <EmptyState
            actionLabel="Capture something"
            message="No family profiles yet. Capture family details to build them."
            onAction={onOpenCapture}
          />
        )}
      </div>

      <h2 className="notebook-section-title">Documents &amp; records</h2>

      {pendingAnalysisItems.length > 0 ? (
        <div className="notebook-callout" aria-label="Vault suggestions">
          <span>
            LifeMap found {pendingAnalysisItems.length} vault{" "}
            {pendingAnalysisItems.length === 1 ? "record" : "records"} to
            review.
          </span>
          <button
            className="notebook-link"
            type="button"
            onClick={saveAllSuggestions}
          >
            Save all
          </button>
        </div>
      ) : null}

      {feedback ? (
        <p className="notebook-note" role="status">
          <strong>{feedback.title}</strong>
          {feedback.body}
        </p>
      ) : null}

      <div className="notebook-filters" aria-label="Vault categories">
        {vaultFilters.map((filter) => (
          <button
            aria-pressed={activeCategory === filter.id}
            className={
              activeCategory === filter.id
                ? "notebook-filter active"
                : "notebook-filter"
            }
            key={filter.id}
            type="button"
            onClick={() => setActiveCategory(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="notebook-list">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <VaultRow
              isSaved={savedSuggestionIds.has(item.id)}
              item={item}
              key={item.id}
              onDismissSuggestion={() => dismissSuggestion(item)}
              onOpenDetails={() => openVaultItem(item)}
              onSaveSuggestion={() => saveSuggestion(item)}
            />
          ))
        ) : (
          <EmptyState
            actionLabel="Capture something"
            message="No records yet. Paste an ID, policy, or form and it files itself."
            onAction={onOpenCapture}
          />
        )}
      </div>

      <section className="emergency-panel" aria-label="Emergency view">
        <h2 className="notebook-section-title">Emergency view</h2>
        {familyMembers.length > 0 ? (
          <div className="notebook-list">
            <div className="notebook-row entry">
              <span className="notebook-when">Contact</span>
              <span className="notebook-row-main">
                <span className="notebook-row-title">Primary contact</span>
                <span className="notebook-row-sub">{identity.name}</span>
              </span>
            </div>
            {familyMembers
              .filter((member) => member.careNotes.length > 0)
              .map((member) => (
                <div className="notebook-row entry" key={member.id}>
                  <span className="notebook-when">{member.role}</span>
                  <span className="notebook-row-main">
                    <span className="notebook-row-title">{member.name}</span>
                    <span className="notebook-row-sub">
                      {member.careNotes.join(" · ")}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            actionLabel="Capture something"
            message="Emergency basics appear once you add family profiles."
            onAction={onOpenCapture}
          />
        )}
      </section>

      <h2 className="notebook-section-title">Care loops</h2>
      {recurringCareItems.length > 0 ? (
        <div className="notebook-list">
          {recurringCareItems.slice(0, 3).map((item) => (
            <div className="notebook-row entry" key={item.id}>
              <span className="notebook-when">
                {formatShortDate(item.nextDue)}
              </span>
              <span className="notebook-row-main">
                <span className="notebook-row-title">{item.title}</span>
                <span className="notebook-row-sub">{item.cadence}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel="Capture something"
          message="No recurring care loops yet. Capture a routine and I'll track it."
          onAction={onOpenCapture}
        />
      )}

      {selectedVaultItem ? (
        <VaultDetailDialog
          isSensitiveVisible={isSensitiveVisible}
          item={selectedVaultItem}
          onClose={() => setSelectedVaultItem(undefined)}
          onReveal={() => setIsSensitiveVisible(true)}
        />
      ) : null}
    </section>
  );
}

function VaultRow({
  item,
  isSaved,
  onSaveSuggestion,
  onDismissSuggestion,
  onOpenDetails,
}: {
  item: VaultItem;
  isSaved: boolean;
  onSaveSuggestion: () => void;
  onDismissSuggestion: () => void;
  onOpenDetails: () => void;
}) {
  const isGenerated = item.id.startsWith("ai-vault-");
  const pending = isGenerated && !isSaved;
  const sub = `${item.owner}${
    item.renewalDate ? ` · review by ${formatShortDate(item.renewalDate)}` : ""
  }`;

  if (pending) {
    return (
      <div className="notebook-row entry pending">
        <span className="notebook-when">{item.category}</span>
        <button
          aria-label={`Open details for ${item.title}`}
          className="notebook-row-main notebook-row-open"
          type="button"
          onClick={onOpenDetails}
        >
          <span className="notebook-notch" aria-hidden="true" />
          <span className="notebook-row-title">{item.title}</span>
          <span className="notebook-row-sub">{sub}</span>
        </button>
        <span className="notebook-row-actions">
          <span className="notebook-tag">Needs review</span>
          <button
            className="notebook-link"
            type="button"
            onClick={onSaveSuggestion}
          >
            Save
          </button>
          <button
            className="notebook-link quiet"
            type="button"
            onClick={onDismissSuggestion}
          >
            Dismiss
          </button>
        </span>
      </div>
    );
  }

  return (
    <button
      aria-label={`Open details for ${item.title}`}
      className="notebook-row entry"
      type="button"
      onClick={onOpenDetails}
    >
      <span className="notebook-when">{item.category}</span>
      <span className="notebook-row-main">
        <span className="notebook-row-title">{item.title}</span>
        <span className="notebook-row-sub">{sub}</span>
      </span>
      <span className="notebook-tag">{item.status}</span>
    </button>
  );
}

function VaultDetailDialog({
  isSensitiveVisible,
  item,
  onClose,
  onReveal,
}: {
  isSensitiveVisible: boolean;
  item: VaultItem;
  onClose: () => void;
  onReveal: () => void;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="vault-detail-title"
        aria-modal="true"
        className="review-dialog vault-detail-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="vault-detail-title">{item.title}</h2>
            <p>
              {item.owner} · {item.category}
            </p>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <article className="vault-private-card">
          <div>
            <LockKeyhole size={18} />
            <span>Private details</span>
          </div>
          <p>
            {isSensitiveVisible ? item.detail : "Hidden until you reveal them."}
          </p>
          {isSensitiveVisible ? (
            <span className="vault-private-state">
              <CheckCircle2 size={14} />
              Visible for this session
            </span>
          ) : (
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={onReveal}
            >
              <Eye size={15} />
              Reveal details
            </button>
          )}
        </article>

        <div className="brief-detail-grid">
          <article className="brief-detail-card">
            <span>Status</span>
            <h3>{item.status}</h3>
            <p>
              {item.renewalDate
                ? `Review by ${formatShortDate(item.renewalDate)}.`
                : "No renewal date saved yet."}
            </p>
          </article>
          <article className="brief-detail-card">
            <span>Trust note</span>
            <h3>Human approved</h3>
            <p>
              LifeMap can suggest records, but saving stays user-controlled.
            </p>
          </article>
        </div>
      </section>
    </ModalBackdrop>
  );
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default VaultView;
