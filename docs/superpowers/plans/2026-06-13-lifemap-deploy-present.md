# LifeMap Deploy And Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship LifeMap as a working, phone-viewable production demo with real AI extraction, Cloudflare deployment, Supabase-backed signed-in persistence when configured, and a crisp founder presentation path.

**Architecture:** Keep the current React/Vite SPA and deploy it to Cloudflare Pages. Keep AI calls server-side through the existing Cloudflare Worker API (`worker/lifemap-api.mjs`) and keep Supabase optional: real auth/persistence when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, browser-only demo mode otherwise.

**Tech Stack:** React 18, Vite 5, TypeScript, Vitest, Lucide, OpenAI Responses API via Worker, Cloudflare Pages/Workers, Supabase Auth/Postgres/RLS, npm.

---

## Compact Context Capsule

- Product: LifeMap, "AI chief of staff for real life."
- Current UI target: the uploaded Atlas Home/LifeMap spec sheet with Deep Slate `#121826`, Warm Bone `#F3EFE6`, Intelligence Blue `#3A6BFF`, Clay Terracotta `#D26A4A`, Muted Plum `#5A4661`, Soft Ivory `#FAF7F2`, Sage `#7FA284`.
- Current local app URL: `http://127.0.0.1:5173/`.
- Current local API URL: `http://127.0.0.1:8787/`.
- Current Worker entry: `worker/lifemap-api.mjs`.
- Current Worker config: `wrangler.jsonc`.
- Current Supabase migration: `supabase/migrations/0001_init.sql`.
- Current deployment notes: `docs/cloudflare-deployment.md`.
- Current design QA artifact: `design-qa.md`, final result passed.
- Current screenshot target: `/tmp/codex-remote-attachments/019eba3d-ec95-7090-9115-3c1a65c6fed3/87978EA5-25E0-432D-A0C1-8824AB650D3D/1-Photo-1.jpg`.
- Current rendered QA screenshot: `/tmp/lifemap-atlas-mobile-390-qa.png`.
- Current package manager: npm, because `package-lock.json` exists.
- Latest known checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed with 67 tests.
- Current dirty worktree contains existing changes in `src/App.test.tsx`, `src/App.tsx`, `src/BrainDumpView.tsx`, `src/TodayView.tsx`, `src/styles.css`, `wrangler.jsonc`, plus new `design-qa.md`.

## Timeframe

- **Presentation-ready deployed demo:** 4-6 focused hours if Cloudflare, Supabase, GitHub, and OpenAI access are already available.
- **Polished founder demo with rehearsed iPhone flow:** 1 working day.
- **Private beta that feels safe for real users:** 3-5 working days, mostly for auth persistence, production smoke testing, security review, and edge-case cleanup.

## Presentation Definition Of Done

- A public HTTPS app URL opens on iPhone.
- Pressing login gets to the Atlas-style Today screen.
- Capture opens from the center button.
- Pasting a messy family-admin message produces AI-organized results.
- Review queue shows approval-gated reminders/drafts.
- Refreshing/reopening keeps state.
- Worker health check returns `{ ok: true, service: "lifemap-api" }`.
- No OpenAI key or service-role secret appears in client code or `dist`.

---

## File Map

- `src/App.tsx`: app shell, demo login, tabs, capture sheet, top-level state.
- `src/TodayView.tsx`: Atlas-style Today dashboard.
- `src/styles.css`: visual system, mobile shell, bottom nav, Atlas palette.
- `src/api.ts`: client API origin selection and fetch wrappers.
- `src/storage.ts`: browser-only demo persistence.
- `src/remoteState.ts`: Supabase persistence seam.
- `src/supabaseClient.ts`: browser Supabase client using safe `VITE_*` vars.
- `worker/lifemap-api.mjs`: deployed AI API for analyze/classify/brief.
- `wrangler.jsonc`: Worker deployment config and allowed origins.
- `supabase/migrations/0001_init.sql`: Auth/Postgres/RLS schema.
- `docs/cloudflare-deployment.md`: deployment checklist.
- `design-qa.md`: current visual QA record.

