# AGENTS Guidelines for Polyratings

This repository is a **Lerna monorepo** with Nx for task orchestration. It contains the Polyratings website (professor ratings for Cal Poly) with a React frontend and Cloudflare Workers backend.

> **Agent instruction:** If you determine that any information in this file is out of date (e.g., commands, structure, tech stack, conventions), update AGENTS.md to reflect the current state of the project.

## Project Structure

| Package | Path | Description |
|---------|------|-------------|
| `@polyratings/frontend` | `packages/frontend/` | React app (Vite) deployed at polyratings.dev |
| `@polyratings/backend` | `packages/backend/` | Cloudflare Workers API (tRPC) |
| `@polyratings/cron` | `packages/cron/` | Nightly sync and backup jobs |
| `@polyratings/eslint-config` | `packages/eslint-config/` | Shared ESLint config |

**Dependencies:** frontend and cron depend on backend; all use eslint-config.

## Development Commands

### Root (from repo root)

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies (Lerna bootstraps packages) |
| `npm run build` | Build all packages |
| `npm run start:local` | Start frontend + backend with hot reload |
| `npm run start:dev` | Same, but uses dev KV (requires Cloudflare access) |
| `npm run test` | Run tests across packages |
| `npm run lint` | Lint all packages |
| `npm run fix` | Auto-fix lint issues |

### Per-package (from `packages/<name>/`)

- **Frontend:** `npm run start:local` (Vite dev server), `npm run test` (Vitest)
- **Backend:** `npm run start:local` (Wrangler dev), `npm run build` (generates types + esbuild)
- **Cron:** `npm run run:local`, `npm run build:local`

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, tRPC, TanStack Query, React Router
- **Backend:** Cloudflare Workers, tRPC, Workers KV, esbuild
- **Shared:** TypeScript, Zod, shared `@polyratings/backend` types

## Coding Conventions

### Frontend (`packages/frontend/`)

- **Styling:** Tailwind CSS. Write CSS inline via Tailwind classes.
- **Module pattern:** Use `index.ts` per folder to re-export; avoid `../` imports when possible (restricted by ESLint).
- **API:** tRPC for type-safe client–server calls; TanStack Query for caching.
- **Components:** One public component per file; co-locate styles with components.

### Backend (`packages/backend/`)

- **Entry:** `src/index.ts` sets up tRPC router.
- **Structure:** `routers/` (handlers), `dao/` (data access over KV), `types/` (KV schema).
- **Build:** `npm run build` runs `generateBackendTypes.js`, tsc, then esbuild.

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
