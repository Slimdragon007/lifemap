import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";
import { saveStoredDemoState } from "./storage";

const aiAnalysis: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-slip",
      title: "Field trip permission slip",
      dueDate: "Jun 18, 2026",
      sourceQuote: "Return by 6/18."
    }
  ],
  missingInfo: [
    {
      id: "missing-signature",
      label: "Parent signature",
      reason: "The school needs the signed form.",
      sourceQuote: "Please sign and return."
    }
  ],
  waitingOn: [{ id: "wait-school", name: "Westview School", reason: "Needs signed slip" }],
  nextActions: [
    { id: "action-print", label: "Print the permission slip", owner: "Alex" },
    { id: "action-sign", label: "Sign the form", owner: "Alex" },
    { id: "action-return", label: "Return it to school", owner: "Alex" }
  ],
  reminders: [
    {
      id: "reminder-slip",
      title: "Permission slip due",
      body: "Remind Alex before Jun 18.",
      status: "Scheduled"
    }
  ],
  draftMessages: [
    {
      id: "draft-teacher",
      recipient: "Westview School",
      subject: "Permission slip for Casey",
      body: "Hi, I will send Casey's signed permission slip before Jun 18.",
      status: "Needs review"
    }
  ],
  sourceEvidence: [
    {
      id: "source-email",
      type: "email",
      label: "Email: teacher@school.org",
      quote: "Return by 6/18."
    }
  ]
};

const aiBrief: DailyBrief = {
  todaySummary: "The field trip permission slip is the clearest thing to move today.",
  topPriorities: [
    {
      id: "priority-slip",
      label: "Sign the field trip permission slip",
      reason: "It is due Jun 18.",
    },
  ],
  openLoops: [
    {
      id: "loop-signature",
      label: "Parent signature",
      blockedBy: "The school needs a signed form.",
    },
  ],
  canWait: [],
  suggestedMessages: [
    {
      id: "draft-teacher",
      recipient: "Westview School",
      subject: "Permission slip for Casey",
      body: "Hi, I will send Casey's signed permission slip before Jun 18.",
      status: "Needs review",
    },
  ],
  conflicts: [],
  groundingNote: "Grounded in the school portal.",
};

