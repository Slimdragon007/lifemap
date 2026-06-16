# LifeMap de-demo — design spec

**Date:** 2026-06-16
**Branch:** `feat/mvp-now-auth-persistence`
**Scope:** Correctness only (no onboarding wizard, no CRUD, no new data-entry UI)
**Status:** Approved for planning

## Problem

Real authenticated LifeMap users see hardcoded demo identity and sample
collections ("Alex Kim", "Casey Kim", sample family/vault/calendar data) instead
of their own account. The user's Supabase row is verified clean/empty, so this is
not data corruption — it is presentation leaking past the auth boundary.

### Verified root causes (file:line)

The **data** layer already self-corrects: on a real session, the remote-load
effect (`App.tsx:349`) calls `applyStoredState`, which routes through
`authoritativeRemoteState` (`storage.ts:176`) — that spreads `emptyPersistedState()`
first, so map/brief/intake/setup are emptied for a real account. The remaining
leaks are **identity** and **hardcoded sample collections**, which are not
state-driven and never clear:

- `TodayView.tsx:143` — avatar `aria-label="Alex Kim"` / initials "AK" hardcoded in JSX.
- `familyOS.ts:60,118,180,230` — `familyMembers`, `familyEvents`, `vaultItems`,
  `recurringCareItems` exported constants, rendered to everyone via
  `VaultView` (`:175,:333`) and `CalendarView` (`:104,:195`).
- `VaultView.tsx:~308` — "Emergency view" block: hardcoded "Alex Kim · (555) 010-1172",
  "Casey health note", "Milo vet". Pure JSX, separate from `familyMembers`.
- `App.tsx:77,777` — `householdAreas` local sample const rendered in the sidebar.
- `App.tsx:210,211,265` — initial state seeds from `starterIntake` /
  `presentationAnalysis` / `presentationBrief`, plus leftover demo `localStorage`,
  so a real user sees a demo **flash** before remote load resolves.
- `App.tsx:416,421` — remote-apply fallbacks still reference `presentation*`
  (mostly dead because `emptyPersistedState` always supplies a value, but unsafe).

## Approach (chosen: A — centralized seam + pure selectors)

One demo-mode boundary; correctness in pure, unit-testable functions; views become
pure (data + identity arrive via props) so they render correctly in both modes and
are testable in both — important because `isSupabaseConfigured` is pinned `false`
under Vitest (`supabaseClient.ts:14`), so the existing suite runs in demo mode.

### New units (pure, TDD'd)

1. **`src/demoMode.ts`** — `export const demoMode = !isSupabaseConfigured`.
   Single source of truth for "are we showing sample data".
2. **`src/viewer.ts`** — `viewerIdentity(session, demoMode): { name: string; initials: string }`
   - demo → `{ name: "Alex Kim", initials: "AK" }`
   - real + session → derived from email local-part: split on `. _ - +`, take the
     first letter of the first two tokens, uppercased (`m.haslim` → `MH`;
     single-token `casey` → `CA`); name = email local-part.
   - no session → `{ name: "You", initials: "" }`
3. **`src/sampleData.ts`** — `sampleCollections(demoMode): { familyMembers, familyEvents, vaultItems, recurringCareItems, householdAreas }`
   - demo → existing `familyOS` constants + `householdAreas` (moved here from App)
   - real → every field `[]`
4. **`initialAppState({ demoMode, stored }): StoredDemoState`** (in `storage.ts`)
   - demo → `stored` values, falling back to demo seeds (today's behavior)
   - real → `emptyPersistedState()` (ignore leftover demo `localStorage`; no flash)

### Wiring changes

- **App.tsx**: seed initial state via `initialAppState` (replaces `:210,:211,:265`);
  empty the `:416,:421` fallbacks; compute `identity = viewerIdentity(session, demoMode)`
  and `samples = sampleCollections(demoMode)` once; thread to views; sidebar
  `householdAreas` from `samples`.
- **TodayView**: new `identity` prop → avatar renders `identity.initials` /
  `aria-label={identity.name}`; drop hardcoded "AK"/"Alex Kim".
- **VaultView**: `familyMembers`, `vaultItems`, `recurringCareItems`, `identity` as
  props; empty states for the family list, recurring care, and the Emergency view
  (Primary contact uses `identity`); no hardcoded Alex/Casey/Milo in real mode.
- **CalendarView**: `recurringCareItems`, `familyEvents` as props; empty states.

### Empty-state treatment

Low-stim, matching the shipped design (warm cream, one coral accent, no decorative
motion). Each emptied surface shows a calm one-line placeholder and, where relevant,
the existing capture CTA — e.g. Vault family → "No family members yet." No new
data-entry UI; population happens through the existing capture/analyze flow.

## Testing (TDD, red→green)

- **Unit (Vitest):** `viewer.test.ts`, `sampleData.test.ts`, and `initialAppState`
  cases — exhaustive, both modes. These are the primary correctness guards.
- **Component (Vitest):** render `TodayView` and `VaultView` directly with a real
  identity + empty collections; assert **no "Alex Kim"** present. Real-mode coverage
  in Vitest, enabled by the views now being pure.
- **Existing 132 App tests** run in demo mode (Vitest pins `isSupabaseConfigured`
  false) → must stay green.
- **E2E:** the already-committed `tests/e2e/de-demo.spec.ts` turns green once a
  dedicated Supabase test user exists (`tests/e2e/.env.e2e`).

## Out of scope

Onboarding wizard, family/vault/calendar CRUD, any new data-entry UI, RLS work,
and the test-user provisioning (tracked separately).

## Success criteria

1. A real authenticated session renders **no** "Alex Kim" / "Casey Kim" / sample
   contacts anywhere, and no demo flash on load.
2. The avatar shows the real viewer's initials.
3. Demo login (demo build) is **unchanged** — full Alex Kim sample experience.
4. Existing 132 Vitest tests stay green; new unit + component tests pass; build and
   typecheck clean.
