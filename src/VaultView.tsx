import { CheckCircle2, ChevronDown, Eye, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type FamilyMember,
  type VaultCategory,
  type VaultItem,
} from "./familyOS";
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
  familyMembers: FamilyMember[];
  vaultItems: VaultItem[];
  identity: ViewerIdentity;
  onOpenCapture: () => void;
};

function VaultView({
  familyMembers,
  vaultItems,
  identity,
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
  const visibleItems = useMemo(
    () =>
      activeCategory === "all"
        ? vaultItems
        : vaultItems.filter((item) => item.category === activeCategory),
    [activeCategory, vaultItems],
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
              item={item}
              key={item.id}
              onOpenDetails={() => openVaultItem(item)}
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
  onOpenDetails,
}: {
  item: VaultItem;
  onOpenDetails: () => void;
}) {
  const sub = `${item.owner}${
    item.renewalDate ? ` · review by ${formatShortDate(item.renewalDate)}` : ""
  }`;

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
