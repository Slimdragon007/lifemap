# LifeMap Mobile Reset Design

**Date:** 2026-06-28
**Status:** Proposed after production mobile review
**Decision:** Reset the mobile shell and information architecture before adding more features.

## Problem

The product idea is still strong: LifeMap should be a relief tool for overloaded
parents and ADHD users who need one trusted place to drop messy real-life
logistics, find important household information, and approve sensitive actions.

The current UI is failing that goal because it exposes too many app concepts at
once. Home, Family, Settings, Cabinet, Review, profile pages, staged drafts,
document filters, fixed categories, and onboarding all compete for attention.
The result is a polished interface that still feels like work.

Recent mobile screenshots show four concrete issues:

- The app content is too close to mobile browser chrome and is sometimes visually
  clipped by the top browser UI.
- The bottom dock overlaps content and makes the page feel trapped between
  browser chrome and app chrome.
- Color/theme changes do not fully propagate through navigation and active
  states, which means some UI still relies on hardcoded styling.
- Profile sections such as Health and School are fixed. They need to be
  customizable because the whole product promise is "make this fit my family."

## Product Principle

LifeMap should feel like this:

> Drop the messy thing. LifeMap sorts it. You approve what matters. Later, you can
> find it by person, pet, trip, school, health, or document type.

The app should not feel like a dashboard, task manager, or admin console.

## Research Grounding

This reset follows the direction already captured in
`docs/2026-06-14-lifemap-ux-research-brief.md`:

- Use progressive disclosure: show only the most important thing first.
- Favor recognition over recall: users should pick from familiar people,
  categories, and examples instead of inventing a system from scratch.
- Reduce cognitive load: every screen needs one clear job and one obvious next
  action.
- Keep bottom navigation for durable destinations only. Screen-specific actions
  live inside the screen or in a focused capture sheet.
- Hide sensitive details by default, then reveal with intentional user action.

Reference sources behind that brief:

- W3C Making Content Usable for People with Cognitive and Learning Disabilities:
  https://www.w3.org/TR/coga-usable/
- NN/g Progressive Disclosure:
  https://www.nngroup.com/articles/progressive-disclosure/
- NN/g Recognition Rather Than Recall:
  https://www.nngroup.com/articles/recognition-and-recall/
- NN/g Reducing Cognitive Load:
  https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- Apple Human Interface Guidelines, Tab Bars:
  https://developer.apple.com/design/human-interface-guidelines/tab-bars

## Non-Negotiable UX Rules

1. Every screen has one primary job.
2. Home shows what needs the user now, not everything LifeMap knows.
3. Capture is the heartbeat, but it is an action, not a destination.
4. Review is a safety gate, not a permanent place users should manage daily.
5. Family/profile pages are the user-facing filing model.
6. Cabinet is for finding saved things, not for configuring the family.
7. Settings owns setup, themes, tour, feedback, security, integrations, and
   account controls.
8. Sensitive details stay hidden until the user explicitly reveals them.
9. Users can add custom people, pets, sections, fields, and document types.
10. Visual tokens must drive navigation, active states, buttons, cards, focus
    rings, and liquid/glass accents.

## Recommended Top-Level Navigation

Use four durable destinations plus a persistent capture action.

```txt
Cabinet | Home | Family | Settings
```

Home should be the visual anchor of the dock. With four destinations, it does
not need to be mathematically centered, but it should get the elevated liquid
treatment that makes it feel like the user's safe return point.

### Home

Purpose: "What needs me now?"

Home should contain:

- One primary next move.
- A quiet "Drop anything here" capture entry.
- At most one small upcoming strip.
- A conditional review card only when something needs approval.
- No category grid, no setup clutter, no app explanation blocks after onboarding.

Home should not contain:

- Full family setup.
- Full document browsing.
- Full approval queue.
- Full analytics.
- "Needs attention" panels unless there is a specific action the user can take.

### Cabinet

Purpose: "Find the thing."

Cabinet should contain:

- Search first.
- Recent or pinned records.
- Category filters only after search and recent items.
- Document records, emergency details, IDs, insurance, vaccines, travel numbers,
  school forms, pet records, and other saved household information.

Cabinet should not contain:

- Family member setup.
- Guided onboarding.
- Long explanatory cards.
- Red urgency counters unless there is an actual urgent safety state.

### Family

