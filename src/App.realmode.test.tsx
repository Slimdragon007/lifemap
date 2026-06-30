import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { LifeMapAnalysis } from "./lifemap";
import type { FamilyMember, VaultItem } from "./familyOS";

// Real-mode regression guard for the AI-vault-item Supabase persistence path.
//
// In real mode (`isSupabaseConfigured && session`), saving an AI-suggested vault
// item must route through `materializeSuggestions`, which derives the per-user
// field key, builds the vault candidate from the analysis, and persists it via
// `upsertVaultItem` (encrypted, RLS-scoped) before joining it into the in-memory
// collection. A merge silently dropped this branch; this test fails if it goes
// missing again.
//
// These module mocks are file-scoped (Vitest hoists/scopes vi.mock per test
// file), so the demo-mode suite in App.test.tsx is unaffected. We force
// `isSupabaseConfigured` true and provide an authenticated session, then drive
// App's real `saveSuggestions` -> real `materializeSuggestions` through a stubbed
// CalendarView so the only thing under test is the genuine persistence path.

const VAULT_SUGGESTION_ID = "ai-vault-missing-signature";

// Hoisted so these are available inside the hoisted vi.mock factories below.
const {
  aiAnalysis,
  caseyMember,
  fieldCrypto,
  ensureFieldCryptoMock,
  session,
  upsertFamilyMemberMock,
  upsertVaultItemMock,
} = vi.hoisted(() => {
  const aiAnalysis: LifeMapAnalysis = {
    dueItems: [
      {
        id: "due-slip",
        title: "Field trip permission slip",
        dueDate: "Jun 18, 2026",
        sourceQuote: "Return by 6/18.",
      },
    ],
    missingInfo: [
      {
        id: "missing-signature",
        label: "Parent signature",
        reason: "The school needs the signed form.",
        sourceQuote: "Please sign and return.",
      },
    ],
    waitingOn: [],
    nextActions: [],
    reminders: [],
    draftMessages: [],
    sourceEvidence: [],
  };
  const session = {
    access_token: "test-access-token",
    user: { id: "user-123", email: "alex@example.com" },
  } as unknown as Session;
  const caseyMember: FamilyMember = {
    id: "casey",
    name: "Casey Kim",
    role: "Grade 4",
    initials: "CK",
    profileType: "child",
    details: [{ label: "Teacher", value: "Ms. Rivera" }],
    careNotes: [],
  };
  const fieldCrypto = {
    encrypt: async (value: string) => value,
    decrypt: async (value: string) => value,
  };
  const ensureFieldCryptoMock = vi.fn(async () => fieldCrypto);
  const upsertFamilyMemberMock = vi.fn(
    async (_userId: string, member: FamilyMember) => ({
      ok: true as const,
      item: member,
    }),
  );
  // Spy we assert on: the real-mode persistence call.
  const upsertVaultItemMock = vi.fn(
    async (_userId: string, item: VaultItem) => ({
      ok: true as const,
      item: { ...item, id: "persisted-uuid" },
    }),
  );
  return {
    aiAnalysis,
    caseyMember,
    fieldCrypto,
    ensureFieldCryptoMock,
    session,
    upsertFamilyMemberMock,
    upsertVaultItemMock,
  };
});

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  getSupabase: vi.fn(() => ({})),
  getAccessToken: vi.fn(async () => "test-access-token"),
}));

vi.mock("./use-session", () => ({
  useSession: () => ({
    session,
    loading: false,
    recovering: false,
    clearRecovery: vi.fn(),
  }),
}));

vi.mock("./field-crypto", () => ({
  ensureFieldCrypto: ensureFieldCryptoMock,
  getFieldCrypto: vi.fn(() => ({
    encrypt: async (value: string) => value,
    decrypt: async (value: string) => value,
  })),
  clearFieldCrypto: vi.fn(),
}));

vi.mock("./remoteState", async () => {
  const actual =
    await vi.importActual<typeof import("./remoteState")>("./remoteState");
  return {
    ...actual,
    loadRemoteState: vi.fn(async () => ({
      ok: true as const,
      state: {
        isLoggedIn: true,
        intake: "stored school note",
        analysis: aiAnalysis,
      },
    })),
    saveRemoteState: vi.fn(async () => ({ ok: true as const })),
  };
});

