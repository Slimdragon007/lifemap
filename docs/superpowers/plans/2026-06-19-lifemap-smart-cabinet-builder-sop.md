# LifeMap Smart Cabinet Builder SOP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build LifeMap correctly by using existing open-source and Figma references as disciplined scaffolding, then proving the Smart Filing Cabinet core loop before expanding the product.

**Architecture:** Treat LifeMap as a family readiness system, not a generic vault. The core loop is: user drops messy family information, LifeMap extracts meaning, the user approves every sensitive action, and the app creates records, calendar suggestions, reminders, and ready packs. Open-source and Figma references are used as audited blueprints, not as a replacement for the existing React/Vite/Cloudflare/Supabase architecture.

**Tech Stack:** React 18, Vite 5, TypeScript, npm, Cloudflare Pages/Workers, Supabase, Playwright, Vitest, Figma variables, Figma Code Connect later.

---

## Product Thesis

LifeMap should become a smart filing cabinet for family life:

```txt
Drop messy real-world family information.
LifeMap sorts it into records, calendar holds, reminders, and ready packs.
Nothing sensitive happens until the user approves it.
```

This plan rejects a plain digital filing cabinet as the final product. Storage is necessary, but the differentiated product is readiness: knowing what a record is for, when it matters, who it belongs to, and what action is safe.

## Builder SOP

Every major LifeMap feature should follow this sequence:

```txt
1. Define the user moment.
2. Search for existing references.
3. Audit references for fit, license, security, and maintenance.
4. Extract patterns, not product assumptions.
5. Prototype the smallest complete loop.
6. Test the loop with fake data.
7. Threat-model sensitive data before real uploads.
8. Build into the existing repo with tests.
9. Verify on iPhone-size and desktop viewports.
10. Only then expand scope.
```

## Working Definitions

- **Drop Zone:** The primary capture action where users paste text, upload screenshots, PDFs, photos, emails, or rough notes.
- **Smart Cabinet:** The organizing system that stores records and understands who/what/when/why.
- **Ready Pack:** A situation-based bundle such as School Year, San Diego Trip, Camp Forms, Pet Boarding, Doctor Visit, or Emergency Wallet.
- **Review Gate:** The approval layer before sending, revealing, saving to calendar, sharing, or using sensitive data.
- **Reference Audit:** A written review of open-source repos, Figma systems, SDK docs, and competitor patterns before copying any idea into LifeMap.

## File Structure

### Documentation Files

- Create: `docs/research/reference-scaffold-audit.md`
  - Owns the audit of GitHub, Figma, SDK, and competitor references.
- Create: `docs/product/smart-cabinet-validation-plan.md`
  - Owns user validation scripts, concept test prompts, and decision thresholds.
- Create: `docs/product/smart-cabinet-product-brief.md`
  - Owns the product thesis, target user, core flows, and non-goals.
- Create: `docs/security/smart-cabinet-threat-model.md`
  - Owns privacy/security risks before real document upload or extraction work.

### Prototype Files

- Create: `public/prototypes/lifemap-smart-cabinet.html`
  - Static mobile-first prototype for the Drop Zone to Ready Pack flow.
- Modify: `public/prototypes/lifemap-creative-prototypes.html`
  - Add a link to the Smart Cabinet prototype.

### App Files For Later Implementation

These are not modified in the first research/prototype tasks. They are listed so future implementation has clear landing zones.

- Modify later: `src/App.tsx`
  - Route or view switch integration for the selected Smart Cabinet flow.
- Modify later: `src/TodayView.tsx`
  - Make Today focus on the current next move and one Drop Zone entry.
- Modify later: `src/family-data.ts`
  - Add fake sample data for records, packs, extracted events, and review items.
- Modify later: `src/styles.css`
  - Token-backed styles only, no scattered one-off theme values.
- Modify later: `src/App.test.tsx`
  - Behavioral coverage for navigation and user-visible outcomes.
