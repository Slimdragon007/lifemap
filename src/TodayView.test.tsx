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
  onOpenBrainDump?: () => void;
  onOpenFamilyMap?: () => void;
  onOpenReview?: () => void;
  brief?: DailyBrief;
};

function renderToday(overrides: TodayOverrides = {}) {
  const {
    identity = { name: "Alex Kim", initials: "AK" },
    approvalCount = 0,
    onOpenBrainDump = vi.fn(),
    onOpenFamilyMap = vi.fn(),
    onOpenReview = vi.fn(),
    brief = emptyBrief,
  } = overrides;
  render(
    <TodayView
      approvalCount={approvalCount}
      brief={brief}
      identity={identity}
      map={emptyMap}
      priorityActionStates={{}}
      setupBuckets={[]}
      setupProfile={defaultSetupProfile}
      status="idle"
      upcomingDates={[]}
      onGenerateBrief={vi.fn()}
      onOpenBrainDump={onOpenBrainDump}
      onOpenCabinet={vi.fn()}
      onOpenFamilyMap={onOpenFamilyMap}
      onOpenImportantDates={vi.fn()}
      onOpenReview={onOpenReview}
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
    // Home no longer leads with a fake demo greeting; identity stays tucked in
    // the avatar.
    expect(
      screen.getByText("One thing at a time."),
    ).toBeInTheDocument();
  });

  test("the demo identity still renders AK", () => {
    renderToday({ identity: { name: "Alex Kim", initials: "AK" } });

    expect(screen.getByLabelText("Alex Kim")).toHaveTextContent("AK");
  });
});

describe("TodayView focus flow", () => {
  test("keeps review out of the Home chrome", () => {
    renderToday({ approvalCount: 3 });

    expect(
      screen.getByText("3 waiting, whenever you're ready."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Review notifications" }),
    ).not.toBeInTheDocument();
  });

  test("does not render old Home review count cards", () => {
    renderToday({ approvalCount: 0 });

    expect(
      screen.queryByText(/waiting for your yes/i),
    ).not.toBeInTheDocument();
  });

  test("shows a safety entry when approvals need an OK", async () => {
    const user = userEvent.setup();
    const onOpenReview = vi.fn();

    renderToday({ approvalCount: 3, onOpenReview });

    await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
    expect(onOpenReview).toHaveBeenCalledTimes(1);
  });

  test("hides the safety entry when nothing needs an OK", () => {
    renderToday({ approvalCount: 0 });

    expect(
      screen.queryByRole("button", { name: /Needs your OK/i }),
    ).not.toBeInTheDocument();
  });
});

describe("TodayView intake", () => {
  test("makes the blender the primary capture path", async () => {
    const user = userEvent.setup();
    const onOpenBrainDump = vi.fn();
    renderToday({ onOpenBrainDump });

    expect(screen.getByRole("heading", { name: "Drop anything here." })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Drop a thought or file" }));
    expect(onOpenBrainDump).toHaveBeenCalledTimes(1);
  });

  test("routes the empty focus card into capture", async () => {
    const user = userEvent.setup();
    const onOpenBrainDump = vi.fn();
    renderToday({ onOpenBrainDump });

    await user.click(screen.getByRole("button", { name: "Start here" }));
    expect(onOpenBrainDump).toHaveBeenCalledTimes(1);
  });

  test("offers a direct Family dashboard entry without adding another tool tab", async () => {
    const user = userEvent.setup();
    const onOpenFamilyMap = vi.fn();

    renderToday({ onOpenFamilyMap });

    await user.click(screen.getByRole("button", { name: "Open Family dashboard" }));
    expect(onOpenFamilyMap).toHaveBeenCalledTimes(1);
  });

  test("keeps Home focused on one thing and capture, not routing cards or profiles", () => {
    const seededBrief: DailyBrief = {
      ...emptyBrief,
      topPriorities: [
        { id: "p1", label: "Field trip permission slip", reason: "due soon" },
      ],
    };
    renderToday({ brief: seededBrief });

    expect(screen.getByText("One thing")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Drop anything here." })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "People and pets" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Profiles")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Four calm places." }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Categories stay small." }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Only when you ask." }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/dates tucked into Calendar/i),
    ).not.toBeInTheDocument();
  });
});
