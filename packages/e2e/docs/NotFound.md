# Not Found – Business Requirements

## Feature

Unknown routes and missing professor pages stay on the requested URL and show a not-found page with a way back into the site. They are not indexed and they do not redirect to home (which would turn every bad URL into a soft 404 of the homepage).

## User Stories

- As a student, I want a mistyped URL to tell me the page is missing so I can try again or go home.
- As a student, I want a stale or invalid professor link to explain that the professor was not found, with links to home and the professor list.
- As a search crawler, I need unknown URLs to stay unknown rather than collapsing onto `/`.

## Acceptance Criteria

| ID          | Criterion                                                                                          | Priority |
| ----------- | -------------------------------------------------------------------------------------------------- | -------- |
| NOT-FOUND-1 | Navigating to an unknown path shows "Page not found", stays on that URL, and offers a home link    | Must     |
| NOT-FOUND-2 | The not-found document title names the miss and the page is marked `noindex`                       | Must     |
| NOT-FOUND-3 | Navigating to an invalid professor id shows "Professor not found" and stays on that URL            | Must     |
| NOT-FOUND-4 | A missing professor page offers links to home and to the professor list                            | Must     |

## Test Scenarios

| Scenario                                              | Criteria Covered | Spec                | Status      |
| ----------------------------------------------------- | ---------------- | ------------------- | ----------- |
| Unknown route shows a not-found page                  | NOT-FOUND-1      | `not-found.spec.ts` | Implemented |
| Not-found page is titled and noindexed                | NOT-FOUND-2      | `not-found.spec.ts` | Implemented |
| Invalid professor id shows a professor not-found page | NOT-FOUND-3      | `not-found.spec.ts` | Implemented |
| Professor not-found offers home and list links        | NOT-FOUND-4      | `not-found.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/not-found.spec.ts`
- **Tests:** `NOT-FOUND-1: unknown route shows a not-found page`, `NOT-FOUND-2: not-found page is titled and noindexed`, `NOT-FOUND-3: invalid professor id shows a professor not-found page`, `NOT-FOUND-4: professor not-found offers home and list links`
- **Status:** Implemented
- **Frontend:** `packages/frontend/src/pages/NotFound.tsx`, catch-all route and professor loader in `packages/frontend/src/App.tsx` and `packages/frontend/src/pages/ProfessorPage.tsx`
- **Professor loader:** invalid UUIDs and tRPC `NOT_FOUND` render the professor variant; other loader failures still propagate to the router error surface.
