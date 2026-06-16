# LifeMap — Low-stim microinteractions implementation

**Goal:** Wire the LOCKED motion spec (`docs/lifemap-design-rationale.md` → "Motion spec — Low-stimulus (LOCKED 2026-06-16)") into the live app. The palette restyle (`5ad237f`) shipped colors + defined motion tokens but never applied the calibrated microinteractions. This closes that gap.

**Spec source of truth:** `docs/lifemap-design-rationale.md` lines ~64–94. Tokens already exist in `src/design/tokens/lifemap-light.css` (`--motion-press:100ms; --motion-state:140ms; --motion-enter:220ms; --motion-cap:300ms; --ease-out`/`--motion-standard`). They are currently used **0 times** for durations.

**All changes are in `src/styles.css`** (plus a possible class add in the relevant `*.tsx` for press feedback). Non-essential motion must collapse under `prefers-reduced-motion`. GPU-only: animate `transform`/`opacity` only.

## The 5 fixes

### Fix 1 — Press feedback on all tappable controls (`--motion-press`, scale 0.98, 100ms)

Today only `.more-row:active` (styles.css:3665) and `.auth-submit:active` (7244) have it. Add a shared press rule covering the real tappable controls: `button`, `.nav-item`, `.nav-capture-button`, `.atlas-area-tile`, `.atlas-priority-card`, `.more-row`, `.vault-card`, `.event-card`, `.area-row`, `.atlas-icon-button`, `.primary-button`, `.secondary-button`, `.atlas-ai-primary`, `.atlas-link-button`.
Pattern:

```css
button,
.nav-item,
.nav-capture-button,
.atlas-area-tile,
.atlas-priority-card,
.vault-card,
.event-card,
.area-row,
.primary-button,
.secondary-button,
.atlas-ai-primary,
.atlas-link-button {
  transition: transform var(--motion-press) var(--ease);
}
button:active,
.nav-item:active,
.nav-capture-button:active,
.atlas-area-tile:active,
.atlas-priority-card:active,
.vault-card:active,
.event-card:active,
.area-row:active,
.primary-button:active,
.secondary-button:active,
.atlas-ai-primary:active,
.atlas-link-button:active {
  transform: scale(0.98);
}
```

(Keep the existing `.more-row`/`.auth-submit` rules or fold them in; avoid double-declaring `transform` conflicts.)

### Fix 2 — State-change motion on task complete/snooze (`--motion-state`, 140ms, opacity+transform)

`TodayView` priority cards get `priority-completed` / `priority-snoozed` classes (App state `priorityActionStates`). Add a 140ms opacity+transform settle:

```css
.atlas-priority-card {
  transition:
    transform var(--motion-state) var(--ease),
    opacity var(--motion-state) var(--ease);
}
.atlas-priority-card.priority-completed,
.atlas-priority-card.priority-snoozed {
  opacity: 0.55;
}
.atlas-priority-card.priority-completed {
  transform: scale(0.99);
}
```

(Verify exact class names in `src/TodayView.tsx` — `priority-${actionState}`.)

### Fix 3 — Retune content-enter to spec (`--motion-enter` 220ms, cap `--motion-cap` 300ms)

`@keyframes rise-in` (styles.css:1606) is used at **420ms** (line 226) and **360ms** (line 563) — both breach the 300ms cap / 400ms hard wall. Change those two `animation:` durations to `var(--motion-enter)` (220ms); if the larger surface needs more, cap at `var(--motion-cap)` (300ms). Keep the `fade-in` keyframe (1618) consistent.

### Fix 4 — Kill the ambient breathing loop (spec violation)

`assistant-breathe 4.8s ... infinite` (styles.css:1995; keyframe at 1634) is a persistent ~0.21 Hz ambient loop — exactly the breathing-dot pattern the spec explicitly CUT (vestibular risk). Remove the `animation` (make the element static) and delete/neutralize the `@keyframes assistant-breathe` if unused elsewhere. Confirm `.ambient-field` (89/210/6327) stays static (no drift loop) — it already is.

### Fix 5 — Reduced-motion coverage

Ensure `@media (prefers-reduced-motion: reduce)` collapses ALL the above: press → no transform, enter (`rise-in`/`fade-in`) → instant or plain opacity, and there are no surviving infinite loops. There are currently 2 reduced-motion blocks — extend them to cover the new press/state rules and confirm they kill any animation. Loading spinners (`spin` 720ms, `auth-spin`) are functional (progress) — leave, but they may stay under reduced-motion as they indicate state.

## Verification

1. `nvm use 22 && npm test` (existing 151 must stay green — CSS-only changes shouldn't affect them) and `npm run build` clean.
2. Browser check (Playwright, app running or against prod after deploy): confirm a button `:active` computes `transform: matrix(...scale 0.98...)`, `getComputedStyle` on the assistant card shows `animation-name: none`, and rise-in durations ≤ 300ms.
3. Grep guard: `grep -c "var(--motion-(press|state|enter|cap))" src/styles.css` should be > 0 (was 0); `grep "assistant-breathe" src/styles.css` shows no `infinite` usage.
4. Visual: load Today/Vault/Calendar, confirm presses feel responsive, screen settles once on load, nothing loops at rest.
5. Deploy only on Slim's "ship it" (`npm run deploy:pages`, verify live bundle bakes the Supabase ref).

## Notes

- No new deps. Pure CSS + maybe a className. Commit on the `feat/mvp-now-auth-persistence` branch.
- Pairs naturally with the token cleanup (#3, the ~60 hardcoded cool-grays / the `#9fb9ff` periwinkle at styles.css:4351) — can be done in the same pass or separately.