- Modify later: `tests/e2e/smoke.spec.ts`
  - Browser smoke coverage for mobile-size core flow.

## Execution Rules

- Do not add new production dependencies during the prototype phase.
- Do not change auth, Supabase RLS, migrations, billing, deployment config, or environment variable names in this plan.
- Do not store or upload real medical, passport, insurance, child, school, or pet data during prototype work.
- Do not position LifeMap as an Apple Wallet replacement.
- Do not build native iOS or Android before the web/PWA core loop is proven.
- Do not make Calendar, Vault, Packing, or AI into separate top-level products yet.

## Task 1: Create Reference Scaffold Audit

**Files:**
- Create: `docs/research/reference-scaffold-audit.md`

- [ ] **Step 1: Create the research folder**

Run:

```bash
mkdir -p docs/research
```

Expected: `docs/research` exists.

- [ ] **Step 2: Add the audit document**

Create `docs/research/reference-scaffold-audit.md` with:

```markdown
# LifeMap Reference Scaffold Audit

**Date:** 2026-06-19
**Status:** Active research baseline
**Purpose:** Identify existing open-source, Figma, SDK, and product references that can guide LifeMap without turning it into a clone.

## Decision Rule

LifeMap may borrow patterns. LifeMap must not inherit another product's core assumptions.

## Audit Table

| Reference | Category | What It Solves | Useful Pattern | Do Not Copy | License / Terms | Security Notes | LifeMap Adaptation | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Figma Simple Design System | Design system | Variables, components, design-to-code structure | Token naming, component organization, Code Connect concepts | Visual identity and component hierarchy wholesale | Check current repository/license before reuse | Low risk if used as reference only | Use as a Figma/token architecture reference | Reference |
| Figma Design Tokens plugin | Design tokens | Token export/import workflows | JSON token structure and naming discipline | Plugin-specific workflow as a hard dependency | Check license before adopting code | Low risk if reference only | Use as reference for CSS variable mapping | Reference |
| Open-source document management apps | Document storage/OCR | Upload, OCR, tags, search, document detail | Document lifecycle, review states, search UX | Enterprise document-management complexity | Check each repo before reuse | High if copying storage/security code blindly | Extract UX/data-model patterns only | Audit needed |
| Open-source packing list apps | Trip packing | Reusable packing checklists | Trip context and reusable "normally forget" items | Standalone packing product assumptions | Check each repo before reuse | Low to medium | Fold into Trip Pack, not separate app | Reference |
| Apple Wallet / PassKit docs | Wallet integration | Eligible passes and issuer-controlled wallet items | "Wallet / LifeMap / Physical" recommendation model | Promise arbitrary sensitive docs can be pushed to Wallet | Official Apple docs apply | High trust risk if misunderstood | Build an education/recommendation layer first | Reference |
| Google Wallet docs | Wallet integration | Eligible passes and Android wallet behavior | Cross-platform "what belongs where" logic | Treat Wallet as universal storage | Official Google docs apply | High trust risk if misunderstood | Keep as later integration research | Later |
| Supabase docs | Backend storage/auth | Auth, row policies, storage, database | Access model, storage policies, audit metadata | Schema changes before threat model | Official docs apply | High because family records are sensitive | Use after threat model and schema plan | Later |

## Reference Categories To Search

- Family document vaults
- Personal document management
- OCR and document extraction
- Packing list and trip planning apps
- Family calendar and school schedule tools
- Apple Wallet / Google Wallet pass support
- Figma variables, token systems, and Code Connect
- Privacy-first family apps

## Scoring Rubric

Score each reference from 1 to 5.

- Product fit
- Architecture fit
- License safety
- Security maturity
- Maintenance activity
- Differentiation risk

## Acceptance Threshold

Use a reference as a scaffold only when:

- License is compatible or no code is copied.
- Security posture is understood.
- It supports the Smart Cabinet thesis.
- It does not make LifeMap feel like a generic vault, calendar, or packing app.
```