---

### Task 1: Checkpoint The Current MVP State

**Files:**
- Read: all modified files from `git status --short`
- Modify: none unless committing after review

- [ ] **Step 1: Inspect current worktree**

Run:

```bash
pwd
git status --short
git diff --stat
```

Expected: repo path is `/Users/michaelhaslim/Projects/lifemap`; dirty files match the context capsule.

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands pass; Vitest reports 67 passing tests unless new tests have been added.

- [ ] **Step 3: Commit only after the user approves committing**

Run only after approval:

```bash
git add src/App.test.tsx src/App.tsx src/BrainDumpView.tsx src/TodayView.tsx src/styles.css wrangler.jsonc design-qa.md docs/superpowers/plans/2026-06-13-lifemap-deploy-present.md
git commit -m "feat: polish lifemap mobile demo"
```

Expected: one clean checkpoint commit.

---

### Task 2: Add A Presentation-Perfect First-Run Demo Seed

**Files:**
- Create: `src/demoSeed.ts`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Add a failing test for the first-run Today content**

Add this test to `src/App.test.tsx`:

```tsx
test("starts a fresh demo with the presentation-ready LifeMap sample", async () => {
  const user = userEvent.setup();

  render(<App />);
  await user.click(screen.getByRole("button", { name: "Login as Alex Kim" }));

  expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  expect(screen.getByText("Field trip permission slip")).toBeInTheDocument();
  expect(screen.getByText("Renew passport")).toBeInTheDocument();
  expect(screen.getByText("Milo vet appointment")).toBeInTheDocument();
  expect(screen.getByText("Vault")).toBeInTheDocument();
  expect(screen.getByText("Travel")).toBeInTheDocument();
  expect(screen.getByText("Health")).toBeInTheDocument();
  expect(screen.getByText("Home")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new test to confirm it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: the new test fails because current stored/default sample content is not locked to the spec-sheet sample.

- [ ] **Step 3: Create `src/demoSeed.ts`**

Add:

```ts
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";

export const presentationIntake = `School portal, travel reminder, and pet care notes:

Emma's field trip permission slip is due tomorrow. The school still needs the parent signature.
Alex needs to renew the passport before the Maui trip.
Milo has a vet appointment on Jun 18 at 10:30 AM.`;

export const presentationAnalysis: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-field-trip-slip",
      title: "Field trip permission slip",
      dueDate: "Tomorrow",
      sourceQuote: "Emma's field trip permission slip is due tomorrow.",
    },
    {
      id: "due-passport",
      title: "Renew passport",
      dueDate: "In 12 days",
      sourceQuote: "Alex needs to renew the passport before the Maui trip.",
    },
    {
      id: "due-milo-vet",
      title: "Milo vet appointment",
      dueDate: "Jun 18 at 10:30 AM",
      sourceQuote: "Milo has a vet appointment on Jun 18 at 10:30 AM.",
    },
  ],
  missingInfo: [
    {
      id: "missing-parent-signature",
      label: "Parent signature",
      reason: "The school still needs the signed permission slip.",
      sourceQuote: "The school still needs the parent signature.",
    },
  ],
  waitingOn: [
    {
      id: "wait-school",
      name: "Westview School",
      reason: "Needs the signed permission slip returned.",
    },
  ],
  nextActions: [
    {
      id: "action-sign-slip",
      label: "Field trip permission slip",
      owner: "Emma",
    },
    {
      id: "action-renew-passport",
      label: "Renew passport",
      owner: "You",
    },
    {
      id: "action-milo-vet",
      label: "Milo vet appointment",
      owner: "Milo",
    },
  ],
  reminders: [
    {
      id: "reminder-slip",
      title: "Field trip permission slip due",
      body: "Remind Alex to sign and return Emma's permission slip tomorrow.",
      status: "Scheduled",
    },
    {
      id: "reminder-vet",
      title: "Milo vet appointment",
      body: "Remind Alex about Milo's vet appointment on Jun 18 at 10:30 AM.",
      status: "Scheduled",
    },
  ],
  draftMessages: [
    {
      id: "draft-teacher",
      recipient: "Westview School",
      subject: "Emma field trip permission slip",
      body: "Hi, I will return Emma's signed field trip permission slip tomorrow.",
      status: "Needs review",
    },
  ],
  sourceEvidence: [
    {
      id: "source-school",
      type: "note",
      label: "School portal",
      quote: "Field trip permission slip is due tomorrow.",
    },
    {
      id: "source-travel",
      type: "note",
      label: "Travel reminder",
      quote: "Renew the passport before the Maui trip.",
    },
    {
      id: "source-health",
      type: "note",
      label: "Pet care",
      quote: "Milo has a vet appointment on Jun 18 at 10:30 AM.",
    },
  ],
};

