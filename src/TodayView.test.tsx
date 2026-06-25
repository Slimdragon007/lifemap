import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import TodayView from "./TodayView";
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import type { FamilyEvent, FamilyMember, VaultItem } from "./familyOS";
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
  familyMembers?: FamilyMember[];
  vaultItems?: VaultItem[];
  familyEvents?: FamilyEvent[];
  selectedMemberId?: string;
  onSelectMember?: (id: string) => void;
  onAddForMember?: (member: FamilyMember) => void;
  onAddMember?: () => void;
};

function renderToday(overrides: TodayOverrides = {}) {
  const {
    identity = { name: "Alex Kim", initials: "AK" },
    approvalCount = 0,
    onOpenApprovals = vi.fn(),
    onOpenBrainDump = vi.fn(),
    brief = emptyBrief,
    familyMembers,
    vaultItems,
    familyEvents,
    selectedMemberId,
    onSelectMember = vi.fn(),
    onAddForMember = vi.fn(),
    onAddMember = vi.fn(),
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
      upcomingDates={[]}
      onGenerateBrief={vi.fn()}
      onOpenFeedback={vi.fn()}
      onOpenApprovals={onOpenApprovals}
      onOpenBrief={vi.fn()}
      onOpenBrainDump={onOpenBrainDump}
      onOpenFamilyMap={vi.fn()}
      onOpenImportantDates={vi.fn()}
      onOpenPriority={vi.fn()}
      onTogglePriorityDone={vi.fn()}
      onOpenSetup={vi.fn()}
      onOpenSetupBucket={vi.fn()}
      familyMembers={familyMembers}
      vaultItems={vaultItems}
      familyEvents={familyEvents}
      selectedMemberId={selectedMemberId}
      onSelectMember={onSelectMember}
      onAddForMember={onAddForMember}
      onAddMember={onAddMember}
    />,
  );
}

const sampleMembers: FamilyMember[] = [
  {
    id: "alex",
    name: "Alex Kim",
    role: "Parent",
    initials: "AK",
    profileType: "adult",
    details: [],
    careNotes: [],
  },
  {
    id: "casey",
    name: "Casey Kim",
    role: "Grade 4",
    initials: "CK",
    profileType: "child",
    details: [],
    careNotes: [],
  },
];

const caseyPassport: VaultItem = {
  id: "v1",
  title: "Casey passport",
  category: "identity",
  owner: "Casey Kim",
  status: "Expires soon",
  detail: "",
};

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

    // Calm home: the rest folds behind a quiet line. Expand it, then the Review
    // opener surfaces and routes to approvals.
    await user.click(
      screen.getByRole("button", { name: /^3 waiting for your yes$/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Review 3 waiting for your yes/i }),
    );
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

  test("stays out of the way once there is anything to show (calm home)", () => {
    localStorage.removeItem("lm-coach-seen");
    const seededBrief: DailyBrief = {
      ...emptyBrief,
      topPriorities: [
        { id: "p1", label: "Field trip permission slip", reason: "due soon" },
      ],
    };
    renderToday({ brief: seededBrief });

    // Calm home: the coach only greets a genuinely empty first-run account, so
    // a populated brief never adds the orientation block to the wall.
    expect(screen.queryByText("New here?")).toBeNull();
  });

  test("stays hidden once dismissed", () => {
    // beforeEach sets lm-coach-seen="1" — a returning user never sees it again.
    renderToday();
    expect(screen.queryByText("New here?")).toBeNull();
  });
});

describe("TodayView family-first", () => {
  test("no family section when App supplies no members", () => {
    renderToday();
    expect(screen.queryByText(/'s stuff/)).toBeNull();
  });

  test("shows the selected member's stuff and routes Add for member", async () => {
    const user = userEvent.setup();
    const onAddForMember = vi.fn();
    renderToday({
      familyMembers: sampleMembers,
      vaultItems: [caseyPassport],
      selectedMemberId: "casey",
      onAddForMember,
    });

    expect(screen.getByText("Casey Kim's stuff")).toBeInTheDocument();
    expect(screen.getByText("Casey passport")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add for Casey Kim" }));
    expect(onAddForMember).toHaveBeenCalledWith(
      expect.objectContaining({ id: "casey" }),
    );
  });

  test("an empty member shows the first-thing prompt", () => {
    renderToday({
      familyMembers: sampleMembers,
      selectedMemberId: "alex",
    });
    expect(
      screen.getByText(/Nothing yet\. Tap \+ to add Alex Kim's first thing\./),
    ).toBeInTheDocument();
  });

  test("tapping a member avatar fires onSelectMember", async () => {
    const user = userEvent.setup();
    const onSelectMember = vi.fn();
    renderToday({
      familyMembers: sampleMembers,
      selectedMemberId: "alex",
      onSelectMember,
    });

    await user.click(
      screen.getByRole("button", { name: "Show Casey Kim's stuff" }),
    );
    expect(onSelectMember).toHaveBeenCalledWith("casey");
  });

  test("the Add avatar fires onAddMember", async () => {
    const user = userEvent.setup();
    const onAddMember = vi.fn();
    renderToday({
      familyMembers: sampleMembers,
      selectedMemberId: "alex",
      onAddMember,
    });

    await user.click(
      screen.getByRole("button", { name: "Add a family member" }),
    );
    expect(onAddMember).toHaveBeenCalledTimes(1);
  });
});
