# Polyratings Playwright E2E

These tests assume the app is already running locally from the repo root:

1. In terminal 1: `npm run start:local`
2. In terminal 2: `npm run e2e`

Defaults:

- Frontend base URL: `http://localhost:5173` (Vite default port)
- Backend API URL in local mode: `http://localhost:3001` (from `App.config`/generated backend env)

Useful commands:

- `npm run e2e` (run all tests)
- `npm run e2e:ui` (open Playwright UI mode)
- `npm run e2e:headed` (headed browser run)

To target a different frontend host, set `PLAYWRIGHT_BASE_URL`:

`PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run e2e`
