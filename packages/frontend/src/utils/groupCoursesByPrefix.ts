export function getCoursePrefix(courseName: string) {
    return courseName.split(" ")[0] ?? courseName;
}

export function getCourseNumber(courseName: string) {
    return courseName.split(" ").slice(1).join(" ") || courseName;
}

/** Fall 2026+ semester catalog numbers (1000–5999). */
export function isSemesterCourseNumber(courseNumber: string) {
    const parsed = Number.parseInt(courseNumber, 10);
    return Number.isFinite(parsed) && parsed >= 1000;
}

/** Semester (4-digit) courses before quarter (3-digit), then by number within each group. */
export function compareCourseNames(a: string, b: string) {
    const aNumber = getCourseNumber(a);
    const bNumber = getCourseNumber(b);
    const aSemester = isSemesterCourseNumber(aNumber);
    const bSemester = isSemesterCourseNumber(bNumber);

    if (aSemester !== bSemester) {
        return aSemester ? -1 : 1;
    }

    return Number.parseInt(aNumber, 10) - Number.parseInt(bNumber, 10);
}

export function groupCoursesByPrefix(courses: string[]) {
    const groups = courses.reduce<{ prefix: string; courses: string[] }[]>((groups, course) => {
        const prefix = getCoursePrefix(course);
        const existingGroup = groups.find((group) => group.prefix === prefix);
        if (existingGroup) {
            existingGroup.courses.push(course);
        } else {
            groups.push({ prefix, courses: [course] });
        }
        return groups;
    }, []);

    groups.forEach((group) => group.courses.sort(compareCourseNames));
    return groups;
}
