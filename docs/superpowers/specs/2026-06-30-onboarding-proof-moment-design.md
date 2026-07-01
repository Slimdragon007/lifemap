# LifeMap Onboarding Proof Moment Design

**Date:** 2026-06-30
**Status:** Approved concept; ready for implementation plan

## Context

A trusted UI/UX reviewer liked the onboarding but said the app should show the end result earlier:

- Show what a filled-in LifeMap looks like.
- Show why functions like search are useful.
- Mention how LifeMap handles sensitive personal information.
- Make the use case visible "in action."

The selected direction is Option A from the visual companion: add a compact proof moment inside onboarding that shows a filled LifeMap example and includes privacy reassurance.

## Goal

Make first-time users understand the payoff before they are asked to add household details or upload documents.

The proof moment should answer:

1. What does LifeMap look like after it has useful data?
2. How would I use it when I need something quickly?
3. Why should I trust it enough to continue setting up?

## Non-Goals

- Do not redesign the full onboarding flow.
- Do not add a new navigation surface.
- Do not change auth, Supabase, RLS, Storage, encryption, or upload behavior.
- Do not claim HIPAA, bank-grade security, zero-knowledge encryption, independent audit status, or complete SSN safety.
- Do not encourage real SSN/passport/medical upload during controlled beta.

## Recommended Design

Update the existing intro cover in `src/onboarding-view.tsx` into a proof-first welcome screen.

This avoids increasing wizard complexity and preserves the existing setup steps:

- Intro cover: "See LifeMap in action" proof moment.
- Step 1: name.
- Step 2: household people/pets.
- Step 3: areas LifeMap should watch.
- Step 4: private things stay private.
- Step 5: finale.

The intro cover should include:

- A headline that still feels calm and human.
- A compact filled-state preview.
- A search example.
- One or two sample outcomes.
- A plain-language sensitive-data note.
- Existing `Skip` and `Continue` controls.

## Proposed Copy

Headline:

> See what LifeMap does before you add anything.

Supporting copy:

> It turns scattered family details into a few places you can actually find again.

Preview content:

- Search query: `Casey passport`
- Result: `Casey passport`
- Meta: `Cabinet · IDs · renew by Aug 14`
- Status: `Found instantly`
- Home card: `Today · 1 priority from your family records`
- Cabinet card: `4 records saved privately`

Sensitive-data note:

> Files are encrypted before upload. Private records stay hidden until opened, and nothing is sent or shared without your OK.

Optional beta caution if space allows:

> For the first beta test, use fake or low-risk data.

## UX Behavior

- The proof content is static example content.
- It must not create records.
- It must not use real account data.
- It must not call AI, Supabase, Storage, or the Worker.
- `Continue` proceeds into the existing name step.
- `Skip` exits onboarding exactly as it does today.

## Visual Requirements

- Stay consistent with current light LifeMap design tokens.
- Keep the preview compact enough for iPhone screens.
- Avoid heavy cards or dashboard density.
- Use a simple fake search row and two small result cards.
- Use a soft trust strip rather than a warning box.
- Text must not overflow on mobile.

## Security Copy Requirements

Allowed claims:

- Files are encrypted before upload.
- Stored document blobs live in a private bucket.
- Private details are hidden until opened.
- Nothing is sent or shared without user approval.
- LifeMap is in controlled beta; fake or low-risk data is recommended for first testing.

Disallowed claims:

- Zero-knowledge.
- HIPAA compliant.
- Bank-grade or bank-level security.
- Independently audited.
- Safe for SSNs without qualification.

## Files Expected To Change

- `src/onboarding-view.tsx`
- `src/styles.css`
- `src/onboarding-view.test.tsx`
- `.gitignore`

`.gitignore` should ignore `.superpowers/` because the visual companion stores local brainstorming session state there.

## Tests

Update or add onboarding tests to verify:

- The intro renders the proof headline.
- The intro renders the search example.
- The intro renders the sensitive-data note.
- `Continue` still reaches the name step.
- `Skip` still calls `onSkip`.

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
```

After push/deploy, run:

```bash
npm run verify:production
```

## Risks

- Too much proof copy could make onboarding feel heavier. Keep it short.
- Security copy must build trust without overclaiming.
- The proof example should not confuse users into thinking records already exist in their account.

## Success Criteria

The next reviewer should be able to say:

- "I understand what a filled LifeMap looks like."
- "I understand why search matters."
- "I understand the basic sensitive-data posture."
- "I still feel safe continuing setup."
