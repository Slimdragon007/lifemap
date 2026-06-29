# Light Mac Assistant Kickoff

**Date:** 2026-06-14
**Status:** First implementation slice

## Direction

LifeMap should feel closer to a light Mac assistant than a dark SaaS dashboard:
white-led surfaces, pale blue atmosphere, warm orange cues, quiet borders, and
soft command-panel elevation.

The Perplexity Personal Computer and Comet references inform the interaction
language, not a literal clone. The useful patterns are:

- native-feeling floating command surfaces
- minimal chrome
- contextual AI panels
- bright white and pale blue environments
- restrained accent color

## Token Contract

The first token source lives in `src/design/tokens/lifemap-light.css`.
`src/styles.css` imports that file and maps existing legacy variables to the new
semantic names, so older components keep working while new visual changes use
token names.

Figma mapping starts in `src/design/tokens/figma-light-map.json`. It is shaped
around variable collections, one `Light` mode, and WEB code syntax values such
as `var(--color-surface-command)`.

## Typography

Use `--font-display` only for brand, hero, and section moments. It is meant to
feel printed and editorial without copying Black City. Use `--font-ui` for app
controls, forms, dense panels, and task text.

## First Slice

Implemented surfaces:

- Auth/login shell and panel
- Global primary action treatment
- Today/LifeMap Atlas cockpit
- LifeMap AI command card
- Today priority, area, metric, and nav support styling
- App navigation chrome
- LifeMap AI capture sheet

Out of scope for this slice:

- Full app sweep
- New production font dependency
- Automated Figma sync
- Theme modes beyond `Light`

## Slice Two

The second pass extends the same tokenized light command language into the
bottom/desktop navigation shell and the LifeMap AI capture sheet. This keeps the
most-used AI entry points visually related without sweeping every secondary
screen yet.

## Release Candidate Token Tightening

The release-candidate pass keeps the same light Mac assistant foundation but
tightens the active token contract around the actual product architecture:

- `Home` is the warm daily action surface.
- `Cabinet` is the blue-leaning file ledger.
- `Family` is the household roster and profile surface.
- `Review` is the quiet safety gate.

The active palette is no longer near-monochrome indigo. It uses warm white,
pale blue, softened LifeMap blue, and sparse clay/orange accents so the app
feels cohesive without making every surface look identical.
