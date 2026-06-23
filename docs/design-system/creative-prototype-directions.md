# LifeMap Creative Prototype Directions

**Date:** 2026-06-19
**Status:** Editorial LifeMap / Quiet Minimal selected

## Purpose

These prototypes test four different front-end identities for the same LifeMap
product job:

> Capture messy travel and family mental load, sort it into a trip pack, protect
> sensitive records, and require approval before anything sends, saves, reveals,
> or schedules.

## Prototype URLs

- `public/prototypes/lifemap-liquid-glass.html`
- `public/prototypes/lifemap-quiet-minimal.html`
- `public/prototypes/lifemap-quiet-architect.html`
- `public/prototypes/lifemap-soft-neumorphism.html`
- `public/prototypes/lifemap-field-kit.html`
- `public/prototypes/lifemap-creative-prototypes.html`

## Selected Direction

### Editorial LifeMap / Quiet Minimal

This is the product direction to carry forward.

The selected concept is the **Editorial LifeMap**: a useful, real-feeling system
that turns a messy family/travel brain dump into an organized plan with tools
for documents, calendar holds, messages, packing context, private records, and
approval gates.

The selected visual design is **Quiet Minimalism**: white-led, precise, low
noise, restrained typography, thin borders, and only small blue/clay cues for
state. The app should not feel like a themed notebook, a glass demo, or another
busy ADHD productivity dashboard.

The production candidate is:

`public/prototypes/lifemap-quiet-architect.html`

## Product Navigation Rule

LifeMap should feel guided before it feels powerful. The main navigation should
have four understandable destinations:

- **Today**: the next move and the current guided path.
- **Family**: people, pets, records, health, school, IDs, and private details.
- **Trips**: packing lists, travel documents, reward numbers, current travel
  rules, itineraries, and trip-specific reminders.
- **Review**: the safety gate for anything that sends, saves, reveals, or writes
  to a calendar.

Capture is not a destination. It should be a persistent action for dumping the
stressful thought once. LifeMap then sorts that thought into the right
destination and asks before acting.

Vault should not be a top-level mental model in the first version. It is a
secure storage behavior inside Family and Trips. Calendar should work the same
way: a helpful surface inside Today, Family, and Trips, not a separate tool the
user has to manage.

## Exploration References

### Liquid Glass

Use translucent controls only where they help: navigation, composer, and action
layers. Keep private content on readable surfaces. This follows the Liquid Glass
lesson that content should remain primary and controls should adapt around it.

### Quiet Minimalism

Strip LifeMap down to one next move, one trip pack, and one safety contract.
This direction is the strongest ADHD-relief test because it avoids feature
pressure. This visual system should be merged with the Editorial LifeMap use
case rather than treated as a separate product.

### Quiet Realism / LifeMap Architect

This prototype is now the selected production candidate under the clearer name:
**Editorial LifeMap / Quiet Minimal**.

### Soft Neumorphism

Use tactile raised and pressed surfaces to make the app feel physically
reassuring. Keep contrast high enough that it does not become washed out.

### Warm Editorial Field Kit

Lean into a human travel notebook: stamps, paper texture, checklists, and
compact record cards. This is the most emotionally specific direction.

## Token Model

All four prototypes import:

`public/prototypes/lifemap-style-tokens.css`

The repo token manifest lives at:

`src/design/tokens/lifemap-prototype-modes.json`

Token names intentionally use the `lm/` and `--lm-*` namespace so these
experiments can be reconciled with production tokens later without forcing a
full app retheme.

## Figma Mapping

The token manifest is shaped for Figma variable collections:

- `LifeMap Prototype / Color`
- `LifeMap Prototype / Shape`

Modes:

- `Liquid Glass`
- `Quiet Minimal`
- `Quiet Realism`
- `Soft Neo`
- `Field Kit`

Each variable includes WEB code syntax such as:

`var(--lm-canvas)`

This keeps Figma variable names and CSS custom properties aligned.
