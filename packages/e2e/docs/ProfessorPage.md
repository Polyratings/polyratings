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
| PROF-3 | The page renders an "Evaluate Professor" link to `/professor/:id/eval` when the professor is not locked | Must     |
| PROF-4 | The page renders report controls for existing ratings                                | Must     |
| PROF-6 | Submitting a report from a rating card succeeds and surfaces success feedback        | Must     |
| PROF-7 | Submitting a rating from `/professor/:id/eval` succeeds and surfaces success feedback. Overall Rating, Recognizes Difficulties, and Presents Clearly are 0–4 star pickers exposed as labeled radio groups (options "0 out of 4" through "4 out of 4") rather than dropdowns; they start unselected. Desktop evaluate uses a three-step stepper (Write Review, Course Accessibility, Confirm) and does not include the add-professor Professor Details step. Next advances from Course Accessibility to Confirm. Confirm previews the review card, includes a required checkbox that the review is the submitter's opinion and licenses Polyratings to publish it, and is the submit step. Evaluate does not ask for professor name. After success the user returns to the professor page. | Must     |
| PROF-8 | The evaluate page renders a "Back to professor" link to `/professor/:id` | Must     |
| PROF-9 | The professor page renders a "Back to professor list" link to `/search/name` | Must     |

## Test Scenarios

| Scenario                                                                 | Criteria Covered           | Spec                     | Status      |
| ------------------------------------------------------------------------ | -------------------------- | ------------------------ | ----------- |
| Professor page renders profile, ratings context, evaluate, and report UI | PROF-1 through PROF-4      | `professor-page.spec.ts` | Implemented |
| Report submission succeeds from professor page                           | PROF-6                     | `professor-page.spec.ts` | Implemented |
| Rating submission succeeds from evaluate page                            | PROF-7                     | `professor-page.spec.ts` | Implemented |
| Evaluate page can return to the professor page                           | PROF-8                     | `professor-page.spec.ts` | Implemented |
| Professor page can return to the professor list                          | PROF-9                     | `professor-page.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/professor-page.spec.ts`
- **Tests:** `PROF: professor page renders profile, ratings context, evaluate action, and report controls`, `PROF: report submission flow succeeds from professor page` (`@write`), `PROF: rating submission flow succeeds from professor page` (`@write`), `PROF: evaluate page returns to professor page`, `PROF: professor page returns to professor list`
- **Status:** Implemented
