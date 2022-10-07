import { useEffect, useRef, useState } from "react";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { useNavigate } from "react-router-dom";
import { AutoComplete } from "./AutoComplete";
import { trpc } from "@/trpc";
import { ProfessorSearchType, professorSearch } from "@/utils/ProfessorSearch";
import { Button } from "./forms/Button";

export interface SearchState {
    type: ProfessorSearchType;
    searchValue: string;
}

interface SearchBarProps {
    showOnlyInput: boolean;
    initialState?: SearchState;
    onChange?: (value: SearchState) => void | Promise<void>;
    disableAutoComplete?: boolean;
}
export function SearchBar({
    initialState,
    onChange,
    showOnlyInput,
    disableAutoComplete = false,
}: SearchBarProps) {
    const [searchValue, setSearchValue] = useState(initialState?.searchValue ?? "");
    const [searchType, setSearchType] = useState<ProfessorSearchType>(initialState?.type ?? "name");
    const formRef = useRef<HTMLFormElement>(null);
    const { data: allProfessors } = trpc.useQuery(["allProfessors"]);

    useEffect(() => {
        if (onChange) {
            onChange({ type: searchType, searchValue });
        }
    }, [searchValue, searchType]);

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
        selection?: unknown;
    }) => {
        setSearchValue(inputValue);
        if (selection) {
            navigate(`/professor/${selection}`);
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
            case "department":
                return DEPARTMENT_LIST.filter((dep) => dep.includes(value.toUpperCase())).map(
                    (dep) => ({ label: dep, value: undefined }),
                );
            case "class": {
                const allCourses = new Set(allProfessors?.flatMap((t) => t.courses));
                return [...allCourses]
                    .filter((course) => course.includes(value.toUpperCase()))
                    .map((course) => ({ label: course, value: undefined }));
            }
        }
        throw new Error("Not all autocomplete cases handled");
    };
    return (
        <form
            className="flex flex-col md:flex-row justify-center items-center py-6"
            onSubmit={onFormSubmit}
            ref={formRef}
        >
            <div className="flex">
                {showOnlyInput && (
                    <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as ProfessorSearchType)}
                        className="hidden md:block rounded w-40 mr-4 bg-gray-100 font-medium border-2 border-black"
                    >
                        <option value="name">Professor</option>
                        <option value="class">Class</option>
                        <option value="department">Department</option>
                    </select>
                )}

                <AutoComplete
                    onChange={(change) => onAutoCompleteChange(change)}
                    placeholder={`Enter a ${searchType}`}
                    items={allProfessors ?? []}
                    filterFn={(_, inputValue) => autoCompleteFilter(inputValue)}
                    label="Professor Auto-complete"
                    value={searchValue}
                    className="w-72 h-8 font-normal text-lg"
                    disableDropdown={disableAutoComplete}
                />
            </div>
            {showOnlyInput && (
                <Button className="!py-1 ml-5 mt-3 md:mt-0" type="submit">
                    Submit
                </Button>
            )}
        </form>
    );
}
