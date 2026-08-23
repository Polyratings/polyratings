# Admin – Business Requirements

## Feature

The admin route is gated: unauthenticated visitors are sent to login and do not see moderation UI.

## User Stories

- As an unauthenticated user, I should not be shown moderation controls.

## Acceptance Criteria

| ID      | Criterion                                                                                | Priority |
| ------- | ---------------------------------------------------------------------------------------- | -------- |
| ADMIN-3 | Unauthenticated users visiting `/admin` redirect to `/login` without admin panel content | Must     |

## Test Scenarios

| Scenario                                   | Criteria Covered | Spec            | Status      |
| ------------------------------------------ | ---------------- | --------------- | ----------- |
| Unauthenticated visit redirects to login   | ADMIN-3          | `admin.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/admin.spec.ts`
- **Test:** `ADMIN: unauthenticated users redirect to login`
- **Frontend route handling:** `packages/frontend/src/pages/Admin.tsx` redirects unauthenticated users with `<Navigate to="/login" replace />`
- **Status:** Implemented
