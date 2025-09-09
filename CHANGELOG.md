# Changelog

## [Unreleased]

### Fixed

- **Sidebar scroll spy**: Fixed "active section" highlight bug where the last course section with insufficient content would never become active. The sidebar now uses threshold-based activation (25% visible) instead of requiring the heading to reach the top of the viewport. This ensures short sections and the last section properly highlight when scrolled into view.

### Changed

- **Scroll spy behavior**: Updated ProfessorPage sidebar highlighting to use IntersectionObserver with multiple thresholds (0%, 25%, 50%, 75%, 100%) and rootMargin accounting for fixed navigation (-64px top, -10% bottom). The most visible section above 25% threshold is now activated.

### Technical Details

- Extracted active course selection logic into testable `getActiveCourseIndex` utility function
- Added comprehensive unit tests covering edge cases and the specific last-section scenario
- Updated course visibility tracking from boolean array to number array for intersection ratios
- Added detailed comments explaining threshold and rootMargin choices for future maintenance