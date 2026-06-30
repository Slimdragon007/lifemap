# LifeMap Dependency Audit Notes

**Date:** 2026-06-30
**Status:** Production runtime clean; development tooling still needs a planned Vite/Vitest major upgrade.

## Commands Run

```bash
npm audit --omit=dev
npm audit
npm audit fix
npm audit --omit=dev
npm audit
```

## Production Runtime Result

`npm audit --omit=dev` reports:

```text
found 0 vulnerabilities
```

This is the release-critical result for the browser app runtime dependency set.

## Non-Breaking Fix Applied

`npm audit fix` updated transitive development tooling in `package-lock.json`, including Cloudflare/Miniflare-related dependencies:

- `miniflare` to `4.20260630.0`
- `workerd` platform packages to `1.20260630.1`
- `undici` to `7.28.0`
- `ws` to `8.21.0`
- `form-data` to `4.0.6`

This removed the previous `form-data`, `undici`, `ws`, `miniflare`, and `wrangler` audit findings.

## Remaining Development Audit Finding

`npm audit` still reports 5 findings through development-only Vite/Vitest tooling:

- Root advisory family: `esbuild <=0.24.2`
- Reported chain: `vite` -> `@vitest/mocker` / `vite-node` / `vitest`
- Audit recommendation: `npm audit fix --force`
- Why not forced here: the forced fix would install `vite@8.1.2`, a breaking major upgrade from the current Vite 5 stack.

These findings affect local development server/test tooling, not the deployed static browser bundle or production Worker runtime. They should still be addressed before a mature public launch by planning and testing a Vite/Vitest major upgrade.

## Release Triage

| Area | Status | Release impact |
| --- | --- | --- |
| Production dependency audit | Pass | No known production dependency vulnerabilities from `npm audit --omit=dev`. |
| Non-breaking audit fix | Applied | Reduced development audit findings without changing app code. |
| Development tooling audit | Open | Not a consumer runtime blocker, but should be tracked before broader public launch. |

## Next Dependency Action

Create a separate dependency-upgrade branch for Vite/Vitest major migration. That branch should inspect the Vite and Vitest migration notes, update the package family together, then run lint, typecheck, unit tests, build, E2E, visual tests, and production verification after deploy.
