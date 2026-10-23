import { Fragment, useId, useMemo, useState } from "react";
import { Professor, TruncatedProfessor } from "@backend/types/schema";
import { Department, DEPARTMENT_LIST } from "@backend/utils/const";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { AutoComplete, Button, InlineQueryState, Select, TextInput } from "@/components";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { bulkInvalidationKey, useDbValues } from "@/hooks/useDbValues";
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
import { trpc } from "@/trpc";
import { cn, getApiErrorMessage, toSelectOptions } from "@/utils";
import { professorSearch } from "@/utils/ProfessorSearch";

export function PendingProfessors() {
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
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

    const filteredPending = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (pendingProfessors ?? []).filter((row) => {
            if (department && row.department !== department) {
                return false;
            }
            if (!query) {
                return true;
            }
            const name = formatProfessorName(row.lastName, row.firstName).toLowerCase();
            const course = Object.keys(row.reviews ?? {})[0]?.toLowerCase() ?? "";
            const ratingText =
                Object.values(row.reviews ?? {})[0]?.[0]?.rating?.toLowerCase() ?? "";
            return name.includes(query) || course.includes(query) || ratingText.includes(query);
        });
    }, [pendingProfessors, search, department]);

    if (!pendingProfessors && (error || isPending)) {
        return (
            <AdminSection title="Pending Professors">
                <InlineQueryState
                    wrapperClassName=""
                    titleClassName=""
                    isPending={isPending}
                    error={error}
                    loadingMessage="Loading pending professors..."
                    fallbackErrorMessage="Unable to load pending professors. Please try again."
                    errorClassName="text-destructive"
                />
            </AdminSection>
        );
    }

    const sourceTotal = pendingProfessors?.length ?? 0;
    const hasFilters = Boolean(search.trim() || department);
    const { pageRows, pageCount, currentPage, total } = getAdminTablePage(filteredPending, page);

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
        <AdminSection title="Pending Professors" count={sourceTotal} countLabel="pending">
            {error && (
                <InlineQueryState
                    wrapperClassName="mb-4"
                    error={error}
                    fallbackErrorMessage="Unable to refresh pending professors. Showing last loaded data."
                    errorClassName="text-destructive"
                />
            )}
            <div className={filterBarClassName}>
                <AdminSearchInput
                    id="pending-search"
                    label="Search"
                    value={search}
                    onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                    }}
                    placeholder="Name, course, or rating"
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
                <Table aria-label="Pending Professors">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                            <TableHead className="w-10">
                                <span className="sr-only">Expand row</span>
                            </TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pageRows.length === 0 ? (
                            <AdminTableEmptyRow
                                colSpan={5}
                                message={emptyStateMessage({
                                    hasSourceData: sourceTotal > 0,
                                    hasFilters,
                                    emptyLabel: "No pending professors in the queue.",
                                    noMatchLabel: "No pending professors match your filters.",
                                })}
                            />
                        ) : (
                            pageRows.map((row: Professor) => {
                                const isExpanded = expandedIds.has(row.id);
                                const actionsId = `pending-professor-actions-${row.id}`;
                                const displayName = formatProfessorName(
                                    row.lastName,
                                    row.firstName,
                                );
                                const course = Object.keys(row.reviews ?? {})[0];
                                const ratingText =
                                    Object.values(row.reviews ?? {})[0]?.[0]?.rating ?? "";

                                return (
                                    <Fragment key={row.id}>
                                        <TableRow
                                            className={cn(
                                                "has-aria-expanded:bg-transparent",
                                                isExpanded && "bg-muted/50",
                                            )}
                                        >
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-expanded={isExpanded}
                                                    aria-controls={actionsId}
                                                    aria-label={
                                                        isExpanded
                                                            ? `Collapse edit tools for ${displayName}`
                                                            : `Expand edit tools for ${displayName}`
                                                    }
                                                    onClick={() => toggleExpanded(row.id)}
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            "size-4 transition-transform",
                                                            isExpanded && "rotate-90",
                                                        )}
                                                    />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="whitespace-normal">
                                                <div className="flex flex-col gap-1">
                                                    <a
                                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${row.lastName} ${row.firstName} Cal Poly`)}`}
                                                        className={cn(
                                                            adminLinkClassName,
                                                            "whitespace-nowrap",
                                                        )}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {displayName}
                                                    </a>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md"
                                                        >
                                                            {row.department}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {course ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                <RatingTextCell text={ratingText} />
                                            </TableCell>
                                            <TableCell className="w-px whitespace-nowrap">
                                                <div className="flex flex-nowrap justify-end gap-2">
                                                    <ConfirmAction
                                                        action={() =>
                                                            approvePendingProfessor(row.id)
                                                        }
                                                        variant="default"
                                                        buttonText="Approve"
                                                        ariaLabel={`Approve ${displayName}`}
                                                        title={`Approve ${displayName}?`}
                                                        description="Create this professor and publish the attached rating."
                                                        confirmLabel="Approve"
                                                        icon={<Check data-icon="inline-start" />}
                                                    />
                                                    <ConfirmAction
                                                        action={() =>
                                                            rejectPendingProfessor(row.id)
                                                        }
                                                        variant="destructive"
                                                        buttonText="Deny"
                                                        ariaLabel={`Deny ${displayName}`}
                                                        title={`Deny ${displayName}?`}
                                                        description="Reject this pending professor submission. The rating will not be published."
                                                        confirmLabel="Deny"
                                                        icon={<X data-icon="inline-start" />}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                                                <TableCell
                                                    colSpan={5}
                                                    className="bg-muted/30 whitespace-normal"
                                                >
                                                    <div id={actionsId} className="p-3 sm:p-4">
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
        </AdminSection>
    );
}

