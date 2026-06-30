# LifeMap Controlled User Test Checklist

**Date:** 2026-06-30
**Purpose:** Run one controlled beta test on production without using real sensitive family data.

## Ground Rules

- Use `https://app.getlifemap.com`.
- Use fake or low-risk records only.
- Do not ask the tester to enter genuine child, medical, passport, insurance, school, or family data.
- Do not coach the tester through the app unless they get blocked; record where they expected to go.
- Signup confirmation is intentionally disabled for this test, but password reset must use the branded LifeMap email.

## Tester Script

1. Open `https://app.getlifemap.com`.
2. Create an account or sign in with a test account.
3. Land on Home and say what you think this screen is for.
4. Add one person or pet.
5. Open that profile and add one fake section or field.
6. Add one fake PDF/image document or one low-risk record.
7. Find the saved item in Cabinet.
8. Open the saved item and confirm whether the file/detail behavior matches expectation.
9. Open Settings, then Privacy & security, and say whether the privacy language feels clear.
10. Find Clear my map, but do not use it unless the test account should be wiped.
11. Sign out.
12. Use Forgot password and confirm the email is from `LifeMap <no-reply@getlifemap.com>`.
13. Open the reset link and confirm it lands on `app.getlifemap.com`.
14. Set a new password and sign in again.

## Success Criteria

- Tester can explain what Home, Cabinet, Family, and Settings are for.
- Tester can add and find a fake record without coaching.
- Tester understands private records are hidden until opened.
- Tester trusts the app enough for a controlled beta with low-risk data.
- Password reset works through the branded LifeMap email.

## Evidence Log

| Date | Tester type | Device/browser | Result | Issues found | Screenshots/notes |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | Not run | TBD | TBD |

## Observation Notes

Use these prompts during or immediately after the test:

- What did you expect this screen to do?
- Where did you hesitate?
- Which label felt unclear?
- What information would you trust this with today?
- What information would you not trust this with yet?
- What would make this feel safer?
- What felt useful enough that you would come back?

## Follow-Up Triage

After the session, split findings into:

- Blocking: prevents signup, password reset, save/open, or clear user understanding.
- Trust: makes the tester hesitant to store information.
- Clarity: labels or layout cause confusion but do not block use.
- Later: polish or feature ideas that should not derail the controlled beta.
