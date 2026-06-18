import { render, screen } from "@testing-library/react";
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

function renderToday(identity: { name: string; initials: string }) {
  render(
    <TodayView
      approvalCount={0}
      brief={emptyBrief}
      captureExamples={[]}
      identity={identity}
      map={emptyMap}
      priorityActionStates={{}}
      setupBuckets={[]}
      setupProfile={defaultSetupProfile}
      status="idle"
      onGenerateBrief={vi.fn()}
      onOpenApprovals={vi.fn()}
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
    renderToday({ name: "m.haslim", initials: "MH" });

    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(screen.queryByLabelText("Alex Kim")).toBeNull();
    expect(screen.getByLabelText("m.haslim")).toHaveTextContent("MH");
  });

  test("the demo identity still renders AK", () => {
    renderToday({ name: "Alex Kim", initials: "AK" });

    expect(screen.getByLabelText("Alex Kim")).toHaveTextContent("AK");
  });
});
