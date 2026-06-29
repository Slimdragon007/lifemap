import { describe, expect, test } from "vitest";
import type { FamilyMember } from "./familyOS";
import {
  addProfileField,
  addProfileSection,
  defaultProfileSections,
  profileFieldsForMember,
  profileSectionsForMember,
} from "./profileSections";

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: "casey",
    name: "Casey Kim",
    role: "Grade 4",
    initials: "CK",
    profileType: "child",
    details: [],
    careNotes: [],
    ...overrides,
  };
}

describe("profile sections", () => {
  test("returns default child sections", () => {
    expect(defaultProfileSections(makeMember()).map((section) => section.name)).toEqual([
      "Health",
      "School",
      "Documents",
      "Important dates",
      "Activities",
    ]);
  });

  test("returns default adult sections", () => {
    expect(
      defaultProfileSections(makeMember({ profileType: "adult" })).map(
        (section) => section.name,
      ),
    ).toEqual(["IDs", "Insurance", "Health", "Travel", "Household"]);
  });

  test("returns default pet sections", () => {
    expect(
      defaultProfileSections(makeMember({ profileType: "pet" })).map(
        (section) => section.name,
      ),
    ).toEqual(["Vet", "Vaccines", "Insurance", "Care", "Documents"]);
  });

  test("adds a custom section as member detail metadata", () => {
    const member = makeMember();
    const updated = addProfileSection(member, "Summer camp");

    expect(updated).not.toBe(member);
    expect(member.details).toEqual([]);
    expect(updated.details).toEqual([
      expect.objectContaining({
        detailType: "section",
        label: "Summer camp",
        value: "Summer camp",
      }),
    ]);
    const sections = profileSectionsForMember(updated);
    expect(sections[sections.length - 1]).toEqual(
      expect.objectContaining({
        name: "Summer camp",
        kind: "custom",
        custom: true,
      }),
    );
  });

  test("adds a custom field under a profile section", () => {
    const member = makeMember();
    const updated = addProfileField(member, {
      sectionId: "health",
      label: "Allergy",
      value: "Peanuts",
      private: true,
    });

    expect(updated).not.toBe(member);
    expect(member.details).toEqual([]);
    expect(updated.details).toEqual([
      expect.objectContaining({
        detailType: "field",
        sectionId: "health",
        label: "Allergy",
        value: "Peanuts",
        private: true,
      }),
    ]);
    expect(profileFieldsForMember(updated)).toEqual([
      expect.objectContaining({
        sectionId: "health",
        label: "Allergy",
        value: "Peanuts",
        private: true,
      }),
    ]);
  });

  test("maps legacy school details to the school section", () => {
    const member = makeMember({
      details: [{ label: "Teacher", value: "Ms. Rivera" }],
    });

    expect(profileFieldsForMember(member)).toEqual([
      expect.objectContaining({
        sectionId: "school",
        label: "Teacher",
        value: "Ms. Rivera",
        private: false,
      }),
    ]);
  });

  test("maps adult legacy insurance details to the insurance section", () => {
    const member = makeMember({
      profileType: "adult",
      details: [{ label: "Insurance", value: "BlueCross family plan" }],
    });

    expect(profileFieldsForMember(member)).toEqual([
      expect.objectContaining({
        sectionId: "insurance",
        label: "Insurance",
        value: "BlueCross family plan",
      }),
    ]);
  });

  test("maps pet legacy care details to the vet section", () => {
    const member = makeMember({
      profileType: "pet",
      details: [
        { label: "Vet", value: "Desert Paws Veterinary" },
        { label: "Microchip", value: "982-000-411-903" },
        { label: "Rabies", value: "Booster due this month" },
        { label: "Food", value: "Sensitive stomach salmon kibble" },
      ],
    });

    expect(
      profileFieldsForMember(member).map((field) => field.sectionId),
    ).toEqual(["vet", "vet", "vet", "vet"]);
  });

  test("maps legacy travel details to the travel section", () => {
    const member = makeMember({
      profileType: "adult",
      details: [
        { label: "Passport", value: "Expires soon" },
        { label: "TSA PreCheck", value: "Known traveler saved" },
        { label: "Travel notes", value: "Hotel rewards number" },
      ],
    });

    expect(
      profileFieldsForMember(member).map((field) => field.sectionId),
    ).toEqual(["travel", "travel", "travel"]);
  });

  test("creates fallback IDs when crypto.randomUUID is unavailable", () => {
    const originalRandomUUID = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      const member = makeMember();
      const withSection = addProfileSection(member, "Summer camp");
      const withField = addProfileField(member, {
        sectionId: "health",
        label: "Allergy",
        value: "Peanuts",
      });

      expect(withSection.details[0].id).toMatch(/^section-/);
      expect(withField.details[0].id).toMatch(/^field-/);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        configurable: true,
        value: originalRandomUUID,
      });
    }
  });

  test("does not leak mutations from returned section or field projections", () => {
    const member = makeMember({
      details: [
        {
          id: "therapy",
          label: "Therapy",
          value: "Therapy",
          detailType: "section",
        },
        {
          id: "teacher",
          label: "Teacher",
          value: "Ms. Rivera",
          detailType: "field",
          sectionId: "school",
        },
      ],
    });

    const defaultSections = defaultProfileSections(member);
    defaultSections[0].name = "Changed";
    defaultSections.pop();

    expect(defaultProfileSections(member).map((section) => section.name)).toEqual([
      "Health",
      "School",
      "Documents",
      "Important dates",
      "Activities",
    ]);

    const memberSections = profileSectionsForMember(member);
    memberSections[0].name = "Changed";
    memberSections.pop();

    expect(profileSectionsForMember(member).map((section) => section.name)).toEqual([
      "Health",
      "School",
      "Documents",
      "Important dates",
      "Activities",
      "Therapy",
    ]);

    const memberFields = profileFieldsForMember(member);
    memberFields[0].label = "Changed";
    memberFields.pop();

    expect(profileFieldsForMember(member)).toEqual([
      expect.objectContaining({
        id: "teacher",
        label: "Teacher",
        sectionId: "school",
        value: "Ms. Rivera",
      }),
    ]);
    expect(member.details).toEqual([
      {
        id: "therapy",
        label: "Therapy",
        value: "Therapy",
        detailType: "section",
      },
      {
        id: "teacher",
        label: "Teacher",
        value: "Ms. Rivera",
        detailType: "field",
        sectionId: "school",
      },
    ]);
  });

  test("gives duplicate imported custom sections unique fallback IDs", () => {
    const member = makeMember({
      details: [
        { label: "Therapy", value: "Therapy", detailType: "section" },
        { label: "Therapy", value: "Therapy", detailType: "section" },
      ],
    });

    const customSectionIds = profileSectionsForMember(member)
      .filter((section) => section.custom)
      .map((section) => section.id);

    expect(customSectionIds).toHaveLength(2);
    expect(new Set(customSectionIds).size).toBe(2);
  });

  test("uniquifies duplicate explicit custom section IDs after the first use", () => {
    const member = makeMember({
      details: [
        {
          id: "therapy",
          label: "Therapy",
          value: "Therapy",
          detailType: "section",
        },
        {
          id: "therapy",
          label: "Therapy",
          value: "Therapy",
          detailType: "section",
        },
      ],
    });

    const customSectionIds = profileSectionsForMember(member)
      .filter((section) => section.custom)
      .map((section) => section.id);

    expect(customSectionIds).toHaveLength(2);
    expect(customSectionIds[0]).toBe("therapy");
    expect(new Set(customSectionIds).size).toBe(2);
  });
});
