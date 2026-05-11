# Professor Page – Business Requirements

## Feature

The professor detail route shows professor stats, ratings by course, and user actions for evaluation and reporting.

## User Stories

- As a student, I want to open a professor page and verify I reached the correct professor.
- As a student, I want to view existing ratings grouped by course so I can assess teaching experience.
- As a student, I want to evaluate a professor when submissions are open.
- As a student, I want to report problematic ratings for moderation review.

## Acceptance Criteria

| ID     | Criterion                                                                            | Priority |
| ------ | ------------------------------------------------------------------------------------ | -------- |
| PROF-1 | Navigating to `/professor/:id` renders the professor header with name and department | Must     |
| PROF-2 | The page renders rating sections by course when ratings exist                        | Must     |
| PROF-3 | The page renders "Evaluate Professor" action when professor is not locked            | Must     |
| PROF-4 | The page renders report controls for existing ratings                                | Must     |
| PROF-5 | If no ratings exist, the page renders "Be the first to add a rating!" fallback copy  | Should   |
| PROF-6 | Submitting a report from a rating card succeeds and surfaces success feedback        | Must     |
| PROF-7 | Submitting a rating from the evaluate flow succeeds and surfaces success feedback    | Must     |

## Test Scenarios

| Scenario                                           | Criteria Covered  | Spec                     | Status      |
| -------------------------------------------------- | ----------------- | ------------------------ | ----------- |
| Professor page renders profile and ratings context | PROF-1 and PROF-2 | `professor-page.spec.ts` | Implemented |
| Evaluate entry point appears when unlocked         | PROF-3            | `professor-page.spec.ts` | Implemented |
| Report controls are available on rating cards      | PROF-4            | `professor-page.spec.ts` | Implemented |
| Empty-state copy appears when no ratings exist     | PROF-5            | `professor-page.spec.ts` | Planned     |
| Report submission succeeds from professor page     | PROF-6            | `professor-page.spec.ts` | Implemented |
| Rating submission succeeds from professor page     | PROF-7            | `professor-page.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/professor-page.spec.ts`
- **Implemented tests:** `PROF: professor page renders profile, ratings context, evaluate action, and report controls`, `PROF: report submission flow succeeds from professor page`, `PROF: rating submission flow succeeds from professor page`
- **Status:** Partially implemented
