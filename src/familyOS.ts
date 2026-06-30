import type { LifeMapAnalysis } from "./lifemap";

export type FamilyMemberDetail = {
  id?: string;
  label: string;
  value: string;
  detailType?: "field" | "section";
  sectionId?: string;
  order?: number;
  private?: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  profileType: "adult" | "child" | "pet";
  details: FamilyMemberDetail[];
  careNotes: string[];
};

export type CalendarLayer =
  "school" | "health" | "pets" | "travel" | "meals" | "admin";

// Persisted on family_events.event_category; 'generic' = default for pre-existing rows.
export type DateCategory =
  | "birthday"
  | "anniversary"
  | "renewal"
  | "appointment"
  | "school"
  | "bill"
  | "custom";

export type FamilyEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  layer: CalendarLayer;
  owner: string;
  source: string;
  needsPrep?: string;
  // Important Dates extras (additive; absent on legacy/AI/demo rows).
  eventCategory?: DateCategory;
  isAnnual?: boolean;
};

export type VaultCategory =
  "identity" | "insurance" | "health" | "school" | "pet" | "travel";

export type VaultItemFile = {
  id: string;
  vaultItemId: string;
  bucketId: "lifemap-documents";
  objectPath: string;
  encryptionVersion: "file-v1";
  encryptionIv: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  encryptedByteSize: number;
};

export type VaultItem = {
  id: string;
  title: string;
  category: VaultCategory;
  owner: string;
  status: "Current" | "Needs update" | "Expires soon";
  detail: string;
  renewalDate?: string;
  linkedEventId?: string;
  files?: VaultItemFile[];
};

export type RecurringCareItem = {
  id: string;
  title: string;
  cadence: string;
  owner: string;
  nextDue: string;
  category: "medication" | "vaccine" | "school" | "meal" | "document";
};

export const familyMembers: FamilyMember[] = [
  {
    id: "alex",
    name: "Alex Kim",
    role: "Parent",
    initials: "AK",
    profileType: "adult",
    details: [
      { label: "Primary role", value: "School forms and appointments" },
      { label: "Emergency contact", value: "(555) 010-1172" },
      { label: "Insurance", value: "BlueCross family plan" },
    ],
    careNotes: ["Can approve school and medical releases"],
  },
  {
    id: "casey",
    name: "Casey Kim",
    role: "Grade 4",
    initials: "CK",
    profileType: "child",
    details: [
      { label: "School", value: "Westview Elementary" },
      { label: "Teacher", value: "Ms. Rivera" },
      { label: "Medication", value: "Cetirizine, as needed" },
      { label: "Allergy", value: "Peanuts" },
    ],
    careNotes: [
      "MCV4 vaccine record due for camp",
      "Lunch account refill threshold: $12",
    ],
  },
  {
    id: "milo",
    name: "Milo",
    role: "Dog",
    initials: "MI",
    profileType: "pet",
    details: [
      { label: "Vet", value: "Desert Paws Veterinary" },
      { label: "Microchip", value: "982-000-411-903" },
      { label: "Food", value: "Sensitive stomach salmon kibble" },
    ],
    careNotes: [
      "Rabies booster due this month",
      "Boarding requires vaccine PDF",
    ],
  },
];

export const calendarLayers: Array<{ id: CalendarLayer; label: string }> = [
  { id: "school", label: "School" },
  { id: "health", label: "Health" },
  { id: "pets", label: "Pets" },
  { id: "travel", label: "Travel" },
  { id: "meals", label: "Meals" },
  { id: "admin", label: "Admin" },
];

