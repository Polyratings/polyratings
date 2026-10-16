# Layout – Business Requirements

## Feature

Site-wide chrome states that Polyratings is independent of Cal Poly.

## User Stories

- As a student or faculty member, I want every page to say Polyratings is not an official Cal Poly service so I do not mistake it for the university.
- As a visitor on a short page, I want the footer to rest at the bottom of the window instead of floating mid-screen.
- As a visitor whose device is set to light mode, I want to read Polyratings in dark mode anyway, and I want that choice remembered on my next visit.

## Acceptance Criteria

| ID       | Criterion                                                                                                                                                                     | Priority |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| LAYOUT-1 | Public routes render a contentinfo footer stating Polyratings is a student and alumni-run project and is not affiliated with, endorsed by, or an official service of Cal Poly | Must     |
| LAYOUT-2 | On a route whose content is shorter than the viewport, the footer rests at the bottom of the viewport and the page does not scroll                                            | Must     |
| LAYOUT-3 | On a first visit the rendered color scheme follows the operating system setting                                                                                                | Must     |
| LAYOUT-4 | The navbar theme control switches between light and dark, and its accessible name names the scheme the click applies                                                           | Must     |
| LAYOUT-5 | A chosen theme survives a reload and overrides the operating system setting                                                                                                   | Must     |

## Test Scenarios

| Scenario                                          | Criteria Covered   | Spec             | Status      |
| ------------------------------------------------- | ------------------ | ---------------- | ----------- |
| Public pages show Cal Poly non-affiliation footer | LAYOUT-1           | `layout.spec.ts` | Implemented |
| Short pages pin the footer to the viewport bottom | LAYOUT-2           | `layout.spec.ts` | Implemented |
| Theme toggle overrides and remembers the scheme   | LAYOUT-3, 4, 5     | `layout.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/layout.spec.ts`
- **Tests:** `LAYOUT: public pages show Cal Poly non-affiliation footer`, `LAYOUT: short pages pin the footer to the viewport bottom`, `LAYOUT: theme toggle overrides and remembers the scheme`
- **Status:** Implemented
