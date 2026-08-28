import { Fragment, useState } from "react";
import { Professor, RatingReport, TruncatedProfessor } from "@backend/types/schema";
import { useQueryClient } from "@tanstack/react-query";
import { Department, DEPARTMENT_LIST } from "@backend/utils/const";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks";
import { trpc } from "@/trpc";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { AutoComplete, Button, InlineQueryState, PageMeta, Select, TextInput } from "@/components";
import { Button as UiButton } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { professorSearch } from "@/utils/ProfessorSearch";
import { cn, getApiErrorMessage, toSelectOptions } from "@/utils";

/** Same default page size as react-data-table-component; prev/next only (no per-page selector). */
const ADMIN_TABLE_PAGE_SIZE = 10;

function createAdminMutationErrorHandler(action: string) {
    return (error: unknown) => {
        toast.error(getApiErrorMessage(error, `Failed to ${action}.`));
    };
}

function getAdminTablePage<T>(rows: T[], page: number) {
    const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_TABLE_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pageCount - 1);
    const start = currentPage * ADMIN_TABLE_PAGE_SIZE;
    return {
        pageRows: rows.slice(start, start + ADMIN_TABLE_PAGE_SIZE),
        pageCount,
        currentPage,
        total: rows.length,
    };
}

function AdminTablePagination({
    total,
    page,
    pageCount,
    onPrevious,
    onNext,
}: {
    total: number;
    page: number;
    pageCount: number;
    onPrevious: () => void;
    onNext: () => void;
}) {
    const start = total === 0 ? 0 : page * ADMIN_TABLE_PAGE_SIZE + 1;
    const end = Math.min(total, (page + 1) * ADMIN_TABLE_PAGE_SIZE);

    return (
        <div className="flex items-center justify-end gap-3 px-2 py-2 text-sm text-foreground">
            <span>{total === 0 ? "0 of 0" : `${start}–${end} of ${total}`}</span>
            <UiButton
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0 || total === 0}
                onClick={onPrevious}
            >
                Previous
            </UiButton>
            <UiButton
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1 || total === 0}
                onClick={onNext}
            >
                Next
            </UiButton>
        </div>
    );
}

function AdminTableEmptyRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
                There are no records to display
            </TableCell>
        </TableRow>
    );
}

export function Admin() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return (
        <div id="main" tabIndex={-1} className="outline-none">
            <PageMeta title="Admin" description="Polyratings admin tools." path="/admin" noindex />
            <h1 className="text-center text-6xl font-semibold my-4">Polyratings Admin Panel</h1>
            <div className="container m-auto text-lg">
                <PendingProfessors />
                <ReportedRatings />
                <ProcessedRatings />
            </div>
        </div>
    );
}

function findProfessor(professors: Professor[] | undefined, professorId: string) {
    return professors?.find((professor) => professor.id === professorId);
}

function findRating(professor: Professor | undefined, ratingId: string) {
    return Object.values(professor?.reviews ?? {})
        .flat()
        .find((rating) => rating.id === ratingId);
}

