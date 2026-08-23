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

## Test Scenarios

| Scenario                        | Criteria Covered | Spec          | Status      |
| ------------------------------- | ---------------- | ------------- | ----------- |
| FAQ page loads expected heading | FAQ-1 and FAQ-2  | `faq.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/faq.spec.ts`
- **Test:** `FAQ: faq page loads expected heading` (FAQ-1 page title and FAQ-2 semester-conversion question)
- **Status:** Implemented
