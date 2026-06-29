# LifeMap Tokens

This folder is the source-of-truth slice for the current **quiet household OS**
direction.

- `lifemap-light.css` is consumed by the app today.
- `figma-light-map.json` mirrors the same names for future Figma variables and
  WEB code syntax.

The release-candidate palette is intentionally narrow:

- warm white / pale blue canvas
- white glass and quiet row surfaces
- softened LifeMap blue for action and storage
- sparse clay/orange warmth for "needs me" moments
- readable ink, muted slate, and restrained hairlines

## Token Rules

Use semantic tokens in app CSS first. Keep primitive color changes in
`lifemap-light.css` so login, Home, Cabinet, Family, Review, and Settings stay
coordinated.

Screen-role tokens exist for the main product jobs:

- `--color-role-home-*`: what needs me now
- `--color-role-drop-*`: drop/capture affordance
- `--color-role-cabinet-*`: records-only storage
- `--color-role-family-*`: household roster and profiles
- `--color-role-review-*`: approval and safety gate

Do not add new one-off screen colors in `src/styles.css` unless a token already
cannot represent the intent. If a new recurring role appears, add the token here
first and then consume it from CSS.

## Figma Mapping

`figma-light-map.json` is not generated yet, but it should stay aligned with the
active CSS token names and values. The `css` field is the future WEB code syntax,
for example `var(--color-role-family-accent)`.
