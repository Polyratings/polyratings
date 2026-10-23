import { useCallback, useMemo, type RefObject } from "react";
import { useNavigate } from "react-router";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { AutoComplete, type AutoCompleteOption } from "./AutoComplete";
import { trpc } from "@/trpc";
import { ProfessorSearchType, professorSearch } from "@/utils/ProfessorSearch";
import { Button } from "./forms";
import { cn } from "@/utils";

/** Cap autocomplete rows — full search page still ranks the complete list. */
const AUTOCOMPLETE_LIMIT = 40;

/** Visible placeholder for professor-name search (hero, navbar sheet, desktop bars). */
export const PROFESSOR_SEARCH_PLACEHOLDER = "Search professors";
/** Visible placeholder when the desktop bar is in course mode. */
export const COURSE_SEARCH_PLACEHOLDER = "Course Number";

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
    /** Show popover suggestions below `md` (desktop navbar mid-slot). */
    forceDropdown?: boolean;
    placeholder?: string;
    /**
     * Mobile truncated bar: open full-screen search instead of typing in the pill
     * (avoids soft-keyboard vs dropdown conflict). Desktop ExtendedSearchBar unchanged.
     * Pass the launch control so close can restore focus.
     */
    onMobileSearchOpen?: (opener?: HTMLElement) => void;
}

export interface FullScreenSearchProps {
    value: SearchState;
    onChange: (value: SearchState) => void | Promise<void>;
    placeholder?: string;
    /** Left of the input (optional; branding bar often owns the back control). */
    LeadingAction?: React.ReactNode;
    className?: string;
    /** Focus target for `openSearch` (must be set before the tap handler returns). */
    inputRef?: RefObject<HTMLInputElement>;
}

/**
 * Full-viewport search body: input + in-flow suggestions above the soft keyboard.
 */
