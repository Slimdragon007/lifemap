import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import OnboardingView, { type OnboardingPerson } from "./onboarding-view";

// The "Your people" step must be scalable — any number of people (3+ kids
// included) and a free-form "+ Add another" — and it must actually hand that
// structured list to onComplete (the old wizard discarded it).

async function advanceToPeopleStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continue" })); // intro
  await user.type(screen.getByLabelText("Your name"), "Alex");
  await user.click(screen.getByRole("button", { name: "Continue" })); // step 1
  // Now on step 2 ("Your people").
}

async function finishFromPeopleStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continue" })); // step 2 -> 3
  await user.click(screen.getByRole("button", { name: "Continue" })); // step 3 -> 4
  await user.click(screen.getByRole("button", { name: "Continue" })); // step 4 -> 5
  await user.click(screen.getByRole("button", { name: "Enter LifeMap" }));
}

describe("OnboardingView proof moment", () => {
  test("opens with a filled LifeMap example and sensitive-data reassurance", () => {
    render(<OnboardingView onComplete={vi.fn()} onSkip={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "See what LifeMap does before you add anything.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It turns scattered family details into a few places you can actually find again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Search: Casey passport")).toBeInTheDocument();
    expect(screen.getByText("Casey passport")).toBeInTheDocument();
    expect(
      screen.getByText("Cabinet · IDs · renew by Aug 14"),
    ).toBeInTheDocument();
    expect(screen.getByText("Found instantly")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Files are encrypted before upload. Private records stay hidden until opened, and nothing is sent or shared without your OK.",
      ),
    ).toBeInTheDocument();
  });

  test("still supports Continue into setup and Skip out of onboarding", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const { unmount } = render(
      <OnboardingView onComplete={vi.fn()} onSkip={onSkip} />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();

    unmount();
    render(<OnboardingView onComplete={vi.fn()} onSkip={onSkip} />);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe("OnboardingView step 1 name", () => {
  test("step-1 Continue is disabled until a name is entered", async () => {
    const user = userEvent.setup();
    render(<OnboardingView onComplete={vi.fn()} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Continue" })); // intro

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByLabelText("Your name"), "Alex");
    expect(continueButton).toBeEnabled();
  });

  test("prefills the name from initialName", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingView
        initialName="Michael"
        onComplete={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    // Step through the intro cover to reach step 1.
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("Michael");
  });
});

describe("OnboardingView 'Your people' step", () => {
  test("emits every chosen person — 3+ kids and a custom add — through onComplete", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingView onComplete={onComplete} onSkip={vi.fn()} />);

    await advanceToPeopleStep(user);

    // Quick chips: Partner (adult) + the first child via "A child".
    await user.click(screen.getByRole("button", { name: "Partner" }));
    await user.click(screen.getByRole("button", { name: "A child" }));

    // Two more children + a pet via "+ Add another" — proving no 2-kid cap.
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.click(screen.getByRole("button", { name: "Add another" }));

    const list = screen.getByRole("list", { name: "People in your map" });
    const rows = within(list).getAllByRole("listitem");
    // You + Partner + A child + 3 added rows = 6 rows.
    expect(rows).toHaveLength(6);

    // Name + role the three custom rows (indices 4,5,6 are persons 4,5,6).
    await user.type(screen.getByLabelText("Name for person 4"), "Sam");
    await user.type(screen.getByLabelText("Name for person 5"), "Lee");
    await user.type(screen.getByLabelText("Name for person 6"), "Rex");
    await user.selectOptions(screen.getByLabelText("Role for person 6"), "pet");

    await finishFromPeopleStep(user);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const payload = onComplete.mock.calls[0][0] as {
      name: string;
      areas: string[];
      people: OnboardingPerson[];
    };
    expect(payload.name).toBe("Alex");

    const byName = (n: string) => payload.people.find((p) => p.name === n);
    expect(payload.people).toHaveLength(6);
    expect(byName("You")?.role).toBe("adult");
    expect(byName("Partner")?.role).toBe("adult");
    expect(byName("A child")?.role).toBe("child");
    expect(byName("Sam")?.role).toBe("child");
    expect(byName("Lee")?.role).toBe("child");
    expect(byName("Rex")?.role).toBe("pet");
    // Three children present (A child, Sam, Lee) — the old fixed list capped at 2.
    expect(payload.people.filter((p) => p.role === "child")).toHaveLength(3);
  });

  test("drops unnamed added rows from the payload", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingView onComplete={onComplete} onSkip={vi.fn()} />);

    await advanceToPeopleStep(user);
    // Add a blank row and never name it.
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await finishFromPeopleStep(user);

    const payload = onComplete.mock.calls[0][0] as {
      people: OnboardingPerson[];
    };
    // Only the seeded "You" survives; the empty row is dropped.
    expect(payload.people).toEqual([{ name: "You", role: "adult" }]);
  });

  test("keeps the chip linked after a rename and collapses duplicate names", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OnboardingView onComplete={onComplete} onSkip={vi.fn()} />);

    await advanceToPeopleStep(user);

    // Rename the seeded "You" row. The "You" chip stays active (linked by a
    // stable marker, not the editable name) — so it is not re-added as a dup.
    const youInput = screen.getByLabelText("Name for person 1");
    await user.clear(youInput);
    await user.type(youInput, "Alex");
    expect(screen.getByRole("button", { name: "You" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // A second row also named "Alex" is collapsed by the dedup in finish().
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.type(screen.getByLabelText("Name for person 2"), "Alex");

    await finishFromPeopleStep(user);

    const payload = onComplete.mock.calls[0][0] as {
      people: OnboardingPerson[];
    };
    expect(payload.people.filter((p) => p.name === "Alex")).toHaveLength(1);
  });
});