export const presentationBrief: DailyBrief = {
  todaySummary: "3 things need your attention today.",
  topPriorities: [
    {
      id: "priority-slip",
      label: "Field trip permission slip",
      reason: "Due tomorrow · Emma",
    },
    {
      id: "priority-passport",
      label: "Renew passport",
      reason: "Due in 12 days · You",
    },
    {
      id: "priority-vet",
      label: "Milo vet appointment",
      reason: "Jun 18 at 10:30 AM",
    },
  ],
  openLoops: [
    {
      id: "loop-signature",
      label: "Parent signature",
      blockedBy: "The field trip slip still needs a signature.",
    },
  ],
  canWait: [],
  suggestedMessages: presentationAnalysis.draftMessages,
  conflicts: [],
  groundingNote: "Grounded in school, travel, and pet care notes.",
};
```

- [ ] **Step 4: Wire the seed into `src/App.tsx` only for empty first-run state**

Change the default imports and state initialization:

```tsx
import {
  presentationAnalysis,
  presentationBrief,
  presentationIntake,
} from "./demoSeed";

const starterIntake = presentationIntake;
```

Keep this behavior:

```tsx
const [intake, setIntake] = useState(initialState.intake ?? starterIntake);
const [map, setMap] = useState(
  initialState.analysis ?? presentationAnalysis,
);
const [dailyBrief, setDailyBrief] = useState<DailyBrief>(
  initialState.dailyBrief ?? presentationBrief,
);
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm test -- src/App.test.tsx src/lifemap.test.ts src/dailyBrief.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 6: Commit**

Run after review:

```bash
git add src/demoSeed.ts src/App.tsx src/App.test.tsx
git commit -m "feat: add presentation demo seed"
```

---

### Task 3: Final Visual And Phone QA

**Files:**
- Modify: `src/TodayView.tsx`
- Modify: `src/styles.css`
- Modify: `design-qa.md`

- [ ] **Step 1: Open the local app**

Run:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Expected: LifeMap loads in the side browser.

- [ ] **Step 2: Verify the first viewport**

Check these items visually on a 390x844 mobile viewport:

```text
LifeMap wordmark
Today
current date
Daily Brief card
Top Priorities with School / Travel / Health
Your LifeMap tiles
Bottom nav
```

Expected: no overlap, no text outside cards, bottom nav does not cover the tiles.

- [ ] **Step 3: Update `design-qa.md` with the new screenshot path**

Use the browser capture path from the actual QA run and update:

