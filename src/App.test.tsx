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

async function openFamilyMap(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "More" }));
  await user.click(screen.getByRole("button", { name: "Open family admin map" }));
}

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
    expect(
      screen.getByRole("heading", { name: "Paste anything messy." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture anything" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "School form" }));
    expect(screen.getByRole("heading", { name: "Ask LifeMap AI" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Westview Elementary/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Today" }));
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Capture" }));
    expect(screen.getByRole("heading", { name: "Ask LifeMap AI" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vault" }));
    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("heading", { name: "More" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inbox" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open launch plan" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open family admin map" }));
    expect(screen.getByRole("heading", { name: "Family admin map" })).toBeInTheDocument();
    expect(screen.getByText("Demo data is stored in this browser only.")).toBeInTheDocument();
    expect(screen.getByText("LifeMap AI command center")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open LifeMap AI" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Every reminder and message pauses here before anything leaves your hands.",
      ),
    ).toBeInTheDocument();
  });

  test("opens the founder launch plan and restores checked progress", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: "Open launch plan" }));

    expect(screen.getByRole("heading", { name: "Launch Plan" })).toBeInTheDocument();
    expect(screen.getByText("9 of 17 complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Launch plan progress" })).toHaveAttribute(
      "aria-valuenow",
      "53",
    );

    await user.click(
      screen.getByRole("checkbox", { name: /Founder sign-in path is obvious/i }),
    );

    expect(screen.getByText("10 of 17 complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Launch plan progress" })).toHaveAttribute(
      "aria-valuenow",
      "59",
    );

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: "Open launch plan" }));

    expect(
      screen.getByRole("checkbox", { name: /Founder sign-in path is obvious/i }),
    ).toBeChecked();
    expect(screen.getByText("10 of 17 complete")).toBeInTheDocument();
  });

  test("opens guided setup and restores recommended buckets", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("button", { name: "Open guided setup" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    expect(screen.getByRole("heading", { name: "Guided setup" })).toBeInTheDocument();
    expect(screen.getByText("Tell LifeMap what your real life looks like.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Children"));
    await user.type(screen.getByLabelText("Children"), "2");
    await user.clear(screen.getByLabelText("Pets"));
    await user.type(screen.getByLabelText("Pets"), "1");
    await user.click(screen.getByRole("switch", { name: "Travel planning" }));
    await user.click(screen.getByRole("checkbox", { name: "School schedules and forms" }));
    await user.click(screen.getByRole("checkbox", { name: "Passports, IDs, and insurance cards" }));
    await user.click(screen.getByRole("button", { name: "Create recommended buckets" }));

    expect(screen.getByText("School command center")).toBeInTheDocument();
    expect(screen.getByText("Family profiles")).toBeInTheDocument();
    expect(screen.getByText("Pet care loop")).toBeInTheDocument();
    expect(screen.getByText("Travel command center")).toBeInTheDocument();
    expect(screen.getByText("Vault: IDs and records")).toBeInTheDocument();
    expect(screen.getByText("5 active buckets")).toBeInTheDocument();

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    expect(screen.getByLabelText("Children")).toHaveValue(2);
    expect(screen.getByLabelText("Pets")).toHaveValue(1);
    expect(screen.getByText("5 active buckets")).toBeInTheDocument();
    expect(screen.getByText("Travel command center")).toBeInTheDocument();
  });

  test("starts a fresh demo with the presentation-ready LifeMap sample", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.getByText("Renew passport")).toBeInTheDocument();
    expect(screen.getByText("Milo vet appointment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vault 24 items" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Travel 3 trips" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Health 2 updates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home 5 tasks" })).toBeInTheDocument();
  });

  test("uses completed guided setup buckets on Today", async () => {
    saveStoredDemoState({
      isLoggedIn: true,
      setupProfile: {
        adults: 2,
        children: 2,
        pets: 1,
        travels: true,
        focusAreas: ["school", "records"],
      },
      setupBucketIds: [
        "family-profiles",
        "school-command",
        "vault-records",
        "pet-care",
        "travel-command",
      ],
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profiles 5 profiles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "School 2 kids" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Records IDs + cards" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pets 1 pet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Health 2 updates" })).not.toBeInTheDocument();
  });

  test("opens a focused detail page from a setup bucket on Today", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      setupProfile: {
        adults: 2,
        children: 2,
        pets: 1,
        travels: true,
        focusAreas: ["school", "records"],
      },
      setupBucketIds: [
        "family-profiles",
        "school-command",
        "vault-records",
        "pet-care",
        "travel-command",
      ],
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Records IDs + cards" }));

    expect(screen.getByRole("heading", { name: "Vault: IDs and records" })).toBeInTheDocument();
    expect(screen.getByText("Passports, IDs, insurance cards, emergency cards, and renewal dates belong behind one trusted door.")).toBeInTheDocument();
    expect(screen.getByText("Add the first card or document you always search for.")).toBeInTheDocument();
    expect(screen.getByText("Passports and IDs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Vault" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to Today" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  test("starts capture with a bucket-specific note", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      setupProfile: {
        adults: 2,
        children: 2,
        pets: 1,
        travels: true,
        focusAreas: ["school", "records"],
      },
      setupBucketIds: [
        "family-profiles",
        "school-command",
        "vault-records",
        "pet-care",
        "travel-command",
      ],
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Records IDs + cards" }));
    await user.click(screen.getByRole("button", { name: "Start records capture" }));

    expect(screen.getByRole("heading", { name: "Ask LifeMap AI" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Vault records starter/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Passports and IDs/)).toBeInTheDocument();
  });

  test("routes analyzed bucket capture back to Vault", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, analysis: aiAnalysis }),
      }),
    );
    saveStoredDemoState({
      isLoggedIn: true,
      setupProfile: {
        adults: 2,
        children: 2,
        pets: 1,
        travels: true,
        focusAreas: ["school", "records"],
      },
      setupBucketIds: [
        "family-profiles",
        "school-command",
        "vault-records",
        "pet-care",
        "travel-command",
      ],
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Records IDs + cards" }));
    await user.click(screen.getByRole("button", { name: "Start records capture" }));

    const capture = screen.getByRole("heading", { name: "Ask LifeMap AI" })
      .closest("section");
    expect(capture).not.toBeNull();
    await user.click(within(capture as HTMLElement).getByRole("button", { name: "Analyze intake" }));

    expect(
      await within(capture as HTMLElement).findByText("Route this into Vault so records and missing details stay findable."),
    ).toBeInTheDocument();
    await user.click(within(capture as HTMLElement).getByRole("button", { name: "Open Vault" }));

    expect(screen.queryByRole("heading", { name: "Ask LifeMap AI" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    expect(screen.getByText("Parent signature")).toBeInTheDocument();
  });

  test("uses real app tabs for the review queue", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Review" }));

    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Approval queue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toHaveClass("active");
  });

  test("opens LifeMap AI capture from the centered capture action", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, analysis: aiAnalysis }),
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Capture" }));

    const capture = screen.getByRole("heading", { name: "Ask LifeMap AI" })
      .closest("section");
    expect(capture).not.toBeNull();
    await user.click(within(capture as HTMLElement).getByRole("button", { name: "Analyze intake" }));

    expect(
      await screen.findByText(
        "I found 1 due item, 1 missing record, 1 person waiting, and 3 next actions.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review drafts" }));

    expect(screen.queryByRole("heading", { name: "Ask LifeMap AI" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
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
    expect(screen.getByText("AI suggestion ready for review.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open details for Parent signature" }));
    const detailDialog = screen.getByRole("dialog", { name: "Parent signature" });
    await user.click(within(detailDialog).getByRole("button", { name: "Reveal details" }));
    expect(within(detailDialog).getByText("The school needs the signed form.")).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole("button", { name: "Close" }));
    expect(screen.getByText("6 records")).toBeInTheDocument();
  });

  test("confirms when a vault suggestion is saved", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: [],
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Vault" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved Parent signature to Vault.",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Private details stay hidden until opened.",
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  test("keeps AI suggestions visible until the user saves or dismisses them", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: []
    });

    const firstRender = render(<App />);

    await user.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByText("Needs review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Saved to LifeMap")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

    firstRender.unmount();
    const secondRender = render(<App />);

    await user.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByText("Saved to LifeMap")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vault" }));
    expect(screen.getByText("Parent signature")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Suggestion dismissed.",
    );
    expect(screen.queryByText("Parent signature")).not.toBeInTheDocument();
    expect(screen.getByText("5 records")).toBeInTheDocument();

    secondRender.unmount();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Vault" }));
    expect(screen.queryByText("Parent signature")).not.toBeInTheDocument();
    expect(screen.getByText("5 records")).toBeInTheDocument();
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

  test("opens the full Daily Brief without rerunning AI", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "View full brief" }));

    const dialog = screen.getByRole("dialog", { name: "Daily Brief details" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Top 3")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Review approvals" }));

    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
  });

  test("keeps Daily Brief useful when AI refresh falls back", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "LifeMap could not analyze this yet. Try again or edit the intake.",
        }),
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Refresh Daily Brief" }));

    expect(
      await screen.findByText(
        "LifeMap is using the current map while AI refresh is unavailable.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You can still review priorities or capture a new update."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("LifeMap could not analyze this yet. Try again or edit the intake."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Capture a new update" }));

    expect(screen.getByRole("heading", { name: "Ask LifeMap AI" })).toBeInTheDocument();
  });

  test("lets a Today priority become a real action", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: /Open priority Renew passport/i }));

    const dialog = screen.getByRole("dialog", { name: "Renew passport" });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /Mark complete/i }));

    expect(screen.queryByRole("dialog", { name: "Renew passport" })).not.toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  test("keeps Vault profile and record details tucked away until tapped", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Vault" }));

    expect(screen.queryByText("Westview Elementary")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Casey Kim/i }));

    expect(screen.getByText("Westview Elementary")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open details for Casey passport" }));

    const dialog = screen.getByRole("dialog", { name: "Casey passport" });
    expect(within(dialog).getByText("Hidden until you reveal them.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Reveal details" }));

    expect(within(dialog).getByText("Renewal packet started")).toBeInTheDocument();
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
    await openFamilyMap(user);

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
    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(await screen.findByText("OPENAI_API_KEY is not configured.")).toBeInTheDocument();
    expect(screen.getAllByText("Field trip permission slip").length).toBeGreaterThan(0);
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

    await openFamilyMap(user);
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
    await openFamilyMap(user);
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

    await openFamilyMap(user);
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

    await openFamilyMap(user);
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

    await openFamilyMap(user);
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

    await openFamilyMap(user);
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

    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Review selected" }));
    await user.click(screen.getByRole("button", { name: "Approve & stage" }));
    expect(screen.getByLabelText("Demo staged approvals")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Doctor appointment" }));

    expect(screen.getByDisplayValue(/Valley Pediatrics/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Demo staged approvals")).not.toBeInTheDocument();
    expect(screen.queryByText("AI map updated. Review before sending anything.")).not.toBeInTheDocument();
  });
});