const fieldRowClassName = "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-2";

function PendingProfessorActions({ professor }: { professor: Professor }) {
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end lg:gap-5">
            <ChangeNameAction professor={professor} />
            <ChangeDepartmentAction professor={professor} />
            <MergeIntoExistingAction professor={professor} />
        </div>
    );
}

type PendingProfessorAction = {
    professor: Professor;
};

function MergeIntoExistingAction({ professor }: PendingProfessorAction) {
    const mergeInputId = useId();
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
            setDestProfessor(undefined);
            setSearchValue("");
        } catch (submitError) {
            toast.error(
                getApiErrorMessage(
                    submitError,
                    "Failed to submit ratings under selected professor.",
                ),
            );
        }
    };

    const destLabel = destProfessor
        ? formatProfessorName(destProfessor.lastName, destProfessor.firstName)
        : null;

    return (
        <div className={fieldRowClassName}>
            <div className="flex w-full min-w-0 flex-1 flex-col text-inherit">
                <label className="text-sm whitespace-nowrap" htmlFor={mergeInputId}>
                    Merge into existing
                </label>
                <AutoComplete
                    className="z-50 w-full"
                    inputId={mergeInputId}
                    items={allProfessors ?? []}
                    filterFn={(items, inputValue) =>
                        professorSearch(items, "name", inputValue, {
                            includeStale: true,
                        }).map((t) => ({
                            label: formatProfessorName(t.lastName, t.firstName),
                            value: t.id,
                        }))
                    }
                    inputValue={searchValue}
                    onChange={({ selection, inputValue }) => {
                        setSearchValue(inputValue);
                        if (selection) {
                            setDestProfessor(allProfessors?.find((p) => p.id === selection));
                        } else {
                            setDestProfessor(undefined);
                        }
                    }}
                    label="Merge into existing"
                    placeholder="Search by name"
                    disableDropdown={false}
                    forceDropdown
                />
            </div>
            <div className="flex h-10 shrink-0 flex-wrap items-center gap-2">
                {destLabel ? (
                    <Badge variant="secondary" className="max-w-48 truncate rounded-md">
                        {destLabel}
                    </Badge>
                ) : null}
                <ConfirmAction
                    action={() => submit()}
                    variant="default"
                    buttonText="Merge"
                    ariaLabel="Merge into selected professor"
                    title="Merge into existing professor?"
                    description={
                        destLabel
                            ? `Submit this pending rating under ${destLabel} and remove the pending professor.`
                            : "Select a destination professor first."
                    }
                    confirmLabel="Merge"
                    disabled={!destProfessor || isPending}
                />
            </div>
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
        <div className="min-w-0 space-y-1.5">
            <div className={fieldRowClassName}>
                <TextInput
                    name={`pending-last-${professor.id}`}
                    className="w-full"
                    wrapperClassName="min-w-0 flex-1"
                    label="Last name"
                    placeholder="Last"
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                />
                <TextInput
                    name={`pending-first-${professor.id}`}
                    className="w-full"
                    wrapperClassName="min-w-0 flex-1"
                    label="First name"
                    placeholder="First"
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                />
                <div className="flex h-10 shrink-0 items-center">
                    <Button
                        type="button"
                        size="sm"
                        disabled={isPending || (!first.trim() && !last.trim())}
                        onClick={() =>
                            setName({
                                professorId: professor.id,
                                firstName: first,
                                lastName: last,
                            })
                        }
                    >
                        Save
                    </Button>
                </div>
            </div>
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(error, "Failed to update pending professor name.")}
                </p>
            ) : null}
        </div>
    );
}

function ChangeDepartmentAction({ professor }: PendingProfessorAction) {
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
        <div className="min-w-0 space-y-1.5">
            <div className={fieldRowClassName}>
                <Select
                    label="Department"
                    options={toSelectOptions(DEPARTMENT_LIST)}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    wrapperClassName="min-w-0 w-full flex-1"
                />
                <div className="flex h-10 shrink-0 items-center">
                    <Button
                        type="button"
                        size="sm"
                        disabled={isPending || department === professor.department}
                        onClick={() =>
                            setProfessorDepartment({
                                professorId: professor.id,
                                department,
                            })
                        }
                    >
                        Save
                    </Button>
                </div>
            </div>
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(error, "Failed to update pending professor department.")}
                </p>
            ) : null}
        </div>
    );
}
