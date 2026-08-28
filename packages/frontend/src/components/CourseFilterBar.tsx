import { useSearchParams } from "react-router";
import { Button } from "@/components/forms/Button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, getCourseNumber, getCoursePrefix, groupCoursesByPrefix } from "@/utils";

type CourseFilterSelection =
    { type: "all" } | { type: "prefix"; prefix: string } | { type: "course"; course: string };

function parseSelection(
    courses: string[],
    courseParam: string | null,
    prefixParam: string | null,
): CourseFilterSelection {
    if (courseParam && courses.includes(courseParam)) {
        return { type: "course", course: courseParam };
    }

    const prefixes = new Set(courses.map(getCoursePrefix));
    if (prefixParam && prefixes.has(prefixParam)) {
        return { type: "prefix", prefix: prefixParam };
    }

    return { type: "all" };
}

function toSelectValue(selection: CourseFilterSelection) {
    if (selection.type === "course") {
        return `course:${selection.course}`;
    }
    if (selection.type === "prefix") {
        return `prefix:${selection.prefix}`;
    }
    return "all";
}

function fromSelectValue(value: string): CourseFilterSelection {
    if (value.startsWith("course:")) {
        return { type: "course", course: value.slice("course:".length) };
    }
    if (value.startsWith("prefix:")) {
        return { type: "prefix", prefix: value.slice("prefix:".length) };
    }
    return { type: "all" };
}

const chipClassName = "h-9 rounded-lg px-3.5 text-sm";

// The department a course row belongs to: an explicit department filter, the department of the
// selected course, or nothing while every department is shown.
function activePrefixOf(selection: CourseFilterSelection) {
    if (selection.type === "prefix") {
        return selection.prefix;
    }
    if (selection.type === "course") {
        return getCoursePrefix(selection.course);
    }
    return null;
}

export function CourseFilterBar({ courses }: { courses: string[] }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const selection = parseSelection(
        courses,
        searchParams.get("course"),
        searchParams.get("prefix"),
    );
    const groups = groupCoursesByPrefix(courses);
    const singleDepartment = groups.length === 1;
    const activePrefix = activePrefixOf(selection) ?? (singleDepartment ? groups[0].prefix : null);
    const activeGroup = groups.find((group) => group.prefix === activePrefix);

    function applySelection(next: CourseFilterSelection) {
        setSearchParams(
            (current) => {
                const params = new URLSearchParams(current);
                params.delete("course");
                params.delete("prefix");
                if (next.type === "course") {
                    params.set("course", next.course);
                } else if (next.type === "prefix") {
                    params.set("prefix", next.prefix);
                }
                return params;
            },
            { replace: true },
        );
    }

    const allButton = (
        <Button
            type="button"
            size="sm"
            className={chipClassName}
            variant={selection.type === "all" ? "default" : "outline"}
            aria-pressed={selection.type === "all"}
            onClick={() => applySelection({ type: "all" })}
        >
            All
        </Button>
    );

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
            <div className="md:hidden">
                <p id="course-filter-label" className="mb-1.5 text-sm font-medium">
                    Filter by course
                </p>
                <Select
                    value={toSelectValue(selection)}
                    onValueChange={(value) => applySelection(fromSelectValue(value))}
                >
                    <SelectTrigger
                        id="course-filter"
                        aria-labelledby="course-filter-label"
                        className="h-11 w-full text-base"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                        <SelectItem value="all">All courses</SelectItem>
                        {groups.map((group) => (
                            <SelectGroup key={group.prefix}>
                                <SelectLabel>{group.prefix}</SelectLabel>
                                {group.courses.length > 1 && (
                                    <SelectItem value={`prefix:${group.prefix}`}>
                                        All {group.prefix}
                                    </SelectItem>
                                )}
                                {group.courses.map((course) => (
                                    <SelectItem key={course} value={`course:${course}`}>
                                        {course}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="hidden md:block">
                {!singleDepartment && (
                    <div
                        className="flex flex-wrap items-center gap-2"
                        role="group"
                        aria-label="Filter ratings by department"
                    >
                        {allButton}
                        {groups.map((group) => {
                            const isSelected =
                                selection.type === "prefix" && selection.prefix === group.prefix;
                            return (
                                <Button
                                    key={group.prefix}
                                    type="button"
                                    size="sm"
                                    className={chipClassName}
                                    variant={isSelected ? "default" : "outline"}
                                    aria-pressed={isSelected}
                                    aria-label={group.prefix}
                                    onClick={() =>
                                        applySelection(
                                            isSelected
                                                ? { type: "all" }
                                                : { type: "prefix", prefix: group.prefix },
                                        )
                                    }
                                >
                                    {group.prefix}
                                    <span
                                        aria-hidden="true"
                                        className="ml-1 text-xs font-normal opacity-70 tabular-nums"
                                    >
                                        {group.courses.length}
                                    </span>
                                </Button>
                            );
                        })}
                    </div>
                )}

                {activeGroup && (
                    <div
                        className={cn(
                            "flex flex-wrap items-center gap-2",
                            !singleDepartment && "mt-2 border-t border-border pt-2.5",
                        )}
                        role="group"
                        aria-label={`Filter ratings by ${activeGroup.prefix} course`}
                    >
                        {singleDepartment ? (
                            allButton
                        ) : (
                            <span className="mr-1 text-sm font-semibold text-muted-foreground">
                                {activeGroup.prefix}
                            </span>
                        )}
                        {activeGroup.courses.map((course) => {
                            const isSelected =
                                selection.type === "course" && selection.course === course;
                            return (
                                <Button
                                    key={course}
                                    type="button"
                                    size="sm"
                                    className={cn(chipClassName, "min-w-13 tabular-nums")}
                                    variant={isSelected ? "default" : "outline"}
                                    aria-pressed={isSelected}
                                    aria-label={course}
                                    onClick={() => {
                                        if (!isSelected) {
                                            applySelection({ type: "course", course });
                                        } else if (singleDepartment) {
                                            applySelection({ type: "all" });
                                        } else {
                                            applySelection({
                                                type: "prefix",
                                                prefix: activeGroup.prefix,
                                            });
                                        }
                                    }}
                                >
                                    {getCourseNumber(course)}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
