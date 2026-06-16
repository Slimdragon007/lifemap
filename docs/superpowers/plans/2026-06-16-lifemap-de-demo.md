# LifeMap De-Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A real authenticated LifeMap session never renders demo identity ("Alex Kim") or hardcoded sample collections, and shows no demo flash on load — while the demo build keeps its full Alex Kim experience unchanged.

**Architecture:** Introduce one demo-mode seam (`demoMode`) plus three pure, unit-tested selectors — `viewerIdentity` (identity), `sampleCollections` (sample data), and `initialAppState` (seed-vs-empty). The leaking views (`TodayView`, `VaultView`, `CalendarView`) become pure: identity and collections arrive as props, so they render correctly in both modes and are testable in both (important because `isSupabaseConfigured` is pinned `false` under Vitest). `App` computes the seam values once and threads them in.

**Tech Stack:** Vite + React + TypeScript; Vitest + @testing-library/react (jsdom, globals, setup `./src/test/setup.ts`); run on **Node 22** (`nvm use 22`).

**Conventions:**

- Run `nvm use 22` before any `npm test` / `npm run build` / `npm run typecheck`.
- A PostToolUse formatter hook reformats files after writes (e.g. trailing commas). If a later Edit fails with "String to replace not found", re-read the file and re-apply.
- Commit messages end with the trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Do NOT deploy. These commits stay local until Slim says "ship it".

---

## File Structure

**New files**

- `src/demoMode.ts` — single source of truth for "show sample data" (`demoMode = !isSupabaseConfigured`).
- `src/demoMode.test.ts` — asserts demo mode is on under Vitest.
- `src/viewer.ts` — `viewerIdentity(session, demoMode): ViewerIdentity` (name + initials).
- `src/viewer.test.ts` — exhaustive identity cases, both modes.
- `src/sampleData.ts` — `sampleCollections(demoMode): SampleCollections` (familyMembers/familyEvents/vaultItems/recurringCareItems/householdAreas). Owns the household-areas sample (moved out of App).
- `src/sampleData.test.ts` — demo returns constants, real returns empties.
- `src/TodayView.test.tsx` — real identity renders no "Alex Kim"; demo renders "AK".
- `src/VaultView.test.tsx` — real mode renders no Alex/Casey/Milo and shows empty states; demo still renders sample data.
- `src/CalendarView.test.tsx` — real mode renders no demo events and shows empty states; demo still renders sample data.

**Modified files**

- `src/storage.ts` — export `emptyAnalysis`/`emptyDailyBrief`; add `InitialAppState` type + `initialAppState(...)`.
- `src/storage.test.ts` — add `initialAppState` cases.
- `src/TodayView.tsx` — add `identity` prop; avatar uses it (drop hardcoded "AK"/"Alex Kim").
- `src/VaultView.tsx` — `familyMembers`/`vaultItems`/`recurringCareItems`/`identity` as props; empty states; Emergency "Primary contact" uses `identity`.
- `src/CalendarView.tsx` — `familyEvents`/`recurringCareItems` as props; empty states.
- `src/App.tsx` — compute `demoMode`, `identity`, `samples`; thread to the three views; sidebar uses `samples.householdAreas`; seed initial state via `initialAppState`; empty the `applyStoredState` fallbacks.

---

## Task 1: `viewer.ts` — viewer identity selector

**Files:**

- Create: `src/viewer.ts`
- Test: `src/viewer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/viewer.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { viewerIdentity } from "./viewer";

describe("viewerIdentity", () => {
  test("demo mode always returns the Alex Kim identity", () => {
    expect(viewerIdentity(null, true)).toEqual({
      name: "Alex Kim",
      initials: "AK",
    });
    expect(
      viewerIdentity({ user: { email: "real@person.com" } }, true),
    ).toEqual({ name: "Alex Kim", initials: "AK" });
  });

  test("real mode derives name and initials from a dotted email local-part", () => {
    expect(
      viewerIdentity({ user: { email: "m.haslim@gmail.com" } }, false),
    ).toEqual({ name: "m.haslim", initials: "MH" });
  });

  test("real mode derives initials from a single-token local-part", () => {
    expect(
      viewerIdentity({ user: { email: "casey@example.com" } }, false),
    ).toEqual({ name: "casey", initials: "CA" });
  });

  test("real mode uses the first two tokens for initials", () => {
    expect(
      viewerIdentity({ user: { email: "jordan.lee.smith@x.com" } }, false),
    ).toEqual({ name: "jordan.lee.smith", initials: "JL" });
  });

  test("real mode with no session falls back to a neutral viewer", () => {
    expect(viewerIdentity(null, false)).toEqual({ name: "You", initials: "" });
  });

  test("real mode with a session but no email falls back to neutral viewer", () => {
    expect(viewerIdentity({ user: {} }, false)).toEqual({
      name: "You",
      initials: "",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/viewer.test.ts`
