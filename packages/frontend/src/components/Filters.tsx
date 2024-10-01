import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { ArrowLongUpIcon } from "@heroicons/react/24/outline";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { MinMaxSlider } from "@/components";
import { trpc } from "@/trpc";
import { useLocationState } from "@/hooks/useLocationState";

type SortingOptions =
    | "relevant"
    | "alphabetical"
    | "overallRating"
    | "recognizesStudentDifficulties"
    | "presentsMaterialClearly";

type Professor = inferProcedureOutput<AppRouter["professors"]["all"]>[0];

export interface FilterProps {
    unfilteredProfessors: Professor[];
    onUpdate: (professors: Professor[]) => void;
    className?: string;
}

export interface FilterHandle {
    getState: () => FilterState;
}

export interface FilterState {
    coursePrefixFilters: { name: string; state: boolean }[];
    avgRatingFilter: [number, number];
    studentDifficultyFilter: [number, number];
    materialClearFilter: [number, number];
    sortBy: SortingOptions;
    numberOfEvaluationsFilter: [number, number];
    reverseFilter: boolean;
}

// eslint-disable-next-line react/function-component-definition
export function Filters({ unfilteredProfessors, onUpdate, className }: FilterProps) {
    // Get all Professors to calculate states
    const { data: allProfessors } = trpc.professors.all.useQuery();

    const getEvaluationDomain = (): [number, number] => [
        Math.min(...(allProfessors?.map((professor) => professor.numEvals) ?? [1])),
        Math.max(...(allProfessors?.map((professor) => professor.numEvals) ?? [2])),
    ];
    const location = useLocation();
    const previousState = location.state as FilterState | undefined;
    // Component State
    const [coursePrefixFilters, setCoursePrefixFilters] = useLocationState<
        { name: string; state: boolean }[]
    >(
        previousState?.coursePrefixFilters ??
            DEPARTMENT_LIST.map((coursePrefix) => ({ name: coursePrefix, state: false })),
        "coursePrefixFilters",
    );
    const [avgRatingFilter, setAvgRatingFilter] = useLocationState<[number, number]>(
        previousState?.avgRatingFilter ?? [0, 4],
        "avgRatingFilter",
    );
    const [studentDifficultyFilter, setStudentDifficultyFilter] = useLocationState<
        [number, number]
    >(previousState?.studentDifficultyFilter ?? [0, 4], "studentDifficultyFilter");
    const [materialClearFilter, setMaterialClearFilter] = useLocationState<[number, number]>(
        previousState?.materialClearFilter ?? [0, 4],
        "materialClearFilter",
    );
    const [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useLocationState<
        [number, number]
    >(
        previousState?.numberOfEvaluationsFilter ?? getEvaluationDomain(),
        "numberOfEvaluationsFilter",
    );
    const [reverseFilter, setReverseFilter] = useLocationState(
        previousState?.reverseFilter ?? false,
        "reverseFilter",
    );
    const [sortBy, setSortBy] = useLocationState<SortingOptions>(
        previousState?.sortBy ?? "relevant",
        "sortBy",
    );

    const professorFilterFunctions: ((professor: Professor) => boolean)[] = [
        (professor) =>
            professor.overallRating >= avgRatingFilter[0] &&
            professor.overallRating <= avgRatingFilter[1],

        (professor) =>
            professor.studentDifficulties >= studentDifficultyFilter[0] &&
            professor.studentDifficulties <= studentDifficultyFilter[1],

        (professor) =>
            professor.materialClear >= materialClearFilter[0] &&
            professor.materialClear <= materialClearFilter[1],

        (professor) =>
            professor.numEvals >= numberOfEvaluationsFilter[0] &&
            professor.numEvals <= numberOfEvaluationsFilter[1],
    ];

    const sortingMap: { [key in SortingOptions]: (a: Professor, b: Professor) => number } = {
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
        const filteredResult = unfilteredProfessors.filter((professor) => {
            // eslint-disable-next-line no-restricted-syntax
            for (const filterFn of professorFilterFunctions) {
                if (!filterFn(professor)) {
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

        const selectedCoursePrefixs = coursePrefixFilters.filter(
            (coursePrefixFilter) => coursePrefixFilter.state,
        );

        if (selectedCoursePrefixs.length) {
            const coursePrefixSet = new Set(
                selectedCoursePrefixs.map((coursePrefixFilter) => coursePrefixFilter.name),
            );
            const postCoursePrefixFilter = filteredResult.filter((professor) =>
                professor.courses.some((course) => coursePrefixSet.has(course)),
            );
            onUpdate(postCoursePrefixFilter);
        } else {
            onUpdate(filteredResult);
        }
    }, [
        coursePrefixFilters,
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
                <button
                    aria-label="Reverse Order"
                    type="button"
                    onClick={() => setReverseFilter(!reverseFilter)}
                >
                    <ArrowLongUpIcon
                        className={`h-5 w-5 hover:text-cal-poly-green transform transition-all ${
                            reverseFilter ? "rotate-180" : ""
                        }`}
                    />
                </button>
            </div>

            <h2 className="text-xl font-bold transform -translate-x-4 py-1">Filters:</h2>

            <div className="block xl:hidden mb-2">
                <h3>CoursePrefix:</h3>
                <select
                    className="w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        const newCoursePrefixFilters = [...coursePrefixFilters].map(({ name }) => ({
                            name,
                            state: false,
                        }));
                        if (value !== -1) {
                            newCoursePrefixFilters[value].state = true;
                        }
                        setCoursePrefixFilters(newCoursePrefixFilters);
                    }}
                >
                    <option value="-1">Any</option>
                    {coursePrefixFilters.map(({ name }, i) => (
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
                <h3>Number of Ratings:</h3>
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
                <h3>Course Prefix:</h3>
                <div className="grid grid-cols-2 gap-x-2">
                    {coursePrefixFilters.map(({ name, state }, i) => (
                        <label htmlFor={name} key={name} className="mt-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={state}
                                id={name}
                                className="h-5 w-5"
                                onChange={(e) => {
                                    const updatedCoursePrefixFilters = [...coursePrefixFilters];
                                    updatedCoursePrefixFilters[i].state = e.target.checked;
                                    setCoursePrefixFilters(updatedCoursePrefixFilters);
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