- [ ] **Step 3: Review the document for forbidden placeholders**

Run:

```bash
rg -n "TBD|TODO|implement later|fill in details|appropriate error handling|handle edge cases|similar to" docs/research/reference-scaffold-audit.md
```

Expected: no output.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/research/reference-scaffold-audit.md
git commit -m "docs: add LifeMap reference scaffold audit"
```

Expected: commit succeeds.

## Task 2: Create Product Brief

**Files:**
- Create: `docs/product/smart-cabinet-product-brief.md`

- [ ] **Step 1: Create the product folder**

Run:

```bash
mkdir -p docs/product
```

Expected: `docs/product` exists.

- [ ] **Step 2: Add the product brief**

Create `docs/product/smart-cabinet-product-brief.md` with:

```markdown
# LifeMap Smart Cabinet Product Brief

**Date:** 2026-06-19
**Status:** Product thesis for prototype validation

## One-Line Product

LifeMap is a smart filing cabinet for family life: drop messy information once, then LifeMap turns it into records, calendar suggestions, reminders, and ready packs.

## Primary User

Busy parents and caregivers who manage family documents, school forms, health records, pet records, travel information, schedules, and recurring real-life admin.

## Core Problem

Important family information is scattered across email, portals, paper, screenshots, photos, text threads, school apps, medical offices, pet providers, and memory.

## Core Promise

LifeMap reduces the stress of finding and using family information by organizing it around real moments.

## Core Loop

```txt
Drop it.
LifeMap reads it.
LifeMap sorts it.
User approves.
LifeMap remembers and surfaces it later.
```

## First Prototype Moment

The user drops a field trip form or school schedule. LifeMap detects:

- child
- school context
- date and time
- permission due date
- payment requirement
- things to bring
- record destination
- calendar suggestion
- reminder suggestion

## Primary Surfaces

- Today: one current next move.
- Drop Zone: one place to add messy information.
- Ready Packs: situation-based bundles.
- Records: private family information.
- Review: approval before sensitive action.

## Non-Goals

- LifeMap is not a generic file drive.
- LifeMap is not an Apple Wallet replacement.
- LifeMap is not a standalone packing app in the first version.
- LifeMap is not a full calendar replacement.
- LifeMap is not allowed to take sensitive action without user approval.

## Differentiation

Generic vaults store documents. LifeMap stores documents and explains why they matter, when they matter, who they belong to, and what is missing.

## Success Criteria

- A parent can understand the product in under 15 seconds.
- A parent can identify the first thing they would drop into LifeMap.
- A parent can explain what LifeMap did with the information.
- A parent trusts the review gate.
- A parent says the pack would prevent a real missed task or stressful search.
```

- [ ] **Step 3: Check for forbidden placeholders**

Run:

```bash
rg -n "TBD|TODO|implement later|fill in details|appropriate error handling|handle edge cases|similar to" docs/product/smart-cabinet-product-brief.md
```

Expected: no output.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/product/smart-cabinet-product-brief.md
git commit -m "docs: define LifeMap smart cabinet product brief"
```

Expected: commit succeeds.

## Task 3: Create Validation Plan

**Files:**
- Create: `docs/product/smart-cabinet-validation-plan.md`

- [ ] **Step 1: Add validation plan**

Create `docs/product/smart-cabinet-validation-plan.md` with:

