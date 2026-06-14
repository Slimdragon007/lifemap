# LifeMap Demo Checklist

## Before Presenting

- Production app opens on iPhone: https://lifemap-d33.pages.dev
- Worker health returns ok: https://lifemap-api.m-haslim.workers.dev/health
- OpenAI analysis works with a fresh pasted intake.
- Supabase project is active: `lifemap` / `tljijkoqfnimnkpzhozy`.
- Production currently opens to real email/password auth.
- After sign-in, bottom nav is visible: Today, Calendar, Capture, Vault, Review, More.
- Review queue clearly shows that nothing sends automatically.
- Phone is on stable Wi-Fi or cellular.
- Backup local URL is ready if needed: http://127.0.0.1:5173/

## Founder Flow

1. Open the production app.
2. Sign in with a LifeMap test account, or use local demo mode for the one-click Alex Kim flow.
3. Show Today.
4. Tap Capture.
5. Paste the travel, school, health, and pet-care sample.
6. Sort the mental load.
7. Open Review and toggle one approval off and on.
8. Open Calendar.
9. Open Vault.
10. Return to Today.

## Security Checks

- Do not paste or show private API keys.
- Confirm `OPENAI_API_KEY` is only in Worker secrets or local `.env.local`.
- Confirm no actual OpenAI key appears in `dist`.
- Do not set `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` as `VITE_*`.
- Supabase URL and anon key are okay to expose when Supabase is ready.

## Supabase Follow-up

Supabase is now created and initialized:

- Project name: `lifemap`
- Project ref: `tljijkoqfnimnkpzhozy`
- Project URL: `https://tljijkoqfnimnkpzhozy.supabase.co`
- Migration applied: `init_lifemap_schema`

Production auth is real email/password auth. For a frictionless founder demo, decide whether to create a known test account or add a visible demo bypass alongside real auth.
