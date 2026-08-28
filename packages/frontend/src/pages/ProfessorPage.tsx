import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import {
    IndexRouteObject,
    Link,
    useLoaderData,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";
import {
    ChevronLeftIcon,
    FlagIcon,
    LockClosedIcon,
    LockOpenIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    TextArea,
    TextInput,
    Button,
    Rating,
    FilledStar,
    RatingCard,
    ProfessorTag,
    CourseFilterBar,
    PageMeta,
} from "@/components";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc";
import { useAuth, useSortedCourses, type CourseRatings } from "@/hooks";
import {
    cn,
    formError,
    formErrors,
    getApiErrorMessage,
    getCoursePrefix,
    professorJsonLd,
    professorPageDescription,
    professorPageTitle,
    withClearErrorOnChange,
} from "@/utils";
import { NotFound } from "./NotFound";

type ValueOf<T> = T[keyof T];

type ProfessorPageLoaderData = { notFound: true } | { notFound: false };

function isProfessorNotFoundError(error: unknown): boolean {
    return error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
}

export function ProfessorPageRoute() {
    const loaderData = useLoaderData() as ProfessorPageLoaderData;

    if (loaderData.notFound) {
        return <NotFound variant="professor" />;
    }

    return <ProfessorPage />;
}

export function professorPageLoaderFactory(trpcContext: ReturnType<(typeof trpc)["useUtils"]>) {
    const professorPageLoader: IndexRouteObject["loader"] = async ({ params }) => {
        const id = params.id ?? "";

        if (!z.uuid().safeParse(id).success) {
            return { notFound: true } satisfies ProfessorPageLoaderData;
        }

        try {
            await (trpcContext.professors.get.getData({ id }) ??
                trpcContext.professors.get.fetch(
                    { id },
                    { meta: { suppressGlobalErrorToast: true } },
                ));
            return { notFound: false } satisfies ProfessorPageLoaderData;
        } catch (error) {
            if (isProfessorNotFoundError(error)) {
                return { notFound: true } satisfies ProfessorPageLoaderData;
            }
            throw error;
        }
    };

    return professorPageLoader;
}

interface LockProfessorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMessage?: string;
    onConfirm: (lockedMessage: string) => void;
    isPending: boolean;
}

