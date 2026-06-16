import { describe, expect, test } from "vitest";
import { sampleCollections } from "./sampleData";
import {
  familyEvents,
  familyMembers,
  recurringCareItems,
  vaultItems,
} from "./familyOS";

describe("sampleCollections", () => {
  test("demo mode returns the familyOS sample constants plus household areas", () => {
    const samples = sampleCollections(true);
    expect(samples.familyMembers).toEqual(familyMembers);
    expect(samples.familyEvents).toEqual(familyEvents);
    expect(samples.vaultItems).toEqual(vaultItems);
    expect(samples.recurringCareItems).toEqual(recurringCareItems);
    expect(samples.householdAreas).toEqual([
      { label: "School", count: 4 },
      { label: "Medical", count: 3 },
      { label: "Bills", count: 2 },
      { label: "Travel", count: 1 },
    ]);
  });

  test("real mode returns empty collections", () => {
    const samples = sampleCollections(false);
    expect(samples.familyMembers).toEqual([]);
    expect(samples.familyEvents).toEqual([]);
    expect(samples.vaultItems).toEqual([]);
    expect(samples.recurringCareItems).toEqual([]);
    expect(samples.householdAreas).toEqual([]);
  });
});
