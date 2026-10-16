# FAQ – Business Requirements

## Feature

The FAQ route answers common questions about rating authenticity, moderation standards, semester course numbers, and contribution channels.

## User Stories

- As a student, I want a clear FAQ page so I can understand how Polyratings handles comments and moderation.

## Acceptance Criteria

| ID    | Criterion                                                                  | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FAQ-1 | Navigating to `/faq` renders the main heading "Frequently Asked Questions" | Must     |
| FAQ-2 | The FAQ explains how to rate Fall 2026+ 4-digit semester courses           | Must     |
| FAQ-3 | The FAQ item about threatened lawsuits tells people to report the rating, does not claim they cannot sue, explains that Section 230 may apply to visitor comments, and links to the Congressional Research Service overview of Section 230 | Must     |

## Test Scenarios

| Scenario                        | Criteria Covered | Spec          | Status      |
| ------------------------------- | ---------------- | ------------- | ----------- |
| FAQ page loads expected heading | FAQ-1, FAQ-2     | `faq.spec.ts` | Implemented |
| Lawsuit FAQ explains reporting and limits of Section 230 | FAQ-3            | `faq.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/faq.spec.ts`
- **Tests:** `FAQ: faq page loads expected heading`, `FAQ: lawsuit FAQ explains reporting and limits of Section 230`
- **Status:** Implemented
