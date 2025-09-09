/**
 * Calculate the active course index based on visibility ratios
 * Uses a 10% threshold for responsive activation while still fixing short/last sections
 * This approach fixes the sidebar highlight bug for short/last sections
 */
export function getActiveCourseIndex(courseVisibility: number[]): number {
    return courseVisibility.reduce((maxIndex, ratio, index) => {
        // Use 0.1 threshold (10% visible) and prefer the course with highest visibility ratio
        if (ratio >= 0.1 && (maxIndex === -1 || ratio > courseVisibility[maxIndex])) {
            return index;
        }
        return maxIndex;
    }, -1);
}
