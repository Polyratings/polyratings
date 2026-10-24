/**
 * Returns `departments` with `priority` values first (in priority order), then
 * the remaining departments in their original order. Unknown priority values
 * are ignored.
 */
export function prioritizeDepartmentList(
    departments: readonly string[],
    priority: readonly string[],
): string[] {
    const remaining = new Set(departments);
    const ordered: string[] = [];

    for (const value of priority) {
        if (!remaining.has(value)) {
            continue;
        }
        ordered.push(value);
        remaining.delete(value);
    }

    for (const value of departments) {
        if (remaining.has(value)) {
            ordered.push(value);
        }
    }

    return ordered;
}
