import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import VaultView from "./VaultView";
import {
  familyMembers,
  vaultItems,
  type FamilyMember,
  type VaultItem,
} from "./familyOS";

const handlers = {
  onOpenCapture: vi.fn(),
  onAddDocument: vi.fn(),
};

const kids: FamilyMember[] = [
  {
    id: "emma",
    name: "Emma",
    role: "Grade 3",
    initials: "E",
    profileType: "child",
    details: [],
    careNotes: [],
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Grade 5",
    initials: "J",
    profileType: "child",
    details: [],
    careNotes: [],
  },
];

describe("VaultView de-demo", () => {
  test("a real viewer sees no demo people and gets empty states", () => {
    render(
      <VaultView
        familyMembers={[]}
        identity={{ name: "m.haslim", initials: "MH" }}
        vaultItems={[]}
        {...handlers}
      />,
    );

    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(screen.queryByText(/MCV4 vaccine record due for camp/i)).toBeNull();
    expect(screen.queryByText(/Rabies booster due this month/i)).toBeNull();
    expect(screen.getByText(/No family profiles yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Emergency basics appear once you add family profiles/i),
    ).toBeInTheDocument();
  });

  test("demo mode still renders the sample family and emergency contact", () => {
    render(
      <VaultView
        familyMembers={familyMembers}
        identity={{ name: "Alex Kim", initials: "AK" }}
        vaultItems={vaultItems}
        {...handlers}
      />,
    );

    expect(screen.getAllByText("Alex Kim").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/MCV4 vaccine record due for camp/i),
    ).toBeInTheDocument();
  });
});

describe("VaultView add-document flow", () => {
  test("tap a doc type, fill, save emits the correct VaultItem", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    // Top affordance → doc-type grid → Passport tile.
    await user.click(screen.getByRole("button", { name: /^Add document$/i }));
    await user.click(screen.getByRole("button", { name: /Add a passport/i }));

    // Title prefilled from the type's defaultTitle.
    expect(screen.getByLabelText("What is it?")).toHaveValue("Passport");

    await user.selectOptions(screen.getByLabelText("Who is it for?"), "Emma");
    await user.type(screen.getByLabelText("Expiry (optional)"), "2030-01-01");

    await user.click(screen.getByRole("button", { name: "Save document" }));

    expect(onAddDocument).toHaveBeenCalledTimes(1);
    const saved = onAddDocument.mock.calls[0][0] as VaultItem;
    expect(saved).toMatchObject({
      title: "Passport",
      category: "identity",
      owner: "Emma",
      status: "Current",
      renewalDate: "2030-01-01",
    });
    expect(saved.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("per-profile Add document pre-selects that member as owner", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    // Expand Emma's profile, use its inline Add document.
    await user.click(screen.getByRole("button", { name: /Emma Grade 3/ }));
    const inlineAdds = screen.getAllByRole("button", {
      name: /^Add document$/i,
    });
    // The inline one is the per-profile button (after the top affordance).
    await user.click(inlineAdds[inlineAdds.length - 1]);
    await user.click(
      screen.getByRole("button", { name: /Add a school form/i }),
    );

    // Owner pre-selected to Emma.
    expect(screen.getByLabelText("Who is it for?")).toHaveValue("Emma");

    await user.click(screen.getByRole("button", { name: "Save document" }));

    const saved = onAddDocument.mock.calls[0][0] as VaultItem;
    expect(saved).toMatchObject({
      title: "School form",
      category: "school",
      owner: "Emma",
    });
  });

  test("generic add auto-guesses the category from the title", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Add document$/i }));
    await user.click(screen.getByRole("button", { name: /Add a other/i }));

    const title = screen.getByLabelText("What is it?");
    await user.clear(title);
    await user.type(title, "School enrollment form");
    await user.selectOptions(screen.getByLabelText("Who is it for?"), "Emma");
    await user.click(screen.getByRole("button", { name: "Save document" }));

    expect(onAddDocument.mock.calls[0][0]).toMatchObject({
      title: "School enrollment form",
      category: "school",
      owner: "Emma",
    });
  });

  test("a manual category pick overrides the auto-guess", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Add document$/i }));
    await user.click(screen.getByRole("button", { name: /Add a other/i }));

    const dialog = screen.getByRole("dialog");
    const title = screen.getByLabelText("What is it?");
    await user.clear(title);
    await user.type(title, "passport"); // would auto-guess identity
    await user.click(within(dialog).getByRole("button", { name: "Health" }));
    await user.selectOptions(screen.getByLabelText("Who is it for?"), "Emma");
    await user.click(screen.getByRole("button", { name: "Save document" }));

    expect(onAddDocument.mock.calls[0][0]).toMatchObject({
      category: "health",
    });
  });

  test("grouping shows only that owner's documents under their profile", async () => {
    const user = userEvent.setup();
    const items: VaultItem[] = [
      {
        id: "v1",
        title: "Emma passport",
        category: "identity",
        owner: "Emma",
        status: "Current",
        detail: "",
      },
      {
        id: "v2",
        title: "Jordan passport",
        category: "identity",
        owner: "Jordan",
        status: "Current",
        detail: "",
      },
    ];

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={items}
        onOpenCapture={vi.fn()}
        onAddDocument={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Emma Grade 3/ }));
    const emmaDetail = screen
      .getAllByRole("button", { name: /Open details for Emma passport/i })
      .map((el) => el.closest(".notebook-member-docs"))
      .find((el): el is HTMLElement => el !== null) as HTMLElement;
    expect(within(emmaDetail).queryByText("Jordan passport")).toBeNull();
    expect(within(emmaDetail).getByText("Emma passport")).toBeInTheDocument();
  });

  test("documents are grouped by person with readable category and status", () => {
    const items: VaultItem[] = [
      {
        id: "v1",
        title: "Emma passport",
        category: "identity",
        owner: "Emma",
        status: "Current",
        detail: "",
      },
      {
        id: "v2",
        title: "Family insurance card",
        category: "insurance",
        owner: "Whole family",
        status: "Needs update",
        detail: "",
      },
    ];

    render(
      <VaultView
        familyMembers={kids}
        identity={{ name: "Mom", initials: "M" }}
        vaultItems={items}
        onOpenCapture={vi.fn()}
        onAddDocument={vi.fn()}
      />,
    );

    const emmaGroup = screen
      .getByRole("heading", { name: "Emma" })
      .closest(".vault-owner-group");
    const familyGroup = screen
      .getByRole("heading", { name: "Whole family" })
      .closest(".vault-owner-group");

    expect(emmaGroup).not.toBeNull();
    expect(familyGroup).not.toBeNull();
    expect(within(emmaGroup as HTMLElement).getByText("Emma passport")).toBeInTheDocument();
    expect(within(emmaGroup as HTMLElement).getByText("IDs")).toBeInTheDocument();
    expect(within(emmaGroup as HTMLElement).getByText("Current")).toBeInTheDocument();
    expect(
      within(familyGroup as HTMLElement).getByText("Family insurance card"),
    ).toBeInTheDocument();
    expect(
      within(familyGroup as HTMLElement).getByText("Needs update"),
    ).toBeInTheDocument();
  });
});
