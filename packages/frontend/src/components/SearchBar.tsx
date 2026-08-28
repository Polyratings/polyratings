import { useNavigate } from "react-router";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { AutoComplete } from "./AutoComplete";
import { trpc } from "@/trpc";
import { ProfessorSearchType, professorSearch } from "@/utils/ProfessorSearch";
import { Button } from "./forms";
import { cn } from "@/utils";

export interface SearchState {
    type: ProfessorSearchType;
    searchValue: string;
}

export interface SearchBarProps {
    value: SearchState;
    onChange: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    className?: string;
    size?: "default" | "hero";
}
export function SearchBar({ size = "default", ...props }: Omit<SearchBarProps, "className">) {
    const isHero = size === "hero";
    return (
        <>
            <ExtendedSearchBar
                {...props}
                size={size}
                className={cn("hidden sm:flex", !isHero && "mt-5")}
            />
            <TruncatedSearchBar
                {...props}
                size={size}
                className={cn("flex w-full sm:hidden", !isHero && "mt-5")}
            />
        </>
    );
}

export function ExtendedSearchBar({
    value,
    onChange,
    disableAutoComplete = false,
    className,
    size = "default",
}: SearchBarProps) {
    const toggleSearchType = () => {
        if (value.type === "class") {
            onChange({ type: "name", searchValue: value.searchValue });
        } else {
            onChange({ type: "class", searchValue: value.searchValue });
        }
    };
    const isHero = size === "hero";

    return (
        <SearchBase
            className={className}
            searchType={value.type}
            value={value}
            onChange={onChange}
            disableAutoComplete={disableAutoComplete}
            size={size}
            LeftSlot={
                <SearchToggle searchType={value.type} size={size} onClick={toggleSearchType} />
            }
            RightSlot={
                <Button
                    aria-label="Submit search"
                    className={cn(
                        "rounded-l-none rounded-r-full px-3 py-1!",
                        isHero ? "h-12 min-w-14 lg:h-14" : "h-10 min-w-11",
                    )}
                    type="submit"
                >
                    <ChevronRightIcon className={isHero ? "size-9" : "size-8"} aria-hidden />
                </Button>
            }
        />
    );
}

export function TruncatedSearchBar({
    onChange,
    disableAutoComplete = false,
    className,
    value,
    size = "default",
}: SearchBarProps) {
    const isHero = size === "hero";
    return (
        <SearchBase
            className={className}
            searchType="name"
            onChange={onChange}
            value={value}
            disableAutoComplete={disableAutoComplete}
            size={size}
            inputClassName="pl-0"
            LeftSlot={
                <div className={cn("rounded-l-full bg-card", isHero ? "h-12 w-6" : "h-10 w-5")} />
            }
            RightSlot={
                <div
                    className={cn(
                        "rounded-l-none rounded-r-full bg-card text-brand",
                        isHero ? "px-3 py-1" : "px-2 py-1",
                    )}
                >
                    <MagnifyingGlassIcon className={isHero ? "h-9 w-9" : "h-8 w-8"} />
                </div>
            }
        />
    );
}

interface SearchToggleProps extends React.ComponentProps<"div"> {
    searchType: ProfessorSearchType;
    size?: "default" | "hero";
}
function SearchToggle({
    searchType,
    size = "default",
    className = "",
    ...divProps
}: SearchToggleProps) {
    const checked = searchType === "class";
    const isHero = size === "hero";
    return (
        <div
            className={cn("cursor-pointer rounded-l-full bg-card", className)}
            {...divProps}
            role="checkbox"
            aria-checked={checked}
        >
            <div
                className={cn(
                    "relative flex items-center rounded-full border-2 border-brand",
                    isHero ? "h-12 lg:h-14" : "h-10",
                )}
            >
                <span
                    className={cn(
                        // inset-y-0 rather than a matching height: the wrapper's
                        // border-2 shrinks the content box, so a fixed h-10/h-12
                        // would spill over the border top and bottom.
                        "absolute inset-y-0 left-0 rounded-full bg-primary transition-all",
                        isHero ? "w-32" : "w-28",
                        checked ? "translate-x-full" : "translate-x-0",
                    )}
                />

                <span
                    className={cn(
                        "z-10 text-center select-none transition-all",
                        isHero ? "w-32 text-lg" : "w-28",
                        checked ? "text-brand" : "text-primary-foreground",
                    )}
                >
                    Professor
                </span>
                <span
                    className={cn(
                        "z-10 text-center select-none transition-all",
                        isHero ? "w-32 text-lg" : "w-28",
                        checked ? "text-primary-foreground" : "text-brand",
                    )}
                >
                    Course
                </span>
            </div>
        </div>
    );
}

