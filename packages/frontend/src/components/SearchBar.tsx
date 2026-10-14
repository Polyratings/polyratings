import { useNavigate } from "react-router";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { AutoComplete } from "./AutoComplete";
import { trpc } from "@/trpc";
import { ProfessorSearchType, professorSearch } from "@/utils/ProfessorSearch";
import { Button } from "./forms/Button";

export interface SearchState {
    type: ProfessorSearchType;
    searchValue: string;
}

export interface SearchBarProps {
    value: SearchState;
    onChange: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    className?: string;
}
export function SearchBar(props: Omit<SearchBarProps, "className">) {
    return (
        <>
            <ExtendedSearchBar {...props} className="mt-7 hidden sm:flex" />
            <TruncatedSearchBar {...props} className="mt-7 flex sm:hidden" />
        </>
    );
}

export function ExtendedSearchBar({
    value,
    onChange,
    disableAutoComplete = false,
    className,
}: SearchBarProps) {
    const toggleSearchType = () => {
        if (value.type === "class") {
            void onChange({ type: "name", searchValue: value.searchValue });
        } else {
            void onChange({ type: "class", searchValue: value.searchValue });
        }
    };

    return (
        <SearchBase
            className={className}
            searchType={value.type}
            value={value}
            onChange={onChange}
            disableAutoComplete={disableAutoComplete}
            LeftSlot={<SearchToggle searchType={value.type} onClick={toggleSearchType} />}
            RightSlot={
                <Button
                    aria-label="Submit search"
                    className="rounded-l-none rounded-r-full px-1 py-1!"
                    type="submit"
                >
                    <ChevronRightIcon className="h-8 w-8" aria-hidden />
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
}: SearchBarProps) {
    return (
        <SearchBase
            className={className}
            searchType="name"
            onChange={onChange}
            value={value}
            disableAutoComplete={disableAutoComplete}
            inputClassName="pl-0"
            LeftSlot={<div className="h-10 w-5 rounded-l-full bg-white" />}
            RightSlot={
                <div className="rounded-l-none rounded-r-full bg-white px-2 py-1 text-cal-poly-green">
                    <MagnifyingGlassIcon className="h-8 w-8" />
                </div>
            }
        />
    );
}

interface SearchToggleProps extends React.ComponentProps<"div"> {
    searchType: ProfessorSearchType;
}
function SearchToggle({ searchType, className = "", ...divProps }: SearchToggleProps) {
    const checked = searchType === "class";
    return (
        <div
            className={`cursor-pointer rounded-l-full bg-white ${className}`}
            {...divProps}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom dual-option toggle
            role="checkbox"
            aria-checked={checked}
        >
            <div className="relative flex h-10 items-center rounded-full border-2 border-cal-poly-green">
                <span
                    className={`absolute left-0 h-10 w-28 rounded-full bg-cal-poly-green transition-all ${
                        checked ? "translate-x-full" : "translate-x-0"
                    }`}
                />

                <span
                    className={`w-28 text-center select-none ${
                        checked ? "text-cal-poly-green" : "text-white"
                    } z-10 transition-all`}
                >
                    Professor
                </span>
                <span
                    className={`w-28 text-center select-none ${
                        checked ? "text-white" : "text-cal-poly-green"
                    } z-10 transition-all`}
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
}: SearchBaseProps) {
    const { data: allProfessors } = trpc.professors.all.useQuery(undefined, {
        meta: { suppressGlobalErrorToast: true },
    });
    const navigate = useNavigate();

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

    const placeholderText = searchType === "name" ? "Professor Name" : "Course Number";

    return (
        <form className={`flex justify-center ${className}`} onSubmit={onFormSubmit}>
            {LeftSlot}
            <AutoComplete<NonNullable<typeof allProfessors>[0], string>
                onChange={(change) => onAutoCompleteChange(change)}
                inputClassName={inputClassName}
                placeholder={placeholderText}
                items={allProfessors ?? []}
                filterFn={(_, inputValue) => autoCompleteFilter(inputValue)}
                label="Professor Auto-complete"
                inputValue={value.searchValue}
                className="h-10 w-60 text-lg font-normal shadow-2xl xl:w-72 2xl:w-96"
                disableDropdown={disableAutoComplete ?? false}
            />
            {RightSlot}
        </form>
    );
}
