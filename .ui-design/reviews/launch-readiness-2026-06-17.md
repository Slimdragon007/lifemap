# Design Review: LifeMap — Pre-Launch Readiness

**Reviewed:** 2026-06-17
**Target:** Full app (visual, usability, accessibility, code quality, performance)
**Context:** About to hand to ~3 real non-technical users (Julie + 2), primarily iPhone
**Method:** Live 6-screen mobile walkthrough (visual) + perf trace + 3 parallel specialist audits (a11y, code, usability). Findings flagged by ≥2 reviewers are marked ⊕ (high confidence).

## Verdict

The **infrastructure is genuinely solid** — security posture (encryption/RLS/CSP/rate-limit), API error taxonomy, data layer, loading states, and (after this session) mobile layout are all good. Performance is excellent (LCP 858ms, CLS 0).

**But the app is currently tuned around the demo account's rich sample data, and your 3 launch users start EMPTY.** A brand-new empty user hits broken-looking empty states, hardcoded fake medical data, and failure dead-ends. **Not quite ready to send blind today** — ~4 blockers stand between you and a confident hand-off. All are fixable in a focused pass.

---

## 🔴 LAUNCH BLOCKERS (a new user hits these in the first 5 minutes, or data-trust)

### B1 ⊕ — Hardcoded fake medical data in Vault "Emergency view"

`src/VaultView.tsx:256-289`. Static rows "Casey health note · Peanut allergy · Cetirizine", "Milo vet · Desert Paws · rabies booster" render whenever `familyMembers.length > 0`. A real user who adds one family member sees **fake medical info for people who don't exist.** Trust-destroying for a family-data app. (Flagged by code + usability.)
**Fix:** Build the emergency view from real member data, or hide it until real emergency info is captured.

### B2 ⊕ — Empty-state screens look broken (the new user's first impression)

- `src/TodayView.tsx:144,259,262` — empty brief renders blank `<p>` bars + "Nothing else needs you today" on a fresh account (reads as "done before I started").
- "View full brief" → dialog full of "No top priorities / No blocked loops" empties (`App.tsx:1790`).
- Review tab → empty multi-step wizard "0 ready to review" (`App.tsx:2070`).
- Failed data-load is indistinguishable from genuinely-empty ("No records yet") — a returning user with a load error thinks their data is gone (`App.tsx:444`).
  **Fix:** First-run copy + a single clear "capture your first note" CTA on empty Today; hide "View full brief" + Review wizard until there's content; distinguish load-failure (persistent "Retry" banner) from empty.

### B3 ⊕ — Encryption race can silently write PLAINTEXT sensitive data

`src/App.tsx:550` `materializeSuggestions` calls the **synchronous** `getFieldCrypto()`, which returns no-op identity crypto if the key isn't ready yet. Saving a suggestion on a slow connection before `ensureFieldCrypto` resolves writes vault/member fields to Supabase **unencrypted**, silently. Undermines the field-encryption work.
**Fix:** `await ensureFieldCrypto(session.access_token)` before the save loop.

### B4 — AI + Google failures dead-end with no recovery

- AI "Analyze intake" failure (`App.tsx:684`, notice `:1579`): generic message, **no "Try again" button**, doesn't distinguish offline vs. 503-budget vs. error.
- Daily-brief 503 falls back to an empty local brief for new users + reassuring copy that doesn't match an empty screen (`App.tsx:748`).
- "Connect Google Calendar" auth-url failure is **silently swallowed** — button just re-enables (`GoogleConnection.tsx:42`).
  **Fix:** Add explicit "Try again" in the analyze error branch; surface the distinct Worker messages (they already reach the client); show an inline error on Google-connect failure.

---

## 🟡 SHOULD-FIX (trust, accessibility, clarity — before or right after launch)

### S1 ⊕ — Color contrast: `--color-text-quiet #93a099` ≈ 2.4:1 (fails AA 4.5:1)

`src/design/tokens/lifemap-light.css:42` (+ aliases :106,:112). The app's dominant secondary-text color (sub-labels, date rail, placeholders, "tap to reveal", empty states) is unreadable in sunlight / for low-vision users.
**Fix (one line):** darken to `#62716a` (~4.5:1).

### S2 ⊕ — Modals: no Escape, no backdrop-close, no focus management

Four dialogs (`App.tsx:1800,1923,2473`, `VaultView.tsx:404`) set `role="dialog"`/`aria-modal` but never move focus in, trap it, restore it, handle Escape, or close on backdrop click. Keyboard/screen-reader users are stranded; even touch users can't tap outside to dismiss.
**Fix:** Shared effect: focus first element on open, Escape→close, restore focus on close; `onClick={onClose}` on `.modal-backdrop` (stopPropagation on the panel). At minimum ship Escape + backdrop-close.

### S3 ⊕ — Tap targets too small: inline `.notebook-link` actions

