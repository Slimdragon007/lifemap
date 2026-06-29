import {
  CheckCircle2,
  Eye,
  LockKeyhole,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  type FamilyMember,
  inferVaultCategory,
  type VaultCategory,
  type VaultItem,
} from "./familyOS";
import ModalBackdrop from "./modal-backdrop";
import EmptyState from "./empty-state";
import {
  DOCUMENT_TYPES,
  type DocumentTypeMeta,
  VAULT_CATEGORY_OPTIONS,
  VAULT_CATEGORY_LABEL,
} from "./documentTypes";

const OTHER_OWNER = "__other__";
const WHOLE_FAMILY = "Whole family";

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
  onOpenCapture: () => void;
  onAddDocument: (item: VaultItem) => void;
};

function VaultView({
  familyMembers,
  vaultItems,
  onOpenCapture,
  onAddDocument,
}: VaultViewProps) {
  const [activeCategory, setActiveCategory] = useState<VaultCategory | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVaultItem, setSelectedVaultItem] = useState<VaultItem>();
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false);
  // Add-document flow: the doc-type grid opens once "+ Add document" is tapped;
  // tapping a type opens the modal. `presetOwner` pre-selects a kid when the add
  // came from that member's profile.
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState<DocumentTypeMeta>();
  const [presetOwner, setPresetOwner] = useState<string>();

  function openTypePicker(owner?: string) {
    setPresetOwner(owner);
    setIsTypePickerOpen(true);
  }

  function openAddDocument(type: DocumentTypeMeta, owner?: string) {
    setPresetOwner(owner);
    setActiveDocType(type);
    setIsTypePickerOpen(false);
  }

  function closeAddDocument() {
    setActiveDocType(undefined);
    setPresetOwner(undefined);
  }
  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return vaultItems.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [
        item.title,
        item.owner,
        item.status,
        VAULT_CATEGORY_LABEL[item.category],
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [activeCategory, searchQuery, vaultItems]);
  const visibleOwnerGroups = useMemo(
    () => groupVaultItemsByOwner(visibleItems),
    [visibleItems],
  );
  const cabinetSummary = useMemo(
    () => summarizeVaultItems(vaultItems),
    [vaultItems],
  );

  function openVaultItem(item: VaultItem) {
    setSelectedVaultItem(item);
    setIsSensitiveVisible(false);
  }

  return (
    <section className="workspace notebook" aria-labelledby="vault-title">
      <header className="notebook-head">
        <h1 id="vault-title" className="notebook-title">
          Cabinet
        </h1>
        <p className="notebook-sub">Records, IDs, forms, and private details.</p>
      </header>

      <section className="cabinet-command-panel" aria-label="Find records">
        <div className="cabinet-command-copy">
          <span className="cabinet-command-icon" aria-hidden="true">
            <LockKeyhole size={18} />
          </span>
          <div>
            <h2>Records only.</h2>
            <p>Search by person, pet, or type.</p>
          </div>
        </div>
        <p className="cabinet-ledger-meta">
          {formatCount(vaultItems.length, "stored record")} ·{" "}
          {formatCount(cabinetSummary.ownerCount, "person or pet")} ·{" "}
          {formatCount(cabinetSummary.needsReview, "review item")}
        </p>
        <label className="cabinet-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search records</span>
          <input
            type="search"
            value={searchQuery}
            placeholder="Search records"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <button
          className="primary-button vault-add-button"
          type="button"
          onClick={() => openTypePicker()}
        >
          <Plus size={16} />
          Add document
        </button>
      </section>

      {isTypePickerOpen ? (
        <section
          className="dates-grid vault-type-grid"
          aria-label="Pick a document type"
        >
          {DOCUMENT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                className="dates-tile"
                type="button"
                onClick={() => openAddDocument(type, presetOwner)}
                aria-label={`Add a ${type.label.toLowerCase()}`}
              >
                <span className="dates-tile-icon">
                  <Icon size={20} />
                </span>
                <strong>{type.label}</strong>
              </button>
            );
          })}
        </section>
      ) : null}

      <h2 className="notebook-section-title">Stored records</h2>

      <div className="notebook-filters" aria-label="Cabinet categories">
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
          visibleOwnerGroups.map((group) => (
            <section
              aria-labelledby={`vault-owner-${group.key}`}
              className="vault-owner-group"
              key={group.key}
            >
              <div className="vault-owner-heading">
                <h3 id={`vault-owner-${group.key}`}>{group.owner}</h3>
                <span>{formatCount(group.items.length, "record")}</span>
              </div>
              <div className="vault-owner-list">
                {group.items.map((item) => (
                  <VaultRow
                    item={item}
                    key={item.id}
                    onOpenDetails={() => openVaultItem(item)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            actionLabel={searchQuery ? "Clear search" : "Capture something"}
            message={
              searchQuery
                ? "No records match that search."
                : "No records yet. Drop one in and LifeMap files it."
            }
            onAction={
              searchQuery ? () => setSearchQuery("") : onOpenCapture
            }
          />
        )}
      </div>

      {selectedVaultItem ? (
        <VaultDetailDialog
          isSensitiveVisible={isSensitiveVisible}
          item={selectedVaultItem}
          onClose={() => setSelectedVaultItem(undefined)}
          onReveal={() => setIsSensitiveVisible(true)}
        />
      ) : null}

      {activeDocType ? (
        <AddDocumentModal
          docType={activeDocType}
          familyMembers={familyMembers}
          presetOwner={presetOwner}
          onClose={closeAddDocument}
          onSave={(item) => {
            onAddDocument(item);
            closeAddDocument();
          }}
        />
      ) : null}
    </section>
  );
}

type VaultOwnerGroup = {
  key: string;
  owner: string;
  items: VaultItem[];
};

function groupVaultItemsByOwner(items: VaultItem[]): VaultOwnerGroup[] {
  const groups = new Map<string, VaultOwnerGroup>();
  for (const item of items) {
    const owner = item.owner.trim() || WHOLE_FAMILY;
    const key = owner.toLocaleLowerCase().replace(/\s+/g, "-");
    const group = groups.get(key) ?? { key, owner, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}

function summarizeVaultItems(items: VaultItem[]) {
  const owners = new Set<string>();
  let needsReview = 0;
  for (const item of items) {
    owners.add((item.owner.trim() || WHOLE_FAMILY).toLocaleLowerCase());
    if (item.status !== "Current") {
      needsReview += 1;
    }
  }
  return { ownerCount: owners.size, needsReview };
}

function formatCount(count: number, singularLabel: string) {
  return `${count} ${count === 1 ? singularLabel : `${singularLabel}s`}`;
}

export function AddDocumentModal({
  docType,
  familyMembers,
  presetOwner,
  onClose,
  onSave,
}: {
  docType: DocumentTypeMeta;
  familyMembers: FamilyMember[];
  presetOwner?: string;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}) {
  const [title, setTitle] = useState(docType.defaultTitle);
  // Pre-select the kid when the add came from their profile.
  const [whoFor, setWhoFor] = useState(presetOwner ?? "");
  const [otherOwner, setOtherOwner] = useState("");
  const [status, setStatus] = useState<VaultItem["status"]>("Current");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");
  // Category: seeded from the tapped doc-type. On the generic quick-add path
  // ("other") we auto-guess from the title until the user taps a chip — then
  // their pick wins (categoryTouched).
  const [category, setCategory] = useState<VaultCategory>(docType.category);
  const [categoryTouched, setCategoryTouched] = useState(false);

  function handleTitleChange(next: string) {
    setTitle(next);
    if (
      !categoryTouched &&
      docType.key === "other" &&
      next.trim() &&
      next.trim() !== docType.defaultTitle
    ) {
      setCategory(inferVaultCategory(next));
    }
  }

  function pickCategory(next: VaultCategory) {
    setCategory(next);
    setCategoryTouched(true);
  }

  const owner = whoFor === OTHER_OWNER ? otherOwner.trim() : whoFor.trim();
  const canSave = title.trim().length > 0 && owner.length > 0;

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      title: title.trim(),
      category,
      owner,
      status,
      detail: notes.trim(),
      ...(expiry ? { renewalDate: expiry } : {}),
    });
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <section
        aria-labelledby="add-document-title"
        aria-modal="true"
        className="review-dialog add-date-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="add-document-title">
              {docType.key === "other"
                ? "Add a document"
                : `Add ${docType.label.toLowerCase()}`}
            </h2>
            <p>Saved straight to your cabinet. No AI, no waiting.</p>
          </div>
        </div>
        <form className="add-date-form" onSubmit={handleSubmit}>
          <label className="add-date-field">
            <span>What is it?</span>
            <input
              type="text"
              value={title}
              autoFocus
              placeholder={`${docType.defaultTitle}…`}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </label>
          <div className="add-date-field">
            <span>Category</span>
            <div className="cat-chip-row" role="group" aria-label="Category">
              {VAULT_CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`cat-chip${category === option.value ? " sel" : ""}`}
                  aria-pressed={category === option.value}
                  onClick={() => pickCategory(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="add-date-field">
            <span>Who is it for?</span>
            <select value={whoFor} onChange={(e) => setWhoFor(e.target.value)}>
              <option value="">Choose…</option>
              <option value={WHOLE_FAMILY}>Whole family</option>
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
          <label className="add-date-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VaultItem["status"])}
            >
              <option value="Current">Current</option>
              <option value="Needs update">Needs update</option>
              <option value="Expires soon">Expires soon</option>
            </select>
          </label>
          <label className="add-date-field">
            <span>Expiry (optional)</span>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label className="add-date-field">
            <span>Notes</span>
            <input
              type="text"
              value={notes}
              placeholder="Policy number, location…"
              onChange={(e) => setNotes(e.target.value)}
            />
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
              Save document
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

function VaultRow({
  item,
  onOpenDetails,
}: {
  item: VaultItem;
  onOpenDetails: () => void;
}) {
  const sub = `${VAULT_CATEGORY_LABEL[item.category]}${
    item.renewalDate ? ` · review by ${formatShortDate(item.renewalDate)}` : ""
  }`;

  return (
    <button
      aria-label={`Open details for ${item.title}`}
      className="notebook-row entry vault-owner-row"
      type="button"
      onClick={onOpenDetails}
    >
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
