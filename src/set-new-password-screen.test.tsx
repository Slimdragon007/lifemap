import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    auth: { updateUser: mocks.updateUser },
  }),
}));

import SetNewPasswordScreen from "./set-new-password-screen";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SetNewPasswordScreen", () => {
  test("updates the password and calls onDone on success", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<SetNewPasswordScreen onDone={onDone} />);

    await user.type(screen.getByLabelText("New password"), "brand-new-pass");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "brand-new-pass",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith({
        password: "brand-new-pass",
      }),
    );
    expect(onDone).toHaveBeenCalled();
  });

  test("blocks mismatched passwords without calling Supabase", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<SetNewPasswordScreen onDone={onDone} />);

    await user.type(screen.getByLabelText("New password"), "brand-new-pass");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "different-pass",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/don't match/i)).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
