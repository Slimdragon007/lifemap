import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import MemberProfileView from "./MemberProfileView";
import type { FamilyMember } from "./familyOS";

const member: FamilyMember = {
  id: "casey",
  name: "Casey Kim",
  role: "Grade 4",
  initials: "CK",
  profileType: "child",
  details: [{ label: "Teacher", value: "Ms. Rivera" }],
  careNotes: [],
};

function renderProfile(profileMember: FamilyMember = member) {
  const onAddDocument = vi.fn();
  const onAddDate = vi.fn();
  const onUpdateMember = vi.fn(() => true);
  render(
    <MemberProfileView
      member={profileMember}
      vaultItems={[]}
      familyEvents={[]}
      onBack={vi.fn()}
      onAddDocument={onAddDocument}
      onAddDate={onAddDate}
      onUpdateMember={onUpdateMember}
    />,
  );
  return { onAddDate, onAddDocument, onUpdateMember };
}

describe("MemberProfileView profile sections", () => {
  test("renders default child sections and legacy school fields", () => {
    renderProfile();

    expect(screen.getByText("Profile shelf")).toBeInTheDocument();
    for (const sectionName of [
      "Health",
      "School",
      "Documents",
      "Important dates",
      "Activities",
    ]) {
      expect(
        screen.getByRole("region", { name: sectionName }),
      ).toBeInTheDocument();
    }

    const school = screen.getByRole("region", { name: "School" });
    expect(within(school).getByText("Teacher")).toBeInTheDocument();
    expect(within(school).getByText("Ms. Rivera")).toBeInTheDocument();
    expect(screen.queryByText("Quick add")).not.toBeInTheDocument();
  });

  test("adds a custom section to the member profile", async () => {
    const user = userEvent.setup();
    const { onUpdateMember } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(screen.getByLabelText("Section name"), "Therapy");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    expect(onUpdateMember).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({
            detailType: "section",
            value: "Therapy",
          }),
        ]),
      }),
    );
  });

  test("adds a private field inside a profile section", async () => {
    const user = userEvent.setup();
    const { onUpdateMember } = renderProfile();

    const health = screen.getByRole("region", { name: "Health" });
    await user.click(
      within(health).getByRole("button", { name: "Add field to Health" }),
    );
    await user.type(screen.getByLabelText("Field label"), "Allergy");
    await user.type(screen.getByLabelText("Field value"), "Peanuts");
    await user.click(screen.getByLabelText("Keep private until revealed"));
    await user.click(screen.getByRole("button", { name: "Save field" }));

    expect(onUpdateMember).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({
            detailType: "field",
            sectionId: "health",
            label: "Allergy",
            value: "Peanuts",
            private: true,
          }),
        ]),
      }),
    );
  });

  test("keeps section input visible when async save fails", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();
    const onAddDate = vi.fn();
    const onUpdateMember = vi.fn(async () => false);
    render(
      <MemberProfileView
        member={member}
        vaultItems={[]}
        familyEvents={[]}
        onBack={vi.fn()}
        onAddDocument={onAddDocument}
        onAddDate={onAddDate}
        onUpdateMember={onUpdateMember}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(screen.getByLabelText("Section name"), "Therapy");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    expect(onUpdateMember).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Section name")).toHaveValue("Therapy");
    expect(
      screen.getByRole("button", { name: "Save section" }),
    ).toBeInTheDocument();
  });

  test("disables section submit while saving and closes after success", async () => {
    const user = userEvent.setup();
    let resolveSave: (value: boolean) => void = () => {};
    const onAddDocument = vi.fn();
    const onAddDate = vi.fn();
    const onUpdateMember = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(
      <MemberProfileView
        member={member}
        vaultItems={[]}
        familyEvents={[]}
        onBack={vi.fn()}
        onAddDocument={onAddDocument}
        onAddDate={onAddDate}
        onUpdateMember={onUpdateMember}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(screen.getByLabelText("Section name"), "Therapy");

    const saveButton = screen.getByRole("button", { name: "Save section" });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();

    resolveSave(true);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Save section" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Section name")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add section" }),
    ).toBeInTheDocument();
  });

  test("keeps field input visible when async save fails and closes after success", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();
    const onAddDate = vi.fn();
    const onUpdateMember = vi.fn(async () => false);
    render(
      <MemberProfileView
        member={member}
        vaultItems={[]}
        familyEvents={[]}
        onBack={vi.fn()}
        onAddDocument={onAddDocument}
        onAddDate={onAddDate}
        onUpdateMember={onUpdateMember}
      />,
    );

    const health = screen.getByRole("region", { name: "Health" });
    await user.click(
      within(health).getByRole("button", { name: "Add field to Health" }),
    );
    await user.type(screen.getByLabelText("Field label"), "Allergy");
    await user.type(screen.getByLabelText("Field value"), "Peanuts");
    await user.click(screen.getByRole("button", { name: "Save field" }));

    expect(onUpdateMember).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Field label")).toHaveValue("Allergy");
    expect(screen.getByLabelText("Field value")).toHaveValue("Peanuts");

    onUpdateMember.mockResolvedValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Save field" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Save field" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Field label")).not.toBeInTheDocument();
  });

  test("does not save blank sections or fields", async () => {
    const user = userEvent.setup();
    const { onUpdateMember } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.click(screen.getByRole("button", { name: "Save section" }));

    const health = screen.getByRole("region", { name: "Health" });
    await user.click(
      within(health).getByRole("button", { name: "Add field to Health" }),
    );
    await user.type(screen.getByLabelText("Field label"), "Allergy");
    await user.click(screen.getByRole("button", { name: "Save field" }));

    expect(onUpdateMember).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Section name")).toBeInTheDocument();
    expect(screen.getByLabelText("Field label")).toHaveValue("Allergy");
  });

  test("keeps shortcuts for known profile sections", async () => {
    const user = userEvent.setup();
    const { onAddDate, onAddDocument } = renderProfile();

    const health = screen.getByRole("region", { name: "Health" });
    await user.click(
      within(health).getByRole("button", { name: "Add health document" }),
    );

    const school = screen.getByRole("region", { name: "School" });
    await user.click(
      within(school).getByRole("button", { name: "Add school date" }),
    );

    expect(onAddDocument).toHaveBeenCalledWith("medical");
    expect(onAddDate).toHaveBeenCalledWith("school");
  });

  test("keeps additional shortcuts for health, school, and travel", async () => {
    const user = userEvent.setup();
    const childResult = renderProfile();

    await user.click(
      within(screen.getByRole("region", { name: "School" })).getByRole(
        "button",
        { name: "Add school document" },
      ),
    );

    expect(childResult.onAddDocument).toHaveBeenCalledWith("school");

    cleanup();

    const adult: FamilyMember = {
      ...member,
      profileType: "adult",
      details: [],
    };
    const { onAddDate, onAddDocument } = renderProfile(adult);

    await user.click(
      within(screen.getByRole("region", { name: "Health" })).getByRole(
        "button",
        { name: "Add vaccine" },
      ),
    );
    await user.click(
      within(screen.getByRole("region", { name: "Travel" })).getByRole(
        "button",
        { name: "Add travel document" },
      ),
    );

    expect(onAddDocument).toHaveBeenNthCalledWith(1, "vaccine");
    expect(onAddDocument).toHaveBeenNthCalledWith(2, "travel");
    expect(onAddDate).not.toHaveBeenCalled();
  });

  test("keeps the existing empty state behavior", () => {
    renderProfile();

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });
});
