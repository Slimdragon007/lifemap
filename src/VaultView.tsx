import {
  Archive,
  CalendarDays,
  FileText,
  HeartPulse,
  IdCard,
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
};

function VaultView({ analysis }: VaultViewProps) {
  const [activeCategory, setActiveCategory] = useState<VaultCategory | "all">(
    "all",
  );
  const analysisItems = useMemo(
    () => buildVaultItemsFromAnalysis(analysis),
    [analysis],
  );
  const allItems = useMemo(
    () => [...analysisItems, ...vaultItems],
    [analysisItems],
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

  return (
    <section className="workspace vault-workspace" aria-labelledby="vault-title">
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <Archive size={14} />
            Household source of truth
          </span>
          <h1 id="vault-title">Vault</h1>
          <p>Insurance cards, IDs, vaccines, school records, and pet documents.</p>
          <span className="storage-note">
            Current AI missing-info records appear here until secure document
            storage is connected.
          </span>
        </div>
        <div className="status-strip" aria-label="Vault summary">
          <span className="status-pill calm">{allItems.length} records</span>
          <span className="status-pill warning">
            {urgentItems.length} need attention
          </span>
          <span className="status-pill urgent">
            {analysisItems.length} from AI
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
              <article className="profile-card" key={member.id}>
                <span className={`profile-avatar profile-${member.profileType}`}>
                  {member.initials}
                </span>
                <div>
                  <div className="profile-card-top">
                    <h3>{member.name}</h3>
                    <span>{member.role}</span>
                  </div>
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
              <article
                className={
                  item.id.startsWith("ai-vault-")
                    ? `vault-card generated-vault-card vault-${item.status.toLowerCase().replace(/\s/g, "-")}`
                    : `vault-card vault-${item.status.toLowerCase().replace(/\s/g, "-")}`
                }
                key={item.id}
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
                {item.id.startsWith("ai-vault-") ? (
                  <span className="generated-label">From AI map</span>
                ) : null}
                <p>{item.detail}</p>
                {item.renewalDate ? (
                  <small>
                    <CalendarDays size={13} />
                    Review by {formatShortDate(item.renewalDate)}
                  </small>
                ) : null}
              </article>
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
    </section>
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