function ReportedRatings() {
    const {
        data: ratingReports,
        isPending: reportsPending,
        error: reportsError,
    } = useDbValues("reports");
    const {
        data: professorsResult,
        isPending: professorsPending,
        error: professorsError,
    } = trpc.admin.getProfessors.useQuery(
        {
            ids: ratingReports?.map((report) => report.professorId) ?? [],
        },
        { meta: { suppressGlobalErrorToast: true } },
    );
    const professors = professorsResult?.professors;
    const queryClient = useQueryClient();
    const { mutate: removeReport } = trpc.admin.removeReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
        onError: createAdminMutationErrorHandler("dismiss this report"),
    });
    const { mutate: actOnReport } = trpc.admin.actOnReport.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("reports") }),
        onError: createAdminMutationErrorHandler("remove the reported rating"),
    });
    const [page, setPage] = useState(0);

    const reportsBlocked = !ratingReports && (reportsPending || Boolean(reportsError));
    const professorsBlocked = !professorsResult && (professorsPending || Boolean(professorsError));

    if (reportsBlocked || professorsBlocked) {
        return (
            <InlineQueryState
                title="Reported Ratings:"
                titleClassName="ml-1"
                isPending={reportsPending || professorsPending}
                error={reportsError ?? professorsError}
                loadingMessage="Loading reported ratings..."
                fallbackErrorMessage="Unable to load reported ratings. Please try again."
            />
        );
    }

    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(
        ratingReports ?? [],
        page,
    );

    return (
        <div className="mt-4">
            {(reportsError || professorsError) && (
                <InlineQueryState
                    error={reportsError ?? professorsError}
                    fallbackErrorMessage="Unable to refresh reported ratings. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Reported Ratings:</h2>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <Table aria-label="Reported Ratings">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Professor</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Rating By</TableHead>
                            <TableHead>Keep</TableHead>
                            <TableHead>Remove</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow colSpan={7} />
                        ) : (
                            pageRows.map((row: RatingReport) => {
                                const professor = findProfessor(professors, row.professorId);
                                const rating = findRating(professor, row.ratingId);
                                return (
                                    <TableRow key={row.ratingId}>
                                        <TableCell>
                                            {professor
                                                ? `${professor.lastName}, ${professor.firstName}`
                                                : "Professor record missing"}
                                        </TableCell>
                                        <TableCell>{professor?.department ?? ""}</TableCell>
                                        <TableCell className="max-w-sm whitespace-normal">
                                            <div className="flex flex-col w-full">
                                                {row.reports.map((report, idx) => (
                                                    <Fragment
                                                        // Need to use index to help out with making each key unique
                                                        // eslint-disable-next-line react/no-array-index-key
                                                        key={idx + report.reason + report.email}
                                                    >
                                                        {idx !== 0 && (
                                                            <div className="w-full h-1 bg-border my-2" />
                                                        )}
                                                        {report.anonymousIdentifier && (
                                                            <div>
                                                                Submitted By:{" "}
                                                                {report.anonymousIdentifier}
                                                            </div>
                                                        )}
                                                        {report.email && (
                                                            <div>Email: {report.email}</div>
                                                        )}
                                                        <div>Reason: {report.reason}</div>
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-lg whitespace-normal">
                                            {rating?.rating ?? ""}
                                        </TableCell>
                                        <TableCell>{rating?.anonymousIdentifier ?? ""}</TableCell>
                                        <TableCell>
                                            <ConfirmationButton
                                                action={() => removeReport(row.ratingId)}
                                                buttonClassName="p-2 bg-primary text-primary-foreground rounded-sm"
                                                buttonText="K"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <ConfirmationButton
                                                action={() => actOnReport(row.ratingId)}
                                                buttonClassName="p-2 bg-destructive text-white rounded-sm"
                                                buttonText="R"
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <AdminTablePagination
                    total={total}
                    page={currentPage}
                    pageCount={pageCount}
                    onPrevious={() => setPage(currentPage - 1)}
                    onNext={() => setPage(currentPage + 1)}
                />
            </div>
        </div>
    );
}

function PendingProfessors() {
    const { data: pendingProfessors, isPending, error } = useDbValues("professor-queue");
    const queryClient = useQueryClient();
    const { mutate: approvePendingProfessor } = trpc.admin.approvePendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        onError: createAdminMutationErrorHandler("approve pending professor"),
    });
    const { mutate: rejectPendingProfessor } = trpc.admin.rejectPendingProfessor.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        onError: createAdminMutationErrorHandler("reject pending professor"),
    });
    const [page, setPage] = useState(0);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

    if (!pendingProfessors && (error || isPending)) {
        return (
            <InlineQueryState
                title="Pending Professors:"
                titleClassName="ml-1"
                isPending={isPending}
                error={error}
                loadingMessage="Loading pending professors..."
                fallbackErrorMessage="Unable to load pending professors. Please try again."
            />
        );
    }

    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(
        pendingProfessors ?? [],
        page,
    );

    const toggleExpanded = (id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="mt-4">
            {error && (
                <InlineQueryState
                    error={error}
                    fallbackErrorMessage="Unable to refresh pending professors. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Pending Professors:</h2>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <Table aria-label="Pending Professors">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <span className="sr-only">Expand row</span>
                            </TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Rating Course</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Approve</TableHead>
                            <TableHead>Deny</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow colSpan={7} />
                        ) : (
                            pageRows.map((row: Professor) => {
                                const isExpanded = expandedIds.has(row.id);
                                const actionsId = `pending-professor-actions-${row.id}`;
                                const displayName = `${row.lastName}, ${row.firstName}`;
                                const course = Object.keys(row.reviews ?? {})[0];
                                const ratingText = Object.values(row.reviews ?? {})[0]?.[0]?.rating;

                                return (
                                    <Fragment key={row.id}>
                                        <TableRow
                                            className={cn(
                                                "has-aria-expanded:bg-transparent",
                                                isExpanded && "bg-muted/50",
                                            )}
                                        >
                                            <TableCell>
                                                <UiButton
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-expanded={isExpanded}
                                                    aria-controls={actionsId}
                                                    aria-label={
                                                        isExpanded
                                                            ? `Collapse actions for ${displayName}`
                                                            : `Expand actions for ${displayName}`
                                                    }
                                                    onClick={() => toggleExpanded(row.id)}
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            "size-4 transition-transform",
                                                            isExpanded && "rotate-90",
                                                        )}
                                                    />
                                                </UiButton>
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={`http://www.google.com/search?q=${row.lastName}+${row.firstName}+Cal+Poly`}
                                                    className="underline text-brand hover:text-accent visited:text-brand/70"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {displayName}
                                                </a>
                                            </TableCell>
                                            <TableCell>{row.department}</TableCell>
                                            <TableCell>{course}</TableCell>
                                            <TableCell className="max-w-lg whitespace-normal">
                                                {ratingText}
                                            </TableCell>
                                            <TableCell>
                                                <ConfirmationButton
                                                    action={async () =>
                                                        approvePendingProfessor(row.id)
                                                    }
                                                    buttonClassName="p-2 bg-primary text-primary-foreground rounded-sm"
                                                    buttonText="✓"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <ConfirmationButton
                                                    action={async () =>
                                                        rejectPendingProfessor(row.id)
                                                    }
                                                    buttonClassName="p-2 bg-destructive text-white rounded-sm"
                                                    buttonText="X"
                                                />
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                                                <TableCell
                                                    colSpan={7}
                                                    className="whitespace-normal bg-muted/40"
                                                >
                                                    <div id={actionsId}>
                                                        <PendingProfessorActions professor={row} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <AdminTablePagination
                    total={total}
                    page={currentPage}
                    pageCount={pageCount}
                    onPrevious={() => setPage(currentPage - 1)}
                    onNext={() => setPage(currentPage + 1)}
                />
            </div>
        </div>
    );
}

function PendingProfessorActions({ professor }: { professor: Professor }) {
    return (
        <div className="flex flex-col gap-2 pl-2 pt-2">
            <SubmitUnderAction professor={professor} />
            <ChangeNameAction professor={professor} />
            <ChangeNameDepartment professor={professor} />
        </div>
    );
}

type PendingProfessorAction = {
    professor: Professor;
};

function SubmitUnderAction({ professor }: PendingProfessorAction) {
    const [destProfessor, setDestProfessor] = useState<TruncatedProfessor | undefined>(undefined);
    const [searchValue, setSearchValue] = useState("");

    const { data: allProfessors } = trpc.professors.all.useQuery(undefined, {
        meta: { suppressGlobalErrorToast: true },
    });

    const queryClient = useQueryClient();
    const { mutateAsync: submitUnder, isPending } =
        trpc.admin.submitPendingUnderProfessor.useMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
            meta: { suppressGlobalErrorToast: true },
        });

    const submit = async () => {
        if (!destProfessor) {
            return;
        }

        try {
            await submitUnder({ destId: destProfessor.id, sourceId: professor.id });
            toast.success("Submitted ratings under selected professor.");
        } catch (submitError) {
            toast.error(
                getApiErrorMessage(
                    submitError,
                    "Failed to submit ratings under selected professor.",
                ),
            );
        }
    };

    return (
        <div className="flex gap-2 items-center">
            <div className="text-sm">
                <span>Submit under </span>
                <span className="font-bold">
                    {destProfessor
                        ? `${destProfessor.lastName}, ${destProfessor.firstName}`
                        : "undefined"}
                </span>
            </div>
            <AutoComplete
                className="w-80 z-50"
                inputClassName="border border-input"
                items={allProfessors ?? []}
                filterFn={(items, inputValue) =>
                    professorSearch(items, "name", inputValue, { includeStale: true }).map((t) => ({
                        label: `${t.lastName}, ${t.firstName}`,
                        value: t.id,
                    }))
                }
                inputValue={searchValue}
                onChange={({ selection, inputValue }) => {
                    setSearchValue(inputValue);
                    if (selection) {
                        setDestProfessor(allProfessors?.find((p) => p.id === selection));
                    }
                }}
                label="Submit To:"
                placeholder="Professor Name"
                disableDropdown={false}
            />
            <Button
                onClick={() => submit()}
                disabled={!destProfessor || isPending}
                className="text-sm"
            >
                Submit
            </Button>
        </div>
    );
}

function ChangeNameAction({ professor }: PendingProfessorAction) {
    const [first, setFirst] = useState(professor.firstName);
    const [last, setLast] = useState(professor.lastName);

    const queryClient = useQueryClient();
    const {
        mutate: setName,
        isPending,
        error,
    } = trpc.admin.changePendingProfessorName.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        meta: { suppressGlobalErrorToast: true },
    });

    return (
        <div className="flex gap-2 items-center text-sm">
            <span>Change Name</span>
            <TextInput
                className="w-40"
                label=""
                placeholder="Last"
                value={last}
                onChange={(e) => setLast(e.target.value)}
            />
            <TextInput
                className="w-40"
                label=""
                placeholder="First"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
            />
            <Button
                disabled={isPending}
                onClick={() =>
                    setName({
                        professorId: professor.id,
                        firstName: first,
                        lastName: last,
                    })
                }
            >
                Submit
            </Button>
            {error && (
                <span className="text-destructive text-sm">
                    {getApiErrorMessage(error, "Failed to update pending professor name.")}
                </span>
            )}
        </div>
    );
}

function ChangeNameDepartment({ professor }: PendingProfessorAction) {
    const [department, setDepartment] = useState(professor.department);

    const queryClient = useQueryClient();
    const {
        mutate: setProfessorDepartment,
        isPending,
        error,
    } = trpc.admin.changePendingProfessorDepartment.useMutation({
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: bulkInvalidationKey("professor-queue") }),
        meta: { suppressGlobalErrorToast: true },
    });

    return (
        <div className="flex gap-2 items-center text-sm">
            <span>Change Department</span>
            <Select
                label=""
                options={toSelectOptions(DEPARTMENT_LIST)}
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
            />
            <Button
                disabled={isPending}
                onClick={() =>
                    setProfessorDepartment({
                        professorId: professor.id,
                        department,
                    })
                }
            >
                Submit
            </Button>
            {error && (
                <span className="text-destructive text-sm">
                    {getApiErrorMessage(error, "Failed to update pending professor department.")}
                </span>
            )}
        </div>
    );
}

