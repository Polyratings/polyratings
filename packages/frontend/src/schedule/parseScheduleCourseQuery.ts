/** Parse "DEPT 1234" or "dept1234" into department + course number for schedule search. */
export function parseScheduleCourseQuery(
    value: string,
): { department: string; courseNum: number } | null {
    const trimmed = value.trim().toUpperCase();
    const spaced = trimmed.match(/^([A-Z]{2,5})\s+(\d{3,4})$/);
    if (spaced) {
        return {
            department: spaced[1],
            courseNum: Number.parseInt(spaced[2], 10),
        };
    }

    const compact = trimmed.match(/^([A-Z]{2,5})(\d{3,4})$/);
    if (compact) {
        return {
            department: compact[1],
            courseNum: Number.parseInt(compact[2], 10),
        };
    }

    return null;
}
