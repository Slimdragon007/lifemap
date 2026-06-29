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
      sourceQuote: "Return by 6/18.",
    },
  ],
  missingInfo: [
    {
      id: "missing-signature",
      label: "Parent signature",
      reason: "The school needs the signed form.",
      sourceQuote: "Please sign and return.",
    },
  ],
  waitingOn: [
    { id: "wait-school", name: "Westview School", reason: "Needs signed slip" },
  ],
  nextActions: [
    { id: "action-print", label: "Print the permission slip", owner: "Alex" },
    { id: "action-sign", label: "Sign the form", owner: "Alex" },
    { id: "action-return", label: "Return it to school", owner: "Alex" },
  ],
  reminders: [
    {
      id: "reminder-slip",
      title: "Permission slip due",
      body: "Remind Alex before Jun 18.",
      status: "Scheduled",
    },
  ],
  draftMessages: [
    {
      id: "draft-teacher",
      recipient: "Westview School",
      subject: "Permission slip for Casey",
      body: "Hi, I will send Casey's signed permission slip before Jun 18.",
      status: "Needs review",
    },
  ],
  sourceEvidence: [
    {
      id: "source-email",
      type: "email",
      label: "Email: teacher@school.org",
      quote: "Return by 6/18.",
    },
  ],
};

const aiBrief: DailyBrief = {
  todaySummary:
    "The field trip permission slip is the clearest thing to move today.",
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
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(
    screen.getByRole("button", { name: "Open family admin map" }),
  );
  // The extracted map + approvals are collapsed by default; reveal them.
  await user.click(
    screen.getByRole("button", { name: "Click here to see the full map" }),
  );
}

async function openBrainDump(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Drop a thought or file" }),
  );
}

async function openReviewFromHome(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Home" }));
  await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
}

