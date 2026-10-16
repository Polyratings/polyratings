import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";
import {
    ProfessorCard,
    InlineQueryState,
    SearchBar,
    SearchState,
    Filters,
    PROFESSOR_CARD_HEIGHT_REM,
} from "@/components";
import { useTailwindBreakpoint } from "@/hooks";
import { professorSearch, ProfessorSearchType } from "@/utils/ProfessorSearch";
import {
    applyProfessorFilters,
    createDefaultFilterState,
    FilterState,
    getEvaluationDomain,
} from "@/utils/applyProfessorFilters";
import { trpc } from "@/trpc";
import { useLocationState } from "@/hooks/useLocationState";

export function Search() {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    const { searchType } = useParams<{ searchType: ProfessorSearchType }>();

    const loadedSearchTerm = {
        type: searchType || "name",
        searchValue: searchParams.get("term") ?? "",
    };
    const [searchState, setSearchState] = useLocationState<SearchState>(
        loadedSearchTerm,
        "searchState",
    );
    const previousFilters = location.state as FilterState | undefined;
    const [filterState, setFilterState] = useLocationState<FilterState>(
        previousFilters ?? createDefaultFilterState(),
        "filterState",
    );
    const {
        data: allProfessors,
        isPending: allProfessorsPending,
        error: allProfessorsError,
    } = trpc.professors.all.useQuery(undefined, { meta: { suppressGlobalErrorToast: true } });
    const searchResults = useMemo(
        () => professorSearch(allProfessors ?? [], searchState.type, searchState.searchValue),
        [allProfessors, searchState.type, searchState.searchValue],
    );
    const evaluationDomain = useMemo(() => getEvaluationDomain(allProfessors), [allProfessors]);
    const filteredProfessors = useMemo(
        () => applyProfessorFilters(searchResults, filterState),
        [searchResults, filterState],
    );
    const [mobileFiltersOpened, setMobileFiltersOpened] = useState(false);

    const mobileFilterBreakpoint = useTailwindBreakpoint({ xl: false }, true);

    // Provide a default value in case of running in a test environment or for some reason font-size is not defined
    const rootFontSize = parseFloat(
        window.getComputedStyle(document.body).getPropertyValue("font-size") || "16",
    );
    // TODO: Reflow height when window changes size
    const virtualScrollListHeight = PROFESSOR_CARD_HEIGHT_REM * rootFontSize;

    // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual returns unstable refs by design
    const rowVirtualizer = useWindowVirtualizer({
        count: filteredProfessors.length,
        estimateSize: () => virtualScrollListHeight,
        overscan: 5,
    });

    return (
        <div id="main">
            <SearchBar value={searchState} onChange={setSearchState} disableAutoComplete />
            {!allProfessorsPending && !allProfessors && allProfessorsError && (
                <InlineQueryState
                    error={allProfessorsError}
                    fallbackErrorMessage="Unable to load search data. Please try again."
                    errorClassName="text-2xl mt-5 text-center text-red-500"
                />
            )}
            {Boolean(allProfessors) && allProfessorsError && (
                <InlineQueryState
                    error={allProfessorsError}
                    fallbackErrorMessage="Unable to refresh search data. Showing last loaded results."
                    errorClassName="text-2xl mt-5 text-center text-red-500"
                />
            )}
            {allProfessorsPending && !allProfessors && (
                <InlineQueryState
                    isPending
                    loadingMessage="Loading search data..."
                    loadingClassName="text-2xl mt-5 text-center text-cal-poly-green"
                />
            )}
            {Boolean(allProfessors) && !searchResults.length && (
                <h2 className="mt-5 text-center text-4xl text-cal-poly-green">
                    No Results Found.
                    <br />
                    <Link className="pt-10 underline" to="/new-professor">
                        Add a Professor?
                    </Link>
                </h2>
            )}
            {Boolean(allProfessors) &&
                Boolean(searchResults.length) &&
                !filteredProfessors.length && (
                    <h2 className="mt-5 text-center text-4xl text-cal-poly-green">
                        Nothing matches these filters.
                    </h2>
                )}
            {Boolean(searchResults.length) && (
                <div className="relative">
                    {!mobileFilterBreakpoint && (
                        <Filters
                            value={filterState}
                            onChange={setFilterState}
                            evaluationDomain={evaluationDomain}
                            className="absolute top-0 left-0 hidden pl-12 xl:block"
                        />
                    )}

                    {/* Mobile Filters dropdown */}
                    {mobileFilterBreakpoint && (
                        <div
                            className={`fixed top-0 left-0 z-10 h-screen w-[calc(100vw-2rem)] transform bg-gray-300 transition-all ${mobileFiltersOpened ? "translate-x-0" : "-translate-x-full"}`}
                        >
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpened(!mobileFiltersOpened)}
                                data-testid="mobile-filters"
                                aria-label="Open Filters"
                                className={`absolute -right-8 h-12 w-8 bg-gray-400 transition-all ${
                                    mobileFiltersOpened
                                        ? "top-0 rounded-r-none"
                                        : "top-14 rounded-r"
                                } flex items-center justify-center`}
                            >
                                <ChevronDoubleRightIcon
                                    className={`h-6 w-6 transform transition-all ${
                                        mobileFiltersOpened ? "rotate-180" : "rotate-0"
                                    }`}
                                    strokeWidth={2}
                                />
                            </button>

                            <Filters
                                value={filterState}
                                onChange={setFilterState}
                                evaluationDomain={evaluationDomain}
                                className="w-4/5 pt-6 pl-12"
                            />
                        </div>
                    )}
                    <div
                        className="relative m-auto sm:w-150 md:w-2xl lg:w-150 2xl:w-2xl"
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const professor = filteredProfessors[virtualRow.index];
                            return (
                                <div
                                    key={professor.id}
                                    className="absolute top-0 left-0 my-4 w-full px-4"
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
        setPrevKey(location.key);
    }
    return <Search key={prevKey} />;
}
