# LifeMap — Family-first Today + tap-to-add quick actions

> REQUIRED SUB-SKILL for execution: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Make the Today home family-first (avatar row → selected member's stuff → "+ Add for {name}") and turn the bottom-nav "+" into a collapsed FAB that fans out a 4-tile quick-add sheet (Document · Date · Person · Brain dump), each pre-scoped to the selected member. Solves real user (Julie) feedback: "no onboarding, can't figure out how to add my kid's documents."

**Source of truth:** `HANDOFF-family-first.md` + mockup `~/Projects/inbox/lifemap-family-first.html`.

**Branch:** `redesign/stage2-today` in worktree `~/Projects/lifemap-redesign`. Ships to CF **preview** for owner approval before any merge to main. Do NOT push without explicit "ship it".

## Global constraints (locked)

- **Backend untouched.** No worker / Supabase / migration changes. Owner stays a member-**name string** (consistent via dropdown), as today.
- **No new nav tab.** 3-tab Today / Add / Settings stays. The center "+" becomes the fan-out trigger.
- **No AI in the add path.** Document/Date/Person are direct manual writes; only "Brain dump" routes to the AI `openCapture()`.
- **Dark-default, high-contrast, calm, one accent** (owner high-myopia). No bright-white default, no low-contrast surfaces. Token-themed via `html[data-theme]` only — no new palette.
- **No em dashes** in user-facing copy/comments. **No WHAT-narrating comments** (repo CLAUDE.md). Match existing `.atlas-*` / `.calm-*` / `.dates-*` patterns.
- Preserve TodayView's full 19-prop contract + `TodayView.test.tsx` hard asserts (avatar `aria-label={identity.name}` text `initials`; renders with empty brief + `setupBuckets:[]`; all props accepted). Append only optional props.

## Architecture

SPA, single `view` state in `src/App.tsx`, no router. New state lives in App (selected member + add-sheet open + active quick-add modal), passed down — Today stays presentational. The four add flows already have working save handlers in App (`handleAddDocument`, `handleSaveImportantDate`, the people-add path, `openCapture`); this task gives them a member-scoped, app-level entry. The two modal components currently nested in views get lifted so both their original view AND the new FAB sheet can mount them.

---

### Task 1: Lift the add modals to reusable components

**Files:**

- Modify: `src/VaultView.tsx` — export `AddDocumentModal` (currently a private fn). Keep VaultView using it unchanged.
- Modify: `src/ImportantDatesView.tsx` — export its add-date modal (e.g. `AddDateModal`) the same way; keep view behavior identical.
- (Person add) reuse the existing onboarding add-person path — read first; if its add UI is inseparable from `OnboardingView`, build a minimal `AddPersonModal` in a new `src/add-person-modal.tsx` that emits one `FamilyMember` (or `OnboardingPerson`) into the existing people-save handler. Decide during Step 1.

- [ ] **Step 1: Map the three modals' real prop/callback shapes** — read `VaultView.tsx:347` (`AddDocumentModal`), the date modal in `ImportantDatesView.tsx`, and the person-add UI in `onboarding-view.tsx`. Record exact `onSave` payload types (`VaultItem`, `FamilyEvent`, family member) + any `presetOwner` support. Decide Person = reuse vs new minimal modal.
- [ ] **Step 2: Export `AddDocumentModal` and the date modal** unchanged; re-import them in their original views. No behavior change.
- [ ] **Step 3: Provide member-scoped presets** — confirm `AddDocumentModal` accepts `presetOwner` (it does). Add the equivalent `presetOwner` to the date modal so a date saves with `owner = member.name`. Append as an optional prop; default path unchanged.
- [ ] **Step 4: Tests + build** — `npx vitest run src/VaultView.test.tsx src/ImportantDatesView.test.tsx` green; `npm run build` PASS (tsc -b typechecks test files too).
- [ ] **Step 5: Commit** — `refactor(add): export AddDocument/AddDate modals + member-scoped preset (no behavior change)`

---

### Task 2: Family-first section in Today

**Files:**

- Modify: `src/TodayView.tsx` — add a family section directly under the greeting: avatar row (You / each member / "+ Add") + selected member's stuff card + "+ Add for {name}". Append optional props: `familyMembers`, `memberItems` (or pass `vaultItems`+`familyEvents` and filter in-view), `selectedMemberId`, `onSelectMember`, `onAddForMember`, `onAddMember`.
- Modify: `src/App.tsx` — own `selectedMemberId` state (default first member or "You"); pass family data + handlers into `<TodayView>` at `App.tsx:1393`. Derive `memberItems` = `vaultItems.filter(owner===name)` + dates `familyEvents.filter(owner===name)`.
- Modify: `src/styles.css` — `.calm-family-row`, `.calm-person`, `.calm-av`, selected ring, `.calm-member-card`, `.calm-add-for`, empty-member copy. Map mockup `--acc/--av gradients` onto existing tokens; light+dark via `html[data-theme]`.
- Test: `src/TodayView.test.tsx` — extend (no `.skip`): member select changes the card; empty member shows "Nothing yet. Tap + to add {name}'s first thing"; "+ Add for {name}" fires `onAddForMember(memberId)`. Keep all existing asserts green (greeting avatar untouched).

- [ ] **Step 1: Baseline green** — `npx vitest run src/TodayView.test.tsx` PASS; note current asserts.
- [ ] **Step 2: Render the avatar row** under the greeting copy — `familyMembers` mapped to `.calm-person` (initials avatar, name), selected gets ring (`aria-pressed`/`aria-current`), plus a trailing "+ Add" person calling `onAddMember`. Keep greeting block + its `atlas-avatar` identity element exactly as-is.
- [ ] **Step 3: Selected-member card** — title `{name}'s stuff`, rows from `memberItems` (doc icon + title + status pill; date icon + title + relative day). Empty state copy per mockup. `+ Add for {name}` button → `onAddForMember(selectedMemberId)`.
- [ ] **Step 4: Style to mockup, dark-default high-contrast** — token-themed, near-mono + single accent, hairline borders, ring on selected avatar. Verify both themes.
- [ ] **Step 5: Wire in App** — state + handlers; `onAddForMember` opens the add sheet (Task 3) pre-scoped; `onAddMember` opens Person add. Guard the empty-family case (no members → show only "+ Add").
- [ ] **Step 6: Tests + typecheck + build + full suite** — extend `TodayView.test.tsx`; `npm run build && npx vitest run` all green.
- [ ] **Step 7: Commit** — `feat(today): family-first home (member avatars + scoped stuff + Add for member)`

---

### Task 3: Collapsed "+" FAB → fan-out quick-add sheet

**Files:**

- Modify: `src/App.tsx` — the center nav "Add" button (`App.tsx:1321-1333`) becomes the fan toggle: open an action sheet over a dim scrim instead of calling `openCapture()` directly. New state `addSheetOpen` + `addSheetOwner` (defaults to `selectedMemberId`'s name). Host the four flows: Document (`AddDocumentModal` presetOwner), Date (`AddDateModal` presetOwner), Person (person modal), Brain dump (`openCapture()`). Each tile closes the sheet then opens its modal/flow.
- New: `src/add-action-sheet.tsx` — presentational sheet: scrim + 2x2 tiles headed "Add for {owner}", props `owner`, `onPickDocument/Date/Person/BrainDump`, `onClose`. Reuse `modal-backdrop.tsx` semantics (focus trap, Esc, backdrop click) — do NOT hand-roll a11y.
- Modify: `src/styles.css` — `.calm-fab` (collapsed, rotates to ✕ when open), `.calm-add-sheet`, `.calm-add-scrim`, `.calm-act` tiles. Fixed-position; mind the Playwright fullPage caveat (verify with viewport shot).
- Test: `src/App.test.tsx` — "+" opens sheet; tile → matching modal (assert a field unique to each); backdrop/✕ closes; Document tile from a selected member pre-fills owner. Re-route any test that clicked the old "Add"→capture directly through the Brain dump tile. No deleted coverage, no `.skip`/`.only`.

- [ ] **Step 1: Add-sheet component** — build `add-action-sheet.tsx` (4 tiles per mockup: Document/Date/Person/Brain dump + hints), backdrop via `ModalBackdrop`.
- [ ] **Step 2: Rewire the nav "+"** — toggle `addSheetOpen`; FAB rotates to ✕; scrim dims; backdrop/Esc dismiss. Keep the button `aria-label` + `aria-expanded`.
- [ ] **Step 3: Host the four flows in App** — pick Document → `AddDocumentModal` with `presetOwner=addSheetOwner` → `handleAddDocument`; Date → `AddDateModal` preset → `handleSaveImportantDate`; Person → person modal → existing people-save; Brain dump → `openCapture()`. Sheet closes before the modal opens.
- [ ] **Step 4: Scope owner** — `onAddForMember` (Task 2) sets `addSheetOwner` to that member then opens the sheet; bare "+" defaults `addSheetOwner` to the selected member (or unset = "Choose…").
- [ ] **Step 5: Style + dark/light verify** — collapsed FAB, fan animation, scrim; token-themed high-contrast.
- [ ] **Step 6: Tests + typecheck + build + full suite** — `npm run build && npx vitest run` all green.
- [ ] **Step 7: Commit** — `feat(add): collapsed + fan-out quick-add sheet (Document/Date/Person/Brain dump), member-scoped`

---

### Task 4: Verify + visual re-bless (do NOT push)

- [ ] **Step 1: Full build + suite** — `npm run build` PASS + `npx vitest run` green (~247 + new tests).
- [ ] **Step 2: Visual regression** — `CI=1 npm run test:visual:update` then `CI=1 npm run test:visual` green. Confirm Today baseline shows the family row + collapsed "+"; fixed FAB verified via a viewport (non-fullPage) `vite preview` shot, not the baseline artifact.
- [ ] **Step 3: Manual demo pass** — `npm run build && npx vite preview --port 4173 --strictPort`, open `http://localhost:4173` (demo mode): pick a kid → tap "+" → add a Document → confirm it lands under that kid; repeat Date; confirm Brain dump still routes to AI capture; check light + dark.
- [ ] **Step 4: Report back for owner's "ship it"** — summarize commits; leave unpushed. On approval: push branch → CF preview → owner review → merge to main (Pages auto-deploys) + manual worker deploy only if backend changed (it won't).

## Design fixes found in live-demo review (2026-06-25)

These came out of driving the real app + mockup. Fold into the relevant task, do not ship around them.

- **FAB ✕ off-center** (Task 3 styling): the open-state ✕ is a 45-degree-rotated "+" glyph, which does not optically center. Use a real `X` icon (lucide), centered in the FAB; cross-fade or swap from the `+`, do not rotate the plus.
- **Add modal renders on a light/cream card** (blocking, owner high-myopia): the reused `AddDocumentModal` (and the shared `review-dialog` / `add-date-dialog` surface) shows a bright-white card over the dark app. Token-theme the dialog surface dark via `html[data-theme]`; no bright-white default. Audit `AddDateModal` + person modal for the same. Verify both themes.
- **Cancel button invisible** (same dialog): the secondary "Cancel" renders near-white on the light card (no visible affordance). Fix contrast as part of the dialog theming.
- **After-add placement** (Task 2): a saved item currently drops into the flat "Documents & records" list. In the family-first home it must land in the selected member's card (filter by `owner === name`), so "+ Add for {name} -> Save" visibly updates that member's stuff.

## Out of scope

Photo/file upload (needs Supabase Storage — separate phase). Google Calendar OAuth (parked, `feat/google-cal-push`). Reworking the AI capture path. Any schema/migration.

## Open question for owner (pre-build)

Mockup's bottom nav reads **Today / + / Vault**; shipped nav is **Today / + / Settings** (locked). Keeping **Today / + / Settings** unless told otherwise — Vault stays reachable from the family card + Settings.
