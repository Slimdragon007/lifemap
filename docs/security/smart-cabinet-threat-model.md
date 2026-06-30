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

## Current Secure Upload Architecture

Real document uploads now require a signed-in Supabase session. The browser validates file type and size, encrypts file bytes with Web Crypto AES-GCM, uploads the encrypted blob to the private `lifemap-documents` bucket, and stores metadata in `vault_item_files`.

Storage object paths use this shape:

```txt
{userId}/{vaultItemId}/{fileId}.bin
```

The design protects against accidental plaintext storage and cross-user reads when RLS and Storage policies are correct.

## Current Non-Zero-Knowledge Limitation

The Worker can derive the user's data key. This means LifeMap has app-layer encryption but not end-user-only key custody. Product copy must not claim zero-knowledge or end-user-only decryption.
