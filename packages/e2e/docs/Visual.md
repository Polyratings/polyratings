# Visual diffs – Business Requirements

## Feature

Fixed public pages keep a stable appearance. The Playwright run after each deploy compares them to committed Linux Chromium baselines. Pages whose pixels come from ratings or professor records are not part of this suite.

## User Stories

- As a reviewer, I want a deploy's Playwright run to fail when a fixed page's pixels drift so a layout change is visible before it is trusted.
- As a maintainer, I want those baselines to be Linux Chromium screenshots of pages end users cannot change.

## Acceptance Criteria

| ID    | Criterion | Priority |
| ----- | --------- | -------- |
| VIS-1 | The desktop home hero and recent-updates block in light mode match the stored baseline. The Best of the Best carousel, which is rating data, is masked. | Must |
| VIS-2 | The desktop home hero and recent-updates block in dark mode match the stored baseline. The Best of the Best carousel is masked. | Must |
| VIS-3 | The phone home hero in light mode matches the stored baseline. The rating carousel is masked. | Must |
| VIS-4 | The phone search sheet, open before any typing and showing no professor names, matches the stored baseline. | Must |
| VIS-5 | The About page in light mode matches the stored baseline. | Must |
| VIS-6 | The About page in dark mode matches the stored baseline. | Must |
| VIS-7 | The FAQ page in light mode, with every item collapsed, matches the stored baseline. | Must |
| VIS-8 | The login page in light mode matches the stored baseline. | Must |
| VIS-9 | The login page in dark mode matches the stored baseline. | Must |
| VIS-10 | An unknown route's not-found page matches the stored baseline. | Must |
| VIS-11 | The empty add-a-professor form matches the stored baseline. Placeholders only; no saved professor. | Must |

## Test Scenarios

| Scenario | Criteria Covered | Spec | Status |
| -------- | ---------------- | ---- | ------ |
| VISUAL: home desktop light matches the baseline | VIS-1 | `visual.spec.ts` | Implemented |
| VISUAL: home desktop dark matches the baseline | VIS-2 | `visual.spec.ts` | Implemented |
| VISUAL: home phone light matches the baseline | VIS-3 | `visual.spec.ts` | Implemented |
| VISUAL: phone search sheet matches the baseline | VIS-4 | `visual.spec.ts` | Implemented |
| VISUAL: about page light matches the baseline | VIS-5 | `visual.spec.ts` | Implemented |
| VISUAL: about page dark matches the baseline | VIS-6 | `visual.spec.ts` | Implemented |
| VISUAL: FAQ page light matches the baseline | VIS-7 | `visual.spec.ts` | Implemented |
| VISUAL: login page light matches the baseline | VIS-8 | `visual.spec.ts` | Implemented |
| VISUAL: login page dark matches the baseline | VIS-9 | `visual.spec.ts` | Implemented |
| VISUAL: not-found page matches the baseline | VIS-10 | `visual.spec.ts` | Implemented |
| VISUAL: new professor page matches the baseline | VIS-11 | `visual.spec.ts` | Implemented |

## Implementation

- **Spec file:** `packages/e2e/src/visual.spec.ts`
- **Tag:** `@visual` on the suite. `npm run e2e` skips it. The post-deploy Playwright command sets `PLAYWRIGHT_VISUAL=compare`, so this suite runs in that same invocation against the deployed site. A mismatch fails the deploy job and is included in the `playwright-report-<env>` artifact.
- **Baselines:** `packages/e2e/src/visual.spec.ts-snapshots/*-chromium-linux.png`, committed. They are the Linux shots from the first CI capture. Refresh them by replacing those files; do not commit macOS or Windows shots.
- **Out of suite:** professor search, professor pages, and anything else whose text or layout comes from ratings or professor records. The home shot stops at the hero and recent-updates copy, and masks the Best of the Best carousel.
- **Local:** `npm run e2e:visual` compares and `npm run e2e:visual:update` rewrites snapshots for the machine you are on. Reduced motion is on, CSS animations are disabled, and the viewport is fixed.
