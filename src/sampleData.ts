import {
  familyEvents,
  familyMembers,
  recurringCareItems,
  vaultItems,
  type FamilyEvent,
  type FamilyMember,
  type RecurringCareItem,
  type VaultItem,
} from "./familyOS";

export type HouseholdArea = { label: string; count: number };

export type SampleCollections = {
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];
  vaultItems: VaultItem[];
  recurringCareItems: RecurringCareItem[];
  householdAreas: HouseholdArea[];
};

const demoHouseholdAreas: HouseholdArea[] = [
  { label: "School", count: 4 },
  { label: "Medical", count: 3 },
  { label: "Bills", count: 2 },
  { label: "Travel", count: 1 },
];

export function sampleCollections(demoMode: boolean): SampleCollections {
  if (!demoMode) {
    return {
      familyMembers: [],
      familyEvents: [],
      vaultItems: [],
      recurringCareItems: [],
      householdAreas: [],
    };
  }

  return {
    familyMembers,
    familyEvents,
    vaultItems,
    recurringCareItems,
    householdAreas: demoHouseholdAreas,
  };
}