```md
- Implementation screenshot path: `/tmp/lifemap-atlas-mobile-390-final-seed.png`
- State: fresh logged-in demo state using presentation seed.
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all pass.

---

### Task 4: Deploy The AI Worker

**Files:**
- Modify if needed: `wrangler.jsonc`
- Read: `worker/lifemap-api.mjs`

- [ ] **Step 1: Confirm Cloudflare login**

Run:

```bash
npx wrangler whoami
```

Expected: Wrangler prints the authenticated Cloudflare account.

- [ ] **Step 2: Set the OpenAI secret**

Run:

```bash
npx wrangler secret put OPENAI_API_KEY
```

Expected: Wrangler prompts for the key; paste the OpenAI key into the terminal prompt, not into source files.

- [ ] **Step 3: Deploy the Worker**

Run:

```bash
npm run deploy:api
```

Expected: Wrangler deploys `lifemap-api` and prints the Worker URL.

- [ ] **Step 4: Save the Worker URL for the remaining deployment steps**

Run, then paste the Worker origin printed by Wrangler in Step 3 and press Return:

```bash
read -r LIFEMAP_API_ORIGIN
export LIFEMAP_API_ORIGIN
```

Expected: the terminal now has `LIFEMAP_API_ORIGIN` available for the next curl commands.

- [ ] **Step 5: Health check the Worker**

Run:

```bash
curl "$LIFEMAP_API_ORIGIN/health"
```

Expected response:

```json
{"ok":true,"service":"lifemap-api"}
```

- [ ] **Step 6: API smoke test**

Run:

```bash
curl -s "$LIFEMAP_API_ORIGIN/api/analyze" \
  -H 'Content-Type: application/json' \
  -d '{"rawIntake":"Field trip slip due tomorrow. Missing parent signature."}'
```

Expected: JSON with `"ok": true` and an `"analysis"` object.

---

### Task 5: Deploy The Frontend To Cloudflare Pages

**Files:**
- Read: `docs/cloudflare-deployment.md`
- Modify if needed: `docs/cloudflare-deployment.md`

- [ ] **Step 1: Build production assets**

Run:

```bash
npm run build
```

Expected: `dist/` is created with Vite assets.

- [ ] **Step 2: Set Cloudflare Pages env vars**

In Cloudflare Pages for the `lifemap` project, set:

```text
VITE_API_ORIGIN = value of LIFEMAP_API_ORIGIN from Task 4
VITE_SUPABASE_URL = Supabase Project Settings > API > Project URL
VITE_SUPABASE_ANON_KEY = Supabase Project Settings > API > anon public key
```

Do not set `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` as `VITE_*`.

- [ ] **Step 3: Deploy Pages from GitHub or CLI**

Preferred GitHub-connected deployment:

```bash
git push origin HEAD
```

CLI fallback:

```bash
npx wrangler pages deploy dist --project-name lifemap
```

Expected: Cloudflare prints a production or preview Pages URL.

- [ ] **Step 4: Open the deployed URL on desktop and iPhone**

Open the Pages URL from Step 3.

Expected: the app loads over HTTPS, login works, and the Today screen matches the Atlas-style design.

---

### Task 6: Apply Supabase And Verify Persistence

**Files:**
- Read/execute: `supabase/migrations/0001_init.sql`
- Read: `src/supabaseClient.ts`
- Read: `src/remoteState.ts`

- [ ] **Step 1: Apply the migration**

In Supabase SQL editor, run the full contents of:

```text
supabase/migrations/0001_init.sql
```

Expected: tables, RLS policies, trigger, and mental models are created without error.

- [ ] **Step 2: Configure auth**

In Supabase Auth settings:

```text
Enable email auth.
Set the production Pages URL as an allowed redirect URL.
Set localhost:5173 as an allowed redirect URL for local testing.
```

Expected: a user can sign in without breaking demo mode.

- [ ] **Step 3: Verify signed-in persistence**

Manual test:

```text
Sign in.
Paste a messy intake.
Analyze.
Save or stage at least one item.
Reload the page.
Confirm the same LifeMap state restores.
Sign out.
Sign back in.
Confirm the same state restores again.
```

Expected: state survives reload and sign-in round trip.

---

### Task 7: Security And Production Smoke Test

**Files:**
- Read: `dist/`
- Read: `src/api.ts`
- Read: `worker/lifemap-api.mjs`
- Modify only if a failure is found.

- [ ] **Step 1: Search built assets for server-only secrets**

Run:

```bash
rg -n "OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|sk-" dist src worker docs
```

Expected: no actual secret values. Secret names may appear only in docs, server code, or tests.

- [ ] **Step 2: Production flow test**

In production Pages URL:

```text
Open app.
Login.
Open Capture.
Paste a new family-admin message.
Analyze intake.
Refresh Daily Brief.
Open Calendar.
Open Vault.
Open Review.
Toggle an approval off and on.
Reload.
```

Expected: no blank screens, no client console errors, no automatic sending.

- [ ] **Step 3: Save the production Pages origin**

Run:

```bash
read -r LIFEMAP_PAGES_ORIGIN
export LIFEMAP_PAGES_ORIGIN
```

Expected: the terminal now has `LIFEMAP_PAGES_ORIGIN` available for the CORS test.

- [ ] **Step 4: Worker CORS test**

Run:

```bash
curl -i -X OPTIONS "$LIFEMAP_API_ORIGIN/api/analyze" \
  -H "Origin: $LIFEMAP_PAGES_ORIGIN" \
  -H 'Access-Control-Request-Method: POST'
