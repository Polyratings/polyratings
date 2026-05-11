# Search – Business Requirements

## Feature

The search route lets students query professors by search type and displays a fallback when no matches are found.

## User Stories

- As a student, I want a clear no-results state when my search has no matches so I know what to do next.
- As a student, I want a direct path to add a professor from no-results so I can submit missing entries.

## Acceptance Criteria

| ID       | Criterion                                                                                                  | Priority |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| SEARCH-1 | Navigating to `/search/name?term=<unknown>` shows the heading "No Results Found." when no professors match | Must     |
| SEARCH-2 | The no-results state shows a visible "Add a Professor?" link to `/new-professor`                           | Must     |

## Test Scenarios

| Scenario                              | Criteria Covered      | Spec             | Status      |
| ------------------------------------- | --------------------- | ---------------- | ----------- |
| Search route handles no-results state | SEARCH-1 and SEARCH-2 | `search.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/search.spec.ts`
- **Test:** `SEARCH: search route handles no-results state`
