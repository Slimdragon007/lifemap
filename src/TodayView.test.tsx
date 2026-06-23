import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
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
  onOpenBrainDump?: () => void;
  brief?: DailyBrief;
};

function renderToday(overrides: TodayOverrides = {}) {
  const {
    identity = { name: "Alex Kim", initials: "AK" },
    approvalCount = 0,
    onOpenApprovals = vi.fn(),
    onOpenBrainDump = vi.fn(),
    brief = emptyBrief,
  } = overrides;
  render(
    <TodayView
      approvalCount={approvalCount}
      brief={brief}
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
      onOpenBrainDump={onOpenBrainDump}
      onOpenFamilyMap={vi.fn()}
      onOpenPriority={vi.fn()}
      onTogglePriorityDone={vi.fn()}
      onOpenSetup={vi.fn()}
      onOpenSetupBucket={vi.fn()}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  // Suppress the first-run coach by default; the coach tests opt in by clearing it.
  localStorage.setItem("lm-coach-seen", "1");
});

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

describe("TodayView coach", () => {
  test("shows the new-user coach on an empty account and routes the CTA to capture", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("lm-coach-seen");
    const onOpenBrainDump = vi.fn();
    renderToday({ onOpenBrainDump });

    expect(screen.getByText("New here?")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Capture your first thing/i }),
    );
    expect(onOpenBrainDump).toHaveBeenCalledTimes(1);
  });

  test("'Got it' dismisses the coach and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.removeItem("lm-coach-seen");
    renderToday();

    expect(screen.getByText("New here?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText("New here?")).toBeNull();
    expect(localStorage.getItem("lm-coach-seen")).toBe("1");
  });

  test("shows on first run even when the account already has priorities", () => {
    localStorage.removeItem("lm-coach-seen");
    const seededBrief: DailyBrief = {
      ...emptyBrief,
      topPriorities: [
        { id: "p1", label: "Field trip permission slip", reason: "due soon" },
      ],
    };
    renderToday({ brief: seededBrief });

    // Trigger is first-run (not empty-data), so it appears regardless of brief.
    expect(screen.getByText("New here?")).toBeInTheDocument();
  });

  test("stays hidden once dismissed", () => {
    // beforeEach sets lm-coach-seen="1" — a returning user never sees it again.
    renderToday();
    expect(screen.queryByText("New here?")).toBeNull();
  });
});