describe("LifeMap MVP app", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test("uses one-click demo login before entering the app", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: "LifeMap" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vault" }));
    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Inbox" }));
    expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.click(screen.getByRole("button", { name: "Organized map" }));
    expect(screen.getByRole("heading", { name: "Family admin map" })).toBeInTheDocument();
    expect(screen.getByText("Demo data is stored in this browser only.")).toBeInTheDocument();
  });

  test("uses real app tabs for the approval queue", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Approvals" }));

    expect(screen.getByRole("heading", { name: "Approvals" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Approval queue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approvals" })).toHaveClass("active");
  });

  test("projects current AI analysis into Calendar and Vault", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: []
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.getByText("Missing: Parent signature")).toBeInTheDocument();
    expect(screen.getByText("1 from AI")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vault" }));

    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    expect(screen.getByText("Parent signature")).toBeInTheDocument();
    expect(screen.getByText("The school needs the signed form.")).toBeInTheDocument();
    expect(screen.getByText("6 records")).toBeInTheDocument();
  });

  test("generates a Daily Brief through the local AI API", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, brief: aiBrief }),
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Refresh Daily Brief" }));

    expect(
      await screen.findByText(
        "The field trip permission slip is the clearest thing to move today.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign the field trip permission slip")).toBeInTheDocument();
    expect(screen.getByText("Grounded in the school portal.")).toBeInTheDocument();
  });

  test("analyzes intake through the local AI API and keeps approvals user-controlled", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      )
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Organized map" }));

    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(screen.getByText("Analyzing with LifeMap AI...")).toBeInTheDocument();
    resolveFetch({
      ok: true,
      json: async () => ({ ok: true, analysis: aiAnalysis })
    });
    expect(await screen.findByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.getByText("Parent signature")).toBeInTheDocument();

    const approvalToggle = screen.getByRole("switch", { name: "Approve Permission slip due" });
    expect(approvalToggle).toBeChecked();

    await user.click(approvalToggle);

    expect(approvalToggle).not.toBeChecked();
  });

  test("shows API errors and leaves the existing analysis visible", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: "OPENAI_API_KEY is not configured." })
      })
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(await screen.findByText("OPENAI_API_KEY is not configured.")).toBeInTheDocument();
    expect(screen.getByText("Immunization record (MCV4)")).toBeInTheDocument();
  });

  test("does not replace an existing AI map when analysis fails", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "From: billing@example.org\nPay a dentist deposit by 7/2.",
      analysis: aiAnalysis,
      disabledApprovalIds: []
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "LifeMap could not analyze this yet. Try again or edit the intake."
        })
      })
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(
      await screen.findByText("LifeMap could not analyze this yet. Try again or edit the intake.")
    ).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.queryByText("Completed form details")).not.toBeInTheDocument();
  });

  test("restores demo state from browser storage", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      dailyBrief: aiBrief,
      disabledApprovalIds: ["reminder-slip"]
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText(aiBrief.todaySummary)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Organized map" }));
    expect(screen.getByDisplayValue("stored school note")).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Approve Permission slip due" })).not.toBeChecked();
  });

  test("lets a draft message be edited before review", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: []
    });

    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Edit Permission slip for Casey" }));
    const draftBody = screen.getByLabelText("Draft body for Permission slip for Casey");
    await user.clear(draftBody);
    await user.type(draftBody, "Hi, Casey's signed permission slip will be returned tomorrow.");
    await user.click(screen.getByRole("button", { name: "Save Permission slip for Casey" }));

    expect(
      screen.getByText("Hi, Casey's signed permission slip will be returned tomorrow.")
    ).toBeInTheDocument();

    unmount();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    expect(
      screen.getByText("Hi, Casey's signed permission slip will be returned tomorrow.")
    ).toBeInTheDocument();
  });

  test("reviews only selected approvals with edited body text", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"]
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Edit Permission slip for Casey" }));
    const draftBody = screen.getByLabelText("Draft body for Permission slip for Casey");
    await user.clear(draftBody);
    await user.type(draftBody, "Hi, the signed slip is attached for Casey.");
    await user.click(screen.getByRole("button", { name: "Save Permission slip for Casey" }));
    await user.click(screen.getByRole("button", { name: "Review selected" }));

    const dialog = screen.getByRole("dialog", { name: "Review selected approvals" });
    expect(within(dialog).queryByText("Permission slip due")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Permission slip for Casey")).toBeInTheDocument();
    expect(within(dialog).getByText("Hi, the signed slip is attached for Casey.")).toBeInTheDocument();
  });

  test("stages only selected approvals without sending or scheduling", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"]
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Review selected" }));
    await user.click(screen.getByRole("button", { name: "Approve & stage" }));

    expect(screen.queryByRole("dialog", { name: "Review selected approvals" })).not.toBeInTheDocument();

    const stagedSummary = screen.getByLabelText("Demo staged approvals");
    expect(within(stagedSummary).getByText("1 item staged", { exact: false })).toBeInTheDocument();
    expect(within(stagedSummary).getByText("1 draft")).toBeInTheDocument();
    expect(within(stagedSummary).getByText("0 reminders")).toBeInTheDocument();
    expect(within(stagedSummary).getByText("Permission slip for Casey")).toBeInTheDocument();
    expect(within(stagedSummary).queryByText("Permission slip due")).not.toBeInTheDocument();
    expect(
      within(stagedSummary).getByText("Nothing was sent or scheduled. This is ready for real integrations later.")
    ).toBeInTheDocument();
  });

  test("loads sample intakes and clears stale staged approvals", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"]
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Organized map" }));
    await user.click(screen.getByRole("button", { name: "Review selected" }));
    await user.click(screen.getByRole("button", { name: "Approve & stage" }));
    expect(screen.getByLabelText("Demo staged approvals")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Medical bill" }));

    expect(screen.getByDisplayValue(/BrightSmilesDental\.com/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Demo staged approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("AI map updated. Review before sending anything.")).not.toBeInTheDocument();
  });
});