export function FullScreenSearch({
    value,
    onChange,
    placeholder = PROFESSOR_SEARCH_PLACEHOLDER,
    LeadingAction,
    className,
    inputRef,
}: FullScreenSearchProps) {
    return (
        <SearchBase
            className={className}
            searchType="name"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            listPlacement="inline"
            LeadingAction={LeadingAction}
            inputRef={inputRef}
        />
    );
}
export function SearchBar({
    size = "default",
    onMobileSearchOpen,
    ...props
}: Omit<SearchBarProps, "className">) {
    const isHero = size === "hero";
    return (
        <>
            <ExtendedSearchBar
                {...props}
                size={size}
                // tall-sm: not bare `sm` — phone landscape is wide but short.
                className={cn("hidden tall-sm:flex", !isHero && "mt-5")}
            />
            <TruncatedSearchBar
                {...props}
                size={size}
                className={cn("flex w-full tall-sm:hidden", !isHero && "mt-5")}
                onMobileSearchOpen={onMobileSearchOpen}
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
    forceDropdown = false,
    placeholder,
    onMobileSearchOpen,
}: SearchBarProps) {
    const isHero = size === "hero";
    const launchFullScreen = Boolean(onMobileSearchOpen);
    const placeholderText = placeholder ?? PROFESSOR_SEARCH_PLACEHOLDER;

    // Button launch-pad (no input) so the first tap can focus the sheet field
    // without a competing hero caret — required for the iOS soft keyboard.
    if (launchFullScreen) {
        return (
            <button
                type="button"
                aria-label={placeholderText}
                className={cn(
                    "flex w-full min-w-0 items-stretch justify-center shadow-2xl sm:w-auto",
                    className,
                )}
                onClick={(event) => onMobileSearchOpen?.(event.currentTarget)}
            >
                <span
                    className={cn("rounded-l-full bg-card", isHero ? "h-12 w-6" : "h-10 w-5")}
                    aria-hidden
                />
                <span
                    className={cn(
                        "flex min-w-0 flex-1 items-center bg-card pl-0 text-left font-normal text-muted-foreground",
                        isHero
                            ? "h-12 w-full text-xl sm:w-80 md:w-96 lg:h-14 lg:w-md xl:w-lg 2xl:w-xl"
                            : fill
                              ? "h-10 w-full min-w-0 text-base sm:text-lg"
                              : "h-10 w-full text-lg sm:w-60 xl:w-72 2xl:w-96",
                    )}
                >
                    {placeholderText}
                </span>
                <span
                    className={cn(
                        "rounded-l-none rounded-r-full bg-card text-brand",
                        isHero ? "px-3 py-1" : "px-2 py-1",
                    )}
                    aria-hidden
                >
                    <MagnifyingGlassIcon className={isHero ? "h-9 w-9" : "h-8 w-8"} aria-hidden />
                </span>
            </button>
        );
    }

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
            inputClassName="pl-0"
            LeftSlot={
                <div className={cn("rounded-l-full bg-card", isHero ? "h-12 w-6" : "h-10 w-5")} />
            }
            RightSlot={
                <button
                    type="submit"
                    aria-label="Search"
                    className={cn(
                        "rounded-l-none rounded-r-full bg-card text-brand",
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
    listPlacement?: "popover" | "inline";
    LeadingAction?: React.ReactNode;
    inputReadOnly?: boolean;
    onInputFocus?: () => void;
    inputRef?: RefObject<HTMLInputElement>;
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
    listPlacement = "popover",
    LeadingAction,
    inputReadOnly = false,
    onInputFocus,
    inputRef,
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

    const courseOptions = useMemo(() => {
        const allCourses = new Set(allProfessors?.flatMap((professor) => professor.courses) ?? []);
        return [...allCourses].sort();
    }, [allProfessors]);

    const autoCompleteFilter = useCallback(
        (
            _items: NonNullable<typeof allProfessors>,
            inputValue: string,
        ): AutoCompleteOption<string>[] => {
            switch (searchType) {
                case "name":
                    return professorSearch(allProfessors ?? [], searchType, inputValue)
                        .slice(0, AUTOCOMPLETE_LIMIT)
                        .map((professor) => ({
                            label: `${professor.lastName}, ${professor.firstName}`,
                            value: professor.id,
                        }));
                case "class": {
                    const needle = inputValue.trim().toUpperCase();
                    if (!needle) {
                        return [];
                    }
                    return courseOptions
                        .filter((course) => course.includes(needle))
                        .slice(0, AUTOCOMPLETE_LIMIT)
                        .map((course) => ({ label: course, value: course }));
                }
                default: {
                    throw new Error("Not all autocomplete cases handled");
                }
            }
        },
        [allProfessors, courseOptions, searchType],
    );

    const placeholderText =
        placeholder ??
        (searchType === "name" ? PROFESSOR_SEARCH_PLACEHOLDER : COURSE_SEARCH_PLACEHOLDER);

    const inline = listPlacement === "inline";

    if (inline) {
        return (
            <form
                className={cn("flex min-h-0 w-full flex-1 flex-col", className)}
                onSubmit={onFormSubmit}
            >
                <AutoComplete<NonNullable<typeof allProfessors>[0], string>
                    onChange={(change) => onAutoCompleteChange(change)}
                    placeholder={placeholderText}
                    items={allProfessors ?? []}
                    filterFn={autoCompleteFilter}
                    label="Professor Auto-complete"
                    inputValue={value.searchValue}
                    className="flex min-h-0 w-full flex-1 flex-col font-normal"
                    disableDropdown={disableAutoComplete ?? false}
                    listPlacement="inline"
                    inputLeading={LeadingAction}
                    inputRef={inputRef}
                />
            </form>
        );
    }

    return (
        <form
            className={cn(
                "flex w-full min-w-0 justify-center sm:w-auto",
                // One shadow on the whole pill — per-segment shadows leave a seam at the chevron.
                "shadow-2xl",
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
                filterFn={autoCompleteFilter}
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
                inputReadOnly={inputReadOnly}
                onInputFocus={onInputFocus}
            />
            {RightSlot}
        </form>
    );
}
