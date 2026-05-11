# Home – Business Requirements

## Feature

The home route introduces Polyratings and provides primary entry points for searching professors and navigating to common user flows.

## User Stories

- As a student, I want to land on a recognizable home page so I know I am on Polyratings.
- As a student, I want obvious links to add a professor or browse the professor list so I can continue my task quickly.

## Acceptance Criteria

| ID     | Criterion                                                                   | Priority |
| ------ | --------------------------------------------------------------------------- | -------- |
| HOME-1 | Navigating to `/` renders the main heading "Polyratings"                    | Must     |
| HOME-2 | The home route shows a visible "Add a Professor" link in primary navigation | Must     |
| HOME-3 | The home route shows a visible "Professor List" link in primary navigation  | Must     |

## Test Scenarios

| Scenario                                     | Criteria Covered      | Spec           | Status      |
| -------------------------------------------- | --------------------- | -------------- | ----------- |
| Home page renders hero and primary nav links | HOME-1 through HOME-3 | `home.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/home.spec.ts`
- **Test:** `HOME: home page renders hero and primary nav links`
