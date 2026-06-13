# LifeMap — Product Strategy & PRD v1

**Date:** 2026-06-13
**Author:** Strategy pass (Claude) on top of the existing Codex + Fable 5 build
**Companion docs:** `lifemap-codex-fable-handoff.md` (current build state — read that for the live demo + file map)
**Status:** Strategy approved? ☐ — review this before we write the implementation plan

> **Honest verdict up front.** You already have the hard part: a working, tested core loop that turns chaos into the next 3 actions. The single biggest threat to this product is **not** missing features — it's scope. The brief describes a whole-life operating system; that vision is right as a _destination_ but wrong as a _next build_. This document deliberately reframes the brief's "MVP" (which is really Stage 2–3) into a lean v1 that ships the wedge to real users and earns retention before expanding. Everything below serves one question: **does a stranger feel clearer after five minutes, and come back tomorrow?**

---

## 1. Executive Summary

LifeMap turns messy life context — emails, forms, screenshots, brain dumps — into a clear map of what's due, what's missing, who you're waiting on, and the next best actions, with draft messages that wait for your approval. The wedge is **family/household admin**, the broader play is **mental-load infrastructure for overloaded adults**.

A working local MVP already exists: structured AI extraction, an approval queue, a calm "family command center" UI, browser-only persistence, and a green test suite. It proves the atomic unit of value — _messy intake → clear action map_ — but has no real auth, persistence, or briefings yet.

**Recommendation:** Do **not** build the full life-OS. Spend the next 30 days turning the existing demo into a thing 5–10 real overloaded parents/professionals use daily. That means three additions only: (1) real accounts + durable storage, (2) a general **mental-load brain-dump capture** (not just family-admin emails), and (3) a **daily brief**. Everything else in the brief — domains dashboard, weekly reset, mental models, integrations, household sharing, automation — is sequenced _after_ retention is proven.

**The one metric that matters for v1:** Day-2 return rate among the first 10 users. If people don't come back without a reminder, no feature list saves it.

---

## 2. Product Thesis

**Refined thesis:** People don't need more apps. They need their invisible mental load made visible, sorted, and reduced to a small number of next actions. The future of personal AI is not chat — it's **mental-load infrastructure**: a system that holds the shape of your life so you don't have to hold it in working memory.

**Why a map, not a list:** Lists scale linearly and collapse under complexity. A map preserves _structure_ — domains, states (active/paused/delegated/ignored), and relationships — so the user offloads not just tasks but the _organization_ of tasks. That offload is the felt relief.

**The atomic unit of value (already built):** `messy text in → {due, missing, waiting-on, next 3 actions, drafts} out, with source evidence and human approval`. Every future feature is a composition of this primitive. Protect it.

**Positioning (lead candidate):**

- Primary: **"Your AI chief of staff for real life."**
- Wedge headline: **"Turn messy family admin into the next three actions."**
- Reframe hook: **"Your to-do list isn't the problem. Your mental load is."**

**Voice:** practical operator, not motivational chatbot. Chief of staff + calm systems-thinker. It reduces the number of things you must remember; it does not lecture you about productivity.

---

## 3. MVP — Reframed

The brief's "MVP" (onboarding intake, 10 domains, mental-load capture, classification, visual map, daily + weekly briefs, next actions, editing, memory) is a strong **Stage 2–3** definition. Shipping all of it before validating retention is the classic over-build trap. Split it:

### MVP-Now (next ~30 days) — "The wedge that retains"

What's needed for a stranger to get value daily:

1. **Existing core loop** (done) — intake → structured extraction → approval queue → staging.
2. **Real auth + durable storage** — replace demo login + `localStorage` with accounts and a real DB. _This is the gate to having "users" at all._
3. **General mental-load capture** — a brain-dump box that accepts anything (not only family-admin email text), classified into types and routed to do-now / schedule / delegate / drop / park. This generalizes the existing extractor.
4. **Daily Brief generator** — the "Daily Dover" moment: one screen each morning summarizing what matters today, open loops, what can wait, and one grounding note.
5. **Manual editing + correction** — user can fix any AI output (partially exists via draft edits/toggles; extend to all item types).

### MVP-Next (Stage 2, only after Day-2 retention proven)

6. Domain dashboard (the 10 life domains with mental-load scores)
7. Weekly Reset generator
8. Durable user memory / context layer (persisted patterns, people, obligations)
9. Multiple map views (Today / Week / Project / Stress)

