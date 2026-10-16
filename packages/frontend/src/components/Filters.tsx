import { ArrowLongUpIcon } from "@heroicons/react/24/outline";
import {
    createDefaultFilterState,
    FilterState,
    hasActiveFilterState,
    SortingOptions,
} from "@/utils/applyProfessorFilters";
import { cn } from "@/utils";
import { MinMaxSlider } from "./MinMaxSlider";
import { Select } from "./forms";
import { CoursePrefixMultiSelect } from "./CoursePrefixMultiSelect";

export type { FilterState, SortingOptions };

export interface FilterProps {
    value: FilterState;
    onChange: (value: FilterState) => void;
    evaluationDomain: [number, number];
    className?: string;
    showHeading?: boolean;
}

const sortByOptions: { value: SortingOptions; label: string }[] = [
    { value: "relevant", label: "Relevant" },
    { value: "alphabetical", label: "Alphabetical" },
    { value: "overallRating", label: "Overall Rating" },
    { value: "recognizesStudentDifficulties", label: "Recognizes Student Difficulty" },
    { value: "presentsMaterialClearly", label: "Presents Material Clearly" },
];

export function Filters({
    value,
    onChange,
    evaluationDomain,
    className,
    showHeading = true,
}: FilterProps) {
    const update = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
    const selectedPrefixes = value.coursePrefixFilters
        .filter((coursePrefixFilter) => coursePrefixFilter.state)
        .map((coursePrefixFilter) => coursePrefixFilter.name);
    const hasActiveFilters = hasActiveFilterState(value);

    return (
        <aside
            className={cn(
                "rounded-xl border border-input bg-card p-5 shadow-sm xl:sticky xl:top-6",
                className,
            )}
        >
            {showHeading && (
                <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold tracking-tight">Filters</h2>
                    {hasActiveFilters && (
                        <button
                            className="mt-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                            type="button"
                            onClick={() => onChange(createDefaultFilterState())}
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}

            <section className={cn(showHeading ? "mt-5 border-t border-border pt-5" : "mt-0")}>
                <h3 className="text-sm font-semibold">Sort</h3>
                <div className="mt-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <Select
                            name="sortBy"
                            label="Sort results"
                            hideLabel
                            wrapperClassName="w-full"
                            className="w-full"
                            value={value.sortBy}
                            onChange={(e) => update({ sortBy: e.target.value as SortingOptions })}
                            options={sortByOptions}
                        />
                    </div>
                    <button
                        aria-label="Reverse Order"
                        type="button"
                        onClick={() => update({ reverseFilter: !value.reverseFilter })}
                        className={cn(
                            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md",
                            "border border-input bg-card transition-colors hover:border-brand/45 hover:bg-muted",
                            "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/35",
                        )}
                    >
                        <ArrowLongUpIcon
                            className={cn(
                                "size-5 transition-transform",
                                value.reverseFilter && "rotate-180",
                            )}
                        />
                    </button>
                </div>
            </section>

            <section className="mt-5 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Course Prefix</h3>
                <div className="mt-2">
                    <CoursePrefixMultiSelect
                        options={value.coursePrefixFilters.map(({ name }) => name)}
                        selected={selectedPrefixes}
                        onChange={(nextSelectedPrefixes) => {
                            const nextSelectedSet = new Set(nextSelectedPrefixes);
                            update({
                                coursePrefixFilters: value.coursePrefixFilters.map(
                                    (coursePrefix) => ({
                                        name: coursePrefix.name,
                                        state: nextSelectedSet.has(coursePrefix.name),
                                    }),
                                ),
                            });
                        }}
                    />
                </div>
            </section>

            <section className="mt-5 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Ratings</h3>
                <div className="mt-4 space-y-4">
                    {(
                        [
                            {
                                name: "Overall rating",
                                filterKey: "avgRatingFilter",
                                range: value.avgRatingFilter,
                            },
                            {
                                name: "Recognizes difficulties",
                                filterKey: "studentDifficultyFilter",
                                range: value.studentDifficultyFilter,
                            },
                            {
                                name: "Presents clearly",
                                filterKey: "materialClearFilter",
                                range: value.materialClearFilter,
                            },
                        ] as const
                    ).map(({ name, filterKey, range }) => (
                        <div key={name}>
                            <h4 className="text-sm font-medium">{name}</h4>
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
                        <h4 className="text-sm font-medium">Number of evaluations</h4>
                        <div className="mt-1">
                            <MinMaxSlider
                                value={value.numberOfEvaluationsFilter ?? evaluationDomain}
                                onchange={(nextRange) =>
                                    update({ numberOfEvaluationsFilter: nextRange })
                                }
                                domain={evaluationDomain}
                                resolution={1}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </aside>
    );
}
