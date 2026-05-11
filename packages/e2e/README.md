# Polyratings Playwright E2E

**Local (default):** From the repo root, `npm run e2e` runs Playwright with `webServer` enabled: it starts the frontend in `packages/frontend` via `npm run start:local` and uses `http://localhost:5173`.

**Beta:** From the repo root, `npm run e2e:beta` runs the same specs against [https://beta.polyratings.pages.dev/](https://beta.polyratings.pages.dev/) without starting a local server.

Defaults:

- Local frontend base URL: `http://localhost:5173` (Vite default port)
- Backend API URL in local mode: `http://localhost:3001` (from `App.config`/generated backend env)

Useful commands:

- `npm run e2e` (local, with dev server)
- `npm run e2e:a11y` (WCAG 2.x A/AA axe scans; `@a11y` tag — see `docs/README.md`)
- `npm run e2e:beta` (deployed beta frontend)
- `npm run e2e:dev` (alias for running the e2e package’s `playwright test`; pass extra args after `--`)
- `npm run e2e:ui` (open Playwright UI mode)
- `npm run e2e:headed` (headed browser run)

Spec-driven workflow:

- Business requirements live in `packages/e2e/docs/*.md`
- Each Playwright suite in `packages/e2e/src/*.spec.ts` maps to acceptance criteria IDs in those docs
- Add or update requirement docs before adding test implementation for new use-cases

To target a different local frontend port or host, set `PLAYWRIGHT_BASE_URL` (must be `http://localhost:…` or `http://127.0.0.1:…` so Playwright still starts `webServer`):

`PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run e2e`
