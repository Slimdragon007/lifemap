# LifeMap Auth Email Deliverability Runbook

**Date:** 2026-06-30
**Purpose:** Make LifeMap password reset and signup emails trustworthy enough for controlled beta and later consumer launch.

## Decision

`https://app.getlifemap.com` is the permanent Supabase Auth link domain.

Keep Supabase Auth links pointed at `app.getlifemap.com`. The Cloudflare Pages URL (`https://lifemap-d33.pages.dev`) remains a deployment/review URL, not the customer-facing auth-link domain.

## Current Confirmed State

Checked from this repo on 2026-06-30:

```bash
npx wrangler email sending list
npx wrangler email sending dns get getlifemap.com
```

Results:

- Cloudflare Email Sending is enabled for `getlifemap.com`.
- Wrangler returned Cloudflare Email Sending DNS records for `cf-bounce.getlifemap.com`.
- Wrangler returned a DMARC record for `getlifemap.com` with `p=reject`.
- Worker app emails already use `SEND_FROM=notify@getlifemap.com`.
- Supabase Auth password reset works today, but reset emails are still sent by Supabase's default sender.

## Why This Matters

Supabase's default Auth SMTP is not a production posture. Supabase's current docs state the default service is intended for testing and imposes restrictions such as only sending to authorized team addresses, low rate limits, and no delivery SLA.

For real families, password reset and confirmation emails should come from the LifeMap domain with DKIM/SPF/DMARC aligned through a provider we control.

## Chosen SMTP Provider

Use Cloudflare Email Service SMTP for Supabase Auth.

Cloudflare SMTP settings:

| Supabase field | Value |
| --- | --- |
| SMTP host | `smtp.mx.cloudflare.net` |
| SMTP port | `465` |
| SMTP security | Implicit TLS / SMTPS |
| SMTP user | `api_token` |
| SMTP password | Cloudflare API token with `Email Sending: Edit` |
| Sender name | `LifeMap` |
| From address | `no-reply@getlifemap.com` |

Do not commit the Cloudflare API token. Treat it like a password because it can send email from onboarded domains on the Cloudflare account.

## Supabase Auth Settings

In Supabase Dashboard:

1. Go to **Authentication > URL Configuration**.
2. Set **Site URL** to:

```text
https://app.getlifemap.com
```

3. Keep production redirect URLs limited to the app domains that must work:

```text
https://app.getlifemap.com/**
https://lifemap-d33.pages.dev/**
```

4. Go to **Authentication > SMTP Settings**.
5. Enable custom SMTP and use the Cloudflare SMTP settings above.
6. Recommended public-launch auth posture:
   - Email/password enabled.
   - Email confirmations enabled.
   - Secure email change enabled.
   - Rate limits reviewed after SMTP is enabled.

The app already handles confirmation-required signup by showing: "Check your email to confirm your account, then sign in."

## Management API Shape

Use this only from a secure terminal with real credentials in environment variables. Never paste the API token into a committed file.

```bash
export SUPABASE_ACCESS_TOKEN="..."
export CLOUDFLARE_EMAIL_TOKEN="..."
export PROJECT_REF="tljijkoqfnimnkpzhozy"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"external_email_enabled\": true,
    \"mailer_secure_email_change_enabled\": true,
    \"mailer_autoconfirm\": false,
    \"site_url\": \"https://app.getlifemap.com\",
    \"uri_allow_list\": \"https://app.getlifemap.com/**,https://lifemap-d33.pages.dev/**\",
    \"smtp_admin_email\": \"no-reply@getlifemap.com\",
    \"smtp_host\": \"smtp.mx.cloudflare.net\",
    \"smtp_port\": 465,
    \"smtp_user\": \"api_token\",
    \"smtp_pass\": \"$CLOUDFLARE_EMAIL_TOKEN\",
    \"smtp_sender_name\": \"LifeMap\"
  }"
```

If Supabase rejects `site_url` or `uri_allow_list` in the Management API payload, configure those two values in the Supabase Dashboard and only patch SMTP fields through the API.

## Verification

After custom SMTP is enabled:

1. Create a synthetic test account with a Gmail plus-address.
2. Confirm signup sends a LifeMap-branded email from `no-reply@getlifemap.com`.
3. Open the confirmation link and verify the account can sign in.
4. Use Forgot password.
5. Confirm the reset email also comes from `no-reply@getlifemap.com`.
6. Open the reset link and confirm it lands on `https://app.getlifemap.com`.
7. Set a new password and sign in with it.
8. Remove the synthetic Auth user and confirm no matching app rows remain.
9. Check Cloudflare Email Sending analytics for the auth email delivery event.

## Failure Handling

- `535 5.7.8 Authentication failed`: verify SMTP user is exactly `api_token`, the Cloudflare token is valid, and it has `Email Sending: Edit`.
- `550 5.7.1 Sender denied`: verify `getlifemap.com` is onboarded in Cloudflare Email Sending for the account that owns the API token.
- Reset link goes to the wrong host: recheck Supabase Site URL, redirect allow list, and the Auth email template's link variable.
- Users do not receive email: check Cloudflare Email Service analytics, suppressions, spam folders, and Supabase Auth logs.

## References

- Supabase custom SMTP: `https://supabase.com/docs/guides/auth/auth-smtp`
- Supabase redirect URLs: `https://supabase.com/docs/guides/auth/redirect-urls`
- Cloudflare SMTP: `https://developers.cloudflare.com/email-service/api/send-emails/smtp/`
- Cloudflare Email Sending domains: `https://developers.cloudflare.com/email-service/configuration/domains/`
