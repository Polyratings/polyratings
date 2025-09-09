/**
 * Calculate the active course index based on visibility ratios
 * Uses a 25% threshold to ensure meaningful section visibility before activation
 * This approach fixes the sidebar highlight bug for short/last sections
 */
export function getActiveCourseIndex(courseVisibility: number[]): number {
    return courseVisibility.reduce((maxIndex, ratio, index) => {
        // Use 0.25 threshold (25% visible) and prefer the course with highest visibility ratio
        if (ratio >= 0.25 && (maxIndex === -1 || ratio > courseVisibility[maxIndex])) {
            return index;
        }
        return maxIndex;
    }, -1);
}
