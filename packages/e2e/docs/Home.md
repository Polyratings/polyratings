# Home – Business Requirements

## Feature

The home route introduces Polyratings and provides primary entry points for searching professors and navigating to common user flows.

## User Stories

- As a student, I want to land on a recognizable home page so I know I am on Polyratings.
- As a student, I want obvious links to add a professor or browse the professor list so I can continue my task quickly.
- As a student or faculty member, I want the home page to explain how Polyratings keeps ratings findable and trustworthy so I know the site is still maintained.

## Acceptance Criteria

| ID     | Criterion                                                                   | Priority |
| ------ | --------------------------------------------------------------------------- | -------- |
| HOME-1 | Navigating to `/` renders the main heading "Polyratings"                    | Must     |
| HOME-2 | The home route shows a visible "Add a Professor" link in primary navigation | Must     |
| HOME-3 | The home route shows a visible "Professor List" link in primary navigation  | Must     |
| HOME-4 | The home route shows a "Recent Updates" heading with cards for search, semester conversion, and moderation, and does not show a Rating Summaries card | Must     |
| HOME-5 | The home route shows a "Best of the Best" heading for featured top-rated professors | Must     |

## Test Scenarios

| Scenario                                     | Criteria Covered      | Spec           | Status      |
| -------------------------------------------- | --------------------- | -------------- | ----------- |
| Home page renders hero and primary nav links | HOME-1 through HOME-3 | `home.spec.ts` | Implemented |
| Home page explains search, semester conversion, and moderation | HOME-4 | `home.spec.ts` | Implemented |
| Home page shows Best of the Best featured professors | HOME-5 | `home.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/home.spec.ts`
- **Test:** `HOME: home page renders hero and primary nav links` (HOME-1 through HOME-5)
- **Status:** Implemented
