# AGENTS Guidelines for Polyratings

This repository is a **Lerna monorepo** with Nx for task orchestration. It contains the Polyratings website (professor ratings for Cal Poly) with a React frontend and Cloudflare Workers backend.

> **Agent instruction:** If you determine that any information in this file is out of date (e.g., commands, structure, tech stack, conventions), update AGENTS.md to reflect the current state of the project.

## Project Structure

| Package                      | Path                      | Description                                  |
| ---------------------------- | ------------------------- | -------------------------------------------- |
| `@polyratings/frontend`      | `packages/frontend/`      | React app (Vite) deployed at polyratings.dev |
| `@polyratings/backend`       | `packages/backend/`       | Cloudflare Workers API (tRPC)                |
| `@polyratings/cron`          | `packages/cron/`          | Nightly sync and backup jobs                 |
| `@polyratings/e2e`           | `packages/e2e/`           | Playwright end-to-end smoke tests            |
| `@polyratings/eslint-config` | `packages/eslint-config/` | Shared ESLint config                         |

**Dependencies:** frontend and cron depend on backend; all use eslint-config.

## Development Commands

### Root (from repo root)

| Command               | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `npm install`         | Install all dependencies (Lerna bootstraps packages) |
| `npm run build`       | Build all packages                                   |
| `npm run start:local` | Start frontend + backend with hot reload             |
| `npm run start:dev`   | Same, but uses dev KV (requires Cloudflare access)   |
| `npm run test`        | Run tests across packages                            |
| `npm run e2e`         | Run Playwright end-to-end tests (`@polyratings/e2e`) |
| `npm run lint`        | Lint all packages                                    |
| `npm run fix`         | Auto-fix lint issues                                 |

### Per-package (from `packages/<name>/`)

- **Frontend:** `npm run start:local` (Vite dev server), `npm run test` (Vitest)
- **Backend:** `npm run start:local` (Wrangler dev), `npm run build` (generates types + esbuild)
- **Cron:** `npm run run:local`, `npm run build:local`
- **E2E:** `npm run e2e` (Playwright), `npm run e2e:ui` (Playwright UI mode)

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, tRPC, TanStack Query, React Router
- **Backend:** Cloudflare Workers, tRPC, Workers KV, esbuild
- **Shared:** TypeScript, Zod, shared `@polyratings/backend` types

## Coding Conventions

### Frontend (`packages/frontend/`)

- **Styling:** Tailwind CSS. Write CSS inline via Tailwind classes.
- **Module pattern:** Use `index.ts` per folder to re-export; avoid `../` imports when possible (restricted by ESLint).
- **API:** tRPC for type-safe client–server calls; TanStack Query for caching.
- **Error handling:** Prefer local, contextual error UX at the query/mutation site (inline messages for page sections and forms). Keep global toasts as a fallback safety net only.
- **Global toast suppression:** When a query/mutation already has local error handling, set query/mutation `meta.suppressGlobalErrorToast = true` (or provide explicit `onError`) to avoid duplicate notifications.
- **Components:** One public component per file; co-locate styles with components.

### Backend (`packages/backend/`)

- **Entry:** `src/index.ts` sets up tRPC router.
- **Structure:** `routers/` (handlers), `dao/` (data access over KV), `types/` (KV schema).
- **Build:** `npm run build` runs `generateBackendTypes.js`, tsc, then esbuild.
- **Public API data safety:** treat `anonymousIdentifier` as sensitive metadata. Public routes should use `publicProcedure` and must return sanitized/public schemas that omit sensitive keys. Only protected procedures (`protectedProcedure`) may return schemas that include `anonymousIdentifier` when needed.
- **Schema pattern:** keep both full/internal and public-safe Zod schemas in `src/types/schema.ts` (for example `ratingParser` vs `publicRatingParser`, `professorParser` vs `publicProfessorParser`) and use helper mappers in `src/types/schemaHelpers.ts` before returning data from public routers.
- **Route error semantics:** For protected/admin routes, prefer explicit `TRPCError` responses (for example `NOT_FOUND`) when IDs are stale/missing. For public report flows affected by stale client cache, prefer graceful no-op behavior.

### General

- Prefer TypeScript (`.ts`/`.tsx`) for new code.
- Use the shared `@polyratings/eslint-config`; run `npm run fix` before committing.

## Testing

- **Frontend:** Vitest. Run with `npm t` from `packages/frontend/`.
- **Backend:** Automated tests are in progress.

## Deployment

- **Backend:** `npm run deploy:prod`, `deploy:beta`, or `deploy:dev` from `packages/backend/`.
- **Frontend:** Deployed via Cloudflare Pages.
- **Cron:** Deployed separately; syncs data and backs up professor list.

## Agent Workflow Tips

1. **Use `start:local` for development** – starts both frontend and backend with hot reload.
2. **Build order:** Run `npm run build` from root to build all packages in dependency order.
3. **Backend types:** Backend build generates types consumed by frontend; rebuild backend if you change routers or types.
4. **Nx:** The workspace uses Nx for caching and task orchestration; `nx run <project>:<target>` works for individual targets.

## E2E Tests

- **Location:** `packages/e2e/src/`
- **Requirements:** Business logic requirements live in `packages/e2e/docs/` and drive test implementation.
- **Environments:**
  - **Local (default):** `npm run e2e` — Playwright starts the frontend (`start:local` in `packages/frontend`) and uses `http://localhost:5173`.
  - **Beta:** `npm run e2e:beta` — runs against [https://beta.polyratings.pages.dev/](https://beta.polyratings.pages.dev/) (no local web server). Override with `PLAYWRIGHT_BASE_URL` if needed.

## Accessibility

- **Target:** WCAG 2.1 AA for sender flows
- **Automated gates (enforced):**
  - **Lint:** `eslint-plugin-jsx-a11y` is enabled via the shared `@polyratings/eslint-config` (Airbnb preset). Frontend uses `packages/frontend/.eslintrc.js` and `npm run lint` from the repo root.
  - **Unit:** `jest-axe` with Vitest (assert on `results.violations` from `axe(container)`). Add an axe scan when you introduce a new reusable UI primitive (see `packages/frontend/src/components/forms/Button.a11y.spec.tsx`).
  - **E2E:** Playwright tests whose names include `@a11y` use `packages/e2e/src/support/axe-test.ts` (`@axe-core/playwright`): `makeAxeBuilder()` / `scanForA11yViolations()` apply `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`, attach numbered `axe-results-*.json`, and assert zero violations.
- **Running locally:** `npm run e2e:a11y` (starts the frontend via Playwright when using the default localhost base URL). Use `npm run e2e:dev -- --grep @a11y` to forward extra Playwright CLI args. Deployed beta: `npm run e2e:beta -- --grep @a11y` (or set `PLAYWRIGHT_BASE_URL` to another host; non-localhost skips the dev server).
- **Manual cadence (not automated):**
  - Quarterly: one pass with [Accessibility Insights for Web](https://accessibilityinsights.io/) against the live beta (or production) site.
  - Before major releases: VoiceOver smoke on the sender happy path.
  - Before facility pilots: at least one usability session with older-adult testers.
- **Handling known issues:** prefer fixing. If a violation must be deferred, use `.exclude()` / `.disableRules()` on the specific scan call in the spec (not globally) and open a tracking issue.