```

Expected: HTTP `204` and `Access-Control-Allow-Origin` matching the Pages origin.

---

### Task 8: Founder Presentation Package

**Files:**
- Create: `docs/lifemap-demo-script.md`
- Create: `docs/lifemap-demo-checklist.md`

- [ ] **Step 1: Create the demo script**

Add `docs/lifemap-demo-script.md`:

```md
# LifeMap Demo Script

## 30-second setup
LifeMap is an AI chief of staff for real life. Parents forward or paste the messy things that create mental load: school forms, doctor notes, travel docs, bills, pet care, schedules, and reminders.

## Demo flow
1. Open LifeMap on iPhone.
2. Press Login as Alex Kim.
3. Show Today: Daily Brief, Top Priorities, and Your LifeMap.
4. Tap Capture.
5. Paste: "Emma's field trip slip is due tomorrow, passport renewal is coming up, and Milo has a vet appointment Jun 18 at 10:30 AM."
6. Run Analyze.
7. Show what LifeMap extracted: due items, missing info, waiting on, next actions.
8. Open Review and point out that nothing sends automatically.
9. Open Vault and show life logistics buckets.

## Close
LifeMap turns scattered real-life admin into a trusted operating system: what is due, what is missing, who we are waiting on, and the next three actions.
```

- [ ] **Step 2: Create the demo checklist**

Add `docs/lifemap-demo-checklist.md`:

```md
# LifeMap Demo Checklist

- Production app URL opens on iPhone.
- Worker health endpoint returns ok.
- OpenAI analysis works with a fresh pasted intake.
- Supabase sign-in works or demo mode is intentionally used.
- No private key appears in browser devtools or built assets.
- Bottom nav is visible and not overlapping first-screen content.
- Review queue clearly says nothing sends automatically.
- Demo seed is reset before presenting.
- Phone is on stable Wi-Fi or cellular.
- Backup local URL is ready: http://127.0.0.1:5173/
```

- [ ] **Step 3: Commit docs**

Run:

```bash
git add docs/lifemap-demo-script.md docs/lifemap-demo-checklist.md
git commit -m "docs: add lifemap demo script"
```

---

## Recommended Execution Order

1. Task 1: checkpoint and verify.
2. Task 2: presentation seed.
3. Task 3: phone QA.
4. Task 4: Worker deploy.
5. Task 5: Pages deploy.
6. Task 6: Supabase persistence.
7. Task 7: production security smoke.
8. Task 8: demo package.

## Risk Notes

- The app can be presentation-ready before Supabase is perfect because browser demo mode works, but private beta should wait for Supabase persistence verification.
- The Worker must be deployed before Pages can use real AI in production.
- `VITE_*` variables are public by design. Only Supabase URL and anon key belong there.
- The OpenAI key belongs only in Worker secrets or `.env.local` for local API server.
- Current dirty worktree should be committed or intentionally preserved before deployment work begins.

## Final Recommendation

Aim for a deployed, presentation-ready demo in one focused session. Treat private beta as the next milestone after the presentation link works and the demo story lands.
