import { useParams } from "react-router-dom";
import { useState } from "react";
import { Location } from "history";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
    TeacherCard,
    SearchBar,
    SearchState,
    Filters,
    TEACHER_CARD_HEIGHT_REM,
} from "@/components";
import { useQuery, useTailwindBreakpoint } from "@/hooks";
import { professorSearch, ProfessorSearchType } from "@/utils/ProfessorSearch";
import { inferQueryOutput, trpc } from "@/trpc";
import { useHistoryState } from "@/hooks/useHistoryState";

export interface SearchPageProps {
    location: Location;
}

type Teacher = inferQueryOutput<"allProfessors">[0];

export function Search() {
    const query = useQuery();

    const navigatedSearchTerm = query.get("term");
    const { searchType } = useParams<{ searchType: ProfessorSearchType | undefined }>();

    const loadedSearchTerm = {
        type: searchType || "name",
        searchValue: navigatedSearchTerm ?? "",
    };
    const [searchState, setSearchState] = useHistoryState<SearchState>(
        loadedSearchTerm,
        "searchState",
    );
    const { data: allProfessors } = trpc.useQuery(["allProfessors"]);
    const searchResults = professorSearch(
        allProfessors ?? [],
        searchState.type,
        searchState.searchValue,
    );
    const [mobileFiltersOpened, setMobileFiltersOpened] = useState(false);

    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);

    // If we remove the filters from the dom we can use one ref and simplify the process of restoring state when re-visiting route
    const mobileFilterBreakpoint = useTailwindBreakpoint({ xl: false }, true);

    // Provide a default value in case of running in a test environment or for some reason font-size is not defined
    const rootFontSize = parseFloat(
        window.getComputedStyle(document.body).getPropertyValue("font-size") || "16",
    );
    // TODO: Reflow height when window changes size
    const virtualScrollListHeight = TEACHER_CARD_HEIGHT_REM * rootFontSize;

    const rowVirtualizer = useWindowVirtualizer({
        count: filteredTeachers.length,
        estimateSize: () => virtualScrollListHeight,
        overscan: 5,
    });

    return (
        <div className="">
            <SearchBar
                initialState={searchState}
                onChange={setSearchState}
                showOnlyInput
                disableAutoComplete
            />
            {(!searchResults.length || !filteredTeachers.length) && (
                <h1 className="text-4xl mt-5 text-center text-cal-poly-green">
                    No Results Found.{" "}
                    <Link className="underline" to="/new-teacher">
                        Add a Professor?
                    </Link>
                </h1>
            )}
            {Boolean(searchResults.length) && (
                <div className="relative">
                    {!mobileFilterBreakpoint && (
                        <Filters
                            teachers={searchResults}
                            onUpdate={setFilteredTeachers}
                            className="absolute left-0 top-0 pl-12 hidden xl:block"
                        />
                    )}

                    {/* Mobile Filters dropdown */}
                    {mobileFilterBreakpoint && (
                        <div
                            className={`bg-gray-300 w-[calc(100vw-2rem)] h-screen fixed top-0 z-10 transition-all left-0 transform
              ${mobileFiltersOpened ? "-translate-x-0" : "-translate-x-full"}`}
                        >
                            <div
                                onClick={() => setMobileFiltersOpened(!mobileFiltersOpened)}
                                data-testid="mobile-filters"
                                className={`bg-gray-400 w-8 h-12 absolute -right-8 transition-all
                  ${
                      mobileFiltersOpened ? "top-0 rounded-r-none" : "top-14 rounded-r"
                  } flex items-center justify-center`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-6 w-6 transform transition-all ${
                                        mobileFiltersOpened ? "rotate-180" : "rotate-0"
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                    />
                                </svg>
                            </div>

                            <Filters
                                teachers={searchResults}
                                onUpdate={setFilteredTeachers}
                                className="pl-12 pt-6 w-4/5"
                            />
                        </div>
                    )}
                    <div
                        className="relative sm:w-[37.5rem] md:w-[42rem] lg:w-[37.5rem] 2xl:w-[42rem] m-auto"
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
                            const professor = filteredTeachers[index];
                            return (
                                <div
                                    key={professor.id}
                                    className="absolute top-0 left-0 w-full my-4 px-4"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {filteredTeachers[index] && (
                                        <TeacherCard teacher={filteredTeachers[index]} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// This function Wraps the Search page so that it has the ability to swap out the page state
// when a teacher is clicked but still has the ability to clear state when the nav bar button is clicked
// This is an extension of ideas expressed in this thread:
// https://stackoverflow.com/questions/38839510/forcing-a-react-router-link-to-load-a-page-even-if-were-already-on-that-page
export function SearchWrapper({ location }: SearchPageProps) {
    const [prevKey, setPrevKey] = useState("");
    if (!location.state && location.key && prevKey !== location.key) {
        setPrevKey(location.key || `${Date.now()}`);
    }
    return <Search key={prevKey} />;
}
