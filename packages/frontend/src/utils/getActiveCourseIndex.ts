/**
 * Calculate the active course index based on visibility ratios
 * Uses a hybrid approach: most visible section above minimal threshold, fallback to first visible
 * This approach fixes the sidebar highlight bug for short/last sections while maintaining responsive scrolling
 */
export function getActiveCourseIndex(courseVisibility: number[]): number {
    // First try to find the most visible section with any meaningful visibility (>0)
    const mostVisibleIndex = courseVisibility.reduce((maxIndex, ratio, index) => {
        if (ratio > 0 && (maxIndex === -1 || ratio > courseVisibility[maxIndex])) {
            return index;
        }
        return maxIndex;
    }, -1);
    
    return mostVisibleIndex;
}
