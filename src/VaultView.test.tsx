import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import VaultView from "./VaultView";
import type { LifeMapAnalysis } from "./lifemap";
import { familyMembers, recurringCareItems, vaultItems } from "./familyOS";

const emptyMap: LifeMapAnalysis = {
  dueItems: [],
  missingInfo: [],
  waitingOn: [],
  nextActions: [],
  reminders: [],
  draftMessages: [],
  sourceEvidence: [],
};

const handlers = {
  onSaveSuggestion: vi.fn(),
  onSaveSuggestions: vi.fn(),
  onDismissSuggestion: vi.fn(),
};

describe("VaultView de-demo", () => {
  test("a real viewer sees no demo people and gets empty states", () => {
    render(
      <VaultView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyMembers={[]}
        identity={{ name: "m.haslim", initials: "MH" }}
        recurringCareItems={[]}
        savedSuggestionIds={new Set()}
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
    expect(
      screen.getByText(/No recurring care loops yet/i),
    ).toBeInTheDocument();
  });

  test("demo mode still renders the sample family and emergency contact", () => {
    render(
      <VaultView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyMembers={familyMembers}
        identity={{ name: "Alex Kim", initials: "AK" }}
        recurringCareItems={recurringCareItems}
        savedSuggestionIds={new Set()}
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