```markdown
# LifeMap Smart Cabinet Validation Plan

**Date:** 2026-06-19
**Status:** Required before broad buildout

## Purpose

Validate whether parents and caregivers want LifeMap as a smart filing cabinet, not merely whether they agree that family admin is stressful.

## Research Standard

Opinions are weak. Behavior is stronger.

## Interview Target

Interview 15 to 20 parents or caregivers.

## Screening Criteria

Include people who handle at least three of these:

- school forms
- medical or vaccine records
- insurance information
- kids' activities
- travel documents
- pet records
- shared family calendars
- elder or family caregiving

## Interview Questions

1. Tell me about the last time you needed an important family document and could not find it quickly.
2. Where did you search first?
3. Where was it actually stored?
4. What happened because it was hard to find?
5. What information do you keep in screenshots, Notes, email, or texts to yourself?
6. What would you never put in an app like this?
7. If LifeMap sorted a school schedule or field trip form for you, what would you expect it to create?
8. What would make you trust or distrust the app?
9. Would this be useful once, weekly, monthly, or only during trips/school deadlines?
10. What would make you pay for it?

## Concept Test

Show three concepts:

1. Digital filing cabinet.
2. Smart filing cabinet.
3. Ready packs for school, trips, health, pets, and emergencies.

## Pass Criteria

Continue building when at least 8 of 15 interviewees:

- describe a recent painful document/admin retrieval moment
- identify a real item they would drop into LifeMap
- understand the review-before-action model
- prefer Smart Cabinet or Ready Packs over a plain vault
- name a scenario where they would return to the product

## Kill Or Reshape Criteria

Reshape the product when:

- users only want a simple folder/search tool
- users do not trust storing sensitive family information
- users cannot identify a repeated use case
- users see the product as duplicative with Apple Wallet, Google Drive, or Notes

## Validation Artifact

Create a private results table with:

| Participant | Role | Recent pain | Current workaround | First item they would drop | Trust concern | Preferred concept | Return frequency | Willingness to pay | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 2: Check for forbidden placeholders**

Run:

```bash
rg -n "TBD|TODO|implement later|fill in details|appropriate error handling|handle edge cases|similar to" docs/product/smart-cabinet-validation-plan.md
```

Expected: no output.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/product/smart-cabinet-validation-plan.md
git commit -m "docs: add LifeMap smart cabinet validation plan"
```

Expected: commit succeeds.

## Task 4: Create Threat Model Before Real Data

**Files:**
- Create: `docs/security/smart-cabinet-threat-model.md`

- [ ] **Step 1: Create the security folder**

Run:

```bash
mkdir -p docs/security
```

Expected: `docs/security` exists.

- [ ] **Step 2: Add threat model**

Create `docs/security/smart-cabinet-threat-model.md` with:

```markdown
# LifeMap Smart Cabinet Threat Model

**Date:** 2026-06-19
**Status:** Required before real sensitive uploads

## Sensitive Data Classes

- child names and school context
- vaccine records
- medical forms
- insurance cards and member IDs
- passport and ID details
- pet vaccine records
- travel itineraries
- family schedules
- emergency contact details

## Security Promise

LifeMap must protect sensitive family information by default and require explicit user approval before sharing, sending, revealing, or writing sensitive context outside the app.

## Primary Risks

| Risk | Example | Required Control |
| --- | --- | --- |
| Overexposed previews | Insurance member ID visible on home screen | Redacted previews by default |
| Sensitive notifications | Push says "Casey's vaccine missing" on lock screen | Generic notification copy |
| Unauthorized family access | Co-parent sees restricted record | Per-record access rules |
| AI overreach | Raw passport image sent to model without consent | Explicit processing consent |
| Incorrect extraction | Wrong deadline from school PDF | Review gate before calendar write |
| Data retention surprise | Deleted document remains recoverable | Clear delete/export policy |
| Wallet misunderstanding | User thinks any sensitive doc can be added to Apple Wallet | Wallet eligibility explanation |
| Calendar leakage | Private health context appears on shared calendar | User-approved calendar title/body |

## Required Controls Before Real Uploads

- Authentication is required.
- Storage access is scoped per user/family.
- Private previews are redacted.
- Sensitive actions go through Review.
- Calendar writes require explicit approval.
- Sharing requires explicit approval.
- AI extraction has a consent model.
- Logs do not contain private document text.
- Test data never includes real child, medical, insurance, or passport data.

## First Safe Prototype Rule

The first prototype uses fake data only. It may simulate upload and extraction, but it must not process real documents.

## Open Security Decisions

- Whether file encryption is app-managed, platform-managed, or both.
- Whether document extraction runs server-side, client-side, or through an approved AI provider.
- Whether family members have separate accounts or shared household access first.
- Whether audit history is visible to users in the first MVP.
```

