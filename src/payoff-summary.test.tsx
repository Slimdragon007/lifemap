import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import PayoffSummary from "./payoff-summary";
import type { LifeMapAnalysis } from "./lifemap";

const map: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-1",
      title: "Field trip permission slip",
      dueDate: "2026-06-20",
      sourceQuote: "due tomorrow",
    },
  ],
  missingInfo: [
    {
      id: "miss-1",
      label: "Parent signature",
      reason: "school needs it",
      sourceQuote: "needs the parent signature",
    },
  ],
  waitingOn: [],
  nextActions: [{ id: "act-1", label: "Email the teacher", owner: "You" }],
  reminders: [],
  draftMessages: [
    {
      id: "draft-1",
      recipient: "Teacher",
      subject: "Confirming the field trip",
      body: "Hello,",
      status: "Needs review",
    },
  ],
  sourceEvidence: [],
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

describe("PayoffSummary", () => {
  test("summary previews what is ready without claiming it is done yet", () => {
    render(
      <PayoffSummary
        map={map}
        onApproveAll={vi.fn().mockResolvedValue(true)}
        onDone={vi.fn()}
        onTweak={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /got ready/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/off your plate/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve all" }),
    ).toBeInTheDocument();
  });

  test("Approve all asks for confirmation before writing anything", async () => {
    const user = userEvent.setup();
    const onApproveAll = vi.fn().mockResolvedValue(true);
    render(
      <PayoffSummary
        map={map}
        onApproveAll={onApproveAll}
        onDone={vi.fn()}
        onTweak={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve all" }));

    // Confirm-first: the write must not fire until the user confirms.
    expect(onApproveAll).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing sends/i)).toBeInTheDocument();
  });

  test("confirm -> success shows the exhale and Done routes onward", async () => {
    const user = userEvent.setup();
    const onApproveAll = vi.fn().mockResolvedValue(true);
    const onDone = vi.fn();
    render(
      <PayoffSummary
        map={map}
        onApproveAll={onApproveAll}
        onDone={onDone}
        onTweak={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve all" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText(/off your plate/i)).toBeInTheDocument();
    expect(onApproveAll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("confirm -> failure shows an error and never claims success", async () => {
    const user = userEvent.setup();
    const onApproveAll = vi.fn().mockResolvedValue(false);
    const onDone = vi.fn();
    render(
      <PayoffSummary
        map={map}
        onApproveAll={onApproveAll}
        onDone={onDone}
        onTweak={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve all" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Couldn't save everything/i,
    );
    expect(screen.queryByText(/off your plate/i)).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("empty analysis shows the gentle fallback", () => {
    render(
      <PayoffSummary
        map={emptyMap}
        onApproveAll={vi.fn().mockResolvedValue(true)}
        onDone={vi.fn()}
        onTweak={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Nothing to file from that one/i),
    ).toBeInTheDocument();
  });
});
