# Admin – Business Requirements

## Feature

The admin route exposes moderation surfaces for pending professors, reported ratings, and processed moderation history to authenticated users.

## User Stories

- As an admin, I want access to pending professor decisions so I can approve or reject submissions.
- As an admin, I want reported ratings and actions in one place so I can moderate quickly.
- As an unauthenticated user, I should not be shown moderation controls.

## Acceptance Criteria

| ID      | Criterion                                                                                        | Priority |
| ------- | ------------------------------------------------------------------------------------------------ | -------- |
| ADMIN-1 | Authenticated users visiting `/admin` see "Polyratings Admin Panel" heading                      | Must     |
| ADMIN-2 | Authenticated users see sections for Pending Professors, Reported Ratings, and Processed Ratings | Must     |
| ADMIN-3 | Unauthenticated users visiting `/admin` see access-gated messaging                               | Must     |

## Test Scenarios

| Scenario                                            | Criteria Covered    | Spec            | Status      |
| --------------------------------------------------- | ------------------- | --------------- | ----------- |
| Admin panel sections are visible when authenticated | ADMIN-1 and ADMIN-2 | `admin.spec.ts` | Planned     |
| Access-gated message appears when unauthenticated   | ADMIN-3             | `admin.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/admin.spec.ts`
- **Implemented tests:** `ADMIN: access-gated message appears when unauthenticated`
- **Status:** Partially implemented
