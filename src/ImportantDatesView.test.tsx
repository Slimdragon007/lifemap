import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import ImportantDatesView from "./ImportantDatesView";
import type { FamilyEvent, FamilyMember } from "./familyOS";

const members: FamilyMember[] = [
  {
    id: "m1",
    name: "Casey Kim",
    role: "Grade 4",
    initials: "CK",
    profileType: "child",
    details: [],
    careNotes: [],
  },
];

describe("ImportantDatesView", () => {
  test("tapping a category, filling the form, and saving emits a FamilyEvent", async () => {
    const user = userEvent.setup();
    const onSaveDate = vi.fn();

    render(
      <ImportantDatesView
        familyEvents={[]}
        familyMembers={members}
        onBack={vi.fn()}
        onSaveDate={onSaveDate}
        onDeleteDate={vi.fn()}
      />,
    );

    // Open the add modal from the Birthday tile.
    await user.click(
      screen.getByRole("button", { name: "Add a birthday date" }),
    );

    await user.type(screen.getByLabelText("What is it?"), "Casey's birthday");
    // type=date input takes an ISO value
    await user.type(screen.getByLabelText("Date"), "2026-06-30");
    await user.selectOptions(
      screen.getByLabelText("Who is it for?"),
      "Casey Kim",
    );

    await user.click(screen.getByRole("button", { name: "Save date" }));

    expect(onSaveDate).toHaveBeenCalledTimes(1);
    const saved = onSaveDate.mock.calls[0][0] as FamilyEvent;
    expect(saved).toMatchObject({
      title: "Casey's birthday",
      date: "2026-06-30",
      owner: "Casey Kim",
      layer: "admin",
      source: "important-dates",
      eventCategory: "birthday",
      isAnnual: true, // birthday defaults annual on
    });
    expect(saved.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("delete control calls onDeleteDate with the event id", async () => {
    const user = userEvent.setup();
    const onDeleteDate = vi.fn();
    const existing: FamilyEvent = {
      id: "evt-1",
      title: "Passport renewal",
      date: "2026-07-05",
      time: "",
      layer: "admin",
      owner: "Jordan",
      source: "important-dates",
      eventCategory: "renewal",
      isAnnual: false,
    };

    render(
      <ImportantDatesView
        familyEvents={[existing]}
        familyMembers={members}
        onBack={vi.fn()}
        onSaveDate={vi.fn()}
        onDeleteDate={onDeleteDate}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete Passport renewal" }),
    );
    expect(onDeleteDate).toHaveBeenCalledWith("evt-1");
  });
});
