import { Fragment, useMemo, useState } from "react";
import { Professor, RatingReport } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2 } from "lucide-react";
import { InlineQueryState, Select } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
import { trpc } from "@/trpc";
import { cn, toSelectOptions } from "@/utils";
import { RatingTextCell } from "@/pages/admin/RatingTextCell";
import {
    AdminSearchInput,
    AdminSection,
    AdminTableEmptyRow,
    AdminTablePagination,
    ConfirmAction,
    adminLinkClassName,
    createAdminMutationErrorHandler,
    emptyStateMessage,
    filterBarClassName,
    formatProfessorName,
    getAdminTablePage,
    tableSurfaceClassName,
} from "@/pages/admin/shared";

function findProfessor(professors: Professor[] | undefined, professorId: string) {
    return professors?.find((professor) => professor.id === professorId);
}

function findRating(professor: Professor | undefined, ratingId: string) {
    return Object.values(professor?.reviews ?? {})
        .flat()
        .find((rating) => rating.id === ratingId);
}

export function ReportedRatings() {
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
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");

    const reportsBlocked = !ratingReports && (reportsPending || Boolean(reportsError));
    const professorsBlocked = !professorsResult && (professorsPending || Boolean(professorsError));

    const filteredReports = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (ratingReports ?? []).filter((row) => {
            const professor = findProfessor(professors, row.professorId);
            const rating = findRating(professor, row.ratingId);
            if (department && professor?.department !== department) {
                return false;
            }
            if (!query) {
                return true;
            }
            const professorName = formatProfessorName(
                professor?.lastName,
                professor?.firstName,
            ).toLowerCase();
            const ratingText = (rating?.rating ?? "").toLowerCase();
            const reasons = row.reports
                .map((r) => r.reason)
                .join(" ")
                .toLowerCase();
            return (
                professorName.includes(query) ||
                ratingText.includes(query) ||
                reasons.includes(query)
            );
        });
    }, [ratingReports, professors, search, department]);

    if (reportsBlocked || professorsBlocked) {
        return (
            <AdminSection title="Reported Ratings">
                <InlineQueryState
                    wrapperClassName=""
                    titleClassName=""
                    isPending={reportsPending || professorsPending}
                    error={reportsError ?? professorsError}
                    loadingMessage="Loading reported ratings..."
                    fallbackErrorMessage="Unable to load reported ratings. Please try again."
                    errorClassName="text-destructive"
                />
            </AdminSection>
        );
    }

    const sourceTotal = ratingReports?.length ?? 0;
    const hasFilters = Boolean(search.trim() || department);
    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(filteredReports, page);

    return (
        <AdminSection title="Reported Ratings" count={sourceTotal} countLabel="reported">
            {(reportsError || professorsError) && (
                <InlineQueryState
                    wrapperClassName="mb-4"
                    error={reportsError ?? professorsError}
                    fallbackErrorMessage="Unable to refresh reported ratings. Showing last loaded data."
                    errorClassName="text-destructive"
                />
            )}
            <div className={filterBarClassName}>
                <AdminSearchInput
                    id="reported-search"
                    label="Search"
                    value={search}
                    onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                    }}
                    placeholder="Professor, rating, or reason"
                />
                <div className="flex w-full flex-col gap-1 sm:w-48">
                    <Select
                        label="Department"
                        options={[
                            { value: "", label: "All departments" },
                            ...toSelectOptions(DEPARTMENT_LIST),
                        ]}
                        value={department}
                        onChange={(e) => {
                            setDepartment(e.target.value);
                            setPage(0);
                        }}
                        wrapperClassName="w-full"
                    />
                </div>
            </div>
            <div className={tableSurfaceClassName}>
                <Table aria-label="Reported Ratings">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                            <TableHead>Professor</TableHead>
                            <TableHead>Reports</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow
                                colSpan={4}
                                message={emptyStateMessage({
                                    hasSourceData: sourceTotal > 0,
                                    hasFilters,
                                    emptyLabel: "No reported ratings in the queue.",
                                    noMatchLabel: "No reported ratings match your filters.",
                                })}
                            />
                        ) : (
                            pageRows.map((row: RatingReport) => {
                                const professor = findProfessor(professors, row.professorId);
                                const rating = findRating(professor, row.ratingId);
                                const displayName = professor
                                    ? formatProfessorName(professor.lastName, professor.firstName)
                                    : "Professor record missing";

                                return (
                                    <TableRow key={row.ratingId}>
                                        <TableCell className="whitespace-normal">
                                            <div className="flex flex-col gap-1">
                                                {professor ? (
                                                    <a
                                                        href={`/professor/${professor.id}`}
                                                        className={cn(
                                                            adminLinkClassName,
                                                            "whitespace-nowrap",
                                                        )}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {displayName}
                                                    </a>
                                                ) : (
                                                    <span className="font-medium whitespace-nowrap text-foreground">
                                                        {displayName}
                                                    </span>
                                                )}
                                                {professor?.department ? (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md"
                                                        >
                                                            {professor.department}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-sm whitespace-normal">
                                            <div className="flex flex-col gap-2 text-sm">
                                                {row.reports.map((report, idx) => (
                                                    <Fragment
                                                        // Need to use index to help out with making each key unique
                                                        // eslint-disable-next-line react/no-array-index-key
                                                        key={idx + report.reason + report.email}
                                                    >
                                                        {idx !== 0 && <Separator />}
                                                        <div className="space-y-0.5">
                                                            {report.anonymousIdentifier && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    By {report.anonymousIdentifier}
                                                                </div>
                                                            )}
                                                            {report.email && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {report.email}
                                                                </div>
                                                            )}
                                                            <div className="text-foreground">
                                                                {report.reason}
                                                            </div>
                                                        </div>
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <RatingTextCell
                                                text={rating?.rating ?? ""}
                                                author={rating?.anonymousIdentifier}
                                            />
                                        </TableCell>
                                        <TableCell className="w-px whitespace-nowrap">
                                            <div className="flex flex-nowrap justify-end gap-2">
                                                <ConfirmAction
                                                    action={() => removeReport(row.ratingId)}
                                                    variant="default"
                                                    buttonText="Keep"
                                                    ariaLabel={`Keep rating for ${displayName}`}
                                                    title="Keep this rating?"
                                                    description="Dismiss the report and leave the rating on the professor's page."
                                                    confirmLabel="Keep rating"
                                                    icon={<ShieldCheck data-icon="inline-start" />}
                                                />
                                                <ConfirmAction
                                                    action={() => actOnReport(row.ratingId)}
                                                    variant="destructive"
                                                    buttonText="Remove"
                                                    ariaLabel={`Remove rating for ${displayName}`}
                                                    title="Remove this rating?"
                                                    description="Delete the rating and clear the report. This cannot be undone from the admin UI."
                                                    confirmLabel="Remove rating"
                                                    icon={<Trash2 data-icon="inline-start" />}
                                                />
                                            </div>
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
        </AdminSection>
    );
}
