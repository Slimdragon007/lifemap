# LifeMap V1 — Real, Secure Per-User Persistence

**Goal:** A legitimate consumer V1 where signed-in families' **sensitive data** (IDs,
passports, insurance, health, kids' info) is durably stored in **Supabase, per user,
locked down with RLS**. Security is both a product requirement and the positioning
("real info, real insights, real security"). `localStorage` stays the **demo-only**
store. Standing rule: every front-end change ships in **both** the demo and real paths.

## Decisions (confirmed with Slim 2026-06-16)

- **Encryption:** V1 on the strong baseline already in place — per-user RLS + TLS +
  AES-256 at-rest + anon-key-only (no service-role). Isolate crown-jewel free-text
  (`vault_items.detail`, `family_members.care_notes`/`details`) into marked columns so
  **app-layer field encryption** (key in a Worker secret) is a focused fast-follow,
  done before any "bank-grade" marketing claim.
- **Scope:** Persist + edit what the AI extracts (save to vault/calendar, edit, dismiss)
  into per-user RLS tables. No manual add-from-scratch forms / onboarding wizard in V1.
- **UI state:** Keep lightweight non-sensitive state (intake, approvals, saved/dismissed
  IDs, setup) in the existing `user_memory.preferences` blob; move ONLY the sensitive
  family collections into dedicated tables.

## What already exists (verified)

- RLS enabled on all user tables, `auth.uid() = user_id` (`supabase/migrations/0001_init.sql`).
- Client + Worker use **anon key + user JWT only**, never service-role
  (`src/supabaseClient.ts:25`, `worker/lifemap-api.mjs:140`). RLS is actually enforced.
- Real mode already prefers Supabase; demo mode = localStorage (`demoMode = !isSupabaseConfigured`).
- Real state today = one opaque blob in `user_memory.preferences.lifemapState`
  (`src/remoteState.ts`); **family collections are demo-only seeds** (`src/familyOS.ts`,
  `src/sampleData.ts`) — the core gap.

## Plan

1. **Schema (DONE):** `supabase/migrations/0003_family_data.sql` — `family_members`,
   `family_events`, `vault_items`, `recurring_care_items`, each `user_id` + `auth.uid()`
   RLS + `on delete cascade` + `authenticated` grants. Apply **at deploy / via PR**, not
   straight to the live DB.
2. **Data layer:** new `src/familyData.ts` — typed load + per-entity upsert/delete using
   the anon-key client (RLS-enforced). Row(snake_case) ↔ TS(camelCase) mappers for the
   `FamilyMember`/`FamilyEvent`/`VaultItem`/`RecurringCareItem` types in `src/familyOS.ts`.
   Model after `src/remoteState.ts`.
3. **Seam wiring (`src/App.tsx`):** demo → `sampleCollections(demoMode)` (unchanged);
   real → async-load the four collections after session (mirror the `loadRemoteState`
   effect at `App.tsx:353`), hold in state, pass to Today/Calendar/Vault. Save handlers
   (save suggestion to vault/calendar, edits, dismiss) write to the real tables in real
   mode. Keep demo + real in sync.
4. **Security hardening:** run Supabase advisors (fix flagged); enable email confirmation
   - leaked-password protection + MFA roadmap; per-user audit-log table; security headers/CSP
   - `security.txt`; Worker rate-limit; never log sensitive fields; verify logout clears
     local cache.
5. **Verify:** data-layer unit tests (demo vs real, RLS-isolation), e2e green, demo UX
   unchanged, generate `database.types.ts`, apply migration at deploy, verify live bundle
   bakes the Supabase ref.

## Paused until V1 ships

- Tanner Lefferts Notion review audit (reuse/extend his existing feedback DB).
- Further design polish (Household Ledger identity is committed: `ab75c8d`).

## Status

- ✅ Step 1 schema migration written (`0003_family_data.sql`). Apply at deploy.
- ✅ Step 2 data layer (`src/family-data.ts`, kebab-case per the naming lint) —
  RLS-scoped load + per-entity upsert/delete, snake↔camel mappers, temp-id→uuid
  handling. 5 unit tests (`src/family-data.test.ts`).
- ✅ Step 3 App.tsx seam — `collections` state (demo seeds vs. real per-user
  load via `loadFamilyCollections`), and `materializeSuggestions`: in real mode,
  saving an AI suggestion writes a durable typed row (vault item / event) to the
  dedicated table and removes the ephemeral suggestion from the review list. Demo
  path unchanged. Full suite green (156 tests).
- ⏭ Next: Step 4 security hardening (Supabase advisors, email confirmation +
  leaked-password protection, audit log, headers/CSP, Worker rate-limit) and
  Step 5 verify (apply migration at deploy, generate `database.types.ts` once the
  tables exist live, verify live bundle). Fast-follow: edit/delete UI for
  persisted rows (data-layer `deleteFamilyRow`/`upsertFamilyMember`/
  `upsertRecurringCareItem` already exist + tested) and app-layer field
  encryption of `vault_items.detail` / `family_members.care_notes`.

## Real-mode save semantics (the one non-obvious bit)

Real users start with empty collections (correct per the de-demo fix). They
populate them by saving AI-extracted suggestions. On save we: upsert a typed row
(uuid minted by Postgres), add it to in-memory `collections`, and add the
ephemeral `ai-…` suggestion id to `dismissedSuggestionIds` so the analysis item
leaves the review list and the persisted row is the single source of truth (no
double render). Both the analysis blob and the new tables persist per-user, so
this stays consistent across reloads. Demo mode keeps the original ID-set
behavior (no DB).
