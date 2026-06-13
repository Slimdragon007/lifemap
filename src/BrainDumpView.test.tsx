import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import BrainDumpView from "./BrainDumpView";
import * as api from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BrainDumpView", () => {
  test("classifies the dump and renders items grouped by recommendation", async () => {
    vi.spyOn(api, "classifyBrainDumpWithAi").mockResolvedValue({
      ok: true,
      result: {
        items: [
          {
            id: "load-1",
            title: "Pay the electric bill",
            type: "finance",
            recommendation: "do-now",
            emotionalWeight: 3,
            sourceQuote: "pay the electric bill",
          },
          {
            id: "load-2",
            title: "Learn piano",
            type: "someday",
            recommendation: "park",
            emotionalWeight: 1,
            sourceQuote: "someday learn piano",
          },
        ],
      },
    });

    const user = userEvent.setup();
    render(<BrainDumpView />);

    await user.click(
      screen.getByRole("button", { name: /sort my mental load/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("Pay the electric bill")).toBeInTheDocument(),
    );
    // Grouped headings driven by the recommendation buckets.
    expect(screen.getByRole("heading", { name: "Do now" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Park for later" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Learn piano")).toBeInTheDocument();
    expect(screen.getByText(/Sorted into 2 items/i)).toBeInTheDocument();
  });

  test("falls back to the local classifier when the AI call fails", async () => {
    vi.spyOn(api, "classifyBrainDumpWithAi").mockResolvedValue({
      ok: false,
      error: "AI is unavailable",
    });

    const user = userEvent.setup();
    render(<BrainDumpView />);

    await user.click(
      screen.getByRole("button", { name: /sort my mental load/i }),
    );

    // Fallback notice shows, and the deterministic classifier still produces items
    // from the pre-filled sample dump (so the workflow stays usable offline).
    await waitFor(() =>
      expect(screen.getByText(/AI is unavailable/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/local classifier/i)).toBeInTheDocument();
    expect(screen.getByText(/items$/)).toBeTruthy();
  });
});