- [ ] **Step 3: Check for forbidden placeholders**

Run:

```bash
rg -n "TBD|TODO|implement later|fill in details|appropriate error handling|handle edge cases|similar to" docs/security/smart-cabinet-threat-model.md
```

Expected: no output.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/security/smart-cabinet-threat-model.md
git commit -m "docs: add smart cabinet threat model"
```

Expected: commit succeeds.

## Task 5: Build Static Smart Cabinet Prototype

**Files:**
- Create: `public/prototypes/lifemap-smart-cabinet.html`
- Modify: `public/prototypes/lifemap-creative-prototypes.html`

- [ ] **Step 1: Inspect prototype index**

Run:

```bash
sed -n '1,220p' public/prototypes/lifemap-creative-prototypes.html
```

Expected: file exists and shows the existing prototype navigation pattern.

- [ ] **Step 2: Create prototype file**

Create `public/prototypes/lifemap-smart-cabinet.html` as a static iPhone-sized prototype. It must include these visible sections:

```txt
Smart Cabinet
Drop anything here
Found in Casey field trip form
LifeMap sorted this into
School Pack
Calendar suggestions
Records saved privately
Review before anything happens
```

Required interactions:

- Clicking `Drop sample form` reveals extracted results.
- Clicking `Approve suggestions` moves the suggestions into a ready state.
- Private record details remain hidden behind a `Reveal` button.

- [ ] **Step 3: Add prototype index link**

Modify `public/prototypes/lifemap-creative-prototypes.html` to include:

```html
<a href="./lifemap-smart-cabinet.html">Smart Cabinet</a>
```

Place it beside the other prototype links.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: lint passes. Static prototype HTML should not affect lint unless referenced by tooling.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 6: Smoke test prototype locally**

Run:

```bash
npm run dev:web
```

Open:

```txt
http://localhost:5173/prototypes/lifemap-smart-cabinet.html
```

Expected:

- iPhone-width layout works.
- no clipped text
- no overlapping buttons
- no dark intimidating dashboard styling
- drop sample flow is understandable without explanation text overload

- [ ] **Step 7: Commit**

Run:

```bash
git add public/prototypes/lifemap-smart-cabinet.html public/prototypes/lifemap-creative-prototypes.html
git commit -m "prototype: add LifeMap smart cabinet flow"
```

Expected: commit succeeds.

## Task 6: Convert Prototype Into App Slice

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/TodayView.tsx`
- Modify: `src/family-data.ts`
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write failing unit test for Smart Cabinet copy**

Add a test in `src/App.test.tsx`:

```tsx
it("shows the smart cabinet drop zone as the primary first action", () => {
  render(<App />);

  expect(screen.getByText(/drop anything here/i)).toBeInTheDocument();
  expect(screen.getByText(/lifemap will sort it before anything happens/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify red state**

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: test fails because the Smart Cabinet drop zone does not exist in the app yet.

- [ ] **Step 3: Add fake sample intake data**

Modify `src/family-data.ts` to include a fake sample with this shape, matching existing export patterns in the file:

```ts
export const smartCabinetSample = {
  title: "Casey field trip form",
  source: "School PDF sample",
  detected: {
    person: "Casey",
    date: "April 18",
    time: "9:00 AM",
    location: "Phoenix Zoo",
  },
  suggestions: [
    "Add field trip to calendar",
    "Save permission slip to Casey school records",
    "Create field trip checklist",
    "Remind 3 days before",
  ],
  privateRecord: "Emergency contact and student details hidden until revealed",
};
```

- [ ] **Step 4: Add the drop zone UI**

Modify `src/TodayView.tsx` so the first meaningful action is:

```tsx
<section className="smart-cabinet-drop panel" aria-labelledby="smart-cabinet-title">
  <p className="eyebrow">Smart cabinet</p>
  <h2 id="smart-cabinet-title">Drop anything here.</h2>
  <p>LifeMap will sort it before anything happens.</p>
  <button type="button" className="primary-action">
    Drop sample form
  </button>
