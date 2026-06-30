# LifeMap Consumer Storage Safety Review

**Date:** 2026-06-30
**Status:** Release-candidate security planning baseline

## User Safety Promise

LifeMap stores family records so they are findable without exposing private details by default. Sensitive files are encrypted before upload, stored in a private Supabase Storage bucket, and linked to records protected by Supabase Auth and Row Level Security.

## Accurate Claims

- Files are encrypted in the browser before upload.
- Stored document blobs are uploaded as encrypted binary data.
- File metadata is linked to the signed-in user's records.
- Supabase RLS is required for every user-owned table.
- The document bucket is private.
- Sensitive actions require explicit user approval.
- Clearing the map attempts to delete owned file objects before records are cleared.

## Claims We Do Not Make

- LifeMap is not zero-knowledge.
- LifeMap is not independently audited.
- LifeMap is not HIPAA compliant.
- LifeMap is not a medical record system.
- LifeMap is not a replacement for Apple Wallet, Google Wallet, or official identity storage.

## Key Limitation

LifeMap uses app-layer encryption. The Cloudflare Worker can derive the data key from server-side secrets and the signed-in user's session. This is a strong MVP protection against database/storage exposure, but it is not a zero-knowledge architecture.

## Security Triage Standard

For LifeMap, unnecessary privileges on sensitive file metadata are treated as release blockers even when there is no evidence of a breach. This is intentional: family records, IDs, school details, vaccines, and insurance information deserve a stricter standard than ordinary app data.

Security notes should clearly separate these states:

- Confirmed exposure: evidence shows another user or public actor could access private data.
- Release-blocking hardening: no confirmed exposure, but the control does not meet LifeMap's least-privilege standard.
- Follow-up improvement: a non-blocking control improvement that should be scheduled and tracked.

Every future storage or RLS finding should state the evidence observed, affected surface, user-data exposure status, remediation, and remaining proof needed.

## Protected Data Classes

- child names and school context
- vaccine records
- medical and camp forms
- insurance cards and member IDs
- passport and ID details
- pet vaccine records
- family schedules
- travel documents
- emergency contacts

## Launch Blockers

- Cross-account RLS and Storage denial must be manually verified.
- Password reset and account recovery must be verified on the production domain.
- Dev dependency audit must be triaged and documented.
- Privacy copy must avoid zero-knowledge or compliance claims.
- Clear-map deletion must fail closed if Storage object deletion fails.

## Release Evidence Required

| Evidence | Required Result |
| --- | --- |
| Supabase security advisors | No critical security findings |
| Public table RLS check | Every user-owned public table has RLS enabled |
| Storage bucket check | `lifemap-documents` is private |
| Storage policy check | Authenticated users can only access own user-id folder |
| Real upload test | Signed-in user can upload and reopen encrypted file |
| Cross-account test | Different signed-in user cannot read metadata or object |
| Clear-map test | Stored objects are removed before records are cleared |
| Secret scan | No service role, OpenAI key, Worker secret, or private token in public bundle |
