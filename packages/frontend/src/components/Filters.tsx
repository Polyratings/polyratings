import { useLocation } from "react-router-dom";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Teacher } from "@polyratings/client";
import { MinMaxSlider } from "@/components";

type SortingOptions =
    | "relevant"
    | "alphabetical"
    | "overallRating"
    | "recognizesStudentDifficulties"
    | "presentsMaterialClearly";

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
const FilterRenderFunction: React.ForwardRefRenderFunction<FilterHandle, FilterProps> = (
    { teachers, onUpdate, className },
    ref,
) => {
    const location = useLocation();
    const previousState = location.state as FilterState | undefined;
    // Component State
    const [departmentFilters, setDepartmentFilters] = useState<{ name: string; state: boolean }[]>(
        previousState?.departmentFilters ?? [],
    );
    const [avgRatingFilter, setAvgRatingFilter] = useState<[number, number]>(
        previousState?.avgRatingFilter ?? [0, 4],
    );
    const [studentDifficultyFilter, setStudentDifficultyFilter] = useState<[number, number]>(
        previousState?.studentDifficultyFilter ?? [0, 4],
    );
    const [materialClearFilter, setMaterialClearFilter] = useState<[number, number]>(
        previousState?.materialClearFilter ?? [0, 4],
    );
    const [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useState<[number, number]>(
        previousState?.numberOfEvaluationsFilter ?? [1, 2],
    );
    const [reverseFilter, setReverseFilter] = useState(previousState?.reverseFilter ?? false);
    const [sortBy, setSortBy] = useState<SortingOptions>(previousState?.sortBy ?? "relevant");

    // Internal duplicate of result
    const [preDepartmentFilters, setPreDepartmentFilters] = useState<Teacher[]>([]);
    // On change duplicate result to the outside world
    useEffect(() => {
        const depFilters = departmentFilters.filter(({ state }) => state).map(({ name }) => name);
        const teachersToEmit = preDepartmentFilters.filter(
            (teacher) => depFilters.length === 0 || depFilters.includes(teacher.department),
        );
        onUpdate(teachersToEmit);
    }, [preDepartmentFilters, departmentFilters]);

    const getState: () => FilterState = () => ({
        departmentFilters,
        avgRatingFilter,
        studentDifficultyFilter,
        materialClearFilter,
        sortBy,
        numberOfEvaluationsFilter,
        reverseFilter,
    });

    useImperativeHandle(ref, () => ({
        getState,
    }));

    const getEvaluationDomain: (data: Teacher[]) => [number, number] = (data: Teacher[]) => [
        data.reduce((acc, curr) => (curr.numEvals < acc ? curr.numEvals : acc), Infinity),
        data.reduce((acc, curr) => (curr.numEvals > acc ? curr.numEvals : acc), -Infinity),
    ];

    const generateDepartmentFilters = (list: Teacher[]) => {
        const departments = [...new Set(list.map((t) => t.department))];
        const previousSelectedMap = departmentFilters.reduce(
            (acc: { [name: string]: boolean }, { name, state }) => {
                acc[name] = state;
                return acc;
            },
            {},
        );
        const initialDepartmentList = departments
            .filter((dep) => !!dep)
            .sort()
            .map((dep) => ({ name: dep, state: !!previousSelectedMap[dep] }));
        setDepartmentFilters(initialDepartmentList);
    };

    useEffect(() => {
        generateDepartmentFilters(teachers);
        const initialEvaluationRange = getEvaluationDomain(teachers);
        setNumberOfEvaluationsFilter(initialEvaluationRange);
    }, [teachers]);

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

    // Use keyof to hopefully stop spelling errors in the future
    const departmentFilterKey: keyof FilterState = "departmentFilters";
    const filterCalculationDependencies = Object.entries(getState())
        .filter(([k]) => k !== departmentFilterKey)
        .map(([, v]) => v);

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

        setPreDepartmentFilters(filteredResult);
        generateDepartmentFilters(filteredResult);
    }, Object.values(filterCalculationDependencies));

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
                        domain={getEvaluationDomain(teachers)}
                        resolution={1}
                    />
                </div>
            </div>

            <div className="hidden xl:block">
                <h3>Department:</h3>
                <div className="grid grid-cols-2 gap-x-2">
                    {departmentFilters.map(({ name, state }, i) => (
                        <label key={name} className="mt-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={state}
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
};

export const Filters = forwardRef(FilterRenderFunction);