`src/styles.css:7910` `padding: 0` → "Save"/"Dismiss"/"Edit"/"Forgot password?" are ~18px tall, under the 24px AA min, sitting 12px apart. Mis-taps on a phone (tap Dismiss instead of Save on vault records).
**Fix:** `.notebook-link { padding: 8px 4px; margin: -8px 0; }` (preserves layout).

### S4 — Raw Supabase auth errors shown to users

`auth-screen.tsx:51`, `set-new-password-screen.tsx:34` show `authError.message` verbatim ("Invalid login credentials", "AuthApiError…"). Confusing for non-technical users.
**Fix:** Map common codes to friendly copy. Add "Resend confirmation" + "Didn't get the reset email?" recovery paths (`auth-screen.tsx:29,57`).

### S5 — Demo/founder copy leaks to real users

"Launch Plan … founder demo progress" (`App.tsx:1704`), "Nothing is sent … until real integrations exist" (`App.tsx:2484`), aria-label "Demo staged approvals" (`App.tsx:2416`). Reads as unfinished.
**Fix:** Hide/relabel Launch Plan in real mode; drop dev-facing copy for authenticated users.

### S6 — Completed/snoozed priorities don't persist

`App.tsx:290` `priorityActionStates` isn't in `storedState` — mark "done", refresh, it reappears as active.
**Fix:** Persist it (reset on new analyze).

### S7 — Focus ring still uses retired blue theme

`styles.css:700` + `:3275,:7269` use `rgba(58,107,255,…)` (old blue) instead of the green `--color-focus-ring`. Cosmetic but off-brand.

---

## 🟢 POLISH / MAINTENANCE (not launch-blocking)

- **App.tsx god-component** (25 useState / 8 useEffect / ~1300 lines render): extract `useRemoteSync(session)` + `useFamilyData(session)` hooks — the remote load/save effect pair is the most fragile area and the likeliest source of launch-week bugs. (code: High-maintenance)
- **CSS consolidation** — duplicate top-level `.bottom-nav` (`styles.css:3350` & `:6244`) and `.nav-capture-button` (6+ blocks) silently override by cascade order; dead `@media` blocks (`:3153`) reference classes that may no longer exist. A 9k-line single file. Real maintenance time-bomb, not user-facing today.
- `key={item.title}` → `key={item.id}` on dueItems (`App.tsx:1155`).
- Double-send guard in `handleSendDraft` (`App.tsx:657`); `signOut()` floating promise (`App.tsx:967`); `feedback-bubble.tsx:44` setTimeout not cleared on unmount.
- `resolveApiOrigin` returns `undefined` for non-allowlisted `*.pages.dev` previews → AI silently fails on preview deploys (`api.ts:407`). Affects our own preview testing.
- **Code-splitting** the single 484KB bundle (route-based `React.lazy` + vendor chunk) — for interaction snappiness on mobile, not load score.
- Trim 5 weights of Darker Grotesque (`index.html`) — less font payload.
- Capture paste-box clips its last line mid-sentence (cosmetic).
- Remove dead code: unused `StatusPill` (`App.tsx:2060`), unused `map` prop on TodayView, dead `BrainDumpView`.
- Install `eslint-plugin-jsx-a11y` to catch a11y regressions in CI.
- **Test gaps:** `materializeSuggestions` (the real authenticated Supabase save path) has **zero** coverage — a regression there loses user data silently. Add a test.

---

## Already fixed THIS session (verified)

Mobile: Today priority-list left-align, Vault row stacking, bottom-nav pinning (`overflow-x: clip`), input zoom (16px floor), pinch-lock, feedback FAB position, PWA install/icons. Security: AES-256-GCM field encryption + RLS + CSP/HSTS + AI rate-limit + audit log. Password reset + feedback bubble. _(All on the `mobile-pwa` preview; nav/Today/Vault/feedback bundle awaiting "ship it" to production.)_

## What's genuinely solid (don't touch)

`api.ts` error handling (every fetch try/caught + runtime-validated discriminated unions); `family-data.ts` data layer (typed minimal interfaces, userId defense-in-depth, UUID validation); `use-session.ts` cleanup; `field-crypto.ts` fail-open; `storage.ts` defensive normalizers; loading/busy states across analyze/brief/send/feedback; the send-email confirm step; semantic HTML + ARIA labelling + form-label association; prefers-reduced-motion gating; 30+ test cases on demo flows.

---

## Recommended order

1. **B1–B4** (the four blockers) — before sending to anyone.
2. **S1, S2, S3** (contrast, modal Escape/backdrop, tap targets) — fast, high-value, ship same batch.
3. **S4–S7** — within the first day.
4. 🟢 — backlog; tackle the App.tsx hooks extraction + CSS consolidation before the _next_ feature, not before this launch.

_Generated by the design-review pass, 2026-06-17._
