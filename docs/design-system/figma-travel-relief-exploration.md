# LifeMap Travel Relief Figma Exploration

**Date:** 2026-06-19
**Figma file:** https://www.figma.com/design/QYtDU0O2tOTVT40M3SIGNC
**Status:** Exploration created

## Purpose

This file reframes LifeMap away from a broad ADHD tools dashboard and toward a
private travel-relief product:

> Dump trip stress, let LifeMap sort it, keep sensitive details hidden, and
> approve every action before anything sends, saves, reveals, or schedules.

The exploration is intended to guide the next product-flow pass before more UI
surface area is added.

## Inspiration Notes

### ADHD-friendly UI

Source: https://din-studio.com/ui-ux-for-adhd-designing-interfaces-that-actually-help-students/

Useful principles for LifeMap:

- One visible next move.
- Progressive disclosure instead of fully exposed dashboards.
- Gentle reminders with a clear purpose.
- User-controlled density and motion.
- Calm hierarchy, readable type, and fewer competing visual elements.

### Intuitive UX

Source: https://graphem.com/intuitive-design-leads-to-seamless-user-experiences/

Useful principles for LifeMap:

- Every screen should make the next expected outcome obvious.
- Consistency matters more than feature density.
- Visual confirmation should follow important actions.
- Remove obstacles that make users wonder where to go next.

### Tangle Direction

Source: https://tangle.com/early-access

Useful principles for LifeMap:

- The product should feel like a guided path, not a tool shelf.
- The emotional promise matters: help people get unstuck from autopilot.
- Small suggested actions should feel human and intentional.
- The app should give time and attention back, not create another place to
  manage.

## Product Direction

Recommended primary flow:

1. **Dump** messy travel/family stress in plain language, voice, photo, or paste.
2. **Sort** into a Trip Pack with documents, packing, rules, dates, and messages.
3. **Trip Pack** becomes the center of the experience.
4. **Today** shows only the next useful move.
5. **Review** acts as the safety gate for sends, saves, reveals, and calendar writes.

Recommended nav reduction:

- `Dump`
- `Trip`
- `Today`
- `Review`

The vault should become contextual. Users should not need to browse a filing
cabinet unless they explicitly want to.

## Figma Contents

The created Figma file includes:

- A LifeMap Travel Relief strategy board.
- Local Figma variables with WEB code syntax matching CSS variable naming.
- A north-star positioning panel.
- Inspiration-derived product rules.
- A reduced product-flow model.
- iPhone exploration screens for Dump, Trip Pack, Today, Review, and Vault.

## Token Notes

The exploration aligns with the existing token direction in
`src/design/tokens/lifemap-light.css`, but introduces a tighter travel-relief
semantic layer:

- `color/canvas/warm-sky`
- `color/surface/panel`
- `color/text/ink`
- `color/text/muted`
- `color/accent/lifemap-blue`
- `color/accent/travel-orange`
- `color/border/soft`
- `radius/panel`
- `space/4`
- `space/6`

These should be reconciled with `src/design/tokens/figma-light-map.json` before
production implementation.

## Code Connect Readiness

No Code Connect files were added in this pass.

Reason:

- The repo currently has no `figma.config.json`.
- The repo currently has no `*.figma.ts` or `*.figma.tsx` mappings.
- Code Connect requires published Figma components with node-specific URLs.
- The current Figma file is an exploration board, not a published component
  library.

Recommended Code Connect sequence:

1. Convert approved Figma patterns into published components:
   - `ReliefCard`
   - `TripPackSummary`
   - `SafetyGate`
   - `BottomNav`
   - `PrimaryAction`
2. Add `figma.config.json` with React/TypeScript paths.
3. Add mappings beside the matching source components.
4. Validate mappings only after the component node URLs include `node-id`.

## Next Implementation Target

Before writing more UI code, choose one flow to implement:

> Dump -> Trip Pack -> Today next move -> Review safety gate.

This should replace the current feeling of many independent tools with one
coherent relief loop.
