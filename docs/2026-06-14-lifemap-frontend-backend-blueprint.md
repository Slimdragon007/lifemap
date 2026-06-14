# LifeMap Frontend + Backend Execution Blueprint

**Date:** 2026-06-14  
**Status:** Execution plan after founder UX audit  
**Goal:** Make the deployed app feel obvious, trustworthy, and demo-ready while preserving the real AI/Supabase/Cloudflare direction.

## Outcome

LifeMap should become a mobile-first daily-use app where the first session feels simple:

1. Sign in.
2. Set up who and what LifeMap should help manage.
3. Dump messy life context.
4. Review the organized map.
5. Save important information to the Vault.
6. Come back to Today for a useful Daily Brief.

The app should preserve the current name and Atlas Home visual direction: deep slate, warm bone, intelligence blue, clay terracotta, muted plum, soft ivory, and restrained sage.

## Current Build Reality

Already working or partially working:

- React/Vite frontend.
- Cloudflare Pages deployment.
- Cloudflare Worker API health endpoint.
- OpenAI server-side analysis path.
- Supabase project and test auth user.
- Local/demo persistence and remote Supabase state seam.
- Today, Calendar, Vault, Review, More, Brain Dump, Family/Admin Map, Launch Plan.
- Approval queue, draft messages, source evidence, deterministic fallback parser.
- Atlas-style Today screen and bottom navigation.

Current trust gaps:

- Daily Brief can fail on the home screen.
- Some buttons animate but do not perform meaningful actions.
- AI analysis path needs production hardening and clearer user feedback.
- The app's structure is still too scattered for a first-time user.
- Vault is strong, but its first viewport is too counter/status-heavy.
- Sensitive profile details are too exposed for a real family app.

## Timeframe

### Founder Presentation Demo

**Estimated: 5 to 7 focused work days.**

This means: polished mobile UX, graceful AI fallback, coherent setup, working capture, improved Vault interactions, and a clean Cloudflare demo link.

### First Friendly Alpha

**Estimated: 2 to 3 weeks after the presentation demo.**

This means: better Supabase persistence, user-specific data model, basic RLS confidence, more reliable AI logs/errors, and enough real records/actions for 5 to 10 users to test Day-2 return.

### Real MVP Beta

**Estimated: 4 to 6 weeks if scope stays tight.**

This means: durable family logistics model, richer Vault, daily brief persistence, real setup/onboarding, security posture, and at least one input expansion beyond paste, such as image upload/OCR simulation or email-forwarding prototype.

## Frontend Blueprint

### Navigation Model

Recommended bottom nav:

1. **Today**
2. **Vault**
3. **Calendar**
4. **Review**
5. **More**

Recommended primary action:

- A visible **Capture** button from Today, either as a center raised action or a screen-level button.
- Capture opens a sheet with Brain Dump, Paste Text, Upload/Scan later, and Demo Sample.

Reasoning:

- Tabs are stable places. Capture is an action.
- Users should not have to choose between "Brain Dump," "Capture," and "Family Admin Map."
- Launch Plan stays in More and remains founder-facing.

### First-Run Setup

Add a guided setup flow before the full app experience:

Screen 1: "Who are you managing?"

- Adults
- Kids
- Pets
- Elder care
- Home
- Vehicles

Screen 2: "What do you want LifeMap to help organize?"

- School forms and schedules
- Health, meds, vaccines
- Insurance cards and IDs
- Travel, passports, TSA, rewards
- Meals and lunch
- House maintenance
- Bills and paperwork
- Care loops

Screen 3: Recommendation:

"Based on what you told us, start with these buckets:"

- Vault
- School
- Health
- Pets
- Travel
- Calendar
- Review

CTA: "Create my LifeMap"

Storage:

- Demo mode: localStorage.
- Supabase mode: user profile/preferences table later.

### Today Screen

Jobs:

- Orient the user.
- Show what matters now.
- Provide one obvious capture path.
- Preserve trust if AI fails.

Required behavior:

- Daily Brief always shows a useful state.
- If AI fails, show last saved brief plus "Using your saved map until AI reconnects."
- "View full brief" opens a detail sheet or full view.
- Each priority row supports at least one action:
  - Complete
  - Snooze
  - Save to Vault
  - Add to Calendar
  - Ask someone
  - Open source

### Capture / Brain Dump

Jobs:

- Accept messy text.
- Reduce intimidation.
- Make the next step obvious.

Required behavior:

- Paste or type text.
- "Analyze" sends to AI API.
- Shows loading motion that feels like LifeMap is organizing, not spinning forever.
- AI result becomes:
  - Next 3 actions
  - Missing info
  - Due items
  - Waiting on
  - Save-to-Vault suggestions
  - Calendar suggestions
  - Draft messages/reminders in Review
- If API fails, deterministic fallback returns something useful and clearly marked.

### Vault