### Explicitly NOT now (from brief — agreed)

Full agent automation, real email/calendar **sending/writing**, mobile app, social/sharing network, enterprise admin, marketplace, workflow builder. (Calendar/email _read_ import is Stage 4.)

**MVP success definition:** A user dumps messy life context and receives a useful map + daily brief + next-action system, _persisted to their account_, and returns on Day 2 unprompted.

---

## 4. Architecture

### Current (as built)

- **Client:** React 18 + Vite + TypeScript SPA, `lucide-react` icons, hand-rolled CSS design system (`styles.css`).
- **AI API:** local Node `http` server (`scripts/api-server.mjs`) → OpenAI `/v1/responses` with `strict` `json_schema` structured output. Model `gpt-5.5`, server-side key only.
- **Domain core:** `src/lifemap.ts` — shared schema, deterministic fallback parser, approval-queue builder, defensive `normalizeAnalysis`.
- **Persistence:** `src/storage.ts` — browser `localStorage` only.
- **Tests:** Vitest + Testing Library across UI, API client, server, schema, storage. Lint + typecheck + build green.

### Target (MVP-Now)

Keep the SPA. Add a real backend and DB. **Do not rewrite to Next.js/Vercel** just to match the brief's Option A — that's a rewrite tax for no validation gain, and it fights your existing Cloudflare/Workers muscle memory.

```
[Vite React SPA]  ──HTTPS──►  [API: Cloudflare Worker or small Node service]
       │                              │
       │                              ├──► AI provider (OpenAI Responses / Anthropic Messages)
       │                              └──► Supabase (Postgres + Auth + RLS)
       │
   [Supabase JS auth on client]
```

**Recommended stack for MVP-Now:**

