import { TruncatedProfessor } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";

export type SortingOptions =
    | "relevant"
    | "alphabetical"
    | "overallRating"
    | "recognizesStudentDifficulties"
    | "presentsMaterialClearly";

export interface FilterState {
    coursePrefixFilters: { name: string; state: boolean }[];
    avgRatingFilter: [number, number];
    studentDifficultyFilter: [number, number];
    materialClearFilter: [number, number];
    sortBy: SortingOptions;
    numberOfEvaluationsFilter: [number, number] | null;
    reverseFilter: boolean;
}

const sortingMap: Record<
    Exclude<SortingOptions, "relevant">,
    (a: TruncatedProfessor, b: TruncatedProfessor) => number
> = {
    alphabetical: (a, b) => {
        const aName = `${a.lastName}, ${a.firstName}`;
        const bName = `${b.lastName}, ${b.firstName}`;
        return aName.localeCompare(bName);
    },
    overallRating: (a, b) => b.overallRating - a.overallRating,
    recognizesStudentDifficulties: (a, b) => b.studentDifficulties - a.studentDifficulties,
    presentsMaterialClearly: (a, b) => b.materialClear - a.materialClear,
};

export function createDefaultFilterState(): FilterState {
    return {
        coursePrefixFilters: DEPARTMENT_LIST.map((coursePrefix) => ({
            name: coursePrefix,
            state: false,
        })),
        avgRatingFilter: [0, 4],
        studentDifficultyFilter: [0, 4],
        materialClearFilter: [0, 4],
        sortBy: "relevant",
        numberOfEvaluationsFilter: null,
        reverseFilter: false,
    };
}

export function hasActiveFilterState(value: FilterState) {
    return (
        value.sortBy !== "relevant" ||
        value.reverseFilter ||
        value.avgRatingFilter[0] !== 0 ||
        value.avgRatingFilter[1] !== 4 ||
        value.studentDifficultyFilter[0] !== 0 ||
        value.studentDifficultyFilter[1] !== 4 ||
        value.materialClearFilter[0] !== 0 ||
        value.materialClearFilter[1] !== 4 ||
        Boolean(value.numberOfEvaluationsFilter) ||
        value.coursePrefixFilters.some((coursePrefixFilter) => coursePrefixFilter.state)
    );
}

export function getEvaluationDomain(
    professors: TruncatedProfessor[] | undefined,
): [number, number] {
    if (!professors?.length) {
        return [0, 1];
    }
    let min = professors[0].numEvals;
    let max = professors[0].numEvals;
    professors.forEach((professor) => {
        min = Math.min(min, professor.numEvals);
        max = Math.max(max, professor.numEvals);
    });
    if (min === max) {
        return [min, min + 1];
    }
    return [min, max];
}

export function applyProfessorFilters(
    professors: TruncatedProfessor[],
    filterState: FilterState,
): TruncatedProfessor[] {
    const selectedPrefixes = filterState.coursePrefixFilters
        .filter((coursePrefixFilter) => coursePrefixFilter.state)
        .map((coursePrefixFilter) => coursePrefixFilter.name);
    const prefixSet = selectedPrefixes.length ? new Set(selectedPrefixes) : null;
    const evalRange = filterState.numberOfEvaluationsFilter;

    const filteredResult = professors.filter((professor) => {
        if (
            professor.overallRating < filterState.avgRatingFilter[0] ||
            professor.overallRating > filterState.avgRatingFilter[1]
        ) {
            return false;
        }
        if (
            professor.studentDifficulties < filterState.studentDifficultyFilter[0] ||
            professor.studentDifficulties > filterState.studentDifficultyFilter[1]
        ) {
            return false;
        }
        if (
            professor.materialClear < filterState.materialClearFilter[0] ||
            professor.materialClear > filterState.materialClearFilter[1]
        ) {
            return false;
        }
        if (evalRange && (professor.numEvals < evalRange[0] || professor.numEvals > evalRange[1])) {
            return false;
        }
        if (prefixSet && !professor.courses.some((course) => prefixSet.has(course.split(" ")[0]))) {
            return false;
        }
        return true;
    });

    if (filterState.sortBy !== "relevant") {
        filteredResult.sort(sortingMap[filterState.sortBy]);
    }

    if (filterState.reverseFilter) {
        filteredResult.reverse();
    }

    return filteredResult;
}