Purpose: "Who or what is this about?"

Family should contain:

- People and pets as the first visible model.
- Add person.
- Add pet.
- Each profile opens to that person or pet's saved records, fields, dates, and
  custom sections.

Family should not contain:

- Generic app setup.
- Launch plans.
- Theme controls.
- System-level settings.

### Settings

Purpose: "Configure LifeMap."

Settings should contain:

- Guided setup.
- Welcome tour.
- Theme and appearance.
- Account and sign-out.
- Privacy and security.
- Integrations.
- Feedback.
- Demo/reset controls when in demo mode.

Settings should not be used for daily family information retrieval.

### Capture Action

Capture should be available from Home as the main button. On secondary screens,
it can be a compact "Drop" action in the header or a floating button above the
dock, but it should not become a fifth navigation tab.

Capture opens a sheet with:

- Paste text.
- Upload/scan later path.
- Choose who/what it is about.
- AI-sorted suggestions.
- Explicit approval before reminders, messages, calendar writes, or sensitive
  record updates.

## Mobile Shell Design

The web app cannot control Safari's address bar or browser toolbar. It can and
must avoid fighting them.

Implementation requirements:

- Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` in the shell.
- Add top padding so app headers never sit under browser chrome or the notch.
- Add bottom padding so the last content never hides behind the dock.
- Keep the bottom dock fixed, glassy, and compact.
- Avoid page titles being cropped at the top of Review, Cabinet, and profile
  pages.
- Do not use a second sticky header unless the screen requires it.
- Keep visible page content above the dock at all mobile widths.
- Use `viewport-fit=cover` only if the CSS fully accounts for safe areas.

The app should also be ready for a future PWA install path. In standalone mode,
the browser chrome disappears, but the same safe-area rules still apply.

## Visual System Direction

The current purple/blue active states are too hardcoded. The reset should make
the shell consume semantic tokens first.

Required token roles:

```txt
color.bg.app
color.bg.surface
color.bg.glass
color.text.strong
color.text.muted
color.border.quiet
color.action.primary.bg
color.action.primary.text
color.nav.bg
color.nav.item.text
color.nav.item.active.bg
color.nav.item.active.text
color.nav.home.bg
color.nav.home.text
color.focus.ring
shadow.dock
shadow.panel
radius.dock
radius.panel
radius.control
```

The dock should support a "liquid clear tint" direction without becoming noisy:

- translucent white surface,
- subtle blue tint for Home,
- very low contrast border,
- no pulsing animation,
- no saturated purple unless it is the approved brand accent.

## Profile Page Model

The profile page is currently the clearest sign that the app needs a reset. A
person or pet profile should be customizable, not locked into fixed Health and
School rows.

### Profile Header

Each profile shows:

- Avatar/initials.
- Name.
- Type: adult, child, pet, elder, household, custom.
- Edit profile.
- Optional private note hidden behind reveal.

### Default Sections

When creating a profile, LifeMap suggests sections based on type.

For a child:

- Health
- School
- Documents
- Important dates
- Activities

For an adult:

- IDs
- Insurance
- Health
- Travel
- Household

For a pet:

- Vet
- Vaccines
- Insurance
- Care
- Documents

The user can remove, rename, reorder, and add sections.

### Section Contents

Each profile section can hold:

- Documents
- Dates
- Vaccines
- Notes
- Custom fields
- Linked reminders
- Source snippets from capture

Examples:

```txt
Dragon
  Health
    Vaccines
    Documents
    Doctor
  School
    Test day
    Important dates
    Forms
  Custom section
    Any field the user creates
```

### Empty State

Profile empty states should be actionable:

> Nothing saved for Dragon yet.
> Drop a form, add a date, or create a custom field.

Buttons:

- Add document
- Add date
- Add custom field

## Review Model

Review should remain part of the product because safety is core. It should not
remain equal to Home, Family, Cabinet, and Settings in the navigation.

Recommended behavior:

- If nothing needs approval, Review is not a primary nav item.
- If something needs approval, Home shows a small "Needs your OK" card.
- Tapping that card opens the Review queue as a sheet or focused screen.
- Review shows only items waiting for a yes/no decision.
- Suggestions never auto-send messages, write calendar events, or reveal private
  data without explicit approval.

This keeps the safety gate while reducing daily navigation load.

## Onboarding Model

The first-run tour should be short and skippable:

1. What LifeMap does.
2. Who is in your map.
3. What LifeMap should help with first.
4. Optional: add one sample messy thing.

Required controls:

- Continue.
- Skip.
- Back.
- "Tour later" from Settings.

Onboarding should not force users to finish setup before they can drop a thought.

## Data And Customization Requirements

This spec does not require a database migration before the UI reset. It does
require the frontend model to avoid hardcoded assumptions.

Implementation plan should introduce or adapt a local model like:

```ts
type ProfileSection = {
  id: string;
  profileId: string;
  name: string;
  icon: string;
  order: number;
  kind: "health" | "school" | "travel" | "documents" | "dates" | "custom";
};

