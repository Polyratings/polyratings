import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { MinMaxSlider } from "@/components";
import { inferQueryOutput, trpc } from "@/trpc";
import { useHistoryState } from "@/hooks/useHistoryState";

type SortingOptions =
    | "relevant"
    | "alphabetical"
    | "overallRating"
    | "recognizesStudentDifficulties"
    | "presentsMaterialClearly";

type Teacher = inferQueryOutput<"allProfessors">[0];

export interface FilterProps {
    teachers: Teacher[];
    onUpdate: (teachers: Teacher[]) => void;
    className?: string;
}

export interface FilterHandle {
    getState: () => FilterState;
}

export interface FilterState {
    departmentFilters: { name: string; state: boolean }[];
    avgRatingFilter: [number, number];
    studentDifficultyFilter: [number, number];
    materialClearFilter: [number, number];
    sortBy: SortingOptions;
    numberOfEvaluationsFilter: [number, number];
    reverseFilter: boolean;
}

// eslint-disable-next-line react/function-component-definition
export function Filters({ teachers, onUpdate, className }: FilterProps) {
    // Get all Professors to calculate states
    const { data: allProfessors } = trpc.useQuery(["allProfessors"]);

    const getEvaluationDomain = (): [number, number] => [
        Math.min(...(allProfessors?.map((professor) => professor.numEvals) ?? [1])),
        Math.max(...(allProfessors?.map((professor) => professor.numEvals) ?? [2])),
    ];
    const location = useLocation();
    const previousState = location.state as FilterState | undefined;
    // Component State
    const [departmentFilters, setDepartmentFilters] = useHistoryState<
        { name: string; state: boolean }[]
    >(
        previousState?.departmentFilters ??
            DEPARTMENT_LIST.map((department) => ({ name: department, state: false })),
        "departmentFilters",
    );
    const [avgRatingFilter, setAvgRatingFilter] = useHistoryState<[number, number]>(
        previousState?.avgRatingFilter ?? [0, 4],
        "avgRatingFilter",
    );
    const [studentDifficultyFilter, setStudentDifficultyFilter] = useHistoryState<[number, number]>(
        previousState?.studentDifficultyFilter ?? [0, 4],
        "studentDifficultyFilter",
    );
    const [materialClearFilter, setMaterialClearFilter] = useHistoryState<[number, number]>(
        previousState?.materialClearFilter ?? [0, 4],
        "materialClearFilter",
    );
    const [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useHistoryState<
        [number, number]
    >(
        previousState?.numberOfEvaluationsFilter ?? getEvaluationDomain(),
        "numberOfEvaluationsFilter",
    );
    const [reverseFilter, setReverseFilter] = useHistoryState(
        previousState?.reverseFilter ?? false,
        "reverseFilter",
    );
    const [sortBy, setSortBy] = useHistoryState<SortingOptions>(
        previousState?.sortBy ?? "relevant",
        "sortBy",
    );

    const teacherFilterFunctions: ((teacher: Teacher) => boolean)[] = [
        (teacher) =>
            teacher.overallRating >= avgRatingFilter[0] &&
            teacher.overallRating <= avgRatingFilter[1],

        (teacher) =>
            teacher.studentDifficulties >= studentDifficultyFilter[0] &&
            teacher.studentDifficulties <= studentDifficultyFilter[1],

        (teacher) =>
            teacher.materialClear >= materialClearFilter[0] &&
            teacher.materialClear <= materialClearFilter[1],

        (teacher) =>
            teacher.numEvals >= numberOfEvaluationsFilter[0] &&
            teacher.numEvals <= numberOfEvaluationsFilter[1],
    ];

    const sortingMap: { [key in SortingOptions]: (a: Teacher, b: Teacher) => number } = {
        alphabetical: (a, b) => {
            const aName = `${a.lastName}, ${a.firstName}`;
            const bName = `${b.lastName}, ${b.firstName}`;
            if (aName < bName) {
                return -1;
            }
            if (aName > bName) {
                return 1;
            }
            return 0;
        },
        relevant: () => {
            throw new Error("not a sort");
        },
        overallRating: (a, b) => b.overallRating - a.overallRating,
        recognizesStudentDifficulties: (a, b) => b.studentDifficulties - a.studentDifficulties,
        presentsMaterialClearly: (a, b) => b.materialClear - a.materialClear,
    };

    // Filter logic and emit to parent element
    useEffect(() => {
        const filteredResult = teachers.filter((teacher) => {
            // eslint-disable-next-line no-restricted-syntax
            for (const filterFn of teacherFilterFunctions) {
                if (!filterFn(teacher)) {
                    return false;
                }
            }
            return true;
        });

        // relevant is no sort applied
        if (sortBy !== "relevant") {
            filteredResult.sort(sortingMap[sortBy]);
        }

        if (reverseFilter) {
            filteredResult.reverse();
        }

        const selectedDepartments = departmentFilters.filter(
            (departmentFilter) => departmentFilter.state,
        );

        if (selectedDepartments.length) {
            const departmentSet = new Set(
                selectedDepartments.map((departmentFilter) => departmentFilter.name),
            );
            const postDepartmentFilter = filteredResult.filter((professor) =>
                departmentSet.has(professor.department),
            );
            onUpdate(postDepartmentFilter);
        } else {
            onUpdate(filteredResult);
        }
    }, [
        departmentFilters,
        avgRatingFilter,
        studentDifficultyFilter,
        materialClearFilter,
        sortBy,
        numberOfEvaluationsFilter,
        reverseFilter,
    ]);

    return (
        <div className={className ?? ""}>
            <h2 className="text-xl font-bold transform -translate-x-4 pb-1">Sort by:</h2>
            <div className="flex items-center">
                <select
                    className="block w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortingOptions)}
                >
                    <option value="relevant">Relevant</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="overallRating">Overall Rating</option>
                    <option value="recognizesStudentDifficulties">
                        Recognizes Student Difficulty
                    </option>
                    <option value="presentsMaterialClearly">Presents Material Clearly</option>
                </select>
                {/* Sorting Arrow */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 hover:text-cal-poly-green transform transition-all ${
                        reverseFilter ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    onClick={() => setReverseFilter(!reverseFilter)}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7l4-4m0 0l4 4m-4-4v18"
                    />
                </svg>
            </div>

            <h2 className="text-xl font-bold transform -translate-x-4 py-1">Filters:</h2>

            <div className="block xl:hidden mb-2">
                <h3>Department:</h3>
                <select
                    className="w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        const newDepartmentFilters = [...departmentFilters].map(({ name }) => ({
                            name,
                            state: false,
                        }));
                        if (value !== -1) {
                            newDepartmentFilters[value].state = true;
                        }
                        setDepartmentFilters(newDepartmentFilters);
                    }}
                >
                    <option value="-1">Any</option>
                    {departmentFilters.map(({ name }, i) => (
                        <option value={i} key={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {[
                { name: "Overall Rating:", filter: setAvgRatingFilter, value: avgRatingFilter },
                {
                    name: "Recognizes Student Difficulties:",
                    filter: setStudentDifficultyFilter,
                    value: studentDifficultyFilter,
                },
                {
                    name: "Presents Material Clearly:",
                    filter: setMaterialClearFilter,
                    value: materialClearFilter,
                },
            ].map(({ name, filter, value }) => (
                <div key={name}>
                    <h3>{name}</h3>
                    <div className="mt-1">
                        <MinMaxSlider value={value} onchange={filter} domain={[0, 4]} />
                    </div>
                </div>
            ))}
            <div>
                <h3>Number of Reviews:</h3>
                <div className="mt-1">
                    <MinMaxSlider
                        value={numberOfEvaluationsFilter}
                        onchange={setNumberOfEvaluationsFilter}
                        domain={getEvaluationDomain()}
                        resolution={1}
                    />
                </div>
            </div>

            <div className="hidden xl:block">
                <h3>Department:</h3>
                <div className="grid grid-cols-2 gap-x-2">
                    {departmentFilters.map(({ name, state }, i) => (
                        <label htmlFor={name} key={name} className="mt-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={state}
                                id={name}
                                className="h-5 w-5"
                                onChange={(e) => {
                                    const updatedDepartmentFilters = [...departmentFilters];
                                    updatedDepartmentFilters[i].state = e.target.checked;
                                    setDepartmentFilters(updatedDepartmentFilters);
                                }}
                            />
                            <span className="ml-2 text-gray-700">{name}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
