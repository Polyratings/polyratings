# New Professor – Business Requirements

## Feature

The new professor route allows users to submit a professor entry and initial rating when search results do not include the intended professor.

## User Stories

- As a student, I want to add a professor that does not exist yet so others can rate and discover them.
- As a student, I want clear form controls on desktop and mobile layouts.
- As a student, I want to confirm how my review will look before submitting a new professor.

## Acceptance Criteria

| ID        | Criterion                                                                         | Priority |
| --------- | --------------------------------------------------------------------------------- | -------- |
| NEWPROF-1 | Navigating to `/new-professor` on desktop starts on a Professor Details step (first name, last name, and an empty searchable department field) | Must     |
| NEWPROF-2 | The same route renders a mobile-compatible linear form with professor details, course details, ratings, written review, tags, a required submission-agreement checkbox, and a submit action. Select fields start empty with a "Please select" placeholder. Overall Rating, Recognizes Difficulties, and Presents Clearly are 0–4 star pickers exposed as labeled radio groups (options "0 out of 4" through "4 out of 4") that start unselected and also show "Please select". | Must     |
| NEWPROF-3 | Required fields block submission when left empty and present validation messaging | Must     |
| NEWPROF-4 | Successful submission surfaces success feedback to the user                       | Must     |
| NEWPROF-5 | Desktop uses a four-step stepper (Professor Details, Write Review, Course Accessibility, Confirm). Write Review has course details, the three 0–4 star rating radio groups, and the written review; select fields and star pickers start empty with a "Please select" placeholder. Next advances from Course Accessibility to Confirm. Confirm previews the review as it will appear on the professor page, includes a required checkbox that the review is the submitter's opinion and licenses Polyratings to publish it, and is the submit step | Must     |
| NEWPROF-6 | A 4-digit semester course number (1000–5999) is accepted on submit                | Must     |

## Test Scenarios

| Scenario                                         | Criteria Covered | Spec                    | Status      |
| ------------------------------------------------ | ---------------- | ----------------------- | ----------- |
| New professor form renders on desktop            | NEWPROF-1        | `new-professor.spec.ts` | Implemented |
| New professor form renders on mobile             | NEWPROF-2        | `new-professor.spec.ts` | Implemented |
| Validation appears for missing required fields   | NEWPROF-3        | `new-professor.spec.ts` | Implemented |
| Successful new professor submission flow         | NEWPROF-4        | `new-professor.spec.ts` | Implemented |
| Desktop stepper confirms review before submit    | NEWPROF-5        | `new-professor.spec.ts` | Implemented |
| Successful submission with a 4-digit course num  | NEWPROF-6        | `new-professor.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/new-professor.spec.ts`
- **Tests:** `NEWPROF: desktop route renders new professor form`, `NEWPROF: mobile route renders linear submit flow`, `NEWPROF: empty required fields are blocked with validation state`, `NEWPROF: successful submission surfaces user feedback` (`{ tag: "@write" }`; skipped in production), `NEWPROF: desktop stepper confirms review before submit`, `NEWPROF: successful submission with a 4-digit semester course number` (`{ tag: "@write" }`; skipped in production)
- **Status:** Implemented