vi.mock("./family-data", async () => {
  const actual =
    await vi.importActual<typeof import("./family-data")>("./family-data");
  return {
    ...actual,
    loadFamilyCollections: vi.fn(async () => ({
      ok: true as const,
      collections: {
        familyMembers: [caseyMember],
        familyEvents: [],
        vaultItems: [],
        recurringCareItems: [],
      },
    })),
    upsertFamilyMember: upsertFamilyMemberMock,
    upsertVaultItem: upsertVaultItemMock,
  };
});

// Stub CalendarView with a button that hands an AI vault-suggestion id to App's
// real onSaveSuggestions, so the genuine real-mode save path runs end to end
// without depending on any specific suggestion UI.
vi.mock("./CalendarView", () => ({
  default: ({
    onSaveSuggestions,
  }: {
    onSaveSuggestions: (ids: string[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSaveSuggestions([VAULT_SUGGESTION_ID])}
    >
      Save vault suggestion
    </button>
  ),
}));

import App from "./App";

describe("LifeMap real-mode AI-vault persistence", () => {
  afterEach(() => {
    ensureFieldCryptoMock.mockReset();
    ensureFieldCryptoMock.mockResolvedValue(fieldCrypto);
    upsertFamilyMemberMock.mockClear();
    upsertVaultItemMock.mockClear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test("persists an AI vault suggestion to Supabase via upsertVaultItem", async () => {
    const user = userEvent.setup();
    // Skip the first-run onboarding wizard so the main authenticated shell
    // renders directly (the wizard otherwise gates a brand-new signed-in user).
    localStorage.setItem("lifemap-onboarded", "1");

    render(<App />);

    // Authenticated real-mode shell renders (sign-out shows the session email).
    expect(
      await screen.findByRole("button", { name: "Sign out alex@example.com" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Drop a thought or file" }),
    );
    expect(
      await screen.findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Put on calendar/i }),
    );

    await user.click(
      screen.getByRole("button", { name: "Save vault suggestion" }),
    );

    // The restored ai-vault- branch must call the encrypted Supabase persist.
    await waitFor(() => {
      expect(upsertVaultItemMock).toHaveBeenCalledTimes(1);
    });

    const [userIdArg, itemArg] = upsertVaultItemMock.mock.calls[0];
    expect(userIdArg).toBe("user-123");
    expect(itemArg).toMatchObject({
      id: VAULT_SUGGESTION_ID,
      title: "Parent signature",
    });
  });

  test("does not persist private vault suggestions when field encryption is unavailable", async () => {
    const user = userEvent.setup();
    localStorage.setItem("lifemap-onboarded", "1");

    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Sign out alex@example.com" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Drop a thought or file" }),
    );
    expect(
      await screen.findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Put on calendar/i }),
    );

    ensureFieldCryptoMock.mockRejectedValueOnce(
      new Error(
        "LifeMap cannot save private details until encryption is available.",
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Save vault suggestion" }),
    );

    expect(
      await screen.findByText(
        "Couldn't save securely. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(upsertVaultItemMock).not.toHaveBeenCalled();
  });

  test("persists profile field edits through the real-mode family member upsert path", async () => {
    const user = userEvent.setup();
    localStorage.setItem("lifemap-onboarded", "1");

    render(<App />);

    expect(
      await screen.findByRole("button", { name: "Sign out alex@example.com" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Family" }));
    await user.click(
      await screen.findByRole("button", { name: "Open Casey Kim's profile" }),
    );

    const health = await screen.findByRole("region", { name: "Health" });
    await user.click(
      within(health).getByRole("button", { name: "Add field to Health" }),
    );
    await user.type(screen.getByLabelText("Field label"), "Allergy");
    await user.type(screen.getByLabelText("Field value"), "Peanuts");
    await user.click(screen.getByRole("button", { name: "Save field" }));

    await waitFor(() => {
      expect(upsertFamilyMemberMock).toHaveBeenCalledTimes(1);
    });

    const [userIdArg, memberArg] = upsertFamilyMemberMock.mock.calls[0];
    expect(userIdArg).toBe("user-123");
    expect(memberArg).toMatchObject({
      id: "casey",
      details: expect.arrayContaining([
        expect.objectContaining({
          detailType: "field",
          sectionId: "health",
          label: "Allergy",
          value: "Peanuts",
        }),
      ]),
    });
  });
});