Jobs:

- Make LifeMap feel like a private source of truth.
- Handle records people really need.
- Avoid showing sensitive details too loudly.

Recommended structure:

- Top: search/capture prompt and calm summary.
- Category grid/list:
  - IDs
  - Insurance
  - Health
  - School
  - Pets
  - Travel
  - Home
  - Vehicles
- Records list with filters.
- Emergency View button.
- Profiles as expandable cards.

Interactions:

- Tap profile card to reveal details.
- Tap record to open detail sheet.
- Tap eye/lock icon to reveal sensitive values.
- Save AI suggestion to Vault.
- Dismiss AI suggestion.
- Mark record as updated.

Tone changes:

- Replace red counters with copy like "2 need a quick look."
- Use clay for due soon, plum for private, blue for AI-suggested, sage for complete.

### Calendar

Jobs:

- Make time visible.
- Convert recurring stress into manageable rhythms.

Required behavior:

- Week/list hybrid for mobile.
- Care Loops section:
  - "This week"
  - "Coming up"
  - "Paused"
- Tap event opens details.
- Calendar suggestions from AI can be reviewed before saving.

Future:

- Google/Apple calendar sync.
- OCR from school flyers.
- Travel itinerary parsing.

### Review

Jobs:

- Keep the human in control.
- Make approval gating a trust feature.

Required behavior:

- Drafts editable.
- Reminders reviewable.
- Suggested Vault saves reviewable.
- Suggested calendar items reviewable.
- "Approve & stage" never implies sending until integrations exist.

### More

Jobs:

- Keep non-daily utilities out of the way.

Contains:

- Account.
- Security/privacy.
- Launch Plan.
- Demo reset.
- Data export later.
- Integrations later.

## Backend Blueprint

### P0: Stabilize AI and API Trust

Must fix first:

- Confirm production frontend points to the correct Worker/API URL.
- Confirm Worker has `OPENAI_API_KEY`.
- Confirm CORS allows `https://lifemap-d33.pages.dev`.
- Add structured error categories:
  - Missing key
  - Invalid input
  - OpenAI failure
  - Schema validation failure
  - Rate limit/timeout
- Client should preserve last good analysis/brief when API fails.
- Add safe fallback copy.

Endpoints:

- `POST /api/analyze`
- `POST /api/brief`
- `GET /health`

### P1: Data Model

Keep the existing `LifeMapAnalysis` schema, but promote outputs into durable entities:

- `profiles`
- `buckets`
- `vault_records`
- `care_loops`
- `calendar_items`
- `intakes`
- `analyses`
- `daily_briefs`
- `approval_items`
- `user_preferences`

Suggested table responsibilities:

- `profiles`: family members, pets, emergency basics.
- `buckets`: school, health, travel, pets, home, vehicles, docs.
- `vault_records`: IDs, insurance cards, passports, vaccines, meds, records.
- `care_loops`: recurring rhythms like vaccines, meds, lunches, forms, refills.
- `calendar_items`: due dates, appointments, trip windows, school events.
- `intakes`: raw user-submitted text or uploaded-file metadata.
- `analyses`: AI result JSON with source evidence and model.
- `daily_briefs`: persisted daily output.
- `approval_items`: drafts, reminders, saves, calendar suggestions.
- `user_preferences`: setup answers, selected buckets, tone preferences.

Protected area note:

- Database migrations and RLS changes require explicit approval before editing.
- No service-role key should ever enter the client.

### P2: Daily Brief Generation

Inputs:

- Today's calendar items.
- Open care loops.
- Due items.
- Missing info.
- Waiting-on items.
- Pending approvals.
- Recent intake source evidence.

Output:

- `todaySummary`
- `topPriorities` up to 3
- `openLoops`
- `canWait`
- `suggestedMessages`
- `conflicts`
- `groundingNote`

Rules:

- Never invent events.
- Say "based on what you saved" when no calendar integration exists.
- Preserve last good brief.
- Separate AI suggestions from facts.

### P3: Setup Recommendations

AI is optional here. Use deterministic mapping first.

Example:

- User selects kids + pets + travel.
- Recommend buckets: School, Health, Pets, Travel, Vault, Calendar.
- Seed sample empty states and capture prompts.

This keeps setup fast, cheap, reliable, and testable.

### P4: Future Integrations

Do later:

- OCR/image upload.
- Email forwarding.
- Google Calendar read.
- Apple Calendar export.
- Push reminders.
- Document upload/storage.
- TSA/rewards/travel profile integrations.
- Household sharing.

## Execution Plan

### Phase 0: Production Trust Repair

Goal: The deployed app should not look broken.

Tasks:

- [ ] Verify `/api/analyze` and `/api/brief` from production.
- [ ] Fix any wrong API base URL logic.
- [ ] Make Daily Brief failure graceful.
- [ ] Preserve last good analysis/brief on errors.
- [ ] Ensure Analyze returns fallback rather than dead state.
- [ ] Add UI states for "AI unavailable" vs "nothing captured yet."

