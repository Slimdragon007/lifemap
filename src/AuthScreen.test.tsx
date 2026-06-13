import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  }),
}));

import AuthScreen from "./AuthScreen";

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthScreen", () => {
  test("signs in with email and password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText("Email"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "alex@example.com",
        password: "supersecret",
      }),
    );
  });

  test("creates an account and prompts to confirm email", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  test("surfaces an auth error", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(screen.getByLabelText("Email"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText("Invalid login credentials"),
    ).toBeInTheDocument();
  });
});