- **Frontend:** keep Vite SPA (zero rewrite).
- **Auth + DB:** **Supabase** (Postgres + Auth + Row-Level Security). Fastest path to real accounts with per-user data isolation. (D1 is viable given your Cloudflare history, but Supabase's built-in auth + RLS saves the most net time here.)
- **API:** promote `api-server.mjs` to a deployed service. Cloudflare Worker is the natural host given your stack; a small Node service on Fly/Render is equally fine. Keep the AI key server-side — **never** in the browser.
- **AI provider — honest call:** you're already wired to OpenAI Responses + strict schema and it works. **Do not switch providers mid-validation.** Switching to Anthropic Messages is a real refactor (different request/response shape, tool/structured-output handling) and buys nothing for retention testing. Abstract the provider behind one `analyze()` function so you _can_ swap later, but ship on what's built.
- **Deploy:** Vite static build to Cloudflare Pages/Vercel/Netlify (any); API to Worker/host; Supabase managed.

**Architectural principle:** the structured-extraction core (`lifemap.ts` schema + normalize) is the load-bearing wall. Every new capability (brain-dump classify, daily brief, weekly reset) is a new prompt + schema that reuses the same validate-then-persist pipeline.

---

## 5. Data Model

The built schema is **analysis-centric** (one extraction = arrays of due/missing/waiting/etc.). The brief is **domain-centric** (User → Domain → Item). Reconcile by treating an _analysis_ as an **import event** whose outputs persist as durable **LifeItems** tagged to **Domains**.

```
User
  id, email, name, household_context (jsonb), preferences (jsonb),
  timezone, created_at

Domain                      -- the 10 life domains (seeded per user)
  id, user_id, name, description, status,           -- active|paused|delegated|ignored
  mental_load_score (int), created_at, updated_at

LifeItem                    -- the durable, persisted atom (generalizes built arrays)
  id, user_id, domain_id (nullable),
  title, description,
  type,        -- task|decision|reminder|worry|goal|project|relationship|
               --   finance|health|household|idea|someday|emotional-weight
  status,      -- active|stuck|scheduled|delegated|done|dropped|parked
  priority, emotional_weight (int),
  due_date (nullable),
  source,      -- manual|brain-dump|email-import|calendar-import
  source_quote (text, nullable),     -- evidence; preserves built sourceQuote
  next_action (text, nullable),
  recommendation,   -- do-now|schedule|delegate|automate|clarify|drop|park
  created_at, updated_at

IntakeAnalysis              -- audit/event record of one extraction run
  id, user_id, raw_intake (text), result (jsonb),   -- the LifeMapAnalysis blob
  produced_item_ids (jsonb), model, created_at

Briefing
  id, user_id, type,        -- daily|weekly
  summary (text), recommendations (jsonb),
  date, generated_at

MentalModel                 -- seeded global library, referenced by coaching prompts
  id, name, description, use_case, prompt_instruction

UserMemory                  -- durable context layer (Stage 2)
  id, user_id, durable_context (jsonb), preferences (jsonb),
  recurring_patterns (jsonb), important_people (jsonb),
  recurring_obligations (jsonb), updated_at
```

**Migration note:** the built `LifeMapAnalysis` (dueItems, missingInfo, waitingOn, nextActions, reminders, draftMessages, sourceEvidence) maps cleanly onto `LifeItem` rows: a `dueItem` → `LifeItem{type:task, due_date, source_quote}`; a `reminder`/`draftMessage` → approval-queue items that, on approve, persist as `LifeItem{type:reminder, recommendation:schedule}`. Keep the analysis JSON in `IntakeAnalysis.result` for evidence/audit. **No schema thrown away — it's promoted.**

**Security:** Supabase RLS keyed on `user_id` for every table. Household sharing (Stage 5) adds a `household_id` + membership join, not a redesign.

---

## 6. AI System Prompts

Build every prompt on the **existing pattern**: system role defines the operator persona, strict `json_schema` forces structured output, empty arrays when a category is absent, never invent unsourced facts, cap noise (e.g. next actions ≤ 3). The current extractor prompt is the template:

> _"You are LifeMap, an AI family admin assistant. Extract only actionable household logistics from messy emails, forms, screenshots, or pasted notes. Return empty arrays when a category is absent. Never invent private details that are not implied by the source. Keep nextActions to the three highest-leverage actions."_

**Prompt specs (✅ = exists, 🔜 = MVP-Now, ⏳ = later):**

1. ✅ **Intake extraction** — messy text → `LifeMapAnalysis` (keep as-is; generalize wording beyond "family admin").
2. 🔜 **Mental-load classification** — brain-dump text → array of `{title, type, recommendation, domain, emotional_weight}`. One item per distinct thought; default vague items to `clarify`.
3. 🔜 **Daily brief** — inputs: today's items + open loops + (later) calendar → `{today_summary, top_priorities[≤3], open_loops, can_wait, suggested_messages, conflicts, grounding_note}`. Tone: calm operator. One encouragement, not a pep talk.
4. ⏳ **Weekly reset** — week's items + status deltas → `{moved_forward, still_stuck, needs_decision, can_drop, needs_scheduling, needs_delegation, emerging_patterns, updated_map}`.
5. ✅/🔜 **Next-action recommendation** — already inside extraction; extract as a reusable prompt for any item set.
6. ⏳ **Mental-model coaching** — given a stuck item + relevant `MentalModel.prompt_instruction`, suggest a reframe. Cite which model.
7. ⏳ **Conflict detection** — across dated items, surface overlaps/double-bookings (needs calendar import to be real).
8. ⏳ **Tool/app simplification** — given user's listed tools, suggest consolidations.
9. ⏳ **Tone personalization** — a system-prompt modifier from `UserMemory.preferences` (e.g. terse vs warm).

**Cross-cutting safety rules (enforce in every prompt + UI):**

- Never claim to know calendar/email data unless a source is connected; say "based on what you pasted."
- No medical/legal/financial _decisions_ — surface options, never prescribe.
- Separate **suggestions** from **facts** visually and in copy.
- Always show source evidence/quote for extracted items (the `sourceQuote`/`SourceEvidence` mechanism already does this — keep it everywhere).
- Ask clarifying questions only when genuinely blocked.
- Nothing is sent/scheduled without explicit approval (the staging pattern is already correct — preserve it as a core trust feature, not a demo limitation).

---

## 7. UX Flows & Wireframe Descriptions

**Design language (keep from handoff):** calm premium "family command center" — pastel pink/orange/blue gradient, soft glass surfaces, restrained rounded corners, Todoist-like clarity, mobile-first enough to demo on a phone. First screen after login is the working app, not a marketing page.

**Flow A — Onboarding / first map (≤ 3 min):**

1. Sign up (email/OAuth).
2. One screen: _"What's on your mind right now? Dump it all — messy is fine."_ Big textarea + 2–3 sample chips (school form / overloaded week / brain dump).
3. **Analyze** → first map renders. _Wireframe:_ left = captured items grouped by type; right = "Your next 3 actions" card + "What can wait" + one grounding note.
4. CTA: _"Come back tomorrow for your Daily Brief."_

**Flow B — Daily Brief (the retention engine):**

- Single scrollable card: **Today** (date, 1-line shape-of-day) → **Top 3** → **Open loops** → **Can wait** → **Suggested messages** (draft, approval-gated) → **Conflicts** → **Grounding note**. One-tap "mark done / snooze / drop" per item.

**Flow C — Mental-load capture (anytime):**

- Persistent "＋ Brain dump" button. Paste/type → classify → items drop into the map with recommendations. Voice-to-text friendly (tolerate run-on, no punctuation).

**Flow D — Approval queue (built):**

- Reminders + drafts as toggleable cards; edit draft bodies inline; "Review selected" → "Approve & stage." Staged confirmation states plainly: _nothing was sent or scheduled._

**Flow E — Map dashboard (Stage 2):**

- Domain tiles (Family/Home, Work, Health, Money, Growth, Relationships, Projects, Admin, Creative, Learning). Each tile: active count, stuck count, next deadline, mental-load score, next action. Tap → domain detail.

**Flow F — Weekly Reset (Stage 2):**

- Sunday card: moved-forward / still-stuck / decisions-waiting / drop candidates / emerging patterns → "Update my map."

---

## 8. Testing Plan & QA

**Foundation (exists):** Vitest + Testing Library suites for UI workflow, API client, API server, schema normalize, storage. `npm run lint / typecheck / test / build` all green. **Keep this bar: every new feature ships with tests, green before merge.**

**Test phases:**

- **Phase 1 — Founder test (you):** map Work, Family, Finance, Health, Photography, AI projects, Home, Learning. _Pass if:_ you feel less scattered, the map is useful without over-explaining, the daily brief helps you act, you want to return tomorrow.
- **Phase 2 — Private beta (5–10):** parents, professionals, ADHD users, solopreneurs, household managers. Measure onboarding clarity, map usefulness, briefing usefulness, emotional relief, accuracy, trust, willingness-to-pay, "what would you replace."
- **Phase 3 — Paid pilot:** small charge; test $9/$19/$29/$49. _Pass if:_ people use briefs, return unprompted, say it reduces mental load, invite a partner, ask for integrations.

**QA cases (from brief — turn each into a fixture + assertion):**
messy voice-to-text input · ADHD-style brain dump · parent household logistics · work project overload · conflicting calendar items · worries mixed with tasks · duplicate tasks · vague goals · overloaded day · empty day · weekly reset · sensitive personal data · bad AI recommendation (user can correct) · hallucinated event (must not invent) · misclassification (recoverable) · privacy boundary (no unsourced claims).

**AI-quality QA:** golden-file tests — fixed messy inputs with asserted invariants (≤3 next actions, no invented dates, empty arrays honored, every extracted item carries a source quote). This catches model drift when you tune prompts or swap models.

---

## 9. Go-To-Market

**Wedge:** AI for reducing mental load, starting with families and overloaded professionals.

**Beachhead:** working parents · ADHD professionals · household managers · solopreneurs. Pick **one** to start messaging tests — recommend **ADHD professionals** (acute felt pain, vocal communities, high tool-switching, articulate feedback).

**Lead magnet (top of funnel) — "Mental Load Mapper":** a free, no-signup version of the core loop. Dump everything in your head → get categorized load + a stress map + top 5 next actions + what to drop/delegate/schedule + a sample daily brief. This is _literally the existing extractor de-scoped_ — cheapest possible funnel because it reuses built code.

**Content angles:** "I built an AI chief of staff for my life." · "Your to-do list isn't the problem — your mental load is." · "How AI helps parents stop carrying everything in their head." · "The daily briefing that saved my morning." · "Life Map vs. to-do list." · "Turn your brain dump into a map." · "The future isn't AI agents — it's AI operating systems for real life."

**Channels:** LinkedIn + TikTok/Shorts (build-in-public) · Reddit (r/ADHD, parenting, productivity) · ADHD + parenting communities · indie-hacker + AI-builder communities · productivity newsletters.

**Viral loop (privacy-safe):** shareable _artifacts not data_ — "My Mental Load Score," a blank "My Daily Brief template," "My Weekly Reset" structure. Never auto-share content.

**Build-in-public narrative:** the "Daily Dover" story (Whitney Stefko Dover's family AI chief of staff) is your origin hook — "she built it for one family; LifeMap productizes it for everyone."

---

## 10. Monetization

**Sequence honestly:** validate **retention before price**. Don't gate features until Day-2 return is real; an abandoned paywall teaches nothing.

**Freemium:**

- **Free:** 1 Life Map, limited brain-dumps, limited daily briefs, no saved memory.
- **Paid unlocks:** saved memory/context, unlimited captures, daily + weekly briefings, integrations, household sharing, advanced chief-of-staff.

**Tiers (test, don't assume):**

- **Starter $9/mo** — personal map + weekly reset.
- **Pro $19/mo** — daily brief, saved memory, unlimited captures.
- **Household $29/mo** — partner sharing, family ops, household briefings.
- **Power $49/mo** — integrations, automation suggestions, advanced project maps.

**Future revenue:** template packs (ADHD, founder/operator, family command center), coaching upsells, white-label for coaches, B2B employee mental-load product.

**Pricing test gate:** only run the paid pilot once ≥40% of private-beta users return weekly without nudging.

---

## 11. Risks & Mitigations

| Risk                                    | Severity | Mitigation                                                                                                                                           |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Too broad / scope creep**             | 🔴 High  | This doc's MVP-Now/Next split. Ship the wedge; gate domains/weekly/memory behind retention.                                                          |
| **"Notion with AI"**                    | 🔴 High  | Lead with the _brief moment_ and _next-3-actions_, not a customizable workspace. Opinionated, not configurable.                                      |
| **Users won't maintain another system** | 🔴 High  | Capture-first, zero-setup. Value in the first dump, before any structure. Daily brief does the maintaining _for_ them.                               |
| **Privacy / trust**                     | 🔴 High  | Server-side keys, RLS, source-evidence on every claim, approval-gated drafts, explicit "nothing was sent." Ship a plain-language privacy page early. |
| **AI hallucination**                    | 🟠 Med   | Golden-file invariants, "never invent unsourced facts" in every prompt, visible source quotes, easy correction.                                      |
| **Trust takes time to build**           | 🟠 Med   | Human-in-the-loop everywhere; the system _suggests_, the user _approves_.                                                                            |
| **Too much setup**                      | 🟠 Med   | No onboarding wizard before first value — dump → map in one screen.                                                                                  |
| **Like-it-but-don't-retain**            | 🔴 High  | Daily brief as the habit loop; measure Day-2/Day-7 obsessively. If retention's flat, fix the loop before adding features.                            |
| **Integration complexity**              | 🟠 Med   | Read-only calendar/email _import_ first; no writes/sends until Stage 6.                                                                              |
| **Provider/model risk**                 | 🟢 Low   | Abstract `analyze()`; keep OpenAI for now; golden tests catch drift.                                                                                 |

---

## 12. Roadmap

| Stage                    | Goal                                                 | Status                                   |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------- |
| **1 — Prototype**        | Manual input → AI map → (daily brief)                | ✅ Map loop built; daily brief = the gap |
| **2 — Private beta**     | Real accounts, editable persisted maps, weekly reset | 🔜 next, after auth+DB                   |
| **3 — Paid beta**        | Stripe, onboarding funnel, invite system             | ⏳ after retention proven                |
| **4 — Integrations**     | Calendar (read) → email (read) → tasks               | ⏳                                       |
| **5 — Household mode**   | Partner sharing, family briefing, delegated tasks    | ⏳                                       |
| **6 — Automation layer** | _Suggested_ automations (not autonomous)             | ⏳                                       |

**90-day shape:** Days 0–30 = MVP-Now (auth, persistence, brain-dump, daily brief) + founder test. Days 31–60 = private beta with 5–10 users, domain dashboard + weekly reset, instrument retention. Days 61–90 = if Day-2 retention holds, add Stripe + paid pilot + Mental Load Mapper lead magnet live; begin read-only calendar import.

---

## 13. Claude Code Build Tasks

Grounded in actual files (`src/App.tsx`, `src/lifemap.ts`, `src/api.ts`, `src/storage.ts`, `scripts/api-server.mjs`):

**Epic A — Real accounts & persistence (unblocks "users")**

- A1. Stand up Supabase project; create tables from §5; enable RLS per `user_id`.
- A2. Add Supabase auth to the SPA; replace "Login as Alex Kim" demo path with real sign-up/sign-in (keep a dev-only demo seed).
- A3. Replace `src/storage.ts` `localStorage` with a persistence layer that reads/writes `LifeItem` / `IntakeAnalysis` via the API (keep `localStorage` as offline cache only).
- A4. Promote `scripts/api-server.mjs` to a deployable service; add auth-token verification; keep AI key server-side.

**Epic B — Generalize capture**

- B1. Extend the extractor prompt + schema in `lifemap.ts` from "family admin" to general mental-load (add `type` + `recommendation` per item).
- B2. Add a "Brain dump" entry point in `App.tsx` (textarea + classify → persisted `LifeItem`s).
- B3. Golden-file tests for the new classifier (invariants: ≤3 next actions, no invented dates, source quotes present, empty arrays honored).

**Epic C — Daily Brief**

- C1. New prompt + schema: daily brief from a user's open items.
- C2. `/api/brief` endpoint + `GET` today's brief; persist to `Briefing`.
- C3. Daily Brief screen (Flow B); becomes the post-login default once items exist.

**Epic D — Trust & polish**

- D1. Source-evidence expansion (handoff task #3): click a source chip → reveal supporting quote.
- D2. "Reset demo" control (handoff task #2).
- D3. Privacy page (handoff task #5): local/cloud storage, server-side keys, approval-gated actions.

**Cross-cutting:** wrap the AI call in a single `analyze(provider, ...)` seam so provider/model is swappable; every epic ships with green `lint / typecheck / test / build`.

---

## 14. Immediate Next Steps

**This week (founder-test readiness):**

1. **Decision:** confirm MVP-Now scope (Epics A–C) vs. a different cut. _(Needs your sign-off — see top of doc.)_
2. **Epic A1–A2 first** — nothing else counts until real accounts exist. Start with Supabase + auth.
3. In parallel, **B1** (generalize the extractor prompt) — low-risk, high-leverage, reuses the built pipeline.
4. Keep the demo path working behind a dev flag so you can keep showing it while the real version lands.

**30-day plan:**

- Wk 1: Epic A (auth + DB + persistence + deployed API).
- Wk 2: Epic B (general brain-dump capture + classifier + tests).
- Wk 3: Epic C (daily brief end-to-end).
- Wk 4: Epic D (source evidence, reset, privacy page) + **founder test** against your real life; instrument Day-2 return.

**First exact tasks to implement (in order):**

1. Create Supabase project + `User/Domain/LifeItem/IntakeAnalysis/Briefing` tables with RLS.
2. Add Supabase auth to the SPA; gate the app; seed the 10 domains on first login.
3. Swap `storage.ts` to persist `LifeItem`s through the API instead of `localStorage`.
4. Generalize the extractor prompt/schema to emit `type` + `recommendation`; update golden tests.
5. Build `/api/brief` + the Daily Brief screen.

---

### Appendix — Deliverable cross-reference

Brief asked for 20 deliverables; mapping to sections: thesis §2 · MVP §3 · architecture §4 · schema §5 · user flows + wireframes §7 · AI prompt system §6 · testing §8 · GTM §9 · monetization §10 · competitive (below) · risks §11 · 30/90-day §12+§14 · PRD = §3–§7 · landing copy + interview script + metrics (below) · Claude Code build plan §13 · first tasks §14.

**Competitive note:** Notion/Todoist/Motion/Reclaim/Akiflow/Sunsama (planning/scheduling, not load-reduction), ChatGPT/Claude/Pi (chat, no durable life model), Mem/Rewind (memory, no action), Cozi/Skylight/personal CRMs (single-domain), Goblin.tools (task-breakdown, no map/memory). **LifeMap's lane:** visual map-first + mental-load-first + durable life model + chief-of-staff (not chatbot) + approval-gated trust, for ordinary overloaded people.

**Landing page copy (draft):**

- H1: _Your AI chief of staff for real life._
- Sub: _Dump the mess in your head. LifeMap turns it into a map of what matters — and your next three actions._
- 3 bullets: _Capture anything, messy is fine_ · _See what's due, stuck, and waiting on you_ · _Get a calm daily brief — nothing sent without your OK._
- CTA: _Map your mental load — free._

**Beta interview script (5 Qs):** 1) Walk me through the last time you felt mentally overloaded. 2) What do you currently use to keep track — and where does it fail? 3) [after using] What did the map get right? Wrong? 4) Would you open this tomorrow morning? Why/why not? 5) What would have to be true for you to pay $19/mo?

**Success metrics:** North star = **Day-2 return rate** (then Day-7, Week-4). Supporting: time-to-first-map (<3 min), items captured/session, brief open rate, correction rate (AI accuracy proxy), "felt clearer" survey (1–5), partner invites, willingness-to-pay.
