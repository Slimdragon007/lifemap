import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  }),
}));

import AuthScreen from "./auth-screen";

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

  test("creates an account and signs in instantly when confirmation is off", async () => {
    // Email confirmation disabled (mailer_autoconfirm): signUp returns a
    // session, so the auth listener logs the user in — no confirm-email notice.
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "tok" }, user: { id: "u1" } },
      error: null,
    });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  test("prompts to confirm email when confirmation is required", async () => {
    // Fallback: confirmation still on means signUp returns no session.
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: "u1" } },
      error: null,
    });
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

  test("sends a password reset link from the forgot-password flow", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    await user.type(screen.getByLabelText("Email"), "alex@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() =>
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "alex@example.com",
        expect.objectContaining({ redirectTo: expect.any(String) }),
      ),
    );
    expect(
      await screen.findByText(/check your email for a link/i),
    ).toBeInTheDocument();
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
