# E2E Test Requirements

This directory contains business logic requirement documents that drive E2E test implementation. Each document describes:

- **Feature** – The user-facing capability
- **User Stories** – Business context from the user's perspective
- **Acceptance Criteria** – Conditions that must be satisfied for the feature to be complete
- **Test Scenarios** – Concrete E2E scenarios that verify the criteria
- **Implementation Status** – Link to spec file and coverage

Tests are implemented in `packages/e2e/src/` and run against local (`npm run e2e`) or deployed hosts via `PLAYWRIGHT_BASE_URL` (for example `npm run e2e:beta`).

## Accessibility suite

Tests tagged `@a11y` use the `packages/e2e/src/support/axe-test.ts` fixture, which runs `@axe-core/playwright` with WCAG 2.0/2.1 A+AA tags and attaches the full scan JSON to the test report. CI runs `npm run e2e:a11y` after unit tests. Run just the a11y subset locally:

```bash
npm run e2e:a11y
npm run e2e:dev -- --grep @a11y   # same subset; forward extra Playwright CLI args after `--`
npm run e2e:beta -- --grep @a11y  # deployed beta (see root `package.json` / `packages/e2e/package.json`)
```

Per-test customization uses `scanForA11yViolations((builder) => ...)` or builds from `makeAxeBuilder()` — see `packages/e2e/src/support/axe-test.ts`. See also the **Accessibility** section in the repo root `AGENTS.md` for the project-wide policy.

## Requirement Documents

| Document | Feature | Spec |
| -------- | ------- | ---- |
