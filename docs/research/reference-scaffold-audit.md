# LifeMap Reference Scaffold Audit

**Date:** 2026-06-19
**Status:** Active research baseline
**Purpose:** Identify existing open-source, Figma, SDK, and product references that can guide LifeMap without turning it into a clone.

## Decision Rule

LifeMap may borrow patterns. LifeMap must not inherit another product's core assumptions.

## Audit Table

| Reference | Category | What It Solves | Useful Pattern | Do Not Copy | License / Terms | Security Notes | LifeMap Adaptation | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Figma Simple Design System | Design system | Variables, components, design-to-code structure | Token naming, component organization, Code Connect concepts | Visual identity and component hierarchy wholesale | Check current repository/license before reuse | Low risk if used as reference only | Use as a Figma/token architecture reference | Reference |
| Figma Design Tokens plugin | Design tokens | Token export/import workflows | JSON token structure and naming discipline | Plugin-specific workflow as a hard dependency | Check license before adopting code | Low risk if reference only | Use as reference for CSS variable mapping | Reference |
| Open-source document management apps | Document storage/OCR | Upload, OCR, tags, search, document detail | Document lifecycle, review states, search UX | Enterprise document-management complexity | Check each repo before reuse | High if copying storage/security code blindly | Extract UX/data-model patterns only | Audit needed |
| Open-source packing list apps | Trip packing | Reusable packing checklists | Trip context and reusable "normally forget" items | Standalone packing product assumptions | Check each repo before reuse | Low to medium | Fold into Trip Pack, not separate app | Reference |
| Apple Wallet / PassKit docs | Wallet integration | Eligible passes and issuer-controlled wallet items | "Wallet / LifeMap / Physical" recommendation model | Promise arbitrary sensitive docs can be pushed to Wallet | Official Apple docs apply | High trust risk if misunderstood | Build an education/recommendation layer first | Reference |
| Google Wallet docs | Wallet integration | Eligible passes and Android wallet behavior | Cross-platform "what belongs where" logic | Treat Wallet as universal storage | Official Google docs apply | High trust risk if misunderstood | Keep as later integration research | Later |
| Supabase docs | Backend storage/auth | Auth, row policies, storage, database | Access model, storage policies, audit metadata | Schema changes before threat model | Official docs apply | High because family records are sensitive | Use after threat model and schema plan | Later |

## Reference Categories To Search

- Family document vaults
- Personal document management
- OCR and document extraction
- Packing list and trip planning apps
- Family calendar and school schedule tools
- Apple Wallet / Google Wallet pass support
- Figma variables, token systems, and Code Connect
- Privacy-first family apps

## Scoring Rubric

Score each reference from 1 to 5.

- Product fit
- Architecture fit
- License safety
- Security maturity
- Maintenance activity
- Differentiation risk

## Acceptance Threshold

Use a reference as a scaffold only when:

- License is compatible or no code is copied.
- Security posture is understood.
- It supports the Smart Cabinet thesis.
- It does not make LifeMap feel like a generic vault, calendar, or packing app.
