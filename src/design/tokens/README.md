# LifeMap Tokens

This folder is the first source-of-truth slice for the light Mac Assistant
direction.

- `lifemap-light.css` is consumed by the app today.
- `figma-light-map.json` mirrors the same names for future Figma variables and
  WEB code syntax.

Use semantic tokens in app CSS first. Keep primitive color tweaks in this folder
so login and LifeMap cockpit changes stay coordinated.

## Haven direction (foundation locked, not yet applied)

`lifemap-light.css` also defines the **Haven** design direction — calm editorial
type + organic warmth (the approved successor to the current look). These tokens
are **additive**: defined and font-loaded (`index.html`), but the active
`--font-*` / `--color-*` tokens are unchanged, so no screen has shifted yet.

- Type: `--haven-font-display` (Fraunces), `--haven-font-ui` (Hanken Grotesque),
  `--haven-font-mono` (Fragment Mono).
- Palette: `--haven-cream` / `--haven-paper` / `--haven-line`, ink ramp
  (`--haven-ink`, `--haven-ink-body`, `--haven-ink-quiet`), accents
  (`--haven-coral`, `--haven-coral-deep`, `--haven-blush`, `--haven-peach`,
  `--haven-sky`, `--haven-sage`).
- Atmosphere/form: `--gradient-haven-atmosphere`, `--gradient-haven-cta`,
  `--haven-radius-card`, `--haven-shadow-cta`, `--haven-shadow-card`.

Spec sheet to review: `docs/haven-tokens.html`. Apply deliberately, screen by
screen, by repointing consumers (e.g. `--font-ui: var(--haven-font-ui)`).
