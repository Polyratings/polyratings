import { useHistory, useParams } from "react-router-dom";
import { useState, useEffect, useRef, ElementRef } from "react";
import { Teacher } from "@polyratings/client";
import { WindowScroller } from "fish-react-virtualized/dist/commonjs/WindowScroller";
import { List } from "fish-react-virtualized/dist/commonjs/List";
import { Location } from "history";
import { TeacherService, Logger } from "@/services";
import {
    TeacherCard,
    SearchBar,
    SearchState,
    Filters,
    TEACHER_CARD_HEIGHT_REM,
    FilterState,
} from "@/components";
import { useService, useQuery, useTailwindBreakpoint } from "@/hooks";
import { TeacherSearchType } from "@/services/teacher.service";

export interface SearchPageState {
    searchTerm: SearchState;
}

export interface SearchPageProps {
    location: Location;
}

export function Search({ location }: SearchPageProps) {
    const previousState = location.state as SearchPageState | undefined;
    const query = useQuery();

    const navigatedSearchTerm = query.get("term");
    const { searchType } = useParams<{ searchType: TeacherSearchType | undefined }>();

    const teacherService = useService(TeacherService);

    const loadedSearchTerm = previousState?.searchTerm ?? {
        type: searchType || "name",
        searchValue: navigatedSearchTerm ?? "",
    };
    const [searchState, setSearchState] = useState<SearchState>(loadedSearchTerm);
    const [searchResults, setSearchResults] = useState<Teacher[]>([]);
    const [mobileFiltersOpened, setMobileFiltersOpened] = useState(false);

    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
    const ref = useRef<ElementRef<typeof Filters>>(null);

    const history = useHistory();
    // This saves the current state of the filters by replacing the current route
    // with one with the state object to recreate if it gets popped off the history stack
    const saveState = () => {
        if (!ref.current) {
            return;
        }
        const currentState: SearchPageState & FilterState = {
            searchTerm: searchState,
            // the ref will have to be defined at this state
            ...ref.current.getState(),
        };
        history.replace(location.pathname, currentState);
    };

    // If we remove the filters from the dom we can use one ref and simplify the process of restoring state when re-visiting route
    const mobileFilterBreakpoint = useTailwindBreakpoint({ xl: false }, true);

    useEffect(() => {
        async function retrieveSearchData() {
            try {
                const result: Teacher[] = await teacherService.searchForTeacher(
                    searchState.type,
                    searchState.searchValue,
                );
                setSearchResults(result);
            } catch (e) {
                const logger = useService(Logger);
                logger.error(`Failed to search for teacher with term: ${searchState}`, e);
                history.push("/");
            }
        }
        retrieveSearchData();
    }, [searchState]);

    // Provide a default value in case of running in a test environment or for some reason font-size is not defined
    const rootFontSize = parseFloat(
        window.getComputedStyle(document.body).getPropertyValue("font-size") || "16",
    );
    // TODO: Reflow height when window changes size
    const virtualScrollListHeight = TEACHER_CARD_HEIGHT_REM * rootFontSize;
    const listWidth = useTailwindBreakpoint(
        {
            sm: 37.5 * rootFontSize,
            md: 42 * rootFontSize,
            lg: 37.5 * rootFontSize,
            "2xl": 42 * rootFontSize,
        },
        window.innerWidth - 20,
    );

    return (
        <div id="main">
            <SearchBar
                initialState={searchState}
                onChange={setSearchState}
                showOnlyInput
                disableAutoComplete
            />
            {(!searchResults.length || !filteredTeachers.length) && (
                <h1 className="text-4xl mt-5 text-center text-cal-poly-green">No Results Found</h1>
            )}
            {Boolean(searchResults.length) && (
                <div className="relative">
                    {!mobileFilterBreakpoint && (
                        <Filters
                            ref={ref}
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
                            <button
                                type="button"
                                aria-expanded={mobileFiltersOpened}
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
                            </button>

                            <Filters
                                ref={ref}
                                teachers={searchResults}
                                onUpdate={setFilteredTeachers}
                                className="pl-12 pt-6 w-4/5"
                            />
                        </div>
                    )}
                    <div className="flex justify-center">
                        <WindowScroller>
                            {({ height, isScrolling, onChildScroll, scrollTop }) => (
                                <List
                                    autoHeight
                                    height={height}
                                    isScrolling={isScrolling}
                                    onScroll={onChildScroll}
                                    rowCount={
                                        filteredTeachers.length < 8 ? 8 : filteredTeachers.length
                                    }
                                    rowHeight={virtualScrollListHeight}
                                    scrollTop={scrollTop}
                                    width={listWidth}
                                    // eslint-disable-next-line react/no-unstable-nested-components
                                    rowRenderer={({ style, key, index }) => (
                                        <div key={key} className="my-4" style={style}>
                                            {filteredTeachers[index] && (
                                                <TeacherCard
                                                    teacher={filteredTeachers[index]}
                                                    beforeNavigation={saveState}
                                                />
                                            )}
                                        </div>
                                    )}
                                />
                            )}
                        </WindowScroller>
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
    return <Search location={location} key={prevKey} />;
}
