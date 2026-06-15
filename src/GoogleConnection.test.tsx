import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import GoogleConnection from "./GoogleConnection";
import { getGoogleStatus } from "./api";

vi.mock("./supabaseClient", () => ({
  getAccessToken: vi.fn(async () => "tok"),
}));

vi.mock("./api", () => ({
  getGoogleStatus: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
  disconnectGoogle: vi.fn(),
}));

describe("GoogleConnection", () => {
  test("shows Connect when not connected", async () => {
    vi.mocked(getGoogleStatus).mockResolvedValue({
      ok: true,
      connected: false,
    });
    render(<GoogleConnection />);
    expect(
      await screen.findByRole("button", { name: /connect google calendar/i }),
    ).toBeInTheDocument();
  });

  test("shows Connected with the account email when connected", async () => {
    vi.mocked(getGoogleStatus).mockResolvedValue({
      ok: true,
      connected: true,
      email: "alex@example.com",
    });
    render(<GoogleConnection />);
    expect(await screen.findByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/alex@example.com/i)).toBeInTheDocument();
  });
});
