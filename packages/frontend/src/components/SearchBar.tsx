import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { DEPARTMENT_LIST } from "@polyratings/client";
import { TeacherSearchType, TeacherService } from "@/services/teacher.service";
import { AutoComplete, AutoCompleteOption } from ".";
import { useService } from "@/hooks";

export interface SearchState {
    type: TeacherSearchType;
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
    const [searchType, setSearchType] = useState<TeacherSearchType>(initialState?.type ?? "name");
    const teacherService = useService(TeacherService);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (onChange) {
            onChange({ type: searchType, searchValue });
        }
    }, [searchValue, searchType]);

    const history = useHistory();

    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        history.push(`/search/${searchType}?term=${encodeURIComponent(searchValue)}`);
    };

    const autoCompleteFilter = async (
        value: string,
    ): Promise<AutoCompleteOption<{ id: string } | undefined>[]> => {
        // eslint-disable-next-line default-case
        switch (searchType) {
            case "name":
                return teacherService.searchForTeacher(searchType, value).then((result) =>
                    result.map((t) => ({
                        display: `${t.lastName}, ${t.firstName}`,
                        metadata: { id: t.id },
                    })),
                );
            case "department":
                return DEPARTMENT_LIST.filter((dep) => dep.includes(value.toUpperCase())).map(
                    (dep) => ({ display: dep, metadata: undefined }),
                );
            case "class": {
                const allTeachers = await teacherService.getAllTeachers();
                const allCourses = new Set(allTeachers.flatMap((t) => t.courses));
                return [...allCourses]
                    .filter((course) => course.includes(value.toUpperCase()))
                    .map((course) => ({ display: course, metadata: undefined }));
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
                        onChange={(e) => setSearchType(e.target.value as TeacherSearchType)}
                        className="hidden md:block rounded w-40 mr-4 bg-gray-100 font-medium border-2 border-black"
                    >
                        <option value="name">Professor</option>
                        <option value="class">Class</option>
                        <option value="department">Department</option>
                    </select>
                )}

                <AutoComplete
                    onResult={async (value) => {
                        if (value.metadata) {
                            // Ensure teacher in the cache before loading
                            await teacherService.getTeacher(value.metadata.id);
                            history.push(`/professor/${value.metadata.id}`);
                        } else {
                            // Use timeout to let current value update and then trigger and then form submission
                            setTimeout(() => formRef.current?.requestSubmit());
                        }
                    }}
                    onChange={setSearchValue}
                    placeholder={`Enter a ${searchType}`}
                    filterFn={autoCompleteFilter}
                    maxDropDownSize={5}
                    value={searchValue}
                    className="w-72 h-8 font-normal text-lg"
                    disableDropdown={disableAutoComplete}
                />
            </div>
            {showOnlyInput && (
                <button
                    className="bg-cal-poly-green text-white rounded-md px-5 ml-5 h-8 mt-3 lg:mt-0"
                    type="submit"
                >
                    Submit
                </button>
            )}
        </form>
    );
}