Definition of done:

- A user can paste a messy note on the deployed app and get a result or a useful fallback.
- Today never opens with a hard failure as the main message.

### Phase 1: Navigation and Action Clarity

Goal: The app becomes self-navigating.

Tasks:

- [ ] Reduce bottom nav to Today, Vault, Calendar, Review, More.
- [ ] Move Capture to a prominent action/sheet.
- [ ] Reframe Brain Dump as one capture mode.
- [ ] Hide Family/Admin Map behind Today or More.
- [ ] Ensure every visible button performs a clear action.
- [ ] Add detail sheets for priority rows.

Definition of done:

- A first-time user can identify where they are, what to do, and where to go next without a founder explanation.

### Phase 2: Guided Setup

Goal: LifeMap creates a personalized starter map.

Tasks:

- [ ] Add first-run setup screens.
- [ ] Store setup choices in localStorage/demo state.
- [ ] Recommend buckets from choices.
- [ ] Seed empty states based on buckets.
- [ ] Add tests for setup persistence and bucket recommendation.

Definition of done:

- User selects family/pets/travel/admin needs and sees a tailored LifeMap.

### Phase 3: Vault 2.0

Goal: Vault becomes the clearest "I need this" feature.

Tasks:

- [ ] Replace alarming counters with calm summary.
- [ ] Add expandable profile cards.
- [ ] Add record detail sheet.
- [ ] Add Travel bucket details: passports, TSA/PreCheck/Global Entry, rewards, packing list.
- [ ] Add Health/Pet bucket details: meds, vaccines, vet, insurance, allergies.
- [ ] Add School bucket details: schedules, lunch, forms, contacts.
- [ ] Add save/dismiss/update actions.

Definition of done:

- The Vault feels private, useful, and not overwhelming on mobile.

### Phase 4: Calendar and Care Loops

Goal: Recurring logistics feel managed instead of stressful.

Tasks:

- [ ] Add care-loop interaction states.
- [ ] Make care loops snoozable/complete/updatable.
- [ ] Add "this week" and "coming up" groupings.
- [ ] Link capture results to calendar suggestions.
- [ ] Keep calendar writes approval-gated.

Definition of done:

- A recurring task feels like a gentle rhythm, not another guilt counter.

### Phase 5: Supabase Persistence

Goal: Friendly alpha users can return and keep state.

Tasks:

- [ ] Confirm current remote state behavior.
- [ ] Design migrations for durable entities.
- [ ] Add RLS policies for all user-owned tables.
- [ ] Persist setup, intakes, analyses, briefs, Vault records, care loops, approvals.
- [ ] Add security checks for client bundle secrets.

Definition of done:

- A user logs out/in and sees their LifeMap restored from Supabase.

### Phase 6: Presentation Package

Goal: The demo is presentable without narration rescue.

Tasks:

- [ ] Update demo script.
- [ ] Add demo reset.
- [ ] Verify iPhone viewport.
- [ ] Verify Cloudflare link.
- [ ] Capture screenshots.
- [ ] Prepare 3-minute founder narrative.

Definition of done:

- You can send the link to someone and they understand the product loop.

## Next 48 Hours

Recommended build order:

1. Fix production AI/Daily Brief trust states.
2. Simplify navigation and make Capture a primary action.
3. Make every Today priority tappable with a useful sheet/action.
4. Calm down Vault counters and add expandable profile cards.
5. Add first-run setup scaffold with deterministic bucket recommendations.

This is the fastest path from "looks nice but confusing" to "I get it, and I want to use it."

## Acceptance Test For The Next Demo

Use this script:

1. Log in as the test user.
2. Complete setup: two adults, one kid, one pet, travel, school, health, documents.
3. Paste a messy note about school form, pet vaccine, passport, and lunch schedule.
4. Analyze.
5. See top 3 actions on Today.
6. Save passport/vaccine/insurance item to Vault.
7. Add one suggested event to Calendar.
8. Edit one draft message in Review.
9. Refresh/log out/log in.
10. Confirm the useful state is still there.

Pass condition:

- The user never wonders "what do I do now?"

## Risk Register

- **Scope risk:** Travel, health, school, pets, and documents can each become their own product. Keep them as buckets until retention is proven.
- **Trust risk:** AI failure on Today damages confidence. Preserve last good state and make fallback useful.
- **Privacy risk:** Vault stores sensitive data. Hide details by default and keep server secrets server-side.
- **UX risk:** Too many tabs or cards can make the app feel like work. Prefer fewer destinations and richer detail sheets.
- **Backend risk:** Supabase migrations/RLS need careful sequencing and explicit approval before edits.

## Product Mantra

LifeMap should not ask the user to become more organized. LifeMap should organize the life they already have.