function LockProfessorModal({
    isOpen,
    onClose,
    currentMessage,
    onConfirm,
    isPending,
}: LockProfessorModalProps) {
    const [message, setMessage] = useState(currentMessage ?? "");

    useEffect(() => {
        if (isOpen) {
            setMessage(currentMessage ?? "");
        }
    }, [isOpen, currentMessage]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onConfirm(message.trim());
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="w-screen max-w-[min(35rem,calc(100vw-2rem))] rounded-xl bg-card p-5 sm:max-w-140 sm:w-140"
            >
                <form className="relative text-left" onSubmit={handleSubmit}>
                    <button
                        className={cn(
                            "absolute right-0 top-0 cursor-pointer rounded-md p-3 font-bold",
                            "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                        )}
                        onClick={onClose}
                        type="button"
                    >
                        X
                    </button>
                    <DialogTitle className="pr-10 text-2xl font-semibold mb-4 sm:text-3xl">
                        Lock Professor
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mb-4">
                        Enter the banner message shown to visitors when this professor is locked.
                        New ratings will be disabled.
                    </DialogDescription>
                    <div className="flex flex-col text-inherit w-full mb-4">
                        <span className="text-sm whitespace-nowrap">Banner message</span>
                        <Textarea
                            aria-label="Banner message"
                            id="lockProfessorMessage"
                            name="lockedMessage"
                            placeholder="This professor is not accepting new ratings."
                            className="mt-1 block h-24 min-h-24 field-sizing-fixed"
                            value={message}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setMessage(e.target.value)
                            }
                        />
                    </div>
                    <div className="flex justify-center mt-4">
                        <Button type="submit" disabled={isPending}>
                            Lock Professor
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function ProfessorPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const [selectedRatingIds, setSelectedRatingIds] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirmShown, setBulkDeleteConfirmShown] = useState(false);
    const [bulkDeleteReason, setBulkDeleteReason] = useState("");

    const { data: professorData, error: fetchError } = trpc.professors.get.useQuery(
        {
            id: id ?? "",
        },
        { meta: { suppressGlobalErrorToast: true } },
    );
    const trpcContext = trpc.useUtils();

    // Clear bulk-delete state when navigating to a different professor
    useEffect(() => {
        setSelectedRatingIds(new Set());
        setBulkDeleteConfirmShown(false);
        setBulkDeleteReason("");
    }, [id, professorData?.id]);
    const { isAuthenticated } = useAuth();
    const [lockModalShown, setLockModalShown] = useState(false);
    const lockProfessorMutation = trpc.admin.lockProfessor.useMutation({
        onSuccess: () => {
            trpcContext.professors.get.invalidate({ id: id ?? "" });
            setLockModalShown(false);
            toast.success("Professor lock status updated");
        },
    });

    const bulkDeleteRatingsMutation = trpc.admin.removeRatingsBulk.useMutation({
        onSuccess: (_data, variables) => {
            trpcContext.professors.get.invalidate({ id: variables.professorId });
            setSelectedRatingIds(new Set());
            setBulkDeleteConfirmShown(false);
            setBulkDeleteReason("");
            toast.success("Selected ratings have been removed.");
        },
        onError: (err) => {
            toast.error(err.message ?? "Failed to remove ratings.");
        },
    });

    function toggleRatingSelection(ratingId: string) {
        setSelectedRatingIds((prev) => {
            const next = new Set(prev);
            if (next.has(ratingId)) next.delete(ratingId);
            else next.add(ratingId);
            return next;
        });
    }

    const topTags = Object.entries(professorData?.tags ?? {})
        .sort(([, aNum], [, bNum]) => bNum - aNum)
        .map(([tagName]) => tagName)
        .slice(0, 4);

    const navigate = useNavigate();
    if (fetchError && !professorData) {
        navigate("/");
    }

    const sortedCourses = useSortedCourses(id);
    const visibleCourses = coursesVisibleForFilter(
        sortedCourses,
        searchParams.get("course"),
        searchParams.get("prefix"),
    );

    return (
        <div id="main" tabIndex={-1} className="outline-none">
            {professorData ? (
                <PageMeta
                    title={professorPageTitle(professorData)}
                    description={professorPageDescription(professorData)}
                    path={`/professor/${professorData.id}`}
                    jsonLd={professorJsonLd(professorData, `/professor/${professorData.id}`)}
                />
            ) : (
                <PageMeta
                    title="Professor"
                    description="Student ratings of a Cal Poly professor on Polyratings."
                    path={`/professor/${id ?? ""}`}
                />
            )}
            <LockProfessorModal
                isOpen={lockModalShown}
                onClose={() => setLockModalShown(false)}
                currentMessage={professorData?.lockedMessage}
                onConfirm={(lockedMessage) => {
                    lockProfessorMutation.mutate({
                        professorId: professorData?.id ?? "",
                        locked: true,
                        lockedMessage: lockedMessage || undefined,
                    });
                }}
                isPending={lockProfessorMutation.isPending}
            />

            <Dialog
                open={bulkDeleteConfirmShown}
                onOpenChange={(open) =>
                    !open &&
                    !bulkDeleteRatingsMutation.isPending &&
                    setBulkDeleteConfirmShown(false)
                }
            >
                <DialogContent
                    showCloseButton={false}
                    className="w-screen max-w-md rounded-xl bg-card p-5"
                >
                    <DialogTitle className="text-xl font-semibold mb-2">
                        Delete selected ratings?
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mb-4">
                        You are about to permanently delete {selectedRatingIds.size} rating
                        {selectedRatingIds.size === 1 ? "" : "s"}. This action will be logged to
                        Discord.
                    </DialogDescription>
                    <span className="mb-1 block text-sm font-medium text-foreground">
                        Reason for deletion (required, included in audit log)
                    </span>
                    <Textarea
                        id="bulk-delete-reason"
                        aria-label="Reason for deletion (required, included in audit log)"
                        placeholder="e.g. Spam, off-topic, policy violation"
                        className="mt-1 mb-4 h-24 min-h-24 field-sizing-fixed"
                        value={bulkDeleteReason}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                            setBulkDeleteReason(e.target.value)
                        }
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkDeleteConfirmShown(false)}
                            disabled={bulkDeleteRatingsMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (!professorData?.id) return;
                                const validIds = new Set(
                                    Object.values(professorData.reviews ?? {}).flatMap((r) =>
                                        r.map((rating) => rating.id),
                                    ),
                                );
                                const idsToSend = Array.from(selectedRatingIds).filter((id) =>
                                    validIds.has(id),
                                );
                                if (idsToSend.length === 0) {
                                    toast.info(
                                        "Selection is out of date; those ratings are no longer here. Clearing selection.",
                                    );
                                    setSelectedRatingIds(new Set());
                                    setBulkDeleteConfirmShown(false);
                                    return;
                                }
                                if (idsToSend.length < selectedRatingIds.size) {
                                    const n = selectedRatingIds.size;
                                    toast.warning(
                                        `${idsToSend.length} of ${n} selected still on professor. Deleting those.`,
                                    );
                                }
                                bulkDeleteRatingsMutation.mutate({
                                    professorId: professorData.id,
                                    ratingIds: idsToSend,
                                    reason: bulkDeleteReason.trim(),
                                });
                            }}
                            disabled={
                                bulkDeleteRatingsMutation.isPending || !bulkDeleteReason.trim()
                            }
                        >
                            {bulkDeleteRatingsMutation.isPending ? "Deleting…" : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <header
                className={cn(
                    "mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 pt-8 pb-6",
                    "md:flex-row md:items-start md:justify-between md:pt-10",
                )}
            >
                <div className="flex w-full min-w-0 flex-col md:w-auto">
                    <Link
                        to="/search/name"
                        className={cn(
                            "mb-4 inline-flex items-center gap-1 self-start text-sm font-medium text-brand",
                            "hover:underline",
                            "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                        )}
                    >
                        <ChevronLeftIcon className="size-4" aria-hidden />
                        Back to professor list
                    </Link>
                    <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                        {professorData?.lastName}, {professorData?.firstName}
                    </h1>
                    <h2 className="mt-2 text-base font-medium text-muted-foreground">
                        {professorData?.department} Professor
                    </h2>

                    {Boolean(topTags.length) && (
                        <div className="mt-4 mb-2 flex flex-wrap gap-2">
                            {topTags.map((tag) => (
                                <ProfessorTag key={tag} tagName={tag} />
                            ))}
                        </div>
                    )}

                    <StatsCard className="mt-4 mb-3 block md:hidden" professor={professorData} />

                    <div className="mt-4 hidden md:flex md:flex-wrap md:items-center md:gap-2">
                        {!professorData?.locked && professorData && (
                            <Button size="lg" className="text-base" asChild>
                                <Link to={`/professor/${professorData.id}/eval`}>
                                    Evaluate Professor
                                </Link>
                            </Button>
                        )}
                        {isAuthenticated &&
                            professorData &&
                            (professorData.locked ? (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() =>
                                        lockProfessorMutation.mutate({
                                            professorId: professorData.id,
                                            locked: false,
                                        })
                                    }
                                    disabled={lockProfessorMutation.isPending}
                                >
                                    <LockOpenIcon className="mr-1 inline h-4 w-4" />
                                    Unlock Professor
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setLockModalShown(true)}
                                >
                                    <LockClosedIcon className="mr-1 inline h-4 w-4" />
                                    Lock Professor
                                </Button>
                            ))}
                    </div>

                    <div className="mt-4 flex w-full flex-col gap-2 md:hidden">
                        {!professorData?.locked && professorData && (
                            <Button size="lg" className="w-full text-base" asChild>
                                <Link to={`/professor/${professorData.id}/eval`}>
                                    Evaluate Professor
                                </Link>
                            </Button>
                        )}
                        {isAuthenticated &&
                            professorData &&
                            (professorData.locked ? (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() =>
                                        lockProfessorMutation.mutate({
                                            professorId: professorData.id,
                                            locked: false,
                                        })
                                    }
                                    disabled={lockProfessorMutation.isPending}
                                >
                                    <LockOpenIcon className="mr-1 inline h-4 w-4" />
                                    Unlock Professor
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setLockModalShown(true)}
                                >
                                    <LockClosedIcon className="mr-1 inline h-4 w-4" />
                                    Lock Professor
                                </Button>
                            ))}
                    </div>
                </div>
                <StatsCard
                    className="mt-4 mb-3 hidden md:ml-8 md:block"
                    professor={professorData}
                />
            </header>

            {professorData?.locked && (
                <div className="mx-auto mt-2 w-full max-w-5xl px-4">
                    <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-4 text-foreground">
                        <LockClosedIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <p className="text-base font-medium">
                            {professorData.lockedMessage ||
                                "This professor is not accepting new ratings."}
                        </p>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-5xl border-b border-border px-4" />

            {isAuthenticated && selectedRatingIds.size > 0 && (
                <div className="mx-auto mt-4 w-full max-w-5xl px-4">
                    <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <span className="font-medium text-red-900 dark:text-red-200">
                            {selectedRatingIds.size} rating{selectedRatingIds.size === 1 ? "" : "s"}{" "}
                            selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRatingIds(new Set())}
                                className="text-red-700 underline text-sm dark:text-red-300"
                            >
                                Clear selection
                            </button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setBulkDeleteConfirmShown(true)}
                                disabled={bulkDeleteRatingsMutation.isPending}
                            >
                                Delete selected
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {sortedCourses.length > 1 && (
                <CourseFilterBar courses={sortedCourses.map((course) => course.courseName)} />
            )}

            {professorData &&
                visibleCourses.map(({ courseName, ratings }, courseIndex) => (
                    <section key={courseName} className="pt-4">
                        <div className="mx-auto flex w-full max-w-5xl flex-col px-4">
                            <h3
                                className={cn(
                                    "mb-2 scroll-mt-20 text-2xl font-semibold tracking-tight md:text-3xl",
                                    courseIndex > 0 && "mt-7",
                                )}
                            >
                                {courseName}
                            </h3>
                            {ratings.map((rating) => (
                                <ProfessorRatingCard
                                    key={rating.id}
                                    rating={rating}
                                    professorId={professorData.id}
                                    showBulkDeleteCheckbox={isAuthenticated}
                                    isSelected={selectedRatingIds.has(rating.id)}
                                    onToggleSelect={() => toggleRatingSelection(rating.id)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            {!sortedCourses.length && (
                <h2 className="mt-10 text-center text-3xl font-semibold tracking-tight text-foreground">
                    Be the first to add a rating!
                </h2>
            )}
        </div>
    );
}

function coursesVisibleForFilter(
    sortedCourses: CourseRatings[],
    courseParam: string | null,
    prefixParam: string | null,
) {
    if (courseParam && sortedCourses.some((course) => course.courseName === courseParam)) {
        return sortedCourses.filter((course) => course.courseName === courseParam);
    }
    if (
        prefixParam &&
        sortedCourses.some((course) => getCoursePrefix(course.courseName) === prefixParam)
    ) {
        return sortedCourses.filter((course) => getCoursePrefix(course.courseName) === prefixParam);
    }
    return sortedCourses;
}

type StatsCardProps = {
    professor: inferProcedureOutput<AppRouter["professors"]["get"]> | undefined;
    className?: string;
};
function StatsCard({ professor, className = "" }: StatsCardProps) {
    const naEvalZero = (val: number | undefined) => {
        if (professor?.numEvals) {
            return val?.toFixed(2);
        }
        return "N/A";
    };

    return (
        <div
            className={cn(
                "flex w-full min-w-0 flex-col rounded-lg border border-input bg-card px-5 py-5 md:w-auto md:min-w-80 md:shrink-0 md:px-6",
                className,
            )}
        >
            <div className="flex items-end justify-between gap-4">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold leading-none tabular-nums md:text-6xl">
                        {naEvalZero(professor?.overallRating)}
                    </span>
                    <FilledStar className="self-center md:hidden" size="1.75rem" />
                    <span className="text-xl font-medium text-muted-foreground">/4</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Rating
                        value={professor?.overallRating}
                        size="1.5rem"
                        gap="2px"
                        className="hidden md:inline-flex"
                    />
                    <p className="text-base text-muted-foreground">
                        {professor?.numEvals} Evaluations
                    </p>
                </div>
            </div>
            <dl className="mt-5 space-y-1 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="min-w-0 text-base text-muted-foreground">
                        Recognizes Difficulties
                    </dt>
                    <dd className="flex shrink-0 items-center gap-3">
                        <Rating
                            value={professor?.studentDifficulties}
                            size="1.25rem"
                            gap="1px"
                            className="hidden md:inline-flex"
                        />
                        <FilledStar className="md:hidden" size="1.25rem" />
                        <span className="w-10 text-right text-lg tabular-nums">
                            {naEvalZero(professor?.studentDifficulties)}
                        </span>
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="min-w-0 text-base text-muted-foreground">Presents Clearly</dt>
                    <dd className="flex shrink-0 items-center gap-3">
                        <Rating
                            value={professor?.materialClear}
                            size="1.25rem"
                            gap="1px"
                            className="hidden md:inline-flex"
                        />
                        <FilledStar className="md:hidden" size="1.25rem" />
                        <span className="w-10 text-right text-lg tabular-nums">
                            {naEvalZero(professor?.materialClear)}
                        </span>
                    </dd>
                </div>
            </dl>
        </div>
    );
}

interface ProfessorRatingCardProps {
    professorId: string;
    rating: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>[0];
    showBulkDeleteCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}
function ProfessorRatingCard({
    rating,
    professorId,
    showBulkDeleteCheckbox = false,
    isSelected = false,
    onToggleSelect,
}: ProfessorRatingCardProps) {
    return (
        <RatingCard
            rating={rating}
            actions={
                <>
                    {showBulkDeleteCheckbox && (
                        <Checkbox
                            id={`rating-select-${rating.id}`}
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect?.()}
                            aria-label="Select rating for bulk delete"
                        />
                    )}
                    <ReportButton professorId={professorId} ratingId={rating.id} />
                </>
            }
        />
    );
}

interface ReportButtonProps {
    professorId: string;
    ratingId: string;
    className?: string;
}
function ReportButton({ professorId, ratingId, className = "" }: ReportButtonProps) {
    const [formShown, setFormShown] = useState(false);
    return (
        <div className={className}>
            <Dialog open={formShown} onOpenChange={setFormShown}>
                <DialogContent
                    showCloseButton={false}
                    className="w-screen max-w-[min(35rem,calc(100vw-2rem))] rounded-xl bg-card p-5 sm:max-w-140 sm:w-140"
                >
                    <ReportForm
                        professorId={professorId}
                        ratingId={ratingId}
                        closeForm={() => setFormShown(false)}
                    />
                </DialogContent>
            </Dialog>

            <button
                aria-label="Report Rating"
                type="button"
                onClick={() => setFormShown(true)}
                className="grid size-11 place-items-center rounded-md focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <FlagIcon className="size-6 text-muted-foreground transition-all hover:text-destructive cursor-pointer" />
            </button>
        </div>
    );
}

interface ReportFormProps {
    closeForm: () => void;
    professorId: string;
    ratingId: string;
}

const reportFormParser = z.object({
    email: z
        .string()
        .optional()
        .transform((val) => (val === "" ? undefined : val))
        .pipe(z.email(formError(formErrors.email)).optional()),
    reason: z.string().trim().min(1, formError(formErrors.reportReason)),
});

type ReportFormInputs = z.infer<typeof reportFormParser>;

function ReportForm({ closeForm, professorId, ratingId }: ReportFormProps) {
    const {
        register,
        clearErrors,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormInputs>({
        resolver: zodResolver(reportFormParser),
        reValidateMode: "onSubmit",
    });
    const registerField = withClearErrorOnChange(register, clearErrors);

    const reportMutation = trpc.ratings.report.useMutation({
        meta: { suppressGlobalErrorToast: true },
        onSuccess: () => {
            toast.success("Thank you for the report. The team will review it soon");
            closeForm();
        },
    });

    const onSubmit: SubmitHandler<ReportFormInputs> = (formResult) => {
        reportMutation.mutate({
            professorId,
            ratingId,
            email: formResult.email ?? "",
            reason: formResult.reason,
        });
    };

    return (
        <form className="relative text-left" onSubmit={handleSubmit(onSubmit)}>
            <button
                className={cn(
                    "absolute right-0 top-0 cursor-pointer rounded-md p-3 font-bold",
                    "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
                onClick={closeForm}
                type="button"
            >
                X
            </button>
            <DialogTitle className="pr-10 text-2xl font-semibold mb-4 sm:text-3xl">
                Report Rating
            </DialogTitle>
            <TextInput
                wrapperClassName="w-full!"
                label="Email (Optional)"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...registerField("email")}
            />
            <TextArea
                label="Reason For Reporting"
                placeholder="This Review was offensive and contained inappropriate language."
                wrapperClassName="mt-2"
                className="h-32! sm:h-40!"
                error={errors.reason?.message}
                {...registerField("reason")}
            />
            {reportMutation.error && (
                <p className="text-red-500 text-sm mt-2">
                    {getApiErrorMessage(
                        reportMutation.error,
                        "We could not submit this report. Please try again.",
                    )}
                </p>
            )}
            <div className="flex justify-center">
                <Button className="mt-4" type="submit" disabled={reportMutation.isPending}>
                    Submit
                </Button>
            </div>
        </form>
    );
}