type ProfileField = {
  id: string;
  profileId: string;
  sectionId: string;
  label: string;
  value: string;
  private: boolean;
};
```

The exact implementation can differ, but the UI must be capable of representing
custom sections and fields.

Security rule: private field values must follow the existing sensitive-data
handling path and should not be logged, embedded in URLs, or exposed in public
assets.

## Implementation Boundaries

First implementation slice:

1. Mobile shell safe-area and bottom-dock cleanup.
2. Token cleanup for nav, active states, Home accent, buttons, cards, and focus.
3. Bottom nav reset to Cabinet, Home, Family, Settings.
4. Move Review behind conditional Home entry.
5. Rebuild profile page around customizable sections and add-section controls.
6. Remove the fixed Health/School table layout.
7. Keep existing storage and demo data unless a minimal shape adapter is needed.

Do not include in this slice:

- New production dependencies.
- Supabase schema changes.
- Auth changes.
- Billing.
- Calendar write changes.
- Worker/API changes unless required by compile errors.
- A full visual rewrite of every old screen.

## Acceptance Criteria

### Mobile Layout

- No page title is clipped under iOS Safari chrome.
- No content is hidden behind the bottom dock.
- Bottom dock is visually stable while scrolling.
- Home is visually distinct but not loud.
- The UI works at 360px, 390px, and 430px mobile widths.

### Flow

- A new user can skip onboarding and still reach Home.
- Home shows one primary action and one capture entry.
- Cabinet is find/browse only.
- Family opens a list of people/pets.
- A profile opens into customizable sections.
- Settings owns setup, tour, theme, feedback, security, and account controls.
- Review appears only when there are items needing approval.

### Customization

- User can add a custom profile section.
- User can add a custom field to a profile section.
- Default sections differ for adult, child, and pet profiles.
- Empty profile sections explain the next action without sounding like an error.

### Visual Tokens

- Changing nav semantic tokens changes the dock and active states.
- Active colors are not hardcoded in component-specific CSS.
- Focus rings remain visible.
- Light mode contrast remains readable.

### Safety

- Sensitive details remain hidden by default.
- Review copy states that nothing is sent or changed without approval.
- No private field values appear in console logs or public generated assets.

## Test Plan

Run:

```txt
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
npm run test:e2e
```

Add or update tests for:

- Mobile nav labels and active state.
- Review no longer being a permanent nav item.
- Home conditional review entry.
- Profile add-section and add-field behavior.
- Profile default sections by person/pet type.
- Theme/token-driven nav color behavior.
- Mobile safe-area regression through Playwright screenshots.

Production review:

- Deploy to Cloudflare Pages.
- Run `npm run verify:production`.
- Smoke test on an actual iPhone link.
- Capture Home, Cabinet, Family profile, Settings, and Review-needed states.

## Risks

- Moving Review out of the dock could hide safety status if the Home card is too
  subtle. Mitigation: show a small count on Home when approvals exist.
- Custom sections can become clutter if the add flow is too open-ended.
  Mitigation: offer suggested templates first, then allow custom.
- Token cleanup can become a broad CSS refactor. Mitigation: limit the first
  pass to shell, dock, active states, primary controls, and profile sections.
- Safari browser chrome cannot be removed from a normal web page. Mitigation:
  design the app shell to respect it now and support PWA standalone mode later.

## Recommended Next Step

Write an implementation plan for the first slice only:

1. Shell and token fixes.
2. Navigation reset.
3. Profile customization model.
4. Review demotion.
5. Focused tests and Cloudflare review.

Do not add more product surfaces until these changes make the mobile app feel
calm, obvious, and customizable.