export const familyEvents: FamilyEvent[] = [
  {
    id: "event-field-trip",
    title: "Field trip permission slip due",
    date: "2026-06-18",
    time: "8:00 AM",
    layer: "school",
    owner: "Casey",
    source: "Westview portal screenshot",
    needsPrep: "Signature, emergency contact, $12 fee",
  },
  {
    id: "event-peds",
    title: "Send updated immunization record",
    date: "2026-06-10",
    time: "5:00 PM",
    layer: "health",
    owner: "Casey",
    source: "Westview Pediatrics email",
    needsPrep: "MCV4 vaccine date and PDF record",
  },
  {
    id: "event-lunch",
    title: "Pack lunch: no peanut day",
    date: "2026-06-12",
    time: "7:15 AM",
    layer: "meals",
    owner: "Casey",
    source: "School lunch schedule",
  },
  {
    id: "event-rabies",
    title: "Milo rabies booster",
    date: "2026-06-20",
    time: "3:30 PM",
    layer: "pets",
    owner: "Milo",
    source: "Vet reminder",
    needsPrep: "Bring vaccine booklet",
  },
  {
    id: "event-passport",
    title: "Passport renewal appointment",
    date: "2026-07-12",
    time: "10:30 AM",
    layer: "travel",
    owner: "Jordan",
    source: "Passport checklist",
    needsPrep: "DS-11, photo, birth certificate, IDs",
  },
  {
    id: "event-insurance",
    title: "Upload dental insurance group number",
    date: "2026-07-02",
    time: "9:00 AM",
    layer: "admin",
    owner: "Alex",
    source: "Bright Smiles billing email",
    needsPrep: "Insurance card photo",
  },
  // Important Dates demo seeds — fixed dates so the view + Today "Upcoming"
  // render non-empty AND deterministic under the frozen visual-test clock
  // (2026-06-23 → "in 7 days" / "in 12 days").
  {
    id: "event-casey-birthday",
    title: "Casey's birthday",
    date: "2026-06-30",
    time: "",
    layer: "admin",
    owner: "Casey",
    source: "important-dates",
    eventCategory: "birthday",
    isAnnual: true,
  },
  {
    id: "event-passport-renewal",
    title: "Passport renewal due",
    date: "2026-07-05",
    time: "",
    layer: "admin",
    owner: "Jordan",
    source: "important-dates",
    eventCategory: "renewal",
    isAnnual: false,
  },
];

export const vaultItems: VaultItem[] = [
  {
    id: "vault-insurance",
    title: "Health insurance card",
    category: "insurance",
    owner: "Family",
    status: "Current",
    detail: "BlueCross PPO, group number saved",
    renewalDate: "2026-12-31",
  },
  {
    id: "vault-casey-passport",
    title: "Casey passport",
    category: "identity",
    owner: "Casey",
    status: "Expires soon",
    detail: "Renewal packet started",
    renewalDate: "2026-08-14",
    linkedEventId: "event-passport",
  },
  {
    id: "vault-mcv4",
    title: "MCV4 immunization record",
    category: "health",
    owner: "Casey",
    status: "Needs update",
    detail: "Waiting on updated PDF after vaccination",
    linkedEventId: "event-peds",
  },
  {
    id: "vault-school-lunch",
    title: "June lunch schedule",
    category: "school",
    owner: "Casey",
    status: "Current",
    detail: "No peanut day marked for Friday",
    linkedEventId: "event-lunch",
  },
  {
    id: "vault-milo-rabies",
    title: "Rabies certificate",
    category: "pet",
    owner: "Milo",
    status: "Expires soon",
    detail: "Required for boarding",
    renewalDate: "2026-06-20",
    linkedEventId: "event-rabies",
  },
];

export const recurringCareItems: RecurringCareItem[] = [
  {
    id: "care-cetirizine",
    title: "Check Casey allergy meds",
    cadence: "Monthly",
    owner: "Alex",
    nextDue: "2026-06-15",
    category: "medication",
  },
  {
    id: "care-milo-flea",
    title: "Milo flea/tick medication",
    cadence: "Every 30 days",
    owner: "Jordan",
    nextDue: "2026-06-21",
    category: "medication",
  },
  {
    id: "care-lunch",
    title: "Review school lunch schedule",
    cadence: "Weekly",
    owner: "Alex",
    nextDue: "2026-06-16",
    category: "meal",
  },
  {
    id: "care-passports",
    title: "Check passport expirations",
    cadence: "Quarterly",
    owner: "Alex",
    nextDue: "2026-07-01",
    category: "document",
  },
];

