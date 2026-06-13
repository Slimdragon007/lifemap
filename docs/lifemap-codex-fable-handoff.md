# LifeMap Handoff: Codex + Fable 5

## One-Line Product Summary
LifeMap is an AI family admin map: forward or paste messy emails, screenshots, forms, and task notes, and it turns them into what is due, what is missing, who we are waiting on, the next 3 actions, reminders, and draft messages for approval.

## Current MVP Status
The local demo is working end to end:

- One-click demo login: **Login as Alex Kim**
- Paste or choose messy family-admin intake text
- Click **Analyze intake**
- Real OpenAI structured extraction generates the family admin map
- User can review due items, missing info, waiting-on, next actions, reminders, and draft messages
- User can toggle approvals, edit draft message bodies, review selected items, and click **Approve & stage**
- Staged state clearly says demo-only: nothing was sent or scheduled
- Browser-only storage preserves login, intake, analysis, approval toggles, and draft edits
- No real auth, email sending, calendar scheduling, cloud database, or Supabase yet

## Local Demo Commands
Use npm. Do not mix package managers.

```bash
npm run dev
```

Local desktop URL:

```text
http://localhost:5173/
```

Phone on same Wi-Fi:

```text
http://<Mac LAN IP>:5173/
```

The local API server runs on:

```text
http://localhost:8787/
```

## Environment
The API server reads:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

Default model in the local API server is currently:

```text
gpt-5.5
```

The API key must stay server-side only. Never expose it in browser code, screenshots, build output, or demo copy.

## Demo Script
1. Open LifeMap.
2. Click **Login as Alex Kim**.
3. Click one sample:
   - **School form**
   - **Medical bill**
   - **Travel doc**
4. Click **Analyze intake**.
5. Point out:
   - What is due
   - What is missing
   - Waiting on
   - Next 3 actions
   - Approval queue
6. Edit one draft message.
7. Toggle one item off.
8. Click **Review selected**.
9. Click **Approve & stage**.
10. Show the staged confirmation: nothing was sent or scheduled.

## Visual Direction
The current UI direction is a premium, calm family command center:

- Pastel pink, orange, and blue gradient atmosphere
- Soft glass surfaces
- Clear Todoist-like task organization
- Friendly but serious privacy posture
- Rounded corners kept restrained
- Micro-interactions for hover, loading, modal, switch, and staging states
- Mobile-first enough to demo on a phone

Avoid making it feel like a generic SaaS landing page. The first screen after login should be the actual working app.

## Fable 5 / Video Direction
Create a short product demo that feels like a real family admin problem being solved in under a minute.

Suggested structure:

1. **Opening problem**
   - Show messy email/form/screenshot language.
   - Mood: parental cognitive overload, not corporate productivity.

2. **LifeMap action**
   - Paste or choose a sample intake.
   - Click **Analyze intake**.
   - Show the map organizing the chaos.

3. **Trust moment**
   - Highlight: "Drafts wait for approval."
   - Highlight: "Demo data is stored in this browser only."
   - Do not imply automatic sending.

4. **Finish line**
   - Review selected approvals.
   - Click **Approve & stage**.
   - Show: "Nothing was sent or scheduled. Ready for real integrations later."

5. **Closing line**
   - "LifeMap turns family admin chaos into the next three actions."

## YouTube Banner Direction
Banner concept:

- Product name: **LifeMap**
- Tagline: **AI family admin map**
- Visual: soft pastel pink/orange/blue gradient, with a subtle app-shell preview or task-map motif
- Tone: calm, premium, trusted, parent-friendly
- Avoid: cyber-security cliches, dark hacker visuals, generic productivity checklists

Suggested banner copy:

```text
LifeMap
AI family admin map
Turn messy emails, forms, and reminders into the next 3 actions.
```

## Current Files To Know
- `src/App.tsx`: main React UI, demo login, intake, analysis rendering, approvals, staging flow, sample buttons
- `src/styles.css`: full visual system, responsive layout, motion, cards, sample strip, staged confirmation
- `src/lifemap.ts`: shared analysis schema, deterministic fallback parser, approval queue builder
- `src/api.ts`: browser client for local `/api/analyze`
- `scripts/api-server.mjs`: local OpenAI Responses API server with structured output schema
- `src/storage.ts`: browser-only localStorage persistence
- `src/App.test.tsx`: UI workflow tests

## Validation Already Passing
Most recent local checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All were passing after the sample-intake feature was added.

## Next Codex Tasks
Recommended next implementation tasks:

1. Run all three sample intakes through real AI and tune output formatting if the extraction is too verbose or too sparse.
2. Add a small "Reset demo" control so demos can start cleanly without manually clearing browser storage.
3. Add source evidence expansion so clicking a source chip reveals the quote that supported the extracted item.
4. Add fake "calendar/email integration coming next" placeholders only after the MVP flow remains crisp.
5. Write a security/privacy page explaining local demo storage, server-side API key handling, and future auth plans.

## Hard Boundaries For Now
Do not add these yet:

- Real authentication
- Supabase or cloud database
- Email forwarding
- Calendar writes
- Real sending/scheduling
- Billing
- Production deployment config

The MVP should first win on the core loop: messy intake to clear family admin action map.
