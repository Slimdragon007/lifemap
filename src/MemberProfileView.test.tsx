import { render, screen } from "@testing-library/react";
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
  details: [],
  careNotes: [],
};

function renderProfile() {
  const onAddDocument = vi.fn();
  const onAddDate = vi.fn();
  render(
    <MemberProfileView
      member={member}
      vaultItems={[]}
      familyEvents={[]}
      onBack={vi.fn()}
      onAddDocument={onAddDocument}
      onAddDate={onAddDate}
    />,
  );
  return { onAddDate, onAddDocument };
}

describe("MemberProfileView category actions", () => {
  test("creates health document and vaccine records from the profile", async () => {
    const user = userEvent.setup();
    const { onAddDocument } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Documents" }));
    await user.click(screen.getByRole("button", { name: "Vaccines" }));

    expect(onAddDocument).toHaveBeenNthCalledWith(1, "medical");
    expect(onAddDocument).toHaveBeenNthCalledWith(2, "vaccine");
  });

  test("creates school dates from the profile", async () => {
    const user = userEvent.setup();
    const { onAddDate } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Test day" }));
    await user.click(screen.getByRole("button", { name: "Important dates" }));

    expect(onAddDate).toHaveBeenNthCalledWith(1, "school");
    expect(onAddDate).toHaveBeenNthCalledWith(2, "custom");
  });

  test("keeps the profile focused on requested categories", () => {
    renderProfile();

    expect(screen.getByText("Profile shelf")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("School")).toBeInTheDocument();
    expect(screen.queryByText("Quick add")).not.toBeInTheDocument();
  });
});
