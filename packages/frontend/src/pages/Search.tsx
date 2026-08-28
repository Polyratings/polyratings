import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { XIcon } from "lucide-react";
import {
    ProfessorCard,
    PageMeta,
    InlineQueryState,
    SearchBar,
    SearchState,
    Filters,
    PROFESSOR_CARD_HEIGHT_REM,
    StaticPageHeader,
    Button,
} from "@/components";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useTailwindBreakpoint } from "@/hooks";
import { professorSearch, ProfessorSearchType } from "@/utils/ProfessorSearch";
import {
    applyProfessorFilters,
    createDefaultFilterState,
    FilterState,
    getEvaluationDomain,
    hasActiveFilterState,
} from "@/utils/applyProfessorFilters";
import { trpc } from "@/trpc";
import { cn } from "@/utils";
import { useLocationState } from "@/hooks/useLocationState";

function getAppScrollElement() {
    return document.getElementById("app-scroll");
}

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
    const virtualScrollListHeight = PROFESSOR_CARD_HEIGHT_REM * rootFontSize;

    const rowVirtualizer = useVirtualizer({
        count: filteredProfessors.length,
        estimateSize: () => virtualScrollListHeight,
        getScrollElement: getAppScrollElement,
        overscan: 8,
    });

    return (
        <div id="main" tabIndex={-1} className="relative outline-none">
            <PageMeta
                title="Professor list"
                description="Search Cal Poly professor ratings by name or class and filter by department, course, and score."
                path={`/search/${searchType || "name"}`}
            />
            <div
                className={cn(
                    "mx-auto grid w-full max-w-5xl gap-y-5 px-4 pb-10",
                    "xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-x-8",
                )}
            >
                <div
                    className={cn(
                        "mx-auto mt-8 w-full max-w-2xl",
                        "xl:col-span-2 xl:mx-0 xl:max-w-none",
                    )}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <StaticPageHeader className="mb-0 md:mb-0">Professor list</StaticPageHeader>
                        <div className="flex items-center justify-between gap-3 sm:mb-1">
                            <p className="text-sm text-muted-foreground">
                                Showing {filteredProfessors.length} of {searchResults.length}{" "}
                                {searchResults.length === 1 ? "professor" : "professors"}
                            </p>
                            {mobileFilterBreakpoint && (
                                <Sheet
                                    modal={false}
                                    open={mobileFiltersOpened}
                                    onOpenChange={setMobileFiltersOpened}
                                >
                                    <SheetTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            data-testid="mobile-filters"
                                            aria-label="Open Filters"
                                            className="h-11 shrink-0 px-4"
                                        >
                                            Filters
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="bottom"
                                        showCloseButton={false}
                                        overlayClassName="top-14"
                                        className="max-h-screen-wo-nav gap-0 overflow-y-auto rounded-t-xl bg-background p-0"
                                    >
                                        <SheetHeader
                                            className={cn(
                                                "grid grid-cols-[1fr_auto_1fr] items-center gap-2",
                                                "border-b border-border p-2 pr-2 pl-3",
                                            )}
                                        >
                                            <div className="justify-self-start">
                                                {hasActiveFilterState(filterState) && (
                                                    <button
                                                        className="h-11 px-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                                                        type="button"
                                                        onClick={() =>
                                                            setFilterState(
                                                                createDefaultFilterState(),
                                                            )
                                                        }
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                            </div>
                                            <SheetTitle className="text-center">Filters</SheetTitle>
                                            <div className="justify-self-end">
                                                <SheetClose asChild>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "grid size-11 place-items-center rounded-md",
                                                            "hover:bg-muted focus-visible:outline-hidden",
                                                            "focus-visible:ring-3 focus-visible:ring-ring/35",
                                                        )}
                                                    >
                                                        <XIcon className="size-5" />
                                                        <span className="sr-only">Close</span>
                                                    </button>
                                                </SheetClose>
                                            </div>
                                        </SheetHeader>
                                        <Filters
                                            value={filterState}
                                            onChange={setFilterState}
                                            evaluationDomain={evaluationDomain}
                                            showHeading={false}
                                            className="rounded-none border-0 shadow-none"
                                        />
                                    </SheetContent>
                                </Sheet>
                            )}
                        </div>
                    </div>
                    <SearchBar value={searchState} onChange={setSearchState} disableAutoComplete />
                </div>

                {!mobileFilterBreakpoint && (
                    <Filters
                        value={filterState}
                        onChange={setFilterState}
                        evaluationDomain={evaluationDomain}
                        className="hidden xl:col-start-1 xl:row-start-2 xl:block xl:w-full xl:self-start"
                    />
                )}

                <main
                    className={cn(
                        "mx-auto w-full max-w-2xl",
                        "xl:col-start-2 xl:row-start-2 xl:mx-0 xl:min-w-0 xl:max-w-none",
                    )}
                >
                    {!allProfessorsPending && !allProfessors && allProfessorsError && (
                        <InlineQueryState
                            error={allProfessorsError}
                            fallbackErrorMessage="Unable to load search data. Please try again."
                            errorClassName="text-2xl text-center text-red-500"
                        />
                    )}
                    {Boolean(allProfessors) && allProfessorsError && (
                        <InlineQueryState
                            error={allProfessorsError}
                            fallbackErrorMessage="Unable to refresh search data. Showing last loaded results."
                            errorClassName="text-2xl text-center text-red-500"
                        />
                    )}
                    {allProfessorsPending && !allProfessors && (
                        <InlineQueryState
                            isPending
                            loadingMessage="Loading search data..."
                            loadingClassName="text-2xl text-center text-brand"
                        />
                    )}
                    {Boolean(allProfessors) && !searchResults.length && (
                        <h2 className="text-center text-4xl font-semibold tracking-tight text-brand">
                            No Results Found.
                            <br />
                            <Link className="underline pt-10" to="/new-professor">
                                Add a Professor?
                            </Link>
                        </h2>
                    )}
                    {Boolean(allProfessors) &&
                        Boolean(searchResults.length) &&
                        !filteredProfessors.length && (
                            <h2 className="text-center text-4xl font-semibold tracking-tight text-brand">
                                Nothing matches these filters.
                            </h2>
                        )}
                    {Boolean(searchResults.length) && Boolean(filteredProfessors.length) && (
                        <section aria-label="Professor results">
                            <div
                                className="relative"
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const professor = filteredProfessors[virtualRow.index];
                                    return (
                                        <div
                                            key={professor.id}
                                            className="absolute top-0 left-0 w-full"
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
                        </section>
                    )}
                </main>
            </div>
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
