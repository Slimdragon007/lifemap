export type SetupFocusArea =
  | "school"
  | "records"
  | "health"
  | "home"
  | "meals"
  | "money";

export type SetupProfile = {
  adults: number;
  children: number;
  pets: number;
  travels: boolean;
  focusAreas: SetupFocusArea[];
};

export type SetupBucketId =
  | "family-profiles"
  | "school-command"
  | "pet-care"
  | "travel-command"
  | "vault-records"
  | "health-loop"
  | "home-admin"
  | "meal-loop"
  | "money-admin";

export type RecommendedBucket = {
  id: SetupBucketId;
  label: string;
  reason: string;
  nextAction: string;
  destination: "vault" | "calendar" | "capture";
  tone: "blue" | "clay" | "plum" | "sage";
};

export const defaultSetupProfile: SetupProfile = {
  adults: 2,
  children: 0,
  pets: 0,
  travels: false,
  focusAreas: [],
};

export const setupFocusOptions: Array<{
  id: SetupFocusArea;
  label: string;
  description: string;
}> = [
  {
    id: "school",
    label: "School schedules and forms",
    description: "Forms, lunch, field trips, teacher notes, and pickups.",
  },
  {
    id: "records",
    label: "Passports, IDs, and insurance cards",
    description: "Documents, emergency cards, and renewal dates.",
  },
  {
    id: "health",
    label: "Medication, vaccines, and appointments",
    description: "Doctor visits, refills, pet vaccines, and prep notes.",
  },
  {
    id: "home",
    label: "Home admin and recurring chores",
    description: "Bills, repairs, subscriptions, and repeating household loops.",
  },
  {
    id: "meals",
    label: "Meals and lunches",
    description: "School lunches, groceries, allergies, and weekly meal plans.",
  },
  {
    id: "money",
    label: "Money and renewals",
    description: "Insurance, deposits, renewals, fees, and reimbursements.",
  },
];

const bucketOrder: SetupBucketId[] = [
  "family-profiles",
  "school-command",
  "vault-records",
  "health-loop",
  "pet-care",
  "travel-command",
  "meal-loop",
  "home-admin",
  "money-admin",
];

export function recommendSetupBuckets(profile: SetupProfile): RecommendedBucket[] {
  const normalized = normalizeSetupProfile(profile);
  const focus = new Set(normalized.focusAreas);
  const buckets = new Map<SetupBucketId, RecommendedBucket>();

  if (normalized.adults + normalized.children + normalized.pets > 0) {
    addBucket(buckets, {
      id: "family-profiles",
      label: "Family profiles",
      reason: "Keep each person's emergency notes, roles, school, health, and care context in one place.",
      nextAction: "Add the details you reach for when something is urgent.",
      destination: "vault",
      tone: "plum",
    });
  }

  if (normalized.children > 0 || focus.has("school")) {
    addBucket(buckets, {
      id: "school-command",
      label: "School command center",
      reason: "Kids create the fastest-moving loop: forms, lunches, schedules, pickups, and teacher asks.",
      nextAction: "Forward or paste the next school note into Capture.",
      destination: "calendar",
      tone: "blue",
    });
  }

  if (normalized.pets > 0) {
    addBucket(buckets, {
      id: "pet-care",
      label: "Pet care loop",
      reason: "Vaccines, boarding rules, medication, food, and vet records are recurring but easy to miss.",
      nextAction: "Save the next vaccine or boarding reminder.",
      destination: "vault",
      tone: "sage",
    });
  }

  if (normalized.travels) {
    addBucket(buckets, {
      id: "travel-command",
      label: "Travel command center",
      reason: "Trips pull together passports, TSA numbers, confirmations, packing lists, and rewards logins.",
      nextAction: "Paste a trip note or confirmation to build the travel checklist.",
      destination: "capture",
      tone: "blue",
    });
  }

  if (focus.has("records")) {
    addBucket(buckets, {
      id: "vault-records",
      label: "Cabinet: IDs and records",
      reason: "Passports, IDs, insurance cards, emergency cards, and renewal dates belong behind one trusted door.",
      nextAction: "Add the first card or document you always search for.",
      destination: "vault",
      tone: "clay",
    });
  }

  if (focus.has("health")) {
    addBucket(buckets, {
      id: "health-loop",
      label: "Health and medication loop",
      reason: "Appointments, medication, vaccines, and prep details need a visible next due date.",
      nextAction: "Capture the next doctor, dentist, or vet note.",
      destination: "calendar",
      tone: "sage",
    });
  }

  if (focus.has("meals")) {
    addBucket(buckets, {
      id: "meal-loop",
      label: "Meal and lunch loop",
      reason: "Lunch schedules, allergies, groceries, and weekly meals become calmer when they repeat visibly.",
      nextAction: "Add the next lunch schedule or grocery note.",
      destination: "calendar",
      tone: "clay",
    });
  }

  if (focus.has("home")) {
    addBucket(buckets, {
      id: "home-admin",
      label: "Home admin loop",
      reason: "Repairs, bills, subscriptions, and household tasks need owners and reminder timing.",
      nextAction: "Capture a bill, repair, or recurring home task.",
      destination: "capture",
      tone: "plum",
    });
  }

  if (focus.has("money")) {
    addBucket(buckets, {
      id: "money-admin",
      label: "Money and renewal loop",
      reason: "Fees, reimbursements, renewals, and deposits are less stressful when they have one review queue.",
      nextAction: "Capture the next deposit, renewal, or reimbursement.",
      destination: "capture",
      tone: "clay",
    });
  }

  return bucketOrder
    .map((id) => buckets.get(id))
    .filter((bucket): bucket is RecommendedBucket => Boolean(bucket));
}

export function normalizeSetupProfile(value: unknown): SetupProfile {
  if (!isRecord(value)) {
    return defaultSetupProfile;
  }

  return {
    adults: clampHouseholdNumber(value.adults, defaultSetupProfile.adults),
    children: clampHouseholdNumber(value.children, defaultSetupProfile.children),
    pets: clampHouseholdNumber(value.pets, defaultSetupProfile.pets),
    travels:
      typeof value.travels === "boolean"
        ? value.travels
        : defaultSetupProfile.travels,
    focusAreas: normalizeFocusAreas(value.focusAreas),
  };
}

export function normalizeSetupBucketIds(value: unknown): SetupBucketId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validIds = new Set(bucketOrder);
  return value.filter(
    (id, index, ids): id is SetupBucketId =>
      typeof id === "string" &&
      validIds.has(id as SetupBucketId) &&
      ids.indexOf(id) === index,
  );
}

function addBucket(
  buckets: Map<SetupBucketId, RecommendedBucket>,
  bucket: RecommendedBucket,
) {
  buckets.set(bucket.id, bucket);
}

function normalizeFocusAreas(value: unknown): SetupFocusArea[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const validIds = new Set(setupFocusOptions.map((option) => option.id));
  return value.filter(
    (id, index, ids): id is SetupFocusArea =>
      typeof id === "string" &&
      validIds.has(id as SetupFocusArea) &&
      ids.indexOf(id) === index,
  );
}

function clampHouseholdNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(12, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
