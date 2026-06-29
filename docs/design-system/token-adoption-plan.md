# LifeMap Token Adoption Plan

**Date:** 2026-06-14
**Status:** Active first slice
**Goal:** Make visual changes faster and safer by moving LifeMap from scattered CSS values to a shared token system that can map cleanly to Figma variables.

## Why This Matters

LifeMap is now finding its visual direction through quick product feedback: softer blue, warm orange, calm intelligence, restrained glass. Tokens let those decisions become reusable system choices instead of one-off CSS edits.

The goal is not to refactor the whole UI at once. The goal is to create a small source of truth, generate app variables from it, and migrate existing CSS in safe passes.

## Target Repo Shape

```txt
src/
  design/
    tokens/
      primitives.json
      semantic.json
      components.json
      tokens.json
      README.md
    generated/
      tokens.css
      tokens.figma.json
scripts/
  build-tokens.mjs
  sync-figma-tokens.mjs
docs/
  design-system/
    token-adoption-plan.md
    figma-token-map.md
```

## Token Layers

### 1. Primitives

Raw values only. These should be boring and stable.

Examples:

- `primitive/color/blue/500`
- `primitive/color/clay/500`
- `primitive/color/ink/900`
- `primitive/space/16`
- `primitive/radius/8`

### 2. Semantic Tokens

Meaningful product roles. Most app CSS should use these.

Examples:

- `color/text/strong`
- `color/text/muted`
- `color/bg/app`
- `color/bg/login`
- `color/surface/card`
- `color/action/primary`
- `color/accent/warm`
- `radius/control`
- `shadow/panel`

### 3. Component Tokens

Specific contracts for reusable UI pieces.

Examples:

- `button/primary/bg`
- `button/primary/text`
- `card/login/bg`
- `card/login/shadow`
- `nav/item/active/bg`

## Implementation Phases

### Phase 1: Extract Without Changing UI

Create token JSON files from the current `:root` values in `src/styles.css`.

Acceptance criteria:

- `tokens.css` generated from JSON.
- Existing visual output stays the same.
- `src/styles.css` imports or contains generated CSS variables.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass.

### Phase 2: Replace Hardcoded Values By Area

Migrate one visual area at a time:

1. Auth/login screen.
2. App shell and navigation.
3. Cards and panels.
4. Buttons and controls.
5. Status, priority, and accent states.

Acceptance criteria:

- No broad visual rewrite during token migration.
- Each pass has a focused diff.
- Hardcoded colors and shadows shrink over time.

### Phase 3: Create Figma Token Payload

Generate `tokens.figma.json` from the same token source.

Map tokens to Figma:

- Primitives collection: single `Value` mode.
- Theme collection: `Light` mode first, optional later modes.
- Layout collection: spacing, radius, sizing.
- Typography collection: font family, sizes, line heights, weights.
- Effects: Figma effect styles, with variable-bound values where supported.

### Phase 4: Sync To Figma Variables

Use Figma variables, explicit scopes, aliases, and code syntax.

Rules:

- Hide primitives from ordinary pickers where possible.
- Expose semantic tokens to designers.
- Set WEB code syntax to CSS usage, for example `var(--color-bg-login)`.
- Bind variables to components after variables exist.

### Phase 5: Drift Check

Add a script that compares the repo token manifest with Figma variable names and code syntax.

Acceptance criteria:

- Missing Figma variables are reported.
- Extra Figma variables are reported.
- Code syntax mismatches are reported.
- The script is read-only unless explicitly run in sync mode.

## First Practical Slice

Start with the login screen because the design direction is actively changing and the blast radius is small.

Recommended initial semantic tokens:

```txt
color/bg/login/base
color/bg/login-blue
color/bg/login-warm
color/bg/login-route
color/surface/login-card
color/text/strong
color/text/muted
color/action/primary-bg
color/action/primary-text
shadow/login-card
radius/card
radius/control
```

## Guardrails

- Do not introduce a new dependency for token generation unless plain Node scripts become painful.
- Do not change visual design and token architecture in the same commit unless the visual change is tiny.
- Do not manually edit generated files once generation exists.
- Keep Figma sync idempotent: check existing collections and variables before creating new ones.
- Keep names stable once Figma code syntax depends on them.

## Next Action

Current release-candidate slice:

- `src/design/tokens/lifemap-light.css` is the active app token source.
- `src/design/tokens/figma-light-map.json` mirrors the active CSS token names
  and values for future Figma variables.
- The app now has screen-role tokens for Home, drop/capture, Cabinet, Family,
  and Review so visual changes can happen through named product roles instead
  of scattered CSS values.

Next token work should be mechanical replacement of remaining hardcoded colors
inside `src/styles.css`, one surface at a time. Do not change product flow while
doing that cleanup.