Expected: FAIL — "Failed to resolve import \"./viewer\"" / `viewerIdentity is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/viewer.ts`:

```ts
export type ViewerIdentity = { name: string; initials: string };

// Structural shape — accepts a Supabase Session or a hand-built test stub.
export type ViewerSession = { user: { email?: string | null } } | null;

export function viewerIdentity(
  session: ViewerSession,
  demoMode: boolean,
): ViewerIdentity {
  if (demoMode) {
    return { name: "Alex Kim", initials: "AK" };
  }

  const email = session?.user.email;
  if (!email) {
    return { name: "You", initials: "" };
  }

  const localPart = email.split("@")[0];
  return { name: localPart, initials: initialsFromLocalPart(localPart) };
}

function initialsFromLocalPart(localPart: string): string {
  const tokens = localPart.split(/[._\-+]/).filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22 && npx vitest run src/viewer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/viewer.ts src/viewer.test.ts
git commit -m "feat: add viewerIdentity selector for de-demo identity

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `sampleData.ts` — sample collections selector

**Files:**

- Create: `src/sampleData.ts`
- Test: `src/sampleData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/sampleData.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { sampleCollections } from "./sampleData";
import {
  familyEvents,
  familyMembers,
  recurringCareItems,
  vaultItems,
} from "./familyOS";

