import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { FamilyMember } from "./familyOS";

// Onboarding "Your people" must PERSIST + SCALE: finishing the wizard with N
// people (3+ kids included) creates that many family_members. This is the
// real-mode guard — it asserts upsertFamilyMember is called once per named
// person and that they then surface in Family (mirrors App.realmode.test.tsx's
// module-mock style so the demo suite in App.test.tsx is unaffected).

const { session, upsertFamilyMemberMock } = vi.hoisted(() => {
  const session = {
    access_token: "test-access-token",
    user: { id: "user-123", email: "alex@example.com" },
  } as unknown as Session;
  // Echo the member back with a stable persisted id so it joins collections.
  const upsertFamilyMemberMock = vi.fn(
    async (_userId: string, member: FamilyMember) => ({
      ok: true as const,
      item: { ...member, id: `persisted-${member.name}` },
    }),
  );
  return { session, upsertFamilyMemberMock };
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
  ensureFieldCrypto: vi.fn(async () => ({
    encrypt: async (value: string) => value,
    decrypt: async (value: string) => value,
  })),
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
      state: { isLoggedIn: true },
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
        familyMembers: [],
        familyEvents: [],
        vaultItems: [],
        recurringCareItems: [],
      },
    })),
    upsertFamilyMember: upsertFamilyMemberMock,
  };
});

import App from "./App";

describe("LifeMap onboarding 'Your people' persistence", () => {
  afterEach(() => {
    upsertFamilyMemberMock.mockClear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test("creates one family_member per person (3+ kids) and they reach Family", async () => {
    const user = userEvent.setup();
    // Fresh signed-in user: the first-run gate routes straight into the wizard.
    render(<App />);

    // Intro cover -> step 1 (name).
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Your name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2 "Your people": You (seeded) + Partner + three kids via add rows.
    await user.click(screen.getByRole("button", { name: "Partner" }));
    await user.click(screen.getByRole("button", { name: "A child" }));
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.type(screen.getByLabelText("Name for person 4"), "Robin");
    await user.type(screen.getByLabelText("Name for person 5"), "Sky");

    await user.click(screen.getByRole("button", { name: "Continue" })); // -> areas
    await user.click(screen.getByRole("button", { name: "Continue" })); // -> calendar
    await user.click(screen.getByRole("button", { name: "Continue" })); // -> finale
    await user.click(screen.getByRole("button", { name: "Enter LifeMap" }));

    // One encrypted, RLS-scoped persist per named person: You, Partner, A child,
    // Robin, Sky = 5.
    await waitFor(() => {
      expect(upsertFamilyMemberMock).toHaveBeenCalledTimes(5);
    });

    const persistedNames = upsertFamilyMemberMock.mock.calls.map(
      (call) => (call[1] as FamilyMember).name,
    );
    expect(persistedNames).toEqual(
      expect.arrayContaining(["You", "Partner", "A child", "Robin", "Sky"]),
    );
    // Three children among them (A child, Robin via default child role, Sky).
    const childCount = upsertFamilyMemberMock.mock.calls.filter(
      (call) => (call[1] as FamilyMember).profileType === "child",
    ).length;
    expect(childCount).toBe(3);

    // Every call is scoped to the signed-in user.
    for (const call of upsertFamilyMemberMock.mock.calls) {
      expect(call[0]).toBe("user-123");
    }

    // The persisted people surface in the Family roster, not Cabinet records.
    await screen.findByRole("button", { name: "Family" });
    await user.click(screen.getByRole("button", { name: "Family" }));

    expect(
      screen.getByRole("heading", { name: "Family dashboard" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Robin/ })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Sky/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Partner/ })).toBeInTheDocument();
  });
});
