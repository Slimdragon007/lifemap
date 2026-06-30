import { fireEvent, render, screen, within } from "@testing-library/react";
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
      <VaultView familyMembers={[]} vaultItems={[]} {...handlers} />,
    );

    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(screen.queryByText(/MCV4 vaccine record due for camp/i)).toBeNull();
    expect(screen.queryByText(/Rabies booster due this month/i)).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Cabinet" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search records")).toBeInTheDocument();
    expect(screen.queryByText("Family profiles")).toBeNull();
    expect(screen.queryByText("Emergency view")).toBeNull();
    expect(screen.getByText(/No records yet/i)).toBeInTheDocument();
  });

  test("demo mode renders sample records without the family roster", () => {
    render(
      <VaultView
        familyMembers={familyMembers}
        vaultItems={vaultItems}
        {...handlers}
      />,
    );

    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(
      screen.getByText(/MCV4 immunization record/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search records")).toBeInTheDocument();
  });
});

describe("VaultView add-document flow", () => {
  test("tap a doc type, fill, save emits the correct VaultItem", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
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
    const saved = onAddDocument.mock.calls[0][0].item as VaultItem;
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

  test("generic add auto-guesses the category from the title", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        familyMembers={kids}
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

    expect(onAddDocument.mock.calls[0][0].item).toMatchObject({
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

    expect(onAddDocument.mock.calls[0][0].item).toMatchObject({
      category: "health",
    });
  });

  test("real upload mode requires a supported file and passes it to save", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn(async () => true);

    render(
      <VaultView
        canUploadFiles
        familyMembers={kids}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Add document$/i }));
    await user.click(screen.getByRole("button", { name: /Add a passport/i }));
    await user.selectOptions(screen.getByLabelText("Who is it for?"), "Emma");

    expect(
      screen.getByText(/Files are encrypted in this browser before upload/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save document" })).toBeDisabled();

    const file = new File(["passport"], "passport.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("File"), file);
    await user.click(screen.getByRole("button", { name: "Save document" }));

    expect(onAddDocument).toHaveBeenCalledTimes(1);
    const saved = (onAddDocument.mock.calls[0] as unknown[])[0] as {
      file?: File;
      item: VaultItem;
    };
    expect(saved.file).toBe(file);
    expect(saved.item).toMatchObject({
      title: "passport",
      owner: "Emma",
    });
  });

  test("real upload mode rejects unsupported file types before save", async () => {
    const user = userEvent.setup();
    const onAddDocument = vi.fn();

    render(
      <VaultView
        canUploadFiles
        familyMembers={kids}
        vaultItems={[]}
        onOpenCapture={vi.fn()}
        onAddDocument={onAddDocument}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Add document$/i }));
    await user.click(screen.getByRole("button", { name: /Add a passport/i }));
    fireEvent.change(screen.getByLabelText("File"), {
      target: {
        files: [new File(["svg"], "icon.svg", { type: "image/svg+xml" })],
      },
    });

    expect(
      screen.getByText("Use a PDF, JPG, PNG, HEIC, or HEIF file."),
    ).toBeInTheDocument();
    expect(onAddDocument).not.toHaveBeenCalled();
  });

  test("search finds records by owner and hides non-matches", async () => {
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
        vaultItems={items}
        onOpenCapture={vi.fn()}
        onAddDocument={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Search records"), "Emma");

    expect(screen.getByText("Emma passport")).toBeInTheDocument();
    expect(screen.queryByText("Jordan passport")).toBeNull();
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
    expect(
      within(emmaGroup as HTMLElement).getByText("Emma passport"),
    ).toBeInTheDocument();
    expect(
      within(emmaGroup as HTMLElement).getByText("IDs"),
    ).toBeInTheDocument();
    expect(
      within(emmaGroup as HTMLElement).getByText("Current"),
    ).toBeInTheDocument();
    expect(
      within(familyGroup as HTMLElement).getByText("Family insurance card"),
    ).toBeInTheDocument();
    expect(
      within(familyGroup as HTMLElement).getByText("Needs update"),
    ).toBeInTheDocument();
  });

  test("detail dialog shows attached file metadata and open action", async () => {
    const user = userEvent.setup();
    const onOpenFile = vi.fn();
    const file = {
      id: "33333333-3333-4333-8333-333333333333",
      vaultItemId: "v1",
      bucketId: "lifemap-documents" as const,
      objectPath: "user/v1/file.bin",
      encryptionVersion: "file-v1" as const,
      encryptionIv: "iv",
      originalName: "passport.pdf",
      mimeType: "application/pdf",
      byteSize: 1024,
      encryptedByteSize: 1052,
    };

    render(
      <VaultView
        familyMembers={kids}
        vaultItems={[
          {
            id: "v1",
            title: "Emma passport",
            category: "identity",
            owner: "Emma",
            status: "Current",
            detail: "Hidden number",
            files: [file],
          },
        ]}
        onOpenCapture={vi.fn()}
        onAddDocument={vi.fn()}
        onOpenFile={onOpenFile}
      />,
    );

    expect(screen.getByText(/1 file attached/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Open details/i }));
    expect(screen.getByText("passport.pdf")).toBeInTheDocument();
    expect(screen.getByText(/application\/pdf · 1 KB/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open file" }));

    expect(onOpenFile).toHaveBeenCalledWith(file);
  });
});
