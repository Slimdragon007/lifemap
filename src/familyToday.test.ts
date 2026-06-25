import { describe, expect, it } from "vitest";
import { memberAccent, memberStuff } from "./familyToday";
import type { FamilyEvent, FamilyMember, VaultItem } from "./familyOS";

const casey: FamilyMember = {
  id: "casey",
  name: "Casey Kim",
  role: "Grade 4",
  initials: "CK",
  profileType: "child",
  details: [],
  careNotes: [],
};

describe("memberAccent", () => {
  it("is stable for a given id", () => {
    expect(memberAccent("casey")).toBe(memberAccent("casey"));
  });

  it("returns a token from the palette", () => {
    expect(["blue", "plum", "sage", "amber", "clay"]).toContain(
      memberAccent("alex"),
    );
  });
});

describe("memberStuff", () => {
  const docs: VaultItem[] = [
    {
      id: "d1",
      title: "Passport",
      category: "identity",
      owner: "Casey Kim",
      status: "Current",
      detail: "",
    },
    {
      id: "d2",
      title: "Family policy",
      category: "insurance",
      owner: "Whole family",
      status: "Current",
      detail: "",
    },
  ];
  const events: FamilyEvent[] = [
    {
      id: "e1",
      title: "Dentist",
      date: "2099-01-01",
      time: "",
      layer: "admin",
      owner: "Casey Kim",
      source: "important-dates",
      eventCategory: "appointment",
    },
    {
      id: "e2",
      title: "Bin day",
      date: "2099-01-02",
      time: "",
      layer: "admin",
      owner: "Whole family",
      source: "important-dates",
      eventCategory: "custom",
    },
  ];

  it("returns only the member's documents", () => {
    const { documents } = memberStuff(
      casey,
      docs,
      events,
      new Date("2098-12-01"),
    );
    expect(documents.map((d) => d.id)).toEqual(["d1"]);
  });

  it("returns only the member's upcoming dates", () => {
    const { dates } = memberStuff(casey, docs, events, new Date("2098-12-01"));
    expect(dates.map((d) => d.event.id)).toEqual(["e1"]);
  });
});
