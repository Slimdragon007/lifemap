import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import TodayView from "./TodayView";
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import { defaultSetupProfile } from "./setupBuckets";

const emptyBrief: DailyBrief = {
  todaySummary: "",
  topPriorities: [],
  openLoops: [],
  canWait: [],
  suggestedMessages: [],
  conflicts: [],
  groundingNote: "",
};

const emptyMap: LifeMapAnalysis = {
  dueItems: [],
  missingInfo: [],
  waitingOn: [],
  nextActions: [],
  reminders: [],
  draftMessages: [],
  sourceEvidence: [],
};

type TodayOverrides = {
  identity?: { name: string; initials: string };
  approvalCount?: number;
  onOpenApprovals?: () => void;
};

function renderToday(overrides: TodayOverrides = {}) {
  const {
    identity = { name: "Alex Kim", initials: "AK" },
    approvalCount = 0,
    onOpenApprovals = vi.fn(),
  } = overrides;
  render(
    <TodayView
      approvalCount={approvalCount}
      brief={emptyBrief}
      captureExamples={[]}
      identity={identity}
      map={emptyMap}
      priorityActionStates={{}}
      setupBuckets={[]}
      setupProfile={defaultSetupProfile}
      status="idle"
      onGenerateBrief={vi.fn()}
      onOpenApprovals={onOpenApprovals}
      onOpenBrief={vi.fn()}
      onOpenBrainDump={vi.fn()}
      onOpenFamilyMap={vi.fn()}
      onOpenPriority={vi.fn()}
      onTogglePriorityDone={vi.fn()}
      onOpenSetup={vi.fn()}
      onOpenSetupBucket={vi.fn()}
    />,
  );
}

describe("TodayView identity", () => {
  test("a real viewer never sees the Alex Kim demo identity", () => {
    renderToday({ identity: { name: "m.haslim", initials: "MH" } });

    expect(screen.queryByLabelText("Alex Kim")).toBeNull();
    expect(screen.getByLabelText("m.haslim")).toHaveTextContent("MH");
    // The greeting addresses the real viewer by name, not the demo persona.
    expect(
      screen.getByText(/m\.haslim/, { selector: ".calm-greeting-title" }),
    ).toBeInTheDocument();
  });

  test("the demo identity still renders AK", () => {
    renderToday({ identity: { name: "Alex Kim", initials: "AK" } });

    expect(screen.getByLabelText("Alex Kim")).toHaveTextContent("AK");
  });
});

describe("TodayView Needs you", () => {
  test("surfaces a visible approval count and routes it to review", async () => {
    const user = userEvent.setup();
    const onOpenApprovals = vi.fn();
    renderToday({ approvalCount: 3, onOpenApprovals });

    // A dedicated opener folds Review in, surfacing the count + calling onOpenApprovals.
    const opener = screen.getByRole("button", {
      name: /Review 3 waiting for your yes/i,
    });
    await user.click(opener);
    expect(onOpenApprovals).toHaveBeenCalledTimes(1);
  });

  test("hides the count and opener when nothing needs a yes", () => {
    renderToday({ approvalCount: 0 });

    // The section eyebrow drops the parenthetical count at zero.
    const eyebrow = document.getElementById("needs-title");
    expect(eyebrow).toHaveTextContent("Needs you");
    expect(eyebrow?.textContent).not.toMatch(/\(/);
    expect(
      screen.queryByRole("button", { name: /waiting for your yes/i }),
    ).toBeNull();
  });
});
