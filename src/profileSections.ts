import type { FamilyMember, FamilyMemberDetail } from "./familyOS";

export type ProfileSectionKind =
  | "health"
  | "school"
  | "documents"
  | "dates"
  | "activities"
  | "ids"
  | "insurance"
  | "travel"
  | "household"
  | "vet"
  | "vaccines"
  | "care"
  | "custom";

export type ProfileSection = {
  id: string;
  name: string;
  kind: ProfileSectionKind;
  order: number;
  custom?: boolean;
};

export type ProfileField = {
  id: string;
  sectionId: string;
  label: string;
  value: string;
  private: boolean;
};

type FieldInput = {
  id?: string;
  sectionId: string;
  label: string;
  value: string;
  private?: boolean;
};

const DEFAULT_SECTIONS: Record<FamilyMember["profileType"], ProfileSection[]> = {
  child: [
    { id: "health", name: "Health", kind: "health", order: 0 },
    { id: "school", name: "School", kind: "school", order: 1 },
    { id: "documents", name: "Documents", kind: "documents", order: 2 },
    { id: "dates", name: "Important dates", kind: "dates", order: 3 },
    { id: "activities", name: "Activities", kind: "activities", order: 4 },
  ],
  adult: [
    { id: "ids", name: "IDs", kind: "ids", order: 0 },
    { id: "insurance", name: "Insurance", kind: "insurance", order: 1 },
    { id: "health", name: "Health", kind: "health", order: 2 },
    { id: "travel", name: "Travel", kind: "travel", order: 3 },
    { id: "household", name: "Household", kind: "household", order: 4 },
  ],
  pet: [
    { id: "vet", name: "Vet", kind: "vet", order: 0 },
    { id: "vaccines", name: "Vaccines", kind: "vaccines", order: 1 },
    { id: "insurance", name: "Insurance", kind: "insurance", order: 2 },
    { id: "care", name: "Care", kind: "care", order: 3 },
    { id: "documents", name: "Documents", kind: "documents", order: 4 },
  ],
};

export function defaultProfileSections(member: FamilyMember): ProfileSection[] {
  return DEFAULT_SECTIONS[member.profileType].map((section) => ({ ...section }));
}

export function profileSectionsForMember(member: FamilyMember): ProfileSection[] {
  const defaults = defaultProfileSections(member);
  const usedSectionIds = new Set(defaults.map((section) => section.id));
  const customSections = member.details
    .map((detail, index) => ({ detail, index }))
    .filter(({ detail }) => detail.detailType === "section")
    .map(({ detail, index }) => {
      const name = detail.value.trim() || detail.label.trim() || "Custom section";
      const baseId = detail.id ?? indexedSlugId(name, index);
      return {
        id: uniqueSectionId(baseId, index, usedSectionIds),
        name,
        kind: "custom" as const,
        order: detail.order ?? defaults.length + index,
        custom: true,
      };
    });

  return [...defaults, ...customSections].sort((a, b) => a.order - b.order);
}

export function profileFieldsForMember(member: FamilyMember): ProfileField[] {
  return member.details
    .map((detail, index) => ({ detail, index }))
    .filter(({ detail }) => detail.detailType !== "section")
    .sort((a, b) => detailOrder(a.detail, a.index) - detailOrder(b.detail, b.index))
    .map(({ detail, index }) => ({
      id: detail.id ?? `${member.id}-detail-${index}`,
      sectionId: detail.sectionId ?? inferSectionId(member, detail),
      label: detail.label,
      value: detail.value,
      private: detail.private ?? false,
    }));
}

export function addProfileSection(
  member: FamilyMember,
  name: string,
): FamilyMember {
  const sectionName = name.trim() || "Custom section";
  const detail: FamilyMemberDetail = {
    id: createId("section"),
    label: sectionName,
    value: sectionName,
    detailType: "section",
    order: profileSectionsForMember(member).length,
  };

  return {
    ...member,
    details: [...member.details, detail],
  };
}

export function addProfileField(
  member: FamilyMember,
  field: FieldInput,
): FamilyMember {
  const detail: FamilyMemberDetail = {
    id: field.id ?? createId("field"),
    label: field.label,
    value: field.value,
    detailType: "field",
    sectionId: field.sectionId,
    private: field.private ?? false,
    order: member.details.length,
  };

  return {
    ...member,
    details: [...member.details, detail],
  };
}

function detailOrder(detail: FamilyMemberDetail, index: number) {
  return detail.order ?? index;
}

function inferSectionId(
  member: FamilyMember,
  detail: FamilyMemberDetail,
): string {
  const text = `${detail.label} ${detail.value}`.toLowerCase();

  if (matches(text, ["teacher", "school", "grade", "test"])) {
    return "school";
  }

  if (
    member.profileType === "pet" &&
    matches(text, ["vet", "microchip", "rabies", "food"])
  ) {
    return "vet";
  }

  if (matches(text, ["insurance"])) {
    return "insurance";
  }

  if (matches(text, ["allergy", "medication", "doctor", "health"])) {
    return "health";
  }

  if (matches(text, ["passport", "tsa", "travel"])) {
    return "travel";
  }

  return member.profileType === "adult" ? "household" : "documents";
}

function matches(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function indexedSlugId(value: string, index: number) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "custom"}-${index}`;
}

function uniqueSectionId(baseId: string, index: number, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  const indexedId = `${baseId}-${index}`;
  if (!usedIds.has(indexedId)) {
    usedIds.add(indexedId);
    return indexedId;
  }

  let occurrence = 2;
  let nextId = `${indexedId}-${occurrence}`;
  while (usedIds.has(nextId)) {
    occurrence += 1;
    nextId = `${indexedId}-${occurrence}`;
  }

  usedIds.add(nextId);
  return nextId;
}