</section>
```

Use existing component patterns and state conventions in `TodayView.tsx`; do not introduce a new state management library.

- [ ] **Step 5: Add token-backed styles**

Modify `src/styles.css` using existing token variables where possible:

```css
.smart-cabinet-drop {
  display: grid;
  gap: 0.75rem;
  border: 1px solid var(--color-border-soft);
  background: var(--color-surface-panel);
  box-shadow: var(--shadow-panel);
}

.smart-cabinet-drop .primary-action {
  justify-self: start;
}
```

If these exact variables do not exist, use the closest existing semantic variables in `src/styles.css`; do not create a parallel token system.

- [ ] **Step 6: Run unit tests**

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: Smart Cabinet test passes.

- [ ] **Step 7: Add e2e smoke coverage**

Modify `tests/e2e/smoke.spec.ts` to assert:

```ts
await expect(page.getByText(/Drop anything here/i)).toBeVisible();
await expect(page.getByText(/LifeMap will sort it before anything happens/i)).toBeVisible();
```

Use existing smoke test setup. Do not create a duplicate Playwright config.

- [ ] **Step 8: Run checks**

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/App.tsx src/TodayView.tsx src/family-data.ts src/styles.css src/App.test.tsx tests/e2e/smoke.spec.ts
git commit -m "feat: introduce LifeMap smart cabinet first action"
```

Expected: commit succeeds.

## Task 7: Decide Whether To Advance

**Files:**
- Modify: `docs/product/smart-cabinet-validation-plan.md`
- Modify: `docs/product/smart-cabinet-product-brief.md`

- [ ] **Step 1: Review validation evidence**

After interviews or concept tests, summarize evidence under:

```markdown
## Validation Results

| Signal | Evidence | Decision |
| --- | --- | --- |
| Problem intensity |  |  |
| First item to drop |  |  |
| Trust barrier |  |  |
| Return frequency |  |  |
| Willingness to pay |  |  |
```

- [ ] **Step 2: Make one of four decisions**

Use exactly one:

```txt
Advance: build app slice.
Reshape: revise concept and retest.
Narrow: focus on one pack, such as School or Trips.
Park: stop building until stronger demand evidence exists.
```

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/product/smart-cabinet-validation-plan.md docs/product/smart-cabinet-product-brief.md
git commit -m "docs: record smart cabinet validation decision"
```

Expected: commit succeeds.

## Recommended Execution Order

1. Task 1: Reference audit.
2. Task 2: Product brief.
3. Task 3: Validation plan.
4. Task 4: Threat model.
5. Task 5: Static prototype.
6. Run user feedback on static prototype.
7. Task 6 only if the static prototype is coherent.
8. Task 7 after real validation evidence exists.

## Quality Bar

LifeMap is "incredible" only if it is:

- understandable in 15 seconds
- useful before the user has organized anything
- calmer than the problem it solves
- strict about sensitive data
- focused on real family moments
- built from tokens and reusable patterns
- validated by behavior, not only enthusiasm

## Checks For Implementation Work

Run these before calling any implementation task complete:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run Playwright smoke when UI changes:

```bash
npm run test:e2e
```

## Risks And Assumptions

- Real user data is out of scope until the threat model is complete.
- Apple Wallet and Google Wallet are later integrations, not first-version promises.
- Open-source references may be useful even when their code should not be copied.
- The current app has active dirty changes, so implementation should start from a clean branch or after current work is intentionally committed.
- The first winning wedge is likely School Pack or Trip Pack, not a broad all-purpose vault.

