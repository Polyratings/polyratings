# Not Found Redirect – Business Requirements

## Feature

Unknown routes and missing professor pages redirect users back to the home route instead of showing a generic application error. Desktop users see a brief toast; mobile users see an interim message with a 3-second countdown before redirect.

## User Stories

- As a student, I want mistyped URLs to send me back to Polyratings so I can recover quickly.
- As a student, I want stale or invalid professor links to explain that the professor was not found before returning me home.
- As a mobile user, I want enough time to read why I am being redirected before the navigation happens.

## Acceptance Criteria

| ID          | Criterion                                                                                         | Priority |
| ----------- | ------------------------------------------------------------------------------------------------- | -------- |
| NOT-FOUND-1 | Navigating to an unknown path on desktop redirects to `/` and shows the home page                 | Must     |
| NOT-FOUND-2 | Navigating to an unknown path on mobile shows a countdown, then redirects to `/`                 | Must     |
| NOT-FOUND-3 | Navigating to an invalid professor id on desktop redirects to `/` and shows the home page         | Must     |
| NOT-FOUND-4 | Navigating to an invalid professor id on mobile shows a professor-not-found countdown, then `/`    | Must     |

## Test Scenarios

| Scenario                                              | Criteria Covered           | Spec                          | Status      |
| ----------------------------------------------------- | -------------------------- | ----------------------------- | ----------- |
| Unknown route redirects immediately on desktop        | NOT-FOUND-1                | `not-found-redirect.spec.ts`  | Implemented |
| Unknown route shows countdown then redirects on mobile | NOT-FOUND-2                | `not-found-redirect.spec.ts`  | Implemented |
| Invalid professor id redirects immediately on desktop | NOT-FOUND-3                | `not-found-redirect.spec.ts`  | Implemented |
| Invalid professor id shows countdown on mobile        | NOT-FOUND-4                | `not-found-redirect.spec.ts`  | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/not-found-redirect.spec.ts`
- **Frontend route handling:** `packages/frontend/src/pages/NotFoundRedirect.tsx`, catch-all route and professor loader in `packages/frontend/src/App.tsx` and `packages/frontend/src/pages/ProfessorPage.tsx`
- **Professor loader behavior:** invalid UUIDs and tRPC `NOT_FOUND` responses render the professor variant; other loader failures propagate to the router error surface.
- **Desktop copy:** toast + immediate redirect via `<Navigate replace to="/" />`.
- **Mobile copy:** heading plus visual countdown; screen readers get a single static redirect announcement (no per-second `aria-live` updates).
