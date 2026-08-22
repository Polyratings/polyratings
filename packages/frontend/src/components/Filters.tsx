import { ArrowLongUpIcon } from "@heroicons/react/24/outline";
import { MinMaxSlider } from "./MinMaxSlider";
import { FilterState, SortingOptions } from "@/utils/applyProfessorFilters";

export type { FilterState, SortingOptions };

export interface FilterProps {
    value: FilterState;
    onChange: (value: FilterState) => void;
    evaluationDomain: [number, number];
    className?: string;
}

export function Filters({ value, onChange, evaluationDomain, className }: FilterProps) {
    const update = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
    const selectedPrefixIndex = value.coursePrefixFilters.findIndex(
        (coursePrefixFilter) => coursePrefixFilter.state,
    );

    return (
        <div className={className ?? ""}>
            <h2 className="text-xl font-bold transform -translate-x-4 pb-1">Sort by:</h2>
            <div className="flex items-center">
                <select
                    className="block w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    value={value.sortBy}
                    onChange={(e) => update({ sortBy: e.target.value as SortingOptions })}
                >
                    <option value="relevant">Relevant</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="overallRating">Overall Rating</option>
                    <option value="recognizesStudentDifficulties">
                        Recognizes Student Difficulty
                    </option>
                    <option value="presentsMaterialClearly">Presents Material Clearly</option>
                </select>
                <button
                    aria-label="Reverse Order"
                    type="button"
                    onClick={() => update({ reverseFilter: !value.reverseFilter })}
                >
                    <ArrowLongUpIcon
                        className={`h-5 w-5 hover:text-cal-poly-green transform transition-all ${
                            value.reverseFilter ? "rotate-180" : "rotate-0"
                        }`}
                    />
                </button>
            </div>

            <h2 className="text-xl font-bold transform -translate-x-4 py-1">Filters:</h2>

            <div className="block xl:hidden mb-2">
                <h3>CoursePrefix:</h3>
                <select
                    className="w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    value={selectedPrefixIndex === -1 ? "-1" : String(selectedPrefixIndex)}
                    onChange={(e) => {
                        const selectedIndex = parseInt(e.target.value, 10);
                        update({
                            coursePrefixFilters: value.coursePrefixFilters.map(
                                (coursePrefix, i) => ({
                                    name: coursePrefix.name,
                                    state: i === selectedIndex,
                                }),
                            ),
                        });
                    }}
                >
                    <option value="-1">Any</option>
                    {value.coursePrefixFilters.map(({ name }, i) => (
                        <option value={i} key={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {(
                [
                    {
                        name: "Overall Rating:",
                        filterKey: "avgRatingFilter",
                        range: value.avgRatingFilter,
                    },
                    {
                        name: "Recognizes Student Difficulties:",
                        filterKey: "studentDifficultyFilter",
                        range: value.studentDifficultyFilter,
                    },
                    {
                        name: "Presents Material Clearly:",
                        filterKey: "materialClearFilter",
                        range: value.materialClearFilter,
                    },
                ] as const
            ).map(({ name, filterKey, range }) => (
                <div key={name}>
                    <h3>{name}</h3>
                    <div className="mt-1">
                        <MinMaxSlider
                            value={range}
                            onchange={(nextRange) => update({ [filterKey]: nextRange })}
                            domain={[0, 4]}
                        />
                    </div>
                </div>
            ))}
            <div>
                <h3>Number of Ratings:</h3>
                <div className="mt-1">
                    <MinMaxSlider
                        value={value.numberOfEvaluationsFilter ?? evaluationDomain}
                        onchange={(nextRange) => update({ numberOfEvaluationsFilter: nextRange })}
                        domain={evaluationDomain}
                        resolution={1}
                    />
                </div>
            </div>

            <div className="hidden xl:block">
                <h3>Course Prefix:</h3>
                <div className="grid grid-cols-2 gap-x-2">
                    {value.coursePrefixFilters.map(({ name, state }, i) => (
                        <label htmlFor={name} key={name} className="mt-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={state}
                                id={name}
                                className="h-5 w-5"
                                onChange={(e) => {
                                    update({
                                        coursePrefixFilters: value.coursePrefixFilters.map(
                                            (coursePrefix, index) =>
                                                index === i
                                                    ? {
                                                          name: coursePrefix.name,
                                                          state: e.target.checked,
                                                      }
                                                    : coursePrefix,
                                        ),
                                    });
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