export function buildCalendarEventsFromAnalysis(
  analysis: LifeMapAnalysis,
): FamilyEvent[] {
  return analysis.dueItems.map((item) => ({
    id: `ai-event-${item.id}`,
    title: item.title,
    date: parseDueDate(item.dueDate),
    time: "9:00 AM",
    layer: inferCalendarLayer(`${item.title} ${item.sourceQuote}`),
    owner: inferOwner(`${item.title} ${item.sourceQuote}`),
    source: "Current AI map",
    needsPrep: buildPrepNote(analysis),
  }));
}

function inferCalendarLayer(text: string): CalendarLayer {
  if (/school|teacher|field trip|permission|lunch|camp/i.test(text)) {
    return "school";
  }

  if (/medical|doctor|vaccine|immunization|dental|health|allergy/i.test(text)) {
    return "health";
  }

  if (/pet|vet|rabies|dog|cat|boarding/i.test(text)) {
    return "pets";
  }

  if (/passport|travel|flight|trip|hotel/i.test(text)) {
    return "travel";
  }

  if (/meal|lunch|dinner|snack|grocery/i.test(text)) {
    return "meals";
  }

  return "admin";
}

function inferOwner(text: string): string {
  if (/casey/i.test(text)) return "Casey";
  if (/milo/i.test(text)) return "Milo";
  if (/jordan/i.test(text)) return "Jordan";
  if (/alex/i.test(text)) return "Alex";
  return "Family";
}

export function inferVaultCategory(text: string): VaultCategory {
  if (/passport|license|birth certificate|id\b|ids\b/i.test(text)) {
    return "identity";
  }

  if (/insurance|claim|group number|policy/i.test(text)) {
    return "insurance";
  }

  if (
    /medical|doctor|dentist|dental|vaccine|vaccination|immuniz|health|allergy|prescription|record/i.test(
      text,
    )
  ) {
    return "health";
  }

  if (/pet|vet|rabies|dog|cat|boarding/i.test(text)) {
    return "pet";
  }

  if (/travel|flight|trip|hotel/i.test(text)) {
    return "travel";
  }

  return "school";
}

export function buildVaultItemsFromAnalysis(
  analysis: LifeMapAnalysis,
): VaultItem[] {
  return analysis.missingInfo.map((item) => ({
    id: `ai-vault-${item.id}`,
    title: item.label,
    category: inferVaultCategory(`${item.label} ${item.reason}`),
    owner: inferOwner(`${item.label} ${item.reason} ${item.sourceQuote}`),
    status: "Needs update",
    detail: item.reason,
  }));
}

function buildPrepNote(analysis: LifeMapAnalysis): string | undefined {
  const labels = analysis.missingInfo
    .slice(0, 2)
    .map((item) => item.label)
    .filter(Boolean);

  if (labels.length === 0) {
    return undefined;
  }

  return `Missing: ${labels.join(", ")}`;
}

function parseDueDate(value: string): string {
  const numeric = value.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const numericMonth = Number(numeric[1]);
    const numericDay = Number(numeric[2]);
    if (
      !Number.isInteger(numericMonth) ||
      !Number.isInteger(numericDay) ||
      numericMonth < 1 ||
      numericMonth > 12 ||
      numericDay < 1 ||
      numericDay > 31
    ) {
      return "undated";
    }

    const month = String(numericMonth).padStart(2, "0");
    const day = String(numericDay).padStart(2, "0");
    const year = normalizeYear(numeric[3]);
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(`${value} 12:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return "undated";
}

function normalizeYear(value?: string): string {
  if (!value) {
    return "2026";
  }

  if (value.length === 2) {
    return `20${value}`;
  }

  return value;
}
