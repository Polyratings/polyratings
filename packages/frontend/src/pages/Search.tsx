import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import {
    ProfessorCard,
    SearchBar,
    SearchState,
    Filters,
    PROFESSOR_CARD_HEIGHT_REM,
} from "@/components";
import { useTailwindBreakpoint } from "@/hooks";
import { professorSearch, ProfessorSearchType } from "@/utils/ProfessorSearch";
import { trpc } from "@/trpc";
import { useLocationState } from "@/hooks/useLocationState";

export function Search() {
    const [searchParams] = useSearchParams();

    const { searchType } = useParams<{ searchType: ProfessorSearchType }>();

    const loadedSearchTerm = {
        type: searchType || "name",
        searchValue: searchParams.get("term") ?? "",
    };
    const [searchState, setSearchState] = useLocationState<SearchState>(
        loadedSearchTerm,
        "searchState",
    );
    const { data: allProfessors } = trpc.professors.all.useQuery();
    const searchResults = professorSearch(
        allProfessors ?? [],
        searchState.type,
        searchState.searchValue,
    );
    const [mobileFiltersOpened, setMobileFiltersOpened] = useState(false);

    const [filteredProfessors, setFilteredProfessors] = useState<NonNullable<typeof allProfessors>>(
        [],
    );

    const mobileFilterBreakpoint = useTailwindBreakpoint({ xl: false }, true);

    // Provide a default value in case of running in a test environment or for some reason font-size is not defined
    const rootFontSize = parseFloat(
        window.getComputedStyle(document.body).getPropertyValue("font-size") || "16",
    );
    // TODO: Reflow height when window changes size
    const virtualScrollListHeight = PROFESSOR_CARD_HEIGHT_REM * rootFontSize;

    const rowVirtualizer = useWindowVirtualizer({
        count: filteredProfessors.length,
        estimateSize: () => virtualScrollListHeight,
        overscan: 5,
    });

    return (
        <div id="main">
            <SearchBar
                initialState={searchState}
                onChange={setSearchState}
                showOnlyInput
                disableAutoComplete
            />
            {(!searchResults.length || !filteredProfessors.length) && (
                <h2 className="text-cal-poly-green mt-5 text-center text-4xl">
                    No Results Found.
                    <br />
                    <Link className="pt-10 underline" to="/new-professor">
                        Add a Professor?
                    </Link>
                </h2>
            )}
            {Boolean(searchResults.length) && (
                <div className="relative">
                    {!mobileFilterBreakpoint && (
                        <Filters
                            // Use searchResults.length as key to force the child to re-render since it is an array
                            key={searchResults.length}
                            unfilteredProfessors={searchResults}
                            onUpdate={setFilteredProfessors}
                            className="absolute left-0 top-0 hidden pl-12 xl:block"
                        />
                    )}

                    {/* Mobile Filters dropdown */}
                    {mobileFilterBreakpoint && (
                        <div
                            className={`fixed left-0 top-0 z-10 h-screen w-[calc(100vw-2rem)] bg-gray-300 transition-all${mobileFiltersOpened ? "-translate-x-0" : "-translate-x-full"}`}
                        >
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpened(!mobileFiltersOpened)}
                                data-testid="mobile-filters"
                                className={`absolute -right-8 h-12 w-8 bg-gray-400 transition-all
                  ${
                      mobileFiltersOpened ? "top-0 rounded-r-none" : "top-14 rounded-r"
                  } flex items-center justify-center`}
                            >
                                <ChevronDoubleRightIcon
                                    className={`h-6 w-6 transition-all${
                                        mobileFiltersOpened ? "rotate-180" : "rotate-0"
                                    }`}
                                    strokeWidth={2}
                                />
                            </button>

                            <Filters
                                // Use searchResults.length as key to force the child to re-render since it is an array
                                key={searchResults.length}
                                unfilteredProfessors={searchResults}
                                onUpdate={setFilteredProfessors}
                                className="w-4/5 pl-12 pt-6"
                            />
                        </div>
                    )}
                    <div
                        className="relative m-auto sm:w-[37.5rem] md:w-[42rem] lg:w-[37.5rem] 2xl:w-[42rem]"
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const professor = filteredProfessors[virtualRow.index];
                            return (
                                <div
                                    key={professor.id}
                                    className="absolute left-0 top-0 my-4 w-full px-4"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <ProfessorCard professor={professor} />
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
// when a professor is clicked but still has the ability to clear state when the nav bar button is clicked
// This is an extension of ideas expressed in this thread:
// https://stackoverflow.com/questions/38839510/forcing-a-react-router-link-to-load-a-page-even-if-were-already-on-that-page
export function SearchWrapper() {
    const [prevKey, setPrevKey] = useState("");
    const location = useLocation();
    if (!location.state && location.key && prevKey !== location.key) {
        setPrevKey(location.key || `${Date.now()}`);
    }
    return <Search key={prevKey} />;
}
