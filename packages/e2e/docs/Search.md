# Search – Business Requirements

## Feature

The search route lets students query professors by name or course and narrow the professor list as they type.

## User Stories

- As a student, I want a clear no-results state when my search has no matches so I know what to do next.
- As a student, I want a direct path to add a professor from no-results so I can submit missing entries.
- As a student, I want the professor list to show matching professors as soon as the page loads so I can browse.
- As a student, I want typing in the professor-list search bar to keep showing matching professors so I can refine results.

## Acceptance Criteria

| ID       | Criterion                                                                                                  | Priority |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| SEARCH-1 | Navigating to `/search/name?term=<unknown>` shows the heading "No Results Found." when no professors match | Must     |
| SEARCH-2 | The no-results state shows a visible "Add a Professor?" link to `/new-professor`                           | Must     |
| SEARCH-3 | Navigating to `/search/name` shows professor result cards when professors exist                            | Must     |
| SEARCH-4 | Typing in the professor-list search bar keeps the typed value and continues to show matching professor cards | Must     |

## Test Scenarios

| Scenario                                                      | Criteria Covered      | Spec             | Status      |
| ------------------------------------------------------------- | --------------------- | ---------------- | ----------- |
| Search route handles no-results state                         | SEARCH-1 and SEARCH-2 | `search.spec.ts` | Implemented |
| Professor list shows results and stays populated while typing | SEARCH-3 and SEARCH-4 | `search.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/search.spec.ts`
- **Tests:**
    - `SEARCH: search route handles no-results state`
    - `SEARCH: professor list shows results and stays populated while typing`
- **Status:** Implemented
