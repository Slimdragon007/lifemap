import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HeartPulse,
  Home,
  Inbox,
  Plane,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type {
  RecommendedBucket,
  SetupBucketId,
  SetupProfile,
} from "./setupBuckets";

type BucketDetailViewProps = {
  bucket: RecommendedBucket;
  profile: SetupProfile;
  onBack: () => void;
  onOpenCalendar: () => void;
  onOpenCapture: () => void;
  onOpenVault: () => void;
};

const bucketChecklist: Record<SetupBucketId, string[]> = {
  "family-profiles": [
    "Emergency contacts",
    "School and care notes",
    "Medication basics",
    "Pickup permissions",
  ],
  "school-command": [
    "School calendars",
    "Permission slips",
    "Lunch schedules",
    "Teacher requests",
  ],
  "pet-care": [
    "Vaccine records",
    "Boarding rules",
    "Medication timing",
    "Vet contacts",
  ],
  "travel-command": [
    "Packing lists",
    "TSA and rewards numbers",
    "Flight confirmations",
    "Hotel and rental car notes",
  ],
  "vault-records": [
    "Passports and IDs",
    "Insurance cards",
    "Emergency cards",
    "Renewal dates",
  ],
  "health-loop": [
    "Medication updates",
    "Doctor appointments",
    "Vaccine records",
    "Pharmacy details",
  ],
  "home-admin": [
    "Bills and renewals",
    "Home repairs",
    "Subscriptions",
    "Recurring chores",
  ],
  "meal-loop": [
    "School lunches",
    "Allergies",
    "Grocery staples",
    "Weekly meals",
  ],
  "money-admin": [
    "Fees and deposits",
    "Reimbursements",
    "Insurance renewals",
    "Payment deadlines",
  ],
};

const bucketIcons: Record<SetupBucketId, typeof ShieldCheck> = {
  "family-profiles": UsersRound,
  "school-command": FileText,
  "pet-care": HeartPulse,
  "travel-command": Plane,
  "vault-records": ShieldCheck,
  "health-loop": HeartPulse,
  "home-admin": Home,
  "meal-loop": FileText,
  "money-admin": Archive,
};

function BucketDetailView({
  bucket,
  profile,
  onBack,
  onOpenCalendar,
  onOpenCapture,
  onOpenVault,
}: BucketDetailViewProps) {
  const Icon = bucketIcons[bucket.id];
  const destination = getDestination(bucket, {
    onOpenCalendar,
    onOpenCapture,
    onOpenVault,
  });
  const householdSummary = formatHouseholdSummary(profile);

  return (
    <section
      className="workspace bucket-detail-workspace"
      aria-labelledby="bucket-detail-title"
    >
      <header className="topbar bucket-detail-topbar">
        <div>
          <span className="workspace-kicker">
            <Sparkles size={14} />
            Personalized bucket
          </span>
          <h1 id="bucket-detail-title">{bucket.label}</h1>
          <p>{bucket.reason}</p>
          <span className="storage-note">{householdSummary}</span>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ChevronLeft size={16} />
          Back to Today
        </button>
      </header>

      <div className="bucket-detail-grid">
        <section className={`bucket-hero-panel tone-${bucket.tone}`}>
          <span className="bucket-hero-icon">
            <Icon size={24} />
          </span>
          <div>
            <span className="bucket-eyebrow">Recommended next action</span>
            <h2>{bucket.nextAction}</h2>
            <p>
              LifeMap keeps this as a focused surface so the app feels guided,
              not scattered.
            </p>
          </div>
          <button
            className="primary-button bucket-primary-action"
            type="button"
            onClick={destination.onOpen}
          >
            {destination.label}
            <ChevronRight size={16} />
          </button>
        </section>

        <section className="panel bucket-checklist-panel" aria-labelledby="bucket-checklist-title">
          <div className="panel-heading">
            <div>
              <h2 id="bucket-checklist-title">What belongs here</h2>
              <span>Keep the details hidden until they are useful.</span>
            </div>
            <CheckCircle2 size={18} />
          </div>
          <ul className="bucket-checklist">
            {bucketChecklist[bucket.id].map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel bucket-guidance-panel" aria-labelledby="bucket-guidance-title">
          <div className="panel-heading">
            <div>
              <h2 id="bucket-guidance-title">How to use it today</h2>
              <span>No new account setup required for this MVP.</span>
            </div>
            <Inbox size={18} />
          </div>
          <div className="bucket-guidance-list">
            <button type="button" onClick={onOpenCapture}>
              <Inbox size={17} />
              <span>Capture a messy note</span>
              <ChevronRight size={14} />
            </button>
            <button type="button" onClick={onOpenCalendar}>
              <CalendarDays size={17} />
              <span>Check timing and reminders</span>
              <ChevronRight size={14} />
            </button>
            <button type="button" onClick={onOpenVault}>
              <ShieldCheck size={17} />
              <span>Store reference details</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function getDestination(
  bucket: RecommendedBucket,
  actions: {
    onOpenCalendar: () => void;
    onOpenCapture: () => void;
    onOpenVault: () => void;
  },
) {
  if (bucket.destination === "calendar") {
    return {
      label: "Open Calendar",
      onOpen: actions.onOpenCalendar,
    };
  }

  if (bucket.destination === "capture") {
    return {
      label: "Open Capture",
      onOpen: actions.onOpenCapture,
    };
  }

  return {
    label: "Open Vault",
    onOpen: actions.onOpenVault,
  };
}

function formatHouseholdSummary(profile: SetupProfile) {
  const people = profile.adults + profile.children;
  const petCopy =
    profile.pets > 0
      ? `, ${profile.pets} ${profile.pets === 1 ? "pet" : "pets"}`
      : "";
  const travelCopy = profile.travels ? ", travel enabled" : "";

  return `${people} ${people === 1 ? "person" : "people"}${petCopy}${travelCopy}`;
}

export default BucketDetailView;