interface SearchBaseProps {
    value: SearchState;
    onChange?: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    searchType: ProfessorSearchType;
    LeftSlot?: React.ReactNode;
    RightSlot?: React.ReactNode;
    className?: string;
    inputClassName?: string;
    size?: "default" | "hero";
}
function SearchBase({
    value,
    onChange,
    disableAutoComplete,
    searchType,
    LeftSlot,
    RightSlot,
    className = "",
    inputClassName = "",
    size = "default",
}: SearchBaseProps) {
    const { data: allProfessors } = trpc.professors.all.useQuery(undefined, {
        meta: { suppressGlobalErrorToast: true },
    });
    const navigate = useNavigate();
    const isHero = size === "hero";

    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        navigate(`/search/${searchType}?term=${encodeURIComponent(value.searchValue)}`);
    };

    const onAutoCompleteChange = ({
        inputValue,
        selection,
    }: {
        inputValue: string;
        // Using unknown since it should be a string but the generic is not being inferred
        selection?: string;
    }) => {
        if (onChange) {
            onChange({ type: searchType, searchValue: inputValue });
        }
        if (selection) {
            if (searchType === "name") {
                navigate(`/professor/${selection}`);
            } else {
                navigate(`/search/class?term=${encodeURIComponent(selection)}`);
            }
        }
    };

    const autoCompleteFilter = (value: string) => {
        // eslint-disable-next-line default-case
        switch (searchType) {
            case "name":
                return professorSearch(allProfessors ?? [], searchType, value).map((t) => ({
                    label: `${t.lastName}, ${t.firstName}`,
                    value: t.id,
                }));
            case "class": {
                const allCourses = new Set(allProfessors?.flatMap((t) => t.courses));
                return [...allCourses]
                    .filter((course) => course.includes(value.toUpperCase()))
                    .map((course) => ({ label: course, value: course }));
            }
            default: {
                throw new Error("Not all autocomplete cases handled");
            }
        }
    };

    const placeholderText = searchType === "name" ? "Professor Name" : "Course Number";

    return (
        <form
            className={cn("flex w-full min-w-0 justify-center sm:w-auto", className)}
            onSubmit={onFormSubmit}
        >
            {LeftSlot}
            <AutoComplete<NonNullable<typeof allProfessors>[0], string>
                onChange={(change) => onAutoCompleteChange(change)}
                inputClassName={cn(isHero && "text-xl placeholder:text-xl", inputClassName)}
                placeholder={placeholderText}
                items={allProfessors ?? []}
                filterFn={(_, inputValue) => autoCompleteFilter(inputValue)}
                label="Professor Auto-complete"
                inputValue={value.searchValue}
                className={cn(
                    "min-w-0 font-normal shadow-2xl",
                    isHero
                        ? "h-12 w-full text-xl sm:w-80 md:w-96 lg:h-14 lg:w-md xl:w-lg 2xl:w-xl"
                        : "h-10 w-full text-lg sm:w-60 xl:w-72 2xl:w-96",
                )}
                disableDropdown={disableAutoComplete ?? false}
            />
            {RightSlot}
        </form>
    );
}
