# AGENTS Guidelines for Polyratings

Lerna + Nx monorepo: Cal Poly professor ratings (React frontend, Cloudflare Workers API).

If this file is wrong, update it.

## Packages

| Package | Path | Role |
| --- | --- | --- |
| `@polyratings/frontend` | `packages/frontend/` | Vite React app (polyratings.dev) |
| `@polyratings/backend` | `packages/backend/` | Workers tRPC API |
| `@polyratings/cron` | `packages/cron/` | Nightly sync / backup |
| `@polyratings/e2e` | `packages/e2e/` | Playwright |
| `@polyratings/eslint-config` | `packages/eslint-config/` | Shared ESLint |

Frontend and cron depend on backend.

## Commands (repo root)

| Command | Purpose |
| --- | --- |
| `npm install` | Install + Lerna bootstrap |
| `npm run build` | Build all (dependency order) |
| `npm run start:local` | Frontend + backend, hot reload, local KV |
| `npm run start:dev` | Same with Cloudflare dev KV |
| `npm run test` / `lint` / `fix` | Tests, lint, auto-fix |
| `npm run e2e` | Playwright (local Vite) |
| `npm run e2e:prod` | Production host, skip `@write` |

Per-package: `start:local` (frontend/backend), `npm t` (frontend Vitest), `run:local` (cron). Rebuild backend after router/type changes (generates types for frontend).

## Stack and conventions

- **Frontend:** React 18, Vite, Tailwind (inline classes), tRPC, TanStack Query, React Router. `index.ts` re-exports; no `../` imports. One public component per file. Local error UX at the query/mutation; `meta.suppressGlobalErrorToast` when handled locally. Public routes set unique titles/canonicals with `PageMeta`; keep `docs/seo.md`, `packages/frontend/public/robots.txt`, and `SITEMAP_STATIC_PATHS` in sync when adding indexable pages.
- **Theming:** Tailwind v4 CSS-first; all tokens live in `packages/frontend/src/index.css`. Colors come from the [Cal Poly brand palette](https://ucm.calpoly.edu/color-guidelines). Dark mode is class-based (`:root.dark`): the inline script in `index.html` applies the stored theme — or the OS setting on a first visit — before first paint, and `useTheme` keeps it in sync; `ThemeToggle` in the navbar flips light/dark. There is no separate "system" mode, and CSS never reads `prefers-color-scheme`, so the storage key must stay in sync between that script and `useTheme`. Two brand tokens: `bg-primary` for filled brand surfaces (Poly Green + white in both schemes), `text-brand`/`border-brand` for brand color drawn on a surface (lightens to Dexter Green in dark). Prefer semantic tokens over raw palette classes so both schemes follow.
- **Backend:** Workers, tRPC (`src/index.ts`), KV DAOs, Zod in `src/types/schema.ts` (public vs internal parsers). Public routes: `publicProcedure` and omit `anonymousIdentifier`. Discord notifications production-only; e2e sends `x-polyratings-skip-notifications: 1`.
- **General:** TypeScript; `@polyratings/eslint-config`; `npm run fix` before commit.

## E2E 1:1 with specs

Requirement **specs** in `packages/e2e/docs/*.md` define the tests. Playwright in `packages/e2e/src/` implements them. Do not invent tests without a spec, or shrink specs to match leftover tests.

Keep **1:1 parity**: each spec file ↔ one suite; each acceptance ID ↔ a `test` or `test.step`; scenario titles match test names. Change the spec first, then the `.spec.ts`.

- Local: `npm run e2e` (`http://localhost:5173`). Beta/prod: `e2e:beta` / `e2e:prod`. `@write` skipped in production.
- A11y: WCAG 2.1 AA; `npm run e2e:a11y` (`@a11y`, axe in `src/support/axe-test.ts`). Frontend also uses `eslint-plugin-jsx-a11y` and jest-axe on new UI primitives.

## Deploy (GitHub Actions)

- Workers: `deploy:prod` / `deploy:beta`; PRs use `wrangler versions upload --env dev --preview-alias pr-<number>`.
- Pages: workflow-only `wrangler pages deploy` (`NX_NO_CLOUD=true`, Vite `--mode` per env). Disable Pages Git auto-deploy. Closed same-repo PRs drop Pages + Worker preview alias.
- Cron ships with production worker deploys.
