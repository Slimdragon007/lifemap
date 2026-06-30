# LifeMap Controlled Beta Session Log

**Date:** 2026-06-30
**Audience:** Claude, Gemini, Codex, or any future agent picking up this repo
**Status:** Controlled beta ready with fake or low-risk data; not declared broad public consumer launch.

## Read This First

LifeMap is a calm household operating system for family mental load. The current product direction is not "more tools." The current direction is:

- Home: what needs attention now.
- Cabinet: stored records, documents, IDs, vaccines, insurance, travel details, and private details.
- Family: people, pets, profiles, custom sections, and household roster.
- Settings: account, privacy/security, onboarding replay, preferences, and safe reset/logout controls.

Do not restart the UI direction without a concrete user-test blocker. The last accepted direction was a quiet, Apple-like, light interface with reduced wording and clear jobs for each section.

## Current Live URLs

- Customer app: `https://app.getlifemap.com`
- Pages review URL: `https://lifemap-d33.pages.dev`
- API Worker health: `https://lifemap-api.m-haslim.workers.dev/health`
- GitHub repo: `Slimdragon007/lifemap`
- Current production branch: `main`

## Current Deployment State

Cloudflare Pages project `lifemap` is GitHub-connected:

- Source repo: `Slimdragon007/lifemap`
- Production branch: `main`
- Production trigger: `github:push`
- Preview deploys: enabled for branches/PRs
- Build command: `npm run build`
- Output directory: `dist`

Manual deploy remains a fallback through `npm run deploy:pages`, but the normal path is push/merge to `main` and let Cloudflare Pages build from GitHub.

The latest GitHub-triggered deploy verified during this session was:

- Commit: `1b122cc` (`design: refresh app icon as map`)
- Cloudflare deployment: `github:push`
- Result: success
- Production verification: `npm run verify:production` passed 6/6

## User-Facing State

The app is currently suitable for one controlled real-user beta test with fake or low-risk data.

Do not ask the tester to enter genuine child, medical, passport, insurance, school, or family data yet. Use `docs/product/controlled-user-test-checklist.md`.

Current accepted user-test path:

1. Open `https://app.getlifemap.com`.
2. Create/sign into an account.
3. Land on Home and explain what it is for.
4. Add one person or pet.
5. Add one fake custom profile section or field.
6. Add one fake PDF/image document or low-risk record.
7. Find it in Cabinet.
8. Open the saved item.
9. Check Settings -> Privacy & security.
10. Use Forgot password and confirm the branded reset email works.

Success means the tester can explain Home, Cabinet, Family, and Settings without coaching, can add/find a fake record, and trusts the product enough for controlled beta use.

## Recent Product Decisions

- Bottom nav is `Home | Cabinet | Family | Settings`, with Home far left and active state focused on icon-level direction.
- Review is no longer a primary tab. It appears only when approval is relevant.
- Cabinet and Family were intentionally separated:
  - Cabinet is storage and document retrieval.
  - Family is household roster and customizable profile structure.
- Profile customization must stay visible and trust-building: add section, add field, cancel, save confirmation, and newly added content visible immediately.
- The "More" style tool drawer was removed from the core app direction because it made the app feel like a collection of features instead of one calm operating system.
- The favicon/app icon was changed from a ledger/card mark to a cute folded map with blue route and orange pin.

## Current Auth And Email State

`app.getlifemap.com` is the permanent Supabase Auth link domain.

Confirmed current posture:

- Supabase custom SMTP is enabled through Cloudflare Email Service.
- Password reset email is verified from `LifeMap <no-reply@getlifemap.com>`.
- Reset links land on `https://app.getlifemap.com`.
- Signup confirmation remains intentionally disabled for controlled beta (`mailer_autoconfirm: true`) because confirmation friction previously hurt the first-use flow.

Do not change signup confirmation, redirect URLs, or SMTP settings without explicitly treating it as an auth change.

Relevant doc: `docs/security/auth-email-deliverability-runbook.md`.

## Current Storage And Security State

Secure document upload is implemented as real encrypted upload, not metadata-only:

- Browser encrypts file bytes before upload.
- Encrypted blobs are stored in private Supabase Storage bucket `lifemap-documents`.
- File metadata lives in `vault_item_files`.
- Storage and metadata RLS are owner-scoped.
- First release supports small files only, currently 6 MB max.
- Accepted file types are PDF and common phone image types.

Current security posture is strong enough for controlled beta with fake/low-risk data, but do not call this a broad public consumer launch yet.

Important caveats still tracked:

- Browser-observed upload console/log inspection should still be completed before broad launch.
- Dev-only Vite/Vitest/esbuild audit findings require a separate major-upgrade plan.
- User-test feedback should decide the next UX changes.

Relevant docs:

- `docs/security/release-candidate-security-gate.md`
- `docs/security/storage-security-verification-report.md`
- `docs/security/consumer-safety-test-plan.md`

## Verification Baseline

Most recent full release gate evidence is in `docs/security/release-candidate-security-gate.md`.

At minimum before claiming new work is done:

```bash
npm run lint
npm run typecheck
npm run build
npm run verify:production
```

For feature behavior, also run:

```bash
npm run test -- --reporter=dot
npm run test:e2e
```

Known build note: Vite may warn that a chunk is larger than 500 kB. This warning existed before the favicon/session-log work and is not by itself a release blocker.

## Package And Stack Notes

- Package manager: `npm` (`package-lock.json` is present).
- Frontend: Vite, React 18, TypeScript.
- Backend/API: Cloudflare Worker in `worker/lifemap-api.mjs`.
- Auth/database/storage: Supabase project `tljijkoqfnimnkpzhozy`.
- Deployment: Cloudflare Pages for frontend, Cloudflare Worker for API.

Do not introduce a new package manager, framework, auth provider, storage provider, or broad app shell rewrite without a separate plan.

## Next Recommended Action

Run the controlled user test from `docs/product/controlled-user-test-checklist.md`.

After that, split findings into:

- Blocking: signup, password reset, save/open, or basic understanding fails.
- Trust: tester hesitates to store even low-risk information.
- Clarity: labels/layout confuse the tester but do not block the flow.
- Later: nice-to-have polish that should not derail the beta.

The next product work should come from the user-test evidence, not from another speculative redesign pass.