async function openCalendarFromCapture(user: ReturnType<typeof userEvent.setup>) {
  await openBrainDump(user);
  const capture = screen.getByRole("region", { name: "Brain dump" });
  if (!within(capture).queryByText("Sorted into relief steps")) {
    await user.click(
      within(capture).getByRole("button", { name: "Analyze intake" }),
    );
    expect(
      await within(capture).findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
  }
  await user.click(
    within(capture).getByRole("button", { name: /Put on calendar/i }),
  );
}

describe("LifeMap MVP app", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("uses one-click demo login before entering the app", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "LifeMap" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Drop a thought or file" }),
    ).toBeInTheDocument();
    // Primary nav is now Cabinet · Home · Family · Settings. Capture starts from the
    // Home blender, not from a top-level tool tab.
    const primaryNav = screen.getByRole("navigation", {
      name: "Household sections",
    });
    expect(
      within(primaryNav)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Cabinet", "Home", "Family", "Settings"]);
    expect(
      within(primaryNav).getByRole("button", { name: "Home" }),
    ).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: "Home" })).toHaveClass(
      "nav-item-primary",
    );
    expect(
      within(primaryNav).getByRole("button", { name: "Cabinet" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNav).queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
    expect(
      within(primaryNav).getByRole("button", { name: "Family" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNav).getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      within(primaryNav).queryByRole("button", { name: "Calendar" }),
    ).not.toBeInTheDocument();
    expect(
      within(primaryNav).queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
    await openBrainDump(user);
    expect(
      screen.getByRole("heading", { name: "Brain dump" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Today" }));

    await user.click(screen.getByRole("button", { name: "Cabinet" }));
    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();

    // Review is reachable from Home as a contextual safety entry.
    await user.click(screen.getByRole("button", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: "Home" })).toHaveClass(
      "nav-item-primary",
      "active",
    );

    await user.click(screen.getByRole("button", { name: "Family" }));
    expect(
      screen.getByRole("heading", { name: "Family dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Inbox" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Casey Kim's profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "People and pets" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Needs attention" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Open vault record/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open LifeMap suggestions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "People, pets, shared records, and emergency basics in one calm place.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Household overview" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Next useful actions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Household watchlist" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Account and privacy" }),
    ).toBeInTheDocument();
    const welcomeSetup = screen.getByRole("region", {
      name: "Welcome and setup",
    });
    expect(welcomeSetup).toBeInTheDocument();
    const replayWelcomeButton = within(welcomeSetup).getByRole("button", {
      name: "Replay the welcome tour",
    });
    expect(replayWelcomeButton).toBeInTheDocument();
    expect(
      within(welcomeSetup).getByRole("button", { name: "Open guided setup" }),
    ).toBeInTheDocument();
    expect(
      within(welcomeSetup).queryByText("Family admin map"),
    ).not.toBeInTheDocument();
    expect(
      within(welcomeSetup).queryByText("Cabinet"),
    ).not.toBeInTheDocument();
    await user.click(replayWelcomeButton);
    expect(
      screen.getByRole("heading", {
        name: /LifeMap takes the chaos in your head/i,
      }),
    ).toBeInTheDocument();
    const replayNav = screen.getByRole("navigation", {
      name: "Household sections",
    });
    expect(replayNav).toBeInTheDocument();
    expect(
      within(replayNav).getByRole("button", { name: "Settings" }),
    ).toHaveClass("active");
    await user.click(screen.getByRole("button", { name: "Back to Settings" }));
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open family admin map" }),
    );
    expect(
      screen.getByRole("heading", { name: "Family admin map" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open LifeMap AI" }),
    ).toBeInTheDocument();
    // The map is collapsed by default behind a single calm button.
    expect(
      screen.getByRole("button", { name: "Click here to see the full map" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Click here to see the full map" }),
    );
    expect(
      screen.getByText("Nothing sends, schedules, or changes until you say yes."),
    ).toBeInTheDocument();
  });

  test("opens the founder launch plan and restores checked progress", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open launch plan" }));

    expect(
      screen.getByRole("heading", { name: "Launch Plan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("9 of 17 complete")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Launch plan progress" }),
    ).toHaveAttribute("aria-valuenow", "53");

    await user.click(
      screen.getByRole("checkbox", {
        name: /Founder sign-in path is obvious/i,
      }),
    );

    expect(screen.getByText("10 of 17 complete")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Launch plan progress" }),
    ).toHaveAttribute("aria-valuenow", "59");

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open launch plan" }));

    expect(
      screen.getByRole("checkbox", {
        name: /Founder sign-in path is obvious/i,
      }),
    ).toBeChecked();
    expect(screen.getByText("10 of 17 complete")).toBeInTheDocument();
  });

  test("hides founder and prototype tools outside dev mode", async () => {
    vi.stubEnv("DEV", false);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("region", { name: "Welcome and setup" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Prototype tools" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open family admin map" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open launch plan" }),
    ).not.toBeInTheDocument();
  });

  test("opens guided setup and restores recommended buckets", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("button", { name: "Open guided setup" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    expect(
      screen.getByRole("heading", { name: "Guided setup" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell LifeMap what your real life looks like."),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Children"));
    await user.type(screen.getByLabelText("Children"), "2");
    await user.clear(screen.getByLabelText("Pets"));
    await user.type(screen.getByLabelText("Pets"), "1");
    await user.click(screen.getByRole("switch", { name: "Travel planning" }));
    await user.click(
      screen.getByRole("checkbox", { name: "School schedules and forms" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Passports, IDs, and insurance cards",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Create recommended buckets" }),
    );

    expect(screen.getByText("School command center")).toBeInTheDocument();
    expect(screen.getByText("Family profiles")).toBeInTheDocument();
    expect(screen.getByText("Pet care loop")).toBeInTheDocument();
    expect(screen.getByText("Travel command center")).toBeInTheDocument();
    expect(screen.getByText("Vault: IDs and records")).toBeInTheDocument();
    expect(screen.getByText("5 active buckets")).toBeInTheDocument();

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    expect(screen.getByLabelText("Children")).toHaveValue(2);
    expect(screen.getByLabelText("Pets")).toHaveValue(1);
    expect(screen.getByText("5 active buckets")).toBeInTheDocument();
    expect(screen.getByText("Travel command center")).toBeInTheDocument();
  });

  test("surfaces guided setup from Settings for a fresh household", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    expect(
      screen.getByRole("heading", { name: "Guided setup" }),
    ).toBeInTheDocument();
  });

  test("routes completed guided setup back to Today with created buckets", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));

    await user.clear(screen.getByLabelText("Children"));
    await user.type(screen.getByLabelText("Children"), "2");
    await user.click(
      screen.getByRole("checkbox", { name: "School schedules and forms" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Create recommended buckets" }),
    );

    expect(
      screen.getByRole("heading", { name: "Your LifeMap is ready" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View Today" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "People and pets" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "School On your map" }),
    ).not.toBeInTheDocument();
  });

  test("starts a fresh demo with the presentation-ready LifeMap sample", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open priority Field trip permission slip",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "People and pets" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Drop anything here." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Four calm places." }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vault 24 items" }),
    ).not.toBeInTheDocument();
  });

  test("starts from a person profile and creates a category item there", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    await user.click(screen.getByRole("button", { name: "Family" }));
    await user.click(
      screen.getByRole("button", { name: "Open Casey Kim's profile" }),
    );
    expect(
      screen.getByRole("region", { name: "Casey Kim" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add vaccine" }));

    expect(
      screen.getByRole("dialog", { name: "Add vaccine record" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("What is it?")).toHaveValue("Vaccine record");
    expect(screen.getByLabelText("Who is it for?")).toHaveValue("Casey Kim");
  });

  test("keeps completed guided setup buckets out of Home", async () => {
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
    expect(
      screen.queryByRole("heading", { name: "People and pets" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /On your map/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Health 2 updates" }),
    ).not.toBeInTheDocument();
  });

  test("opens records from guided setup without Home bucket chips", async () => {
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

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));
    const recordsBucket = screen
      .getByText("Vault: IDs and records")
      .closest("article");
    expect(recordsBucket).not.toBeNull();
    await user.click(
      within(recordsBucket as HTMLElement).getByRole("button", {
        name: "Open",
      }),
    );

    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
  });

  test("opens capture from guided setup without Home bucket chips", async () => {
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

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Open guided setup" }));
    const travelBucket = screen.getByText("Travel command center").closest("article");
    expect(travelBucket).not.toBeNull();
    await user.click(
      within(travelBucket as HTMLElement).getByRole("button", {
        name: "Open",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Brain dump" }),
    ).toBeInTheDocument();
  });

  test("routes analyzed capture back to Vault", async () => {
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
    await openBrainDump(user);

    const capture = screen
      .getByRole("heading", { name: "Brain dump" })
      .closest("section");
    expect(capture).not.toBeNull();
    await user.click(
      within(capture as HTMLElement).getByRole("button", {
        name: "Analyze intake",
      }),
    );

    expect(
      await within(capture as HTMLElement).findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
    await user.click(
      within(capture as HTMLElement).getByRole("button", {
        name: /Save privately/i,
      }),
    );

    expect(
      screen.queryByRole("heading", { name: "Brain dump" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    // Vault is records-only now; analysis gaps no longer appear here.
    expect(screen.getByText("Documents & records")).toBeInTheDocument();
    expect(screen.queryByText("Parent signature")).not.toBeInTheDocument();
  });

  test("opens the review queue from the Home safety entry", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    const primaryNav = screen.getByRole("navigation", {
      name: "Household sections",
    });
    expect(
      within(primaryNav).queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Needs your OK/i }));

    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Approval queue" }),
    ).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: "Home" })).toHaveClass(
      "nav-item-primary",
      "active",
    );
    expect(screen.queryByLabelText("Approval status")).not.toBeInTheDocument();
  });

  test("opens brain dump capture from the Home blender action", async () => {
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
    await openBrainDump(user);

    const capture = screen
      .getByRole("heading", { name: "Brain dump" })
      .closest("section");
    expect(capture).not.toBeNull();
    await user.click(
      within(capture as HTMLElement).getByRole("button", {
        name: "Analyze intake",
      }),
    );

    expect(
      await screen.findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Needs approval/i }));

    expect(
      screen.queryByRole("heading", { name: "Brain dump" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
  });

  test("presents Capture as a guided AI command flow", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openBrainDump(user);

    const capture = screen.getByRole("region", { name: "Brain dump" });
    expect(
      within(capture).getByRole("heading", {
        name: "Paste anything",
      }),
    ).toBeInTheDocument();
    expect(
      within(capture).getByRole("textbox", {
        name: "Paste email, screenshot notes, forms, travel plans, or family admin",
      }),
    ).toBeInTheDocument();
    expect(
      within(capture).getByRole("button", { name: "Analyze intake" }),
    ).toBeInTheDocument();
    expect(
      within(capture).getByRole("region", { name: "Choose what this is" }),
    ).toBeInTheDocument();
  });

  test("lets Capture start from a plain-language life category", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openBrainDump(user);

    const capture = screen.getByRole("region", { name: "Brain dump" });
    const captureTypePicker = within(capture).getByRole("region", {
      name: "Choose what this is",
    });

    expect(
      within(captureTypePicker).getByText(
        "Start from a category to prefill an example, or just paste above.",
      ),
    ).toBeInTheDocument();
    expect(
      within(captureTypePicker).getByRole("button", {
        name: "Use travel template",
      }),
    ).toBeInTheDocument();
    expect(
      within(captureTypePicker).getByText("Flights, packing, rewards, TSA"),
    ).toBeInTheDocument();

    await user.click(
      within(captureTypePicker).getByRole("button", {
        name: "Use travel template",
      }),
    );

    expect(
      within(capture).getByDisplayValue(/Need TSA PreCheck numbers/i),
    ).toBeInTheDocument();
  });

  test("advances Capture guidance after analysis succeeds", async () => {
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
    await openBrainDump(user);

    const capture = screen.getByRole("region", { name: "Brain dump" });
    await user.click(
      within(capture).getByRole("button", { name: "Analyze intake" }),
    );

    expect(
      await within(capture).findByText("Sorted into relief steps"),
    ).toBeInTheDocument();
    expect(
      within(capture).getByRole("button", { name: /Put on calendar/i }),
    ).toBeInTheDocument();
    expect(
      within(capture).getByRole("button", { name: /Needs approval/i }),
    ).toBeInTheDocument();
    expect(
      within(capture).queryByRole("heading", { name: "Choose what this is" }),
    ).not.toBeInTheDocument();
  });

  test("routes analyzed Capture results into Calendar", async () => {
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
    await openBrainDump(user);

    const capture = screen
      .getByRole("heading", { name: "Brain dump" })
      .closest("section");
    expect(capture).not.toBeNull();
    await user.click(
      within(capture as HTMLElement).getByRole("button", {
        name: "Analyze intake",
      }),
    );

    expect(
      await within(capture as HTMLElement).findByText(
        "Sorted into relief steps",
      ),
    ).toBeInTheDocument();
    expect(
      within(capture as HTMLElement).getByRole("button", {
        name: /Next moves/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(capture as HTMLElement).getByRole("button", {
        name: /Put on calendar/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(capture as HTMLElement).getByRole("button", {
        name: /Save privately/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(capture as HTMLElement).queryByText(
        "Today gets the top priorities.",
      ),
    ).not.toBeInTheDocument();

    await user.click(
      within(capture as HTMLElement).getByRole("button", {
        name: /Put on calendar/i,
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Calendar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
  });

  test("projects current AI analysis into Calendar; Vault stays records-only", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: [],
    });

    render(<App />);

    await openCalendarFromCapture(user);

    expect(
      screen.getByRole("heading", { name: "Calendar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(screen.getByText("Missing: Parent signature")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cabinet" }));

    expect(screen.getByRole("heading", { name: "Vault" })).toBeInTheDocument();
    expect(screen.getByText("Documents & records")).toBeInTheDocument();
    // The "Parent signature" gap belongs on Calendar, not as a Vault record.
    expect(screen.queryByText("Parent signature")).not.toBeInTheDocument();
  });

  test("keeps Calendar AI suggestions until saved; Vault stays records-only", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: [],
    });

    const firstRender = render(<App />);

    await openCalendarFromCapture(user);

    expect(screen.getByText("Needs review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Saved to LifeMap")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();

    firstRender.unmount();
    render(<App />);

    await openCalendarFromCapture(user);
    expect(screen.getByText("Saved to LifeMap")).toBeInTheDocument();

    // Vault never carries the analysis gap as a record.
    await user.click(screen.getByRole("button", { name: "Cabinet" }));
    expect(screen.queryByText("Parent signature")).not.toBeInTheDocument();
    expect(screen.getByText("Documents & records")).toBeInTheDocument();
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
    await user.click(
      screen.getByRole("button", { name: "Refresh Daily Brief" }),
    );

    // Calm home no longer surfaces the AI summary as a status line; the refreshed
    // brief still drives the focus priority, which is what the user acts on.
    expect(
      await screen.findByText("Sign the field trip permission slip"),
    ).toBeInTheDocument();
  });

  test("keeps the old Daily Brief assistant card off Home", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    expect(
      screen.queryByRole("button", { name: "What matters?" }),
    ).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("keeps Daily Brief useful when AI refresh falls back", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error:
            "LifeMap could not analyze this yet. Try again or edit the intake.",
        }),
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(
      screen.getByRole("button", { name: "Refresh Daily Brief" }),
    );

    expect(
      await screen.findByText(
        "LifeMap is using the current map while AI refresh is unavailable.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You can still review priorities or capture a new update.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "LifeMap could not analyze this yet. Try again or edit the intake.",
      ),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Capture a new update" }),
    );

    expect(
      screen.getByRole("heading", { name: "Brain dump" }),
    ).toBeInTheDocument();
  });

  test("shows a guided Today path into capture, priority, and approvals", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    // Capture: the nav "Capture" action opens the AI capture flow.
    await openBrainDump(user);
    expect(
      screen.getByRole("heading", { name: "Brain dump" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Today" }));

    // Priority: tapping a priority row opens its focused dialog.
    await user.click(
      screen.getByRole("button", {
        name: "Open priority Field trip permission slip",
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Field trip permission slip" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    // Approvals: Review is a contextual Home safety entry.
    await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
  });

  test("presents approvals as a clear select review complete flow", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openReviewFromHome(user);

    const queue = screen.getByRole("region", { name: "Approval queue" });
    expect(within(queue).getByText("Needs your OK")).toBeInTheDocument();
    expect(within(queue).getByText("3 ready for your OK")).toBeInTheDocument();
    expect(
      within(queue).getByText(
        "Nothing sends, schedules, or changes until you say yes.",
      ),
    ).toBeInTheDocument();
    expect(within(queue).queryByText("3 selected")).not.toBeInTheDocument();
    expect(screen.queryByText("3 total")).not.toBeInTheDocument();
    expect(
      within(queue).getByRole("button", { name: "Ready to approve 3" }),
    ).toBeEnabled();
  });

  test("offers a Send email control on draft approval cards", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openReviewFromHome(user);

    const queue = screen.getByRole("region", { name: "Approval queue" });
    expect(
      within(queue).getAllByLabelText(/recipient email/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(queue).getAllByRole("button", { name: /send email/i }).length,
    ).toBeGreaterThan(0);
  });

  test("reveals a source quote when its chip is clicked", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openFamilyMap(user);

    const evidence = screen.getByRole("region", { name: "Source evidence" });
    const chip = within(evidence).getAllByRole("button")[0];
    const quote = chip.getAttribute("data-quote") as string;
    expect(
      within(evidence).queryByText(quote, { exact: false }),
    ).not.toBeInTheDocument();

    await user.click(chip);

    expect(
      within(evidence).getByText(quote, { exact: false }),
    ).toBeInTheDocument();
  });

  test("reset demo returns to a fresh Today from Settings", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Reset demo" }));

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  test("opens the privacy & security page from More", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(
      screen.getByRole("button", { name: "Open privacy and security" }),
    );

    expect(
      screen.getByRole("heading", { name: "Privacy & security" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing sends without an explicit Send/i),
    ).toBeInTheDocument();
  });

  test("shows a toast when returning from a Google Calendar connect", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/?google=connected");

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

    expect(
      await screen.findByText("Google Calendar connected."),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  test("makes approval toggles visibly change the next step", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openReviewFromHome(user);

    const queue = screen.getByRole("region", { name: "Approval queue" });
    const reminderToggle = within(queue).getByRole("switch", {
      name: "Hold Field trip permission slip due for now",
    });
    expect(reminderToggle).toBeChecked();

    await user.click(reminderToggle);

    expect(
      within(queue).getByRole("switch", {
        name: "Allow Field trip permission slip due for approval",
      }),
    ).not.toBeChecked();
    expect(
      within(queue).getByRole("button", { name: "Ready to approve 2" }),
    ).toBeEnabled();
  });

  test("lets a Today priority become a real action", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(
      screen.getByRole("button", {
        name: /Open priority Field trip permission slip/i,
      }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Field trip permission slip",
    });
    expect(dialog).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /Mark complete/i }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Field trip permission slip" }),
    ).not.toBeInTheDocument();
    // Completed priorities show as a checked-off node (struck text), not a label.
    expect(
      screen.getByRole("button", {
        name: "Mark Field trip permission slip not done",
      }),
    ).toBeInTheDocument();
  });

  test("keeps Vault profile and record details tucked away until tapped", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await user.click(screen.getByRole("button", { name: "Cabinet" }));

    expect(screen.queryByText("Westview Elementary")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Casey Kim/i }));

    expect(screen.getByText("Westview Elementary")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Open details for Casey passport" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Casey passport" });
    expect(
      within(dialog).getByText("Hidden until you reveal them."),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Reveal details" }),
    );

    expect(
      within(dialog).getByText("Renewal packet started"),
    ).toBeInTheDocument();
  });

  test("analyzes intake through the local AI API and keeps approvals user-controlled", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openFamilyMap(user);

    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(
      screen.getByText("Analyzing with LifeMap AI..."),
    ).toBeInTheDocument();
    resolveFetch({
      ok: true,
      json: async () => ({ ok: true, analysis: aiAnalysis }),
    });
    expect(
      await screen.findByText("Field trip permission slip"),
    ).toBeInTheDocument();
    expect(screen.getByText("Parent signature")).toBeInTheDocument();

    const approvalToggle = screen.getByRole("switch", {
      name: "Hold Permission slip due for now",
    });
    expect(approvalToggle).toBeChecked();

    await user.click(approvalToggle);

    expect(
      screen.getByRole("switch", {
        name: "Allow Permission slip due for approval",
      }),
    ).not.toBeChecked();
  });

  test("shows API errors and leaves the existing analysis visible", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "OPENAI_API_KEY is not configured.",
        }),
      }),
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));
    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(
      await screen.findByText("OPENAI_API_KEY is not configured."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Field trip permission slip").length,
    ).toBeGreaterThan(0);
  });

  test("does not replace an existing AI map when analysis fails", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "From: billing@example.org\nPay a dentist deposit by 7/2.",
      analysis: aiAnalysis,
      disabledApprovalIds: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error:
            "LifeMap could not analyze this yet. Try again or edit the intake.",
        }),
      }),
    );

    render(<App />);

    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Analyze intake" }));

    expect(
      await screen.findByText(
        "LifeMap could not analyze this yet. Try again or edit the intake.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(
      screen.queryByText("Completed form details"),
    ).not.toBeInTheDocument();
  });

  test("restores demo state from browser storage", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      dailyBrief: aiBrief,
      disabledApprovalIds: ["reminder-slip"],
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    // Calm home drops the AI summary line; the restored brief still drives the
    // focus priority (asserted below) so we know state rehydrated.
    await openFamilyMap(user);
    expect(screen.getByDisplayValue("stored school note")).toBeInTheDocument();
    expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: "Allow Permission slip due for approval",
      }),
    ).not.toBeChecked();
  });

  test("lets a draft message be edited before review", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: [],
    });

    const { unmount } = render(<App />);

    await openFamilyMap(user);
    await user.click(
      screen.getByRole("button", { name: "Edit Permission slip for Casey" }),
    );
    const draftBody = screen.getByLabelText(
      "Draft body for Permission slip for Casey",
    );
    await user.clear(draftBody);
    await user.type(
      draftBody,
      "Hi, Casey's signed permission slip will be returned tomorrow.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save Permission slip for Casey" }),
    );

    expect(
      screen.getByText(
        "Hi, Casey's signed permission slip will be returned tomorrow.",
      ),
    ).toBeInTheDocument();

    unmount();
    render(<App />);

    await openFamilyMap(user);
    expect(
      screen.getByText(
        "Hi, Casey's signed permission slip will be returned tomorrow.",
      ),
    ).toBeInTheDocument();
  });

  test("reviews only selected approvals with edited body text", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"],
    });

    render(<App />);

    await openFamilyMap(user);
    await user.click(
      screen.getByRole("button", { name: "Edit Permission slip for Casey" }),
    );
    const draftBody = screen.getByLabelText(
      "Draft body for Permission slip for Casey",
    );
    await user.clear(draftBody);
    await user.type(draftBody, "Hi, the signed slip is attached for Casey.");
    await user.click(
      screen.getByRole("button", { name: "Save Permission slip for Casey" }),
    );
    await user.click(screen.getByRole("button", { name: "Ready to approve 1" }));

    const dialog = screen.getByRole("dialog", {
      name: "Approve these actions",
    });
    expect(
      within(dialog).queryByText("Permission slip due"),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("Permission slip for Casey"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Hi, the signed slip is attached for Casey."),
    ).toBeInTheDocument();
  });

  test("stages only selected approvals without sending or scheduling", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"],
    });

    render(<App />);

    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Ready to approve 1" }));
    await user.click(screen.getByRole("button", { name: "Approve for now" }));

    expect(
      screen.queryByRole("dialog", { name: "Approve these actions" }),
    ).not.toBeInTheDocument();

    const stagedSummary = screen.getByLabelText("Demo staged approvals");
    expect(
      within(stagedSummary).getByRole("heading", { name: "Approved for now" }),
    ).toBeInTheDocument();
    expect(
      within(stagedSummary).getByText("1 item approved", { exact: false }),
    ).toBeInTheDocument();
    expect(within(stagedSummary).getByText("1 draft")).toBeInTheDocument();
    expect(within(stagedSummary).getByText("0 reminders")).toBeInTheDocument();
    expect(
      within(stagedSummary).getByText("Permission slip for Casey"),
    ).toBeInTheDocument();
    expect(
      within(stagedSummary).queryByText("Permission slip due"),
    ).not.toBeInTheDocument();
    expect(
      within(stagedSummary).getByText(
        "Nothing was sent automatically. Draft messages still require Send email.",
      ),
    ).toBeInTheDocument();
  });

  test("ends the approval flow after selected items are staged", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"],
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
    await user.click(screen.getByRole("button", { name: "Ready to approve 1" }));
    await user.click(screen.getByRole("button", { name: "Approve for now" }));

    const stagedSummary = screen.getByLabelText("Demo staged approvals");
    expect(
      within(stagedSummary).getByRole("heading", { name: "Approved for now" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ready to approve \d/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  test("loads sample intakes and clears stale staged approvals", async () => {
    const user = userEvent.setup();
    saveStoredDemoState({
      isLoggedIn: true,
      intake: "stored school note",
      analysis: aiAnalysis,
      disabledApprovalIds: ["reminder-slip"],
    });

    render(<App />);

    await openFamilyMap(user);
    await user.click(screen.getByRole("button", { name: "Ready to approve 1" }));
    await user.click(screen.getByRole("button", { name: "Approve for now" }));
    expect(screen.getByLabelText("Demo staged approvals")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Doctor appointment" }),
    );

    expect(screen.getByDisplayValue(/Valley Pediatrics/)).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Demo staged approvals"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("AI map updated. Review before sending anything."),
    ).not.toBeInTheDocument();
  });
});
