# LifeMap Phase 1 — Orientation Layer (Teach, don't cut)

**Date:** 2026-06-18
**Status:** Approved (Slim said "go")

## Problem

Real user feedback: _"Where do I go? What tools are in here? What's useful?"_
The premise is strong but the app does not teach itself. Six tabs
(Today / Capture / Calendar / Vault / Review / More) all shout at equal volume,
there is no stated identity, and empty states dead-end. Result: new users have
no mental model and no obvious first move.

## Identity (the anchor everything points at)

> **LifeMap takes the chaos in your head and hands back your next few moves — calmly.**

Core loop to make visible: **Capture (paste mess) → AI sorts → your next moves.**

## Scope

Phase 1 = **teach the existing app**. Cut/merge NO tools yet (that is Phase 2).
Strictly an orientation layer on top of current screens.

## Components

### 1. First-run moment

- One screen (NOT a carousel) shown to a new / empty account on first entry.
- States the identity in one line, then routes straight into **Capture** with a
  real example pre-loaded (demo already pre-fills the textarea — reuse that path).
- Skippable. Calm, on-brand (cool-blue tokens, existing type stack).
- Persistence: a `localStorage` flag (e.g. `lifemap.seenIntro`) so it shows once.

### 2. Per-screen purpose line

- Each primary screen gets one plain-language purpose line at the top, consistent
  treatment. Some screens already have a subtitle — normalize to answer
  "what is this / when do I use it".
- Copy (final):
  - Today: "Your calm summary — the few things that actually need you."
  - Capture: "Paste anything messy; I'll turn it into tasks, dates, and drafts."
  - Calendar: "Everything time-bound, in one list."
  - Vault: "Your family's records and emergency info, safe and findable."
  - Review: "Anything waiting for your OK before it's done."

### 3. Instructive empty states

- The "Set up" life-area dead-ends and empty lists become a single next action:
  _"Nothing here yet — Capture something and I'll file it,"_ with a button that
  routes to Capture (or the relevant add-flow where one exists).
- Applies to: Today life-areas, Calendar (Schedule + Recurring loops empties),
  Vault (Documents, Emergency, Care loops empties).

### 4. "How LifeMap works" screen

- One screen, reachable from More (and/or a "?" affordance).
- Plain, calm, single screen: the loop in 3 steps + one line per tool.

## Out of scope (Phase 2)

- Cutting / merging tabs.
- Demoting Calendar/Vault/Review into views of Today.
- IA / nav restructure.

## Files (expected)

- `src/onboarding-view.tsx` and/or `src/GuidedSetupView.tsx` — first-run moment.
- `src/TodayView.tsx`, `src/CalendarView.tsx`, `src/VaultView.tsx`,
  `src/BrainDumpView.tsx` (Capture) — purpose lines + empty-state CTAs.
- `src/App.tsx` — first-run gating + routing to Capture; "How it works" entry.
- New: a small `how-it-works` view (kebab-case file) reached from More.
- `src/styles.css` / tokens — reuse existing classes; add minimal styles only.

## Success criteria

- A brand-new (empty) user sees the identity + one clear first move within seconds.
- Every screen answers "what is this / what's it for" without guessing.
- No empty state is a dead-end; each offers the next action.
- Existing gate stays green (199 tests, typecheck, lint, build on Node 22).
- Verify on phone before prod (standing CSS rule); ship via branch → main.

## Build order

1. Per-screen purpose lines + instructive empty states (smallest, highest daily value).
2. "How LifeMap works" screen + More entry.
3. First-run moment + gating.
