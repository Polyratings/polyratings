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
    /** Stretch to the parent width (navbar mid-slot) instead of fixed sm+ widths. */
    fill?: boolean;
    /** Show suggestions below `md` (used by the navbar search panel). */
    forceDropdown?: boolean;
    placeholder?: string;
    /** Extra classes for the suggestion list panel (e.g. taller overlay lists). */
    listClassName?: string;
    /** Focus the combobox when mounted (mobile overlay). */
    focusOnMount?: boolean;
    /** Stretch suggestions to the full search pill width with larger tap targets. */
    listMatchForm?: boolean;
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
            void onChange({ type: "name", searchValue: value.searchValue });
        } else {
            void onChange({ type: "class", searchValue: value.searchValue });
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
                    aria-label="Search"
                    className={cn(
                        // Button defaults use bg-clip-padding + transparent border, which leaves a
                        // 1px hero-photo "cap" seam against the input — fill the border box instead.
                        "rounded-l-none rounded-r-full border-0 bg-clip-border px-3 py-1! shadow-none",
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
    fill = false,
    // Mobile/truncated bar: show suggestions by default (desktop ExtendedSearchBar already does).
    forceDropdown = true,
    placeholder,
    listClassName,
    focusOnMount = false,
    listMatchForm = true,
}: SearchBarProps) {
    const isHero = size === "hero";
    return (
        <SearchBase
            className={cn(fill && "w-full sm:w-full", className)}
            searchType="name"
            onChange={onChange}
            value={value}
            disableAutoComplete={disableAutoComplete}
            size={size}
            fill={fill}
            forceDropdown={forceDropdown}
            placeholder={placeholder}
            listClassName={listClassName}
            focusOnMount={focusOnMount}
            listMatchForm={listMatchForm}
            inputClassName="pl-0"
            LeftSlot={
                <div className={cn("rounded-l-full bg-card", isHero ? "h-12 w-6" : "h-10 w-5")} />
            }
            RightSlot={
                <button
                    type="submit"
                    aria-label="Search"
                    className={cn(
                        "rounded-l-none rounded-r-full bg-card text-brand -ml-px",
                        "hover:bg-muted focus-visible:outline-hidden",
                        "focus-visible:ring-3 focus-visible:ring-ring/35",
                        isHero ? "px-3 py-1" : "px-2 py-1",
                    )}
                >
                    <MagnifyingGlassIcon className={isHero ? "h-9 w-9" : "h-8 w-8"} aria-hidden />
                </button>
            }
        />
    );
}

interface SearchToggleProps extends React.ComponentProps<"button"> {
    searchType: ProfessorSearchType;
    size?: "default" | "hero";
}
function SearchToggle({
    searchType,
    size = "default",
    className = "",
    onClick,
    ...buttonProps
}: SearchToggleProps) {
    const checked = searchType === "class";
    const isHero = size === "hero";
    return (
        <button
            type="button"
            className={cn("cursor-pointer rounded-l-full bg-card", className)}
            {...buttonProps}
            aria-pressed={checked}
            onClick={onClick}
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
        </button>
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
    fill?: boolean;
    forceDropdown?: boolean;
    placeholder?: string;
    listClassName?: string;
    focusOnMount?: boolean;
    listMatchForm?: boolean;
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
    fill = false,
    forceDropdown = false,
    placeholder,
    listClassName,
    focusOnMount = false,
    listMatchForm = false,
}: SearchBaseProps) {
    const { data: allProfessors } = trpc.professors.all.useQuery(undefined, {
        meta: { suppressGlobalErrorToast: true },
    });
    const navigate = useNavigate();
    const isHero = size === "hero";

    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void navigate(`/search/${searchType}?term=${encodeURIComponent(value.searchValue)}`);
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
            void onChange({ type: searchType, searchValue: inputValue });
        }
        if (selection) {
            if (searchType === "name") {
                void navigate(`/professor/${selection}`);
            } else {
                void navigate(`/search/class?term=${encodeURIComponent(selection)}`);
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

    const placeholderText =
        placeholder ?? (searchType === "name" ? "Professor Name" : "Course Number");

    return (
        <form
            className={cn(
                "flex w-full min-w-0 justify-center sm:w-auto",
                // One shadow on the whole pill — per-segment shadows leave a seam at the chevron.
                "shadow-2xl",
                listMatchForm && "relative",
                className,
            )}
            onSubmit={onFormSubmit}
        >
            {LeftSlot}
            <AutoComplete<NonNullable<typeof allProfessors>[0], string>
                onChange={(change) => onAutoCompleteChange(change)}
                inputClassName={cn(
                    // Strip form-field chrome — Left/Right slots compose the search pill.
                    "h-full rounded-none border-0 bg-card px-2 shadow-none",
                    "focus-visible:border-transparent focus-visible:bg-card focus-visible:ring-0",
                    "dark:bg-card dark:focus-visible:bg-card",
                    isHero
                        ? "text-xl placeholder:text-xl md:text-xl"
                        : "text-lg placeholder:text-lg md:text-lg",
                    inputClassName,
                )}
                placeholder={placeholderText}
                items={allProfessors ?? []}
                filterFn={(_, inputValue) => autoCompleteFilter(inputValue)}
                label="Professor Auto-complete"
                inputValue={value.searchValue}
                className={cn(
                    "min-w-0 rounded-none bg-card font-normal shadow-none",
                    isHero
                        ? "h-12 w-full text-xl sm:w-80 md:w-96 lg:h-14 lg:w-md xl:w-lg 2xl:w-xl"
                        : fill
                          ? "h-10 w-full min-w-0 text-base sm:text-lg"
                          : "h-10 w-full text-lg sm:w-60 xl:w-72 2xl:w-96",
                )}
                disableDropdown={disableAutoComplete ?? false}
                forceDropdown={forceDropdown}
                listClassName={listClassName}
                focusOnMount={focusOnMount}
                listMatchForm={listMatchForm}
            />
            {RightSlot}
        </form>
    );
}
