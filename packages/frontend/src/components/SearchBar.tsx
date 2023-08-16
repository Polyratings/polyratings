import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    initialState?: SearchState;
    onChange?: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    className?: string;
}
export function SearchBar(props: SearchBarProps) {
    return (
        <>
            <ExtendedSearchBar className="hidden sm:flex" {...props} />
            <TruncatedSearchBar {...props} className="flex sm:hidden" />
        </>
    );
}

export function ExtendedSearchBar({
    initialState,
    onChange,
    disableAutoComplete = false,
    className,
}: SearchBarProps) {
    const [searchType, setSearchType] = useState<ProfessorSearchType>(initialState?.type ?? "name");

    const switchSearchType = () => {
        if (searchType === "class") {
            setSearchType("name");
        } else {
            setSearchType("class");
        }
    };

    return (
        <SearchBase
            className={className}
            searchType={searchType}
            initialState={initialState}
            onChange={onChange}
            disableAutoComplete={disableAutoComplete}
            LeftSlot={<SearchToggle searchType={searchType} onClick={switchSearchType} />}
            RightSlot={
                <Button className="!py-1 rounded-l-none rounded-r-full px-1" type="submit">
                    <ChevronRightIcon className="w-8 h-8" />
                </Button>
            }
        />
    );
}

export function TruncatedSearchBar({
    onChange,
    disableAutoComplete = false,
    className,
    initialState,
}: SearchBarProps) {
    return (
        <SearchBase
            className={className}
            searchType="name"
            onChange={onChange}
            initialState={initialState}
            disableAutoComplete={disableAutoComplete}
            inputClassName="pl-0"
            LeftSlot={<div className="w-5 h-10 bg-white rounded-l-full" />}
            RightSlot={
                <div className="py-1 px-2 text-cal-poly-green rounded-l-none rounded-r-full bg-white">
                    <MagnifyingGlassIcon className="w-8 h-8" />
                </div>
            }
        />
    );
}

interface SearchToggleProps extends React.ComponentProps<"div"> {
    searchType: ProfessorSearchType;
}
function SearchToggle({ searchType, className = "", ...divProps }: SearchToggleProps) {
    const toggle = searchType === "class";
    return (
        <div className={`bg-white rounded-l-full cursor-pointer ${className}`} {...divProps}>
            <div className="flex items-center relative border-cal-poly-green border-2 rounded-full h-10">
                <span
                    className={`w-28 h-10 rounded-full bg-cal-poly-green absolute left-0 transition-all ${
                        toggle ? "translate-x-full" : "translate-x-0"
                    }`}
                />

                <span
                    className={`w-28 text-center select-none ${
                        toggle ? "text-cal-poly-green" : "text-white"
                    } transition-all z-10`}
                >
                    Professor
                </span>
                <span
                    className={`w-28 text-center select-none ${
                        toggle ? "text-white" : "text-cal-poly-green"
                    }  transition-all z-10`}
                >
                    Course
                </span>
            </div>
        </div>
    );
}

interface SearchBaseProps {
    initialState?: SearchState;
    onChange?: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    searchType: ProfessorSearchType;
    LeftSlot?: React.ReactChild;
    RightSlot?: React.ReactChild;
    className?: string;
    inputClassName?: string;
}
function SearchBase({
    initialState,
    onChange,
    disableAutoComplete,
    searchType,
    LeftSlot,
    RightSlot,
    className = "",
    inputClassName = "",
}: SearchBaseProps) {
    const [searchValue, setSearchValue] = useState(initialState?.searchValue ?? "");
    const formRef = useRef<HTMLFormElement>(null);
    const { data: allProfessors } = trpc.professors.all.useQuery();

    const navigate = useNavigate();

    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        navigate(`/search/${searchType}?term=${encodeURIComponent(searchValue)}`);
    };

    const onAutoCompleteChange = ({
        inputValue,
        selection,
    }: {
        inputValue: string;
        // Using unknown since it should be a string but the generic is not being inferred
        selection?: string;
    }) => {
        setSearchValue(inputValue);
        if (onChange) {
            onChange({ type: searchType, searchValue });
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
        }
        throw new Error("Not all autocomplete cases handled");
    };

    const placeholderText = searchType === "name" ? "Professor Name" : "Course Number";

    return (
        <form className={`flex justify-center ${className}`} onSubmit={onFormSubmit} ref={formRef}>
            {LeftSlot}
            <AutoComplete<NonNullable<typeof allProfessors>[0], string>
                onChange={(change) => onAutoCompleteChange(change)}
                inputClassName={inputClassName}
                placeholder={placeholderText}
                items={allProfessors ?? []}
                filterFn={(_, inputValue) => autoCompleteFilter(inputValue)}
                label="Professor Auto-complete"
                initialValue={searchValue}
                className="xl:w-72 w-[15rem] h-10 font-normal text-lg shadow-2xl"
                disableDropdown={disableAutoComplete ?? false}
            />
            {RightSlot}
        </form>
    );
}