function ProcessedRatings() {
    const { data: processedRatings, isPending, error } = useDbValues("rating-log");
    type PendingRating = NonNullable<typeof processedRatings>[0];
    const [page, setPage] = useState(0);

    if (!processedRatings && (error || isPending)) {
        return (
            <InlineQueryState
                title="Processed Ratings:"
                titleClassName="ml-1"
                isPending={isPending}
                error={error}
                loadingMessage="Loading processed ratings..."
                fallbackErrorMessage="Unable to load processed ratings. Please try again."
            />
        );
    }

    const sortedProcessedRatings = [...(processedRatings ?? [])].sort(
        (ratingA, ratingB) => Date.parse(ratingB.postDate) - Date.parse(ratingA.postDate),
    );
    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(
        sortedProcessedRatings,
        page,
    );

    return (
        <div className="mt-4">
            {error && (
                <InlineQueryState
                    error={error}
                    fallbackErrorMessage="Unable to refresh processed ratings. Showing last loaded data."
                />
            )}
            <h2 className="ml-1">Processed Ratings:</h2>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <Table aria-label="Processed Ratings">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Scores</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Open</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow colSpan={4} />
                        ) : (
                            pageRows.map((row: PendingRating) => {
                                let scores;

                                if (row.analyzedScores && "category_scores" in row.analyzedScores) {
                                    scores = row.analyzedScores.category_scores;
                                } else {
                                    // Handle old Perspective ratings
                                    scores = row.analyzedScores ?? {};
                                }

                                return (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.status}</TableCell>
                                        <TableCell className="whitespace-normal">
                                            <div className="flex flex-col">
                                                {Object.entries(scores).map(([name, score]) => (
                                                    <div key={name}>
                                                        {name}: {score}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-lg whitespace-normal">
                                            {row.rating}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                onClick={() =>
                                                    window
                                                        .open(
                                                            `/professor/${row.professor}`,
                                                            "_blank",
                                                        )
                                                        ?.focus()
                                                }
                                            >
                                                <ArrowTopRightOnSquareIcon className="w-6 h-6" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <AdminTablePagination
                    total={total}
                    page={currentPage}
                    pageCount={pageCount}
                    onPrevious={() => setPage(currentPage - 1)}
                    onNext={() => setPage(currentPage + 1)}
                />
            </div>
        </div>
    );
}

interface ConfirmationButtonProps {
    action: () => void | Promise<void>;
    buttonClassName: string;
    buttonText: string;
}
export function ConfirmationButton({
    action,
    buttonClassName,
    buttonText,
}: ConfirmationButtonProps) {
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const handleConfirmation = () => {
        setConfirmationOpen(false);
        action();
    };

    return (
        <div className="relative" onBlur={() => setConfirmationOpen(false)}>
            <button
                type="button"
                className={buttonClassName}
                onClick={() => setConfirmationOpen(true)}
            >
                {buttonText}
            </button>
            {confirmationOpen && (
                <div className="absolute p-2 w-28 z-50 bg-card text-foreground shadow-sm top-0 right-0 ring-1 ring-border rounded-md">
                    <div>Are You Sure?</div>
                    <div className="flex justify-between mt-1">
                        <button
                            className="bg-primary px-2 py-1 text-primary-foreground"
                            type="button"
                            onClick={() => handleConfirmation()}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            YES
                        </button>
                        <button className="bg-destructive px-2 py-1 text-white" type="button">
                            NO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
