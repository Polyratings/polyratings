# Professor Page – Business Requirements

## Feature

The professor detail route shows professor stats, ratings by course, and user actions for evaluation and reporting.

## User Stories

- As a student, I want to open a professor page and verify I reached the correct professor.
- As a student, I want to view existing ratings grouped by course so I can assess teaching experience.
- As a student, I want to evaluate a professor when submissions are open.
- As a student, I want to report problematic ratings for moderation review.
- As a student, I want to see this professor’s current-term teaching schedule when Schedule API data is available.

## Acceptance Criteria

| ID     | Criterion                                                                            | Priority |
| ------ | ------------------------------------------------------------------------------------ | -------- |
| PROF-1 | Navigating to `/professor/:id` renders the professor header with name and department | Must     |
| PROF-2 | The page renders rating sections by course when ratings exist                        | Must     |
| PROF-3 | The page renders "Evaluate Professor" action when professor is not locked            | Must     |
| PROF-4 | The page renders report controls for existing ratings                                | Must     |
| PROF-6 | Submitting a report from a rating card succeeds and surfaces success feedback        | Must     |
| PROF-7 | Submitting a rating from the evaluate flow succeeds and surfaces success feedback    | Must     |
| PROF-8 | When Schedule API is configured, the page shows a “Teaching this term” schedule block | Must     |

## Test Scenarios

| Scenario                                                                 | Criteria Covered           | Spec                     | Status      |
| ------------------------------------------------------------------------ | -------------------------- | ------------------------ | ----------- |
| Professor page renders profile, ratings context, evaluate, and report UI | PROF-1 through PROF-4      | `professor-page.spec.ts` | Implemented |
| Report submission succeeds from professor page                           | PROF-6                     | `professor-page.spec.ts` | Implemented |
| Rating submission succeeds from professor page                           | PROF-7                     | `professor-page.spec.ts` | Implemented |
| Professor page shows current-term teaching schedule                      | PROF-8                     | `professor-page.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/professor-page.spec.ts`
- **Tests:** `PROF: professor page renders profile, ratings context, evaluate action, and report controls`, `PROF: report submission flow succeeds from professor page` (`@write`), `PROF: rating submission flow succeeds from professor page` (`@write`), `PROF: professor page shows teaching schedule when Schedule API is configured` (`@schedule`)
- **Status:** Implemented
- **Note:** PROF-8 requires backend `SCHEDULE_API_URL` + `SCHEDULE_READ_API_KEY` (local `.dev.vars` or deployed secrets) and a populated Schedule API. Run with `npx playwright test --grep @schedule` from `packages/e2e`.
