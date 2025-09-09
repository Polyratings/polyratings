import { useNavigate } from "react-router";
import { AutoComplete } from "./AutoComplete";
import { trpc } from "@/trpc";
import { ProfessorSearchType, professorSearch } from "@/utils/ProfessorSearch";
import { ExtendedSearchBar } from "./ExtendedSearchBar";
import { TruncatedSearchBar } from "./TruncatedSearchBar";

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
            <ExtendedSearchBar {...props} className="hidden sm:flex mt-7" />
            <TruncatedSearchBar {...props} className="flex sm:hidden mt-7" />
        </>
    );
}

export interface SearchBaseProps {
    value: SearchState;
    onChange?: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
    searchType: ProfessorSearchType;
    LeftSlot?: React.ReactNode;
    RightSlot?: React.ReactNode;
    className?: string;
    inputClassName?: string;
}
export function SearchBase({
    value,
    onChange,
    disableAutoComplete,
    searchType,
    LeftSlot,
    RightSlot,
    className = "",
    inputClassName = "",
}: SearchBaseProps) {
    const { data: allProfessors } = trpc.professors.all.useQuery();
    const navigate = useNavigate();

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
                className="2xl:w-96 xl:w-72 w-60 h-10 font-normal text-lg shadow-2xl"
                disableDropdown={disableAutoComplete ?? false}
            />
            {RightSlot}
        </form>
    );
}
