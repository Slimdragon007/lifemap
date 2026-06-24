import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { LifeMapAnalysis } from "./lifemap";

// Real-mode test for the "Clear my map / start fresh" account reset.
//
// In real mode (`isSupabaseConfigured && session`), Settings shows a destructive
// "Clear my map · start fresh" row. Confirming it must (1) wipe every family row
// via deleteAllFamilyData(userId, …) and (2) reset the user's persisted
// lifemapState via saveRemoteState(userId, emptyState, …). We mock both modules,
// drive the real handler through the UI, and assert the calls + their args.

const { aiAnalysis, session, deleteAllFamilyDataMock, saveRemoteStateMock } =
  vi.hoisted(() => {
    const aiAnalysis: LifeMapAnalysis = {
      dueItems: [],
      missingInfo: [],
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
    const deleteAllFamilyDataMock = vi.fn(async () => ({ ok: true as const }));
    const saveRemoteStateMock = vi.fn(async () => ({ ok: true as const }));
    return {
      aiAnalysis,
      session,
      deleteAllFamilyDataMock,
      saveRemoteStateMock,
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
      state: {
        isLoggedIn: true,
        intake: "stored school note",
        analysis: aiAnalysis,
      },
    })),
    saveRemoteState: saveRemoteStateMock,
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
    deleteAllFamilyData: deleteAllFamilyDataMock,
  };
});

import App from "./App";
import { emptyAnalysis } from "./storage";

describe("LifeMap real-mode Clear my map", () => {
  afterEach(() => {
    deleteAllFamilyDataMock.mockClear();
    saveRemoteStateMock.mockClear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test("wipes family rows and resets remote state on confirm", async () => {
    const user = userEvent.setup();
    localStorage.setItem("lifemap-onboarded", "1");

    render(<App />);

    await screen.findByRole("button", {
      name: "Sign out alex@example.com",
    });

    // Open Settings → click the destructive row → confirm in the dialog.
    await user.click(await screen.findByRole("button", { name: "Settings" }));
    await user.click(
      screen.getByRole("button", { name: "Clear my map · start fresh" }),
    );
    // Confirm dialog presents the irreversible action behind a second tap.
    await user.click(
      await screen.findByRole("button", { name: "Clear my map" }),
    );

    await waitFor(() => {
      expect(deleteAllFamilyDataMock).toHaveBeenCalledTimes(1);
    });
    expect(deleteAllFamilyDataMock.mock.calls[0][0]).toBe("user-123");

    await waitFor(() => {
      expect(saveRemoteStateMock).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          intake: "",
          analysis: emptyAnalysis(),
          setupBucketIds: [],
        }),
        expect.anything(),
      );
    });
  });
});
