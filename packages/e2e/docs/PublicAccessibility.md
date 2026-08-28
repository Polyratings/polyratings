# Public Accessibility – Business Requirements

## Feature

Public informational routes maintain a WCAG 2.1 AA accessibility baseline enforced by automated axe scans, in both the light and dark color schemes.

## User Stories

- As a user, I want public pages to be accessible so I can navigate and read content with assistive technology.
- As a maintainer, I want automated a11y checks on public routes so regressions are caught in CI.
- As a user whose device is set to dark mode, I want the dark palette to stay legible so I am not pushed back to the light theme.

## Acceptance Criteria

Dark mode follows `prefers-color-scheme` only — there is no in-app toggle — so the dark criteria emulate the OS setting rather than driving a control.

| ID         | Criterion                                                             | Priority |
| ---------- | --------------------------------------------------------------------- | -------- |
| A11Y-PUB-1 | Home route `/` has zero axe violations under WCAG 2.x A/AA tags       | Must     |
| A11Y-PUB-2 | About route `/about` has zero axe violations under WCAG 2.x A/AA tags | Must     |
| A11Y-PUB-3 | FAQ route `/faq` has zero axe violations under WCAG 2.x A/AA tags     | Must     |
| A11Y-PUB-4 | New professor route `/new-professor` has zero axe violations under WCAG 2.x A/AA tags | Must     |
| A11Y-PUB-5 | Home route `/` has zero axe violations under `prefers-color-scheme: dark` | Must     |
| A11Y-PUB-6 | About route `/about` has zero axe violations under `prefers-color-scheme: dark` | Must     |
| A11Y-PUB-7 | FAQ route `/faq` has zero axe violations under `prefers-color-scheme: dark` | Must     |
| A11Y-PUB-8 | New professor route `/new-professor` has zero axe violations under `prefers-color-scheme: dark` | Must     |

## Test Scenarios

| Scenario                            | Criteria Covered | Spec                         | Status      |
| ----------------------------------- | ---------------- | ---------------------------- | ----------- |
| Home route accessibility baseline   | A11Y-PUB-1       | `a11y/public-routes.spec.ts` | Implemented |
| About route accessibility baseline  | A11Y-PUB-2       | `a11y/public-routes.spec.ts` | Implemented |
| FAQ route accessibility baseline           | A11Y-PUB-3       | `a11y/public-routes.spec.ts` | Implemented |
| New professor route accessibility baseline | A11Y-PUB-4       | `a11y/public-routes.spec.ts` | Implemented |
| Home route accessibility baseline in dark mode | A11Y-PUB-5   | `a11y/public-routes.spec.ts` | Implemented |
| About route accessibility baseline in dark mode | A11Y-PUB-6  | `a11y/public-routes.spec.ts` | Implemented |
| FAQ route accessibility baseline in dark mode | A11Y-PUB-7    | `a11y/public-routes.spec.ts` | Implemented |
| New professor route accessibility baseline in dark mode | A11Y-PUB-8 | `a11y/public-routes.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/a11y/public-routes.spec.ts`
- **Tests:**
    - `@a11y A11Y-PUB: home route accessibility baseline`
    - `@a11y A11Y-PUB: about route accessibility baseline`
    - `@a11y A11Y-PUB: FAQ route accessibility baseline`
    - `@a11y A11Y-PUB: new professor route accessibility baseline`
    - `@a11y A11Y-PUB: home route accessibility baseline in dark mode`
    - `@a11y A11Y-PUB: about route accessibility baseline in dark mode`
    - `@a11y A11Y-PUB: FAQ route accessibility baseline in dark mode`
    - `@a11y A11Y-PUB: new professor route accessibility baseline in dark mode`
- **Status:** Implemented
