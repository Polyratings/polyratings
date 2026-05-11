# Public Accessibility – Business Requirements

## Feature

Public informational routes maintain a WCAG 2.1 AA accessibility baseline enforced by automated axe scans.

## User Stories

- As a user, I want public pages to be accessible so I can navigate and read content with assistive technology.
- As a maintainer, I want automated a11y checks on public routes so regressions are caught in CI.

## Acceptance Criteria

| ID         | Criterion                                                             | Priority |
| ---------- | --------------------------------------------------------------------- | -------- |
| A11Y-PUB-1 | Home route `/` has zero axe violations under WCAG 2.x A/AA tags       | Must     |
| A11Y-PUB-2 | About route `/about` has zero axe violations under WCAG 2.x A/AA tags | Must     |
| A11Y-PUB-3 | FAQ route `/faq` has zero axe violations under WCAG 2.x A/AA tags     | Must     |

## Test Scenarios

| Scenario                             | Criteria Covered              | Spec                         | Status      |
| ------------------------------------ | ----------------------------- | ---------------------------- | ----------- |
| Public routes accessibility baseline | A11Y-PUB-1 through A11Y-PUB-3 | `a11y/public-routes.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/a11y/public-routes.spec.ts`
- **Test:** `@a11y A11Y-PUB: public routes accessibility baseline`
