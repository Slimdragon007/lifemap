# LifeMap Onboarding Proof Moment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact onboarding proof moment that shows a filled LifeMap example, search payoff, and sensitive-data reassurance before setup.

**Architecture:** Update the existing `OnboardingView` intro cover only. The proof moment is static UI content, does not create records, and does not call Supabase, Storage, AI, or the Worker. Existing onboarding steps, completion payload, skip behavior, and persistence stay unchanged.

**Tech Stack:** Vite, React 18, TypeScript, CSS, Vitest, Testing Library, npm.

---

## File Structure

- Modify `src/onboarding-view.test.tsx`: update intro expectations and add assertions for search, result, trust note, Continue, and Skip.
- Modify `src/App.test.tsx`: update replay-tour copy expectation to the new proof heading.
- Modify `src/onboarding-view.tsx`: replace the intro cover copy with a static proof preview.
- Modify `src/styles.css`: add compact proof-preview styles near the existing onboarding CSS.
- Keep `.gitignore` unchanged unless `.superpowers/` is no longer ignored.

## Task 1: Lock Onboarding Proof Behavior With Tests

**Files:**
- Modify: `src/onboarding-view.test.tsx`

- [x] **Step 1: Replace the welcome-copy test with proof-moment assertions**

Change the first onboarding welcome-copy test block to:

```tsx
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
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test -- src/onboarding-view.test.tsx --reporter=dot
```

Expected: FAIL because the current intro still says `Welcome. Let's put the mental load somewhere safe.` and does not render the proof preview.

## Task 2: Implement Static Proof Preview

**Files:**
- Modify: `src/onboarding-view.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Replace the intro body in `src/onboarding-view.tsx`**

Replace the current intro body block with:

```tsx
<div className="onboarding-body onboarding-proof-body">
  <div className="onboarding-proof-copy">
    <p className="onboarding-kicker">See it in action</p>
    <h1 id="onboarding-intro-title">
      See what LifeMap does before you add anything.
    </h1>
    <p className="onboarding-lede">
      It turns scattered family details into a few places you can actually find
      again.
    </p>
  </div>

  <div
    className="onboarding-proof-preview"
    aria-label="Example of a filled LifeMap"
  >
    <div className="onboarding-proof-search">Search: Casey passport</div>
    <div className="onboarding-proof-result">
      <div>
        <strong>Casey passport</strong>
        <span>Cabinet · IDs · renew by Aug 14</span>
      </div>
      <em>Found instantly</em>
    </div>
    <div className="onboarding-proof-grid">
      <div>
        <span>Today</span>
        <strong>1 priority from your family records</strong>
      </div>
      <div>
        <span>Cabinet</span>
        <strong>4 records saved privately</strong>
      </div>
    </div>
    <p className="onboarding-proof-trust">
      Files are encrypted before upload. Private records stay hidden until
      opened, and nothing is sent or shared without your OK.
    </p>
  </div>
</div>
```

- [x] **Step 2: Add proof-preview CSS near the onboarding styles in `src/styles.css`**

Add after `.onboarding-lede`:

```css
.onboarding-kicker {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  color: var(--color-accent-blue-strong);
}

.onboarding-proof-body {
  gap: 16px;
  padding-top: 22px;
}

.onboarding-proof-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-proof-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(255, 239, 222, 0.88),
      transparent 38%
    ),
    rgba(255, 255, 255, 0.74);
  box-shadow: var(--shadow-control);
}

.onboarding-proof-search,
.onboarding-proof-result,
.onboarding-proof-grid > div,
.onboarding-proof-trust {
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  background: var(--color-surface-panel);
}

.onboarding-proof-search {
  padding: 11px 13px;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 650;
}

.onboarding-proof-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
}

.onboarding-proof-result div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.onboarding-proof-result strong,
.onboarding-proof-grid strong {
  color: var(--color-text-strong);
  font-size: 14px;
  line-height: 1.25;
}

.onboarding-proof-result span,
.onboarding-proof-grid span {
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.25;
}

.onboarding-proof-result em {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--color-accent-sky);
  color: var(--color-accent-blue-strong);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.onboarding-proof-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.onboarding-proof-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px;
}

.onboarding-proof-trust {
  margin: 0;
  padding: 12px;
  background: #f4fbf7;
  border-color: #cfe5dc;
  color: #25483b;
  font-size: 12.5px;
  line-height: 1.4;
}
```

- [x] **Step 3: Add mobile stacking CSS if needed**

Add near existing mobile rules if the proof grid overflows on iPhone width:

```css
@media (max-width: 420px) {
  .onboarding-proof-result {
    align-items: flex-start;
    flex-direction: column;
  }

  .onboarding-proof-grid {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm run test -- src/onboarding-view.test.tsx --reporter=dot
```

Expected: PASS.

## Task 3: Full Verification And Commit

**Files:**
- Verify all changed files.

- [x] **Step 1: Run core checks**

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
```

Expected:

- Lint passes.
- Typecheck passes.
- Vitest passes.
- Build passes. Existing Vite chunk-size warning is acceptable.

- [x] **Step 2: Inspect changed files**

Run:

```bash
git diff --check
git status --short
```

Expected:

- No whitespace errors.
- Only expected files changed:
  - `docs/superpowers/plans/2026-06-30-onboarding-proof-moment.md`
  - `src/App.test.tsx`
  - `src/onboarding-view.tsx`
  - `src/styles.css`
  - `src/onboarding-view.test.tsx`

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-30-onboarding-proof-moment.md src/onboarding-view.tsx src/styles.css src/onboarding-view.test.tsx
git commit -m "feat: show LifeMap proof in onboarding"
```

- [ ] **Step 4: Push and verify production**

Run:

```bash
git push origin main
npm run verify:production
```

Expected:

- GitHub push succeeds.
- Cloudflare Pages GitHub deployment succeeds.
- Production verification passes 6 checks.
