import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  HeartPulse,
  IdCard,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildVaultItemsFromAnalysis,
  familyMembers,
  recurringCareItems,
  vaultItems,
  type VaultCategory,
  type VaultItem,
} from "./familyOS";
import type { LifeMapAnalysis } from "./lifemap";

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
  savedSuggestionIds: Set<string>;
  dismissedSuggestionIds: Set<string>;
  onSaveSuggestion: (id: string) => void;
  onSaveSuggestions: (ids: string[]) => void;
  onDismissSuggestion: (id: string) => void;
};

type VaultFeedback = {
  title: string;
  body: string;
};

function VaultView({
  analysis,
  savedSuggestionIds,
  dismissedSuggestionIds,
  onSaveSuggestion,
  onSaveSuggestions,
  onDismissSuggestion,
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
    [visibleAnalysisItems],
  );
  const visibleItems = useMemo(
    () =>
      activeCategory === "all"
        ? allItems
        : allItems.filter((item) => item.category === activeCategory),
    [activeCategory, allItems],
  );
  const urgentItems = allItems.filter(
    (item) => item.status === "Needs update" || item.status === "Expires soon",
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
    <section className="workspace vault-workspace" aria-labelledby="vault-title">
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <Archive size={14} />
            Household source of truth
          </span>
          <h1 id="vault-title">Vault</h1>
          <p>Insurance cards, IDs, passports, vaccines, school, pets, and travel records.</p>
          <span className="storage-note">
            Sensitive details stay tucked away until you open a record.
          </span>
        </div>
        <div className="status-strip" aria-label="Vault summary">
          <span className="status-pill calm">{allItems.length} records</span>
          <span className="status-pill warning">
            {urgentItems.length} quick looks
          </span>
          <span className="status-pill calm">
            {visibleAnalysisItems.length} from AI
          </span>
        </div>
      </header>

      <div className="vault-grid">
        <section className="panel profile-panel" aria-labelledby="profiles-title">
          <div className="panel-heading">
            <div>
              <h2 id="profiles-title">Family profiles</h2>
              <span>People, pets, school, medical, and emergency basics</span>
            </div>
            <UsersRound size={18} />
          </div>

          <div className="profile-list">
            {familyMembers.map((member) => (
              <article
                className={
                  expandedProfileIds.has(member.id)
                    ? "profile-card profile-card-expanded"
                    : "profile-card"
                }
                key={member.id}
              >
                <button
                  aria-expanded={expandedProfileIds.has(member.id)}
                  className="profile-card-toggle"
                  type="button"
                  onClick={() => toggleProfile(member.id)}
                >
                  <span className={`profile-avatar profile-${member.profileType}`}>
                    {member.initials}
                  </span>
                  <span>
                    <span className="profile-card-top">
                      <h3>{member.name}</h3>
                      <span>{member.role}</span>
                    </span>
                    <small>
                      {expandedProfileIds.has(member.id)
                        ? "Details are visible"
                        : "Tap to reveal private details"}
                    </small>
                  </span>
                  <ChevronDown size={17} />
                </button>
                {expandedProfileIds.has(member.id) ? (
                  <div className="profile-hidden-details">
                  <dl className="profile-details">
                    {member.details.map((detail) => (
                      <div key={`${member.id}-${detail.label}`}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="care-note-list">
                    {member.careNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="panel vault-panel" aria-labelledby="records-title">
          <div className="panel-heading">
            <div>
              <h2 id="records-title">Documents & records</h2>
              <span>{visibleItems.length} visible</span>
            </div>
            <FileText size={18} />
          </div>

          {pendingAnalysisItems.length > 0 ? (
            <section className="suggestion-review-bar" aria-label="Vault suggestions">
              <div>
                <strong>
                  LifeMap found {pendingAnalysisItems.length} vault{" "}
                  {pendingAnalysisItems.length === 1 ? "record" : "records"}.
                </strong>
                <span>Save only records you want in the household source of truth.</span>
              </div>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={saveAllSuggestions}
              >
                Save all
              </button>
            </section>
          ) : null}

          {feedback ? (
            <section className="vault-feedback-card" role="status">
              <CheckCircle2 size={18} />
              <div>
                <strong>{feedback.title}</strong>
                <span>{feedback.body}</span>
              </div>
            </section>
          ) : null}

          <div className="vault-filter-row" aria-label="Vault categories">
            {vaultFilters.map((filter) => (
              <button
                aria-pressed={activeCategory === filter.id}
                className={
                  activeCategory === filter.id
                    ? "vault-filter active"
                    : "vault-filter"
                }
                key={filter.id}
                type="button"
                onClick={() => setActiveCategory(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="vault-record-list">
            {visibleItems.map((item) => (
              <VaultCard
                isSaved={savedSuggestionIds.has(item.id)}
                item={item}
                key={item.id}
                onDismissSuggestion={() => dismissSuggestion(item)}
                onOpenDetails={() => openVaultItem(item)}
                onSaveSuggestion={() => saveSuggestion(item)}
              />
            ))}
          </div>
        </section>

        <aside className="panel emergency-panel" aria-labelledby="emergency-title">
          <div className="panel-heading">
            <div>
              <h2 id="emergency-title">Emergency view</h2>
              <span>The short list a sitter, school, or clinic would need</span>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="emergency-list">
            <article>
              <IdCard size={17} />
              <div>
                <strong>Primary contact</strong>
                <span>Alex Kim · (555) 010-1172</span>
              </div>
            </article>
            <article>
              <Stethoscope size={17} />
              <div>
                <strong>Casey health note</strong>
                <span>Peanut allergy · Cetirizine as needed</span>
              </div>
            </article>
            <article>
              <PawPrint size={17} />
              <div>
                <strong>Milo vet</strong>
                <span>Desert Paws Veterinary · rabies booster due Jun 20</span>
              </div>
            </article>
          </div>

          <div className="map-section">
            <h3>Care loops</h3>
            <div className="recurring-list compact-recurring-list">
              {recurringCareItems.slice(0, 3).map((item) => (
                <article className="recurring-card" key={item.id}>
                  <span className={`care-dot care-${item.category}`} />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.cadence}</p>
                    <small>Next due {formatShortDate(item.nextDue)}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
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

function VaultCard({
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

  return (
    <article
      className={
        isGenerated
          ? `vault-card generated-vault-card vault-${item.status.toLowerCase().replace(/\s/g, "-")}`
          : `vault-card vault-${item.status.toLowerCase().replace(/\s/g, "-")}`
      }
    >
      <div className="vault-card-top">
        <span className={`vault-icon vault-icon-${item.category}`}>
          {categoryIcon(item.category)}
        </span>
        <div>
          <h3>{item.title}</h3>
          <p>{item.owner}</p>
        </div>
        <span className="vault-status">{item.status}</span>
      </div>
      {isGenerated ? (
        <span className="generated-label">
          {isSaved ? "Saved to LifeMap" : "Needs review"}
        </span>
      ) : null}
      <p>
        {isGenerated && !isSaved
          ? "AI suggestion ready for review."
          : "Private details hidden until opened."}
      </p>
      {item.renewalDate ? (
        <small>
          <CalendarDays size={13} />
          Review by {formatShortDate(item.renewalDate)}
        </small>
      ) : null}
      {isGenerated && !isSaved ? (
        <div className="suggestion-actions">
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onSaveSuggestion}
          >
            Save
          </button>
          <button
            className="ghost-button compact-button"
            type="button"
            onClick={onDismissSuggestion}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <button
        aria-label={`Open details for ${item.title}`}
        className="ghost-button compact-button vault-detail-button"
        type="button"
        onClick={onOpenDetails}
      >
        Open details
      </button>
    </article>
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
    <div className="modal-backdrop">
      <section
        aria-labelledby="vault-detail-title"
        aria-modal="true"
        className="review-dialog vault-detail-dialog"
        role="dialog"
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
          <p>{isSensitiveVisible ? item.detail : "Hidden until you reveal them."}</p>
          {isSensitiveVisible ? (
            <span className="vault-private-state">
              <CheckCircle2 size={14} />
              Visible for this session
            </span>
          ) : (
            <button className="secondary-button compact-button" type="button" onClick={onReveal}>
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
            <p>LifeMap can suggest records, but saving stays user-controlled.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

function categoryIcon(category: VaultCategory) {
  switch (category) {
    case "identity":
      return <IdCard size={17} />;
    case "insurance":
      return <ShieldCheck size={17} />;
    case "health":
      return <HeartPulse size={17} />;
    case "school":
      return <Archive size={17} />;
    case "pet":
      return <PawPrint size={17} />;
    case "travel":
      return <FileText size={17} />;
  }
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default VaultView;