describe("sampleCollections", () => {
  test("demo mode returns the familyOS sample constants plus household areas", () => {
    const samples = sampleCollections(true);
    expect(samples.familyMembers).toEqual(familyMembers);
    expect(samples.familyEvents).toEqual(familyEvents);
    expect(samples.vaultItems).toEqual(vaultItems);
    expect(samples.recurringCareItems).toEqual(recurringCareItems);
    expect(samples.householdAreas).toEqual([
      { label: "School", count: 4 },
      { label: "Medical", count: 3 },
      { label: "Bills", count: 2 },
      { label: "Travel", count: 1 },
    ]);
  });

  test("real mode returns empty collections", () => {
    const samples = sampleCollections(false);
    expect(samples.familyMembers).toEqual([]);
    expect(samples.familyEvents).toEqual([]);
    expect(samples.vaultItems).toEqual([]);
    expect(samples.recurringCareItems).toEqual([]);
    expect(samples.householdAreas).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/sampleData.test.ts`
Expected: FAIL — "Failed to resolve import \"./sampleData\"".

- [ ] **Step 3: Write minimal implementation**

Create `src/sampleData.ts`:

```ts
import {
  familyEvents,
  familyMembers,
  recurringCareItems,
  vaultItems,
  type FamilyEvent,
  type FamilyMember,
  type RecurringCareItem,
  type VaultItem,
} from "./familyOS";

export type HouseholdArea = { label: string; count: number };

export type SampleCollections = {
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];
  vaultItems: VaultItem[];
  recurringCareItems: RecurringCareItem[];
  householdAreas: HouseholdArea[];
};

const demoHouseholdAreas: HouseholdArea[] = [
  { label: "School", count: 4 },
  { label: "Medical", count: 3 },
  { label: "Bills", count: 2 },
  { label: "Travel", count: 1 },
];

export function sampleCollections(demoMode: boolean): SampleCollections {
  if (!demoMode) {
    return {
      familyMembers: [],
      familyEvents: [],
      vaultItems: [],
      recurringCareItems: [],
      householdAreas: [],
    };
  }

  return {
    familyMembers,
    familyEvents,
    vaultItems,
    recurringCareItems,
    householdAreas: demoHouseholdAreas,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22 && npx vitest run src/sampleData.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sampleData.ts src/sampleData.test.ts
git commit -m "feat: add sampleCollections selector for de-demo data

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `demoMode.ts` — single demo-mode source of truth

**Files:**

- Create: `src/demoMode.ts`
- Test: `src/demoMode.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/demoMode.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { demoMode } from "./demoMode";
import { isSupabaseConfigured } from "./supabaseClient";

describe("demoMode", () => {
  test("is the inverse of isSupabaseConfigured", () => {
    expect(demoMode).toBe(!isSupabaseConfigured);
  });

  test("is on under Vitest (Supabase is pinned off in tests)", () => {
    expect(demoMode).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/demoMode.test.ts`
Expected: FAIL — "Failed to resolve import \"./demoMode\"".

- [ ] **Step 3: Write minimal implementation**

Create `src/demoMode.ts`:

```ts
import { isSupabaseConfigured } from "./supabaseClient";

// True when the app shows sample (demo) data instead of a real account.
// Demo mode = no Supabase env configured. Pinned true under Vitest.
export const demoMode = !isSupabaseConfigured;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22 && npx vitest run src/demoMode.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/demoMode.ts src/demoMode.test.ts
git commit -m "feat: add demoMode single source of truth

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `initialAppState` — seed-vs-empty seam in storage.ts

**Files:**

- Modify: `src/storage.ts` (export `emptyAnalysis`/`emptyDailyBrief`; add `InitialAppState` + `initialAppState`)
- Test: `src/storage.test.ts` (append cases)

- [ ] **Step 1: Write the failing test**

Append to `src/storage.test.ts` (after the existing `describe` block, before EOF). Add the import at the top of the file by extending the existing storage import and adding the demoSeed import:

Add to the existing top-of-file import from `./storage` (it currently imports `authoritativeRemoteState, clearStoredDemoState, emptyPersistedState, loadStoredDemoState, saveStoredDemoState`) so it also imports `initialAppState`. Then add a new import below the existing imports:

```ts
import {
  presentationAnalysis,
  presentationBrief,
  presentationIntake,
} from "./demoSeed";
```

Then append this describe block at the end of the file:

```ts
describe("initialAppState", () => {
  test("real mode returns the empty persisted state and ignores stored demo data", () => {
    const result = initialAppState({
      demoMode: false,
      stored: { intake: "leftover demo notes", isLoggedIn: true },
    });

    expect(result.intake).toBe("");
    expect(result.analysis).toEqual(emptyPersistedState().analysis);
    expect(result.dailyBrief).toEqual(emptyPersistedState().dailyBrief);
    expect(result.isLoggedIn).toBeUndefined();
  });

  test("demo mode with no stored state seeds the presentation demo", () => {
    const result = initialAppState({ demoMode: true, stored: {} });

    expect(result.intake).toBe(presentationIntake);
    expect(result.analysis).toEqual(presentationAnalysis);
    expect(result.dailyBrief).toEqual(presentationBrief);
  });

  test("demo mode lets stored values override the demo seeds", () => {
    const result = initialAppState({
      demoMode: true,
      stored: { intake: "my own notes" },
    });

    expect(result.intake).toBe("my own notes");
    expect(result.analysis).toEqual(presentationAnalysis);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/storage.test.ts`
Expected: FAIL — `initialAppState is not a function` (and a type error on the import).

- [ ] **Step 3: Write minimal implementation**

In `src/storage.ts`:

3a. Add the demoSeed import directly below the existing `setupBuckets` import block at the top:

```ts
import {
  presentationAnalysis,
  presentationBrief,
  presentationIntake,
} from "./demoSeed";
```

3b. Export the two empty builders — change their declarations from `function` to `export function`:

```ts
export function emptyAnalysis(): LifeMapAnalysis {
```

```ts
export function emptyDailyBrief(): DailyBrief {
```

3c. At the end of the file (after `authoritativeRemoteState`), add:

```ts
export type InitialAppState = StoredDemoState & {
  intake: string;
  analysis: LifeMapAnalysis;
  dailyBrief: DailyBrief;
};

// The seed for the very first render. Real accounts start empty (no demo
// flash, leftover demo localStorage ignored). Demo builds start from the
// presentation seeds, with any stored values taking precedence.
export function initialAppState({
  demoMode,
  stored,
}: {
  demoMode: boolean;
  stored: StoredDemoState;
}): InitialAppState {
  const base: StoredDemoState = demoMode
    ? {
        ...emptyPersistedState(),
        intake: presentationIntake,
        analysis: presentationAnalysis,
        dailyBrief: presentationBrief,
        ...stored,
      }
    : emptyPersistedState();

  return {
    ...base,
    intake: base.intake ?? "",
    analysis: base.analysis ?? emptyAnalysis(),
    dailyBrief: base.dailyBrief ?? emptyDailyBrief(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22 && npx vitest run src/storage.test.ts`
Expected: PASS (existing cases + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts src/storage.test.ts
git commit -m "feat: add initialAppState seed-vs-empty seam

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: TodayView identity prop + App wiring

**Files:**

- Modify: `src/TodayView.tsx` (add `identity` prop; avatar uses it)
- Test: `src/TodayView.test.tsx`
- Modify: `src/App.tsx` (import `demoMode` + `viewerIdentity`; compute `identity`; pass to TodayView)

- [ ] **Step 1: Write the failing test**

Create `src/TodayView.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/TodayView.test.tsx`
Expected: FAIL — `identity` is not a valid prop yet; the avatar still renders hardcoded `aria-label="Alex Kim"`, so `queryByLabelText("Alex Kim")` is non-null and `getByLabelText("m.haslim")` throws.

- [ ] **Step 3: Write minimal implementation**

In `src/TodayView.tsx`:

3a. Add the identity type import below the existing `import type { RecommendedBucket, SetupProfile } from "./setupBuckets";` line:

```ts
import type { ViewerIdentity } from "./viewer";
```

3b. Add `identity` to `TodayViewProps` (place it after the `map` field):

```ts
map: LifeMapAnalysis;
identity: ViewerIdentity;
```

3c. Add `identity` to the destructured params (after `map`):

```ts
  map,
  identity,
```

3d. Replace the hardcoded avatar (currently):

```tsx
<span className="atlas-avatar" aria-label="Alex Kim">
  AK
</span>
```

with:

```tsx
<span className="atlas-avatar" aria-label={identity.name}>
  {identity.initials}
</span>
```

- [ ] **Step 4: Run TodayView test to verify it passes**

Run: `nvm use 22 && npx vitest run src/TodayView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire App to pass identity**

In `src/App.tsx`:

5a. Add imports near the other local imports (e.g. below the `import { useSession } from "./useSession";` line):

```ts
import { demoMode } from "./demoMode";
import { viewerIdentity } from "./viewer";
```

5b. Inside `App()`, just after `const { session, loading: sessionLoading } = useSession();`, add:

```ts
const identity = useMemo(() => viewerIdentity(session, demoMode), [session]);
```

5c. In the `<TodayView ... />` render, add the `identity` prop (e.g. right after `error={briefError}`):

```tsx
identity = { identity };
```

- [ ] **Step 6: Run the full suite to verify App still compiles and demo is intact**

Run: `nvm use 22 && npm test`
Expected: PASS — all suites green (demo App tests render `identity` = Alex Kim / AK).

- [ ] **Step 7: Commit**

```bash
git add src/TodayView.tsx src/TodayView.test.tsx src/App.tsx
git commit -m "feat: thread viewer identity into TodayView avatar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: VaultView props + empty states + App wiring (samples + sidebar)

**Files:**

- Modify: `src/VaultView.tsx` (collections + identity as props; empty states)
- Test: `src/VaultView.test.tsx`
- Modify: `src/App.tsx` (compute `samples`; pass Vault props; sidebar uses `samples.householdAreas`; remove App `householdAreas` const)

- [ ] **Step 1: Write the failing test**

Create `src/VaultView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import VaultView from "./VaultView";
import type { LifeMapAnalysis } from "./lifemap";
import { familyMembers, recurringCareItems, vaultItems } from "./familyOS";

const emptyMap: LifeMapAnalysis = {
  dueItems: [],
  missingInfo: [],
  waitingOn: [],
  nextActions: [],
  reminders: [],
  draftMessages: [],
  sourceEvidence: [],
};

const handlers = {
  onSaveSuggestion: vi.fn(),
  onSaveSuggestions: vi.fn(),
  onDismissSuggestion: vi.fn(),
};

describe("VaultView de-demo", () => {
  test("a real viewer sees no demo people and gets empty states", () => {
    render(
      <VaultView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyMembers={[]}
        identity={{ name: "m.haslim", initials: "MH" }}
        recurringCareItems={[]}
        savedSuggestionIds={new Set()}
        vaultItems={[]}
        {...handlers}
      />,
    );

    expect(screen.queryByText("Alex Kim")).toBeNull();
    expect(screen.queryByText(/Casey health note/i)).toBeNull();
    expect(screen.queryByText(/Milo vet/i)).toBeNull();
    expect(screen.getByText(/No family profiles yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Emergency basics appear once you add family profiles/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No recurring care loops yet/i),
    ).toBeInTheDocument();
  });

  test("demo mode still renders the sample family and emergency contact", () => {
    render(
      <VaultView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyMembers={familyMembers}
        identity={{ name: "Alex Kim", initials: "AK" }}
        recurringCareItems={recurringCareItems}
        savedSuggestionIds={new Set()}
        vaultItems={vaultItems}
        {...handlers}
      />,
    );

    expect(screen.getAllByText("Alex Kim").length).toBeGreaterThan(0);
    expect(screen.getByText(/Casey health note/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/VaultView.test.tsx`
Expected: FAIL — VaultView does not accept `familyMembers`/`vaultItems`/`recurringCareItems`/`identity`, still imports the constants directly, and renders hardcoded "Alex Kim · (555) 010-1172" so the real-mode assertions fail.

- [ ] **Step 3: Write minimal implementation**

In `src/VaultView.tsx`:

3a. Replace the familyOS import block (currently imports `buildVaultItemsFromAnalysis, familyMembers, recurringCareItems, vaultItems, type VaultCategory, type VaultItem`) with:

```ts
import {
  buildVaultItemsFromAnalysis,
  type FamilyMember,
  type RecurringCareItem,
  type VaultCategory,
  type VaultItem,
} from "./familyOS";
import type { ViewerIdentity } from "./viewer";
```

3b. Add the new fields to `VaultViewProps` (after the existing `analysis: LifeMapAnalysis;` line):

```ts
  familyMembers: FamilyMember[];
  vaultItems: VaultItem[];
  recurringCareItems: RecurringCareItem[];
  identity: ViewerIdentity;
```

3c. Add them to the destructured params (after `analysis,`):

```ts
  analysis,
  familyMembers,
  vaultItems,
  recurringCareItems,
  identity,
```

3d. Update the `allItems` memo to depend on the `vaultItems` prop:

```ts
const allItems = useMemo(
  () => [...visibleAnalysisItems, ...vaultItems],
  [visibleAnalysisItems, vaultItems],
);
```

3e. Replace the family profile list body. The current `<div className="profile-list">` maps `familyMembers` unconditionally; wrap it:

```tsx
<div className="profile-list">
  {familyMembers.length > 0 ? (
    familyMembers.map((member) => (
      <article
        className={
          expandedProfileIds.has(member.id)
            ? "profile-card profile-card-expanded"
            : "profile-card"
        }
        key={member.id}
      >
        <button
          aria-expanded={expandedProfileIds.has(member.id)}
          className="profile-card-toggle"
          type="button"
          onClick={() => toggleProfile(member.id)}
        >
          <span className={`profile-avatar profile-${member.profileType}`}>
            {member.initials}
          </span>
          <span>
            <span className="profile-card-top">
              <h3>{member.name}</h3>
              <span>{member.role}</span>
            </span>
            <small>
              {expandedProfileIds.has(member.id)
                ? "Details are visible"
                : "Tap to reveal private details"}
            </small>
          </span>
          <ChevronDown size={17} />
        </button>
        {expandedProfileIds.has(member.id) ? (
          <div className="profile-hidden-details">
            <dl className="profile-details">
              {member.details.map((detail) => (
                <div key={`${member.id}-${detail.label}`}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="care-note-list">
              {member.careNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    ))
  ) : (
    <p className="empty-note">
      No family profiles yet. Capture family details to build them.
    </p>
  )}
</div>
```

3f. Replace the documents record list (`<div className="vault-record-list">`) with an empty-state guard:

```tsx
<div className="vault-record-list">
  {visibleItems.length > 0 ? (
    visibleItems.map((item) => (
      <VaultCard
        isSaved={savedSuggestionIds.has(item.id)}
        item={item}
        key={item.id}
        onDismissSuggestion={() => dismissSuggestion(item)}
        onOpenDetails={() => openVaultItem(item)}
        onSaveSuggestion={() => saveSuggestion(item)}
      />
    ))
  ) : (
    <p className="empty-note">
      No records yet. Captured documents will appear here.
    </p>
  )}
</div>
```

3g. Replace the Emergency `<div className="emergency-list">` block (the three hardcoded articles) with an identity-driven, gated version:

```tsx
{
  familyMembers.length > 0 ? (
    <div className="emergency-list">
      <article>
        <IdCard size={17} />
        <div>
          <strong>Primary contact</strong>
          <span>{identity.name}</span>
        </div>
      </article>
      <article>
        <Stethoscope size={17} />
        <div>
          <strong>Casey health note</strong>
          <span>Peanut allergy · Cetirizine as needed</span>
        </div>
      </article>
      <article>
        <PawPrint size={17} />
        <div>
          <strong>Milo vet</strong>
          <span>Desert Paws Veterinary · rabies booster due Jun 20</span>
        </div>
      </article>
    </div>
  ) : (
    <p className="empty-note">
      Emergency basics appear once you add family profiles.
    </p>
  );
}
```

3h. Replace the Care loops body (`<div className="map-section"><h3>Care loops</h3>...`) with a gated version:

```tsx
<div className="map-section">
  <h3>Care loops</h3>
  {recurringCareItems.length > 0 ? (
    <div className="recurring-list compact-recurring-list">
      {recurringCareItems.slice(0, 3).map((item) => (
        <article className="recurring-card" key={item.id}>
          <span className={`care-dot care-${item.category}`} />
          <div>
            <h3>{item.title}</h3>
            <p>{item.cadence}</p>
            <small>Next due {formatShortDate(item.nextDue)}</small>
          </div>
        </article>
      ))}
    </div>
  ) : (
    <p className="empty-note">No recurring care loops yet.</p>
  )}
</div>
```

- [ ] **Step 4: Run VaultView test to verify it passes**

Run: `nvm use 22 && npx vitest run src/VaultView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire App — add `samples`, pass Vault props, fix sidebar**

In `src/App.tsx`:

5a. Add the import (below the `import { viewerIdentity } from "./viewer";` line from Task 5):

```ts
import { sampleCollections } from "./sampleData";
```

5b. Remove the App-level `householdAreas` constant (the `const householdAreas = [ ... ];` block near the top of the file). The sample now lives in `sampleData.ts`.

5c. Inside `App()`, just after the `identity` memo from Task 5, add:

```ts
const samples = useMemo(() => sampleCollections(demoMode), []);
```

5d. In the sidebar "Household areas" list, change `householdAreas.map` to `samples.householdAreas.map`:

```tsx
<div className="area-list" aria-label="Household areas">
  {samples.householdAreas.map((area) => (
    <button className="area-row" key={area.label} type="button">
      <span>{area.label}</span>
      <span>{area.count}</span>
    </button>
  ))}
</div>
```

5e. In the `<VaultView ... />` render, add the four new props (e.g. after `analysis={map}`):

```tsx
            familyMembers={samples.familyMembers}
            identity={identity}
            recurringCareItems={samples.recurringCareItems}
            vaultItems={samples.vaultItems}
```

- [ ] **Step 6: Run the full suite**

Run: `nvm use 22 && npm test`
Expected: PASS — all suites green (demo App renders the familyOS samples through `samples.*`).

- [ ] **Step 7: Commit**

```bash
git add src/VaultView.tsx src/VaultView.test.tsx src/App.tsx
git commit -m "feat: make VaultView pure with sample props and empty states

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: CalendarView props + empty states + App wiring

**Files:**

- Modify: `src/CalendarView.tsx` (events + recurring items as props; empty states)
- Test: `src/CalendarView.test.tsx`
- Modify: `src/App.tsx` (pass Calendar props from `samples`)

- [ ] **Step 1: Write the failing test**

Create `src/CalendarView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import CalendarView from "./CalendarView";
import type { LifeMapAnalysis } from "./lifemap";
import { familyEvents, recurringCareItems } from "./familyOS";

const emptyMap: LifeMapAnalysis = {
  dueItems: [],
  missingInfo: [],
  waitingOn: [],
  nextActions: [],
  reminders: [],
  draftMessages: [],
  sourceEvidence: [],
};

const handlers = {
  onSaveSuggestion: vi.fn(),
  onSaveSuggestions: vi.fn(),
  onDismissSuggestion: vi.fn(),
};

describe("CalendarView de-demo", () => {
  test("a real viewer sees no demo events and gets empty states", () => {
    render(
      <CalendarView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyEvents={[]}
        recurringCareItems={[]}
        savedSuggestionIds={new Set()}
        {...handlers}
      />,
    );

    expect(screen.queryByText(/Field trip permission slip due/i)).toBeNull();
    expect(screen.getByText(/No events yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No recurring loops yet/i)).toBeInTheDocument();
  });

  test("demo mode still renders the sample events and recurring loops", () => {
    render(
      <CalendarView
        analysis={emptyMap}
        dismissedSuggestionIds={new Set()}
        familyEvents={familyEvents}
        recurringCareItems={recurringCareItems}
        savedSuggestionIds={new Set()}
        {...handlers}
      />,
    );

    expect(
      screen.getByText(/Field trip permission slip due/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/CalendarView.test.tsx`
Expected: FAIL — CalendarView does not accept `familyEvents`/`recurringCareItems` props and still imports the constants, so the real-mode empty-state assertions fail.

- [ ] **Step 3: Write minimal implementation**

In `src/CalendarView.tsx`:

3a. Replace the familyOS import block (currently `buildCalendarEventsFromAnalysis, calendarLayers, familyEvents, recurringCareItems, type CalendarLayer`) with:

```ts
import {
  buildCalendarEventsFromAnalysis,
  calendarLayers,
  type CalendarLayer,
  type FamilyEvent,
  type RecurringCareItem,
} from "./familyOS";
```

3b. Add the new fields to `CalendarViewProps` (after `analysis: LifeMapAnalysis;`):

```ts
  familyEvents: FamilyEvent[];
  recurringCareItems: RecurringCareItem[];
```

3c. Add them to the destructured params (after `analysis,`):

```ts
  analysis,
  familyEvents,
  recurringCareItems,
```

3d. Update the `allEvents` memo to depend on the `familyEvents` prop:

```ts
const allEvents = useMemo(
  () => [...visibleAnalysisEvents, ...familyEvents],
  [visibleAnalysisEvents, familyEvents],
);
```

3e. Replace the event timeline (`<div className="event-timeline">`) with an empty-state guard:

```tsx
<div className="event-timeline">
  {visibleEvents.length > 0 ? (
    visibleEvents.map((event) => (
      <EventCard
        event={event}
        isSaved={savedSuggestionIds.has(event.id)}
        onDismissSuggestion={onDismissSuggestion}
        onSaveSuggestion={onSaveSuggestion}
        key={event.id}
      />
    ))
  ) : (
    <p className="empty-note">
      No events yet. Captured dates will appear here.
    </p>
  )}
</div>
```

3f. Replace the recurring loops list (`<div className="recurring-list">` in the aside) with an empty-state guard:

```tsx
<div className="recurring-list">
  {recurringCareItems.length > 0 ? (
    recurringCareItems.map((item) => (
      <article className="recurring-card" key={item.id}>
        <span className={`care-dot care-${item.category}`} />
        <div>
          <h3>{item.title}</h3>
          <p>
            {item.cadence} · {item.owner}
          </p>
          <small>Next due {formatShortDate(item.nextDue)}</small>
        </div>
      </article>
    ))
  ) : (
    <p className="empty-note">No recurring loops yet.</p>
  )}
</div>
```

- [ ] **Step 4: Run CalendarView test to verify it passes**

Run: `nvm use 22 && npx vitest run src/CalendarView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire App to pass Calendar props**

In `src/App.tsx`, in the `<CalendarView ... />` render, add (e.g. after `analysis={map}`):

```tsx
            familyEvents={samples.familyEvents}
            recurringCareItems={samples.recurringCareItems}
```

- [ ] **Step 6: Run the full suite**

Run: `nvm use 22 && npm test`
Expected: PASS — all suites green (demo App renders sample events via `samples.*`).

- [ ] **Step 7: Commit**

```bash
git add src/CalendarView.tsx src/CalendarView.test.tsx src/App.tsx
git commit -m "feat: make CalendarView pure with sample props and empty states

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: App initial-state seam — kill the demo flash, finalize

**Files:**

- Modify: `src/App.tsx` (seed via `initialAppState`; empty the `applyStoredState` fallbacks)

- [ ] **Step 1: Update the storage import**

In `src/App.tsx`, extend the existing `./storage` import (currently `authoritativeRemoteState, clearStoredDemoState, loadStoredDemoState, saveStoredDemoState`) so it also imports `emptyAnalysis`, `emptyDailyBrief`, and `initialAppState`:

```ts
import {
  authoritativeRemoteState,
  clearStoredDemoState,
  emptyAnalysis,
  emptyDailyBrief,
  initialAppState,
  loadStoredDemoState,
  saveStoredDemoState,
} from "./storage";
```

- [ ] **Step 2: Seed initial state through the seam**

Replace:

```ts
const [initialState] = useState(loadStoredDemoState);
```

with:

```ts
const [initialState] = useState(() =>
  initialAppState({ demoMode, stored: loadStoredDemoState() }),
);
```

- [ ] **Step 3: Remove the presentation seeds from the initial useState calls**

Replace:

```ts
const [intake, setIntake] = useState(initialState.intake ?? starterIntake);
const [map, setMap] = useState(initialState.analysis ?? presentationAnalysis);
```

with:

```ts
const [intake, setIntake] = useState(initialState.intake);
const [map, setMap] = useState(initialState.analysis);
```

Replace:

```ts
const [dailyBrief, setDailyBrief] = useState<DailyBrief>(
  initialState.dailyBrief ?? presentationBrief,
);
```

with:

```ts
const [dailyBrief, setDailyBrief] = useState<DailyBrief>(
  initialState.dailyBrief,
);
```

- [ ] **Step 4: Empty the remote-apply fallbacks**

In `applyStoredState`, replace:

```ts
setMap(full.analysis ?? presentationAnalysis);
```

with:

```ts
setMap(full.analysis ?? emptyAnalysis());
```

and replace:

```ts
setDailyBrief(full.dailyBrief ?? presentationBrief);
```

with:

```ts
setDailyBrief(full.dailyBrief ?? emptyDailyBrief());
```

> Note: `starterIntake`, `presentationAnalysis`, and `presentationBrief` remain imported and used by `handleResetDemo` (the demo-only reset). Leave those references — they are correct demo behavior and never run for a real account.

- [ ] **Step 5: Typecheck, full suite, and build**

Run: `nvm use 22 && npm run typecheck && npm test && npm run build`
Expected:

- `typecheck` (`tsc -b`): clean (no unused-import errors; `starterIntake`/presentation seeds still referenced by `handleResetDemo`).
- `npm test`: all suites green.
- `npm run build`: succeeds.

If `tsc` reports `starterIntake` is unused, it means `handleResetDemo` no longer references it — re-check Step 4 did not touch `handleResetDemo`; the reset must still call `setIntake(starterIntake)`, `setMap(presentationAnalysis)`, `setDailyBrief(presentationBrief)`.

- [ ] **Step 6: Manual demo-mode sanity (optional but recommended)**

Check the demo dev server still shows the full Alex Kim experience. First check the port:

Run: `lsof -ti:5173 | xargs kill -9 2>/dev/null; nvm use 22 && npm run dev:web`
Then open `http://localhost:5173`, click "Login as Alex Kim", and confirm Today shows the "AK" avatar, Vault shows the family profiles + emergency contact, Calendar shows sample events. Stop the server when done (Ctrl-C).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "fix: seed real sessions empty to remove demo data flash

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Activate the E2E regression guard (deferred — needs Slim)

This task does NOT block the fix; it confirms the fix end-to-end once a real test user exists. The guard spec (`tests/e2e/de-demo.spec.ts`) is already committed and skips itself without credentials.

- [ ] **Step 1: Create a dedicated empty Supabase test user** (Slim, or with Slim's go-ahead): `e2e@getlifemap.com` with a known password, against the LifeMap Supabase project. The account's data must be empty.

- [ ] **Step 2: Create the gitignored creds file**

Copy `tests/e2e/.env.e2e.example` to `tests/e2e/.env.e2e` and fill in:

```
E2E_EMAIL=e2e@getlifemap.com
E2E_PASSWORD=<the password>
```

- [ ] **Step 3: Run the de-demo E2E guard**

Run: `nvm use 22 && npm run test:e2e -- --grep de-demo`
Expected: PASS — a real authed session shows NO "Alex Kim" (before this plan it was RED, proving the bug; now GREEN).

- [ ] **Step 4: Do not commit** `tests/e2e/.env.e2e` (it is gitignored). No commit needed for this task.

---

## Self-Review

**Spec coverage:**

- Identity leak (`TodayView` avatar) → Task 1 (`viewerIdentity`) + Task 5. ✓
- Sample collections leak (`familyMembers`/`familyEvents`/`vaultItems`/`recurringCareItems`) → Task 2 (`sampleCollections`) + Tasks 6–7. ✓
- `householdAreas` sidebar leak → Task 2 + Task 6 (Step 5b/5d). ✓
- Emergency-view hardcoded Alex/Casey/Milo → Task 6 (Step 3g). ✓
- Demo flash (initial seeds) + `:416/:421` fallbacks → Task 4 (`initialAppState`) + Task 8. ✓
- Empty-state treatment → Tasks 6–7. ✓
- Testing (unit + component + existing 132 green + E2E) → unit (Tasks 1–4), component (Tasks 5–7), full suite gates (Tasks 5–8), E2E (Task 9). ✓
- Out of scope (onboarding, CRUD, RLS) → not introduced. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `ViewerIdentity` (from `viewer.ts`) is the avatar/identity type used in `TodayView` and `VaultView`. `SampleCollections` fields (`familyMembers`/`familyEvents`/`vaultItems`/`recurringCareItems`/`householdAreas`) match the props added to `VaultView`/`CalendarView` and the sidebar. `initialAppState`/`InitialAppState` guarantee non-optional `intake`/`analysis`/`dailyBrief`, matching the `useState` reads in Task 8. `emptyAnalysis`/`emptyDailyBrief` are exported in Task 4 before being imported in Task 8. Memo dep arrays updated where a constant became a prop (`allItems` ← `vaultItems`; `allEvents` ← `familyEvents`). ✓
