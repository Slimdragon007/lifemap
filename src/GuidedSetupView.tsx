import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  Home,
  Inbox,
  Plane,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  recommendSetupBuckets,
  setupFocusOptions,
  type RecommendedBucket,
  type SetupBucketId,
  type SetupFocusArea,
  type SetupProfile,
} from "./setupBuckets";
import { pluralize } from "./format-utils";

type GuidedSetupViewProps = {
  activeBucketIds: SetupBucketId[];
  profile: SetupProfile;
  onBack: () => void;
  onCreateBuckets: (bucketIds: SetupBucketId[]) => void;
  onOpenCalendar: () => void;
  onOpenCapture: () => void;
  onOpenToday: () => void;
  onOpenVault: () => void;
  onProfileChange: (profile: SetupProfile) => void;
};

function GuidedSetupView({
  activeBucketIds,
  profile,
  onBack,
  onCreateBuckets,
  onOpenCalendar,
  onOpenCapture,
  onOpenToday,
  onOpenVault,
  onProfileChange,
}: GuidedSetupViewProps) {
  const recommendedBuckets = recommendSetupBuckets(profile);
  const activeBuckets = recommendedBuckets.filter((bucket) =>
    activeBucketIds.includes(bucket.id),
  );
  const visibleBuckets =
    activeBuckets.length > 0 ? activeBuckets : recommendedBuckets;
  const activeCountLabel = `${activeBuckets.length} active ${pluralize("bucket", activeBuckets.length)}`;

  function updateNumber(field: "adults" | "children" | "pets", value: string) {
    onProfileChange({
      ...profile,
      [field]: Math.max(0, Math.min(12, Number.parseInt(value || "0", 10))),
    });
  }

  function toggleFocusArea(focusArea: SetupFocusArea) {
    const nextFocusAreas = profile.focusAreas.includes(focusArea)
      ? profile.focusAreas.filter((area) => area !== focusArea)
      : [...profile.focusAreas, focusArea];

    onProfileChange({
      ...profile,
      focusAreas: nextFocusAreas,
    });
  }

  function handleCreateBuckets() {
    onCreateBuckets(recommendedBuckets.map((bucket) => bucket.id));
  }

  return (
    <section className="workspace setup-workspace" aria-labelledby="setup-title">
      <header className="topbar setup-topbar">
        <div>
          <span className="workspace-kicker">
            <Sparkles size={14} />
            New household map
          </span>
          <h1 id="setup-title">Guided setup</h1>
          <p>Tell LifeMap what your real life looks like.</p>
          <span className="storage-note">
            Setup is saved in this browser and can sync through Supabase when enabled.
          </span>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={onBack}>
          Back to More
        </button>
      </header>

      <div className="setup-grid">
        <section className="panel setup-profile-panel" aria-labelledby="household-title">
          <div className="panel-heading">
            <div>
              <h2 id="household-title">Household shape</h2>
              <span>Start with the loops that create the most admin.</span>
            </div>
            <UsersRound size={18} />
          </div>

          <div className="setup-count-grid">
            <label>
              <span>Adults</span>
              <input
                aria-label="Adults"
                inputMode="numeric"
                min={0}
                max={12}
                type="number"
                value={profile.adults}
                onChange={(event) => updateNumber("adults", event.target.value)}
              />
            </label>
            <label>
              <span>Children</span>
              <input
                aria-label="Children"
                inputMode="numeric"
                min={0}
                max={12}
                type="number"
                value={profile.children}
                onChange={(event) => updateNumber("children", event.target.value)}
              />
            </label>
            <label>
              <span>Pets</span>
              <input
                aria-label="Pets"
                inputMode="numeric"
                min={0}
                max={12}
                type="number"
                value={profile.pets}
                onChange={(event) => updateNumber("pets", event.target.value)}
              />
            </label>
          </div>

          <button
            aria-checked={profile.travels}
            aria-label="Travel planning"
            className={profile.travels ? "setup-switch active" : "setup-switch"}
            role="switch"
            type="button"
            onClick={() => onProfileChange({ ...profile, travels: !profile.travels })}
          >
            <span>
              <Plane size={18} />
              Travel planning
            </span>
            <strong>{profile.travels ? "On" : "Off"}</strong>
          </button>

          <fieldset className="setup-focus-fieldset">
            <legend>What are you trying to organize?</legend>
            <div className="setup-focus-list">
              {setupFocusOptions.map((option) => (
                <label className="setup-focus-option" key={option.id}>
                  <input
                    aria-label={option.label}
                    checked={profile.focusAreas.includes(option.id)}
                    type="checkbox"
                    onChange={() => toggleFocusArea(option.id)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="primary-button setup-create-button"
            type="button"
            onClick={handleCreateBuckets}
          >
            Create recommended buckets
            <ChevronRight size={16} />
          </button>

          {activeBuckets.length > 0 ? (
            <section className="setup-ready-card" aria-labelledby="setup-ready-title">
              <span className="setup-ready-icon">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <h2 id="setup-ready-title">Your LifeMap is ready</h2>
                <p>
                  {activeCountLabel} now show on Today, so the next useful
                  place to go is your daily map.
                </p>
              </div>
              <button className="secondary-button compact-button" type="button" onClick={onOpenToday}>
                View Today
                <ChevronRight size={14} />
              </button>
            </section>
          ) : null}
        </section>

        <section className="panel setup-recommendations-panel" aria-labelledby="buckets-title">
          <div className="panel-heading">
            <div>
              <h2 id="buckets-title">Recommended LifeMap</h2>
              <span>
                {activeBuckets.length > 0
                  ? "Created from your setup."
                  : "Preview your buckets, then create them."}
              </span>
            </div>
            <StatusCount label={activeCountLabel} />
          </div>

          {visibleBuckets.length > 0 ? (
            <div className="setup-bucket-list">
              {visibleBuckets.map((bucket) => (
                <BucketCard
                  bucket={bucket}
                  key={bucket.id}
                  onOpenCalendar={onOpenCalendar}
                  onOpenCapture={onOpenCapture}
                  onOpenVault={onOpenVault}
                />
              ))}
            </div>
          ) : (
            <div className="setup-empty-state">
              <ShieldCheck size={22} />
              <strong>Choose a few real-life loops.</strong>
              <span>
                Kids, pets, travel, school, health, records, meals, and money
                each unlock a cleaner starting map.
              </span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function BucketCard({
  bucket,
  onOpenCalendar,
  onOpenCapture,
  onOpenVault,
}: {
  bucket: RecommendedBucket;
  onOpenCalendar: () => void;
  onOpenCapture: () => void;
  onOpenVault: () => void;
}) {
  const Icon = getBucketIcon(bucket.id);
  const openDestination =
    bucket.destination === "calendar"
      ? onOpenCalendar
      : bucket.destination === "capture"
        ? onOpenCapture
        : onOpenVault;

  return (
    <article className={`setup-bucket-card tone-${bucket.tone}`}>
      <div className="setup-bucket-icon">
        <Icon size={18} />
      </div>
      <div>
        <h3>{bucket.label}</h3>
        <p>{bucket.reason}</p>
        <small>{bucket.nextAction}</small>
      </div>
      <button type="button" onClick={openDestination}>
        Open
        <ChevronRight size={14} />
      </button>
    </article>
  );
}

function StatusCount({ label }: { label: string }) {
  return (
    <span className="setup-count-pill">
      <CheckCircle2 size={14} />
      {label}
    </span>
  );
}

function getBucketIcon(bucketId: SetupBucketId) {
  switch (bucketId) {
    case "family-profiles":
      return UsersRound;
    case "school-command":
      return CalendarDays;
    case "pet-care":
    case "health-loop":
      return HeartPulse;
    case "travel-command":
      return Plane;
    case "home-admin":
      return Home;
    case "vault-records":
      return Archive;
    case "meal-loop":
    case "money-admin":
      return Inbox;
  }
}

export default GuidedSetupView;
