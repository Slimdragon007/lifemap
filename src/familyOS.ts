export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  profileType: "adult" | "child" | "pet";
  details: Array<{ label: string; value: string }>;
  careNotes: string[];
};

export type CalendarLayer =
  | "school"
  | "health"
  | "pets"
  | "travel"
  | "meals"
  | "admin";

export type FamilyEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  layer: CalendarLayer;
  owner: string;
  source: string;
  needsPrep?: string;
};

export type VaultCategory =
  | "identity"
  | "insurance"
  | "health"
  | "school"
  | "pet"
  | "travel";

export type VaultItem = {
  id: string;
  title: string;
  category: VaultCategory;
  owner: string;
  status: "Current" | "Needs update" | "Expires soon";
  detail: string;
  renewalDate?: string;
  linkedEventId?: string;
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
