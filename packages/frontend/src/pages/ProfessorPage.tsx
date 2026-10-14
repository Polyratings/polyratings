/* eslint-disable react/no-unstable-nested-components */
import { type ChangeEvent, Fragment, type FormEvent, useState } from "react";
import { IndexRouteObject, Navigate, useLoaderData, useParams } from "react-router";
import AnimateHeight from "react-animate-height";
import AnchorLink from "react-anchor-link-smooth-scroll";
import StarRatings from "react-star-ratings";
import Modal from "react-modal";
import { TagIcon } from "@heroicons/react/24/solid";
import { FlagIcon, LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { TRPCClientError } from "@trpc/client";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { InView } from "react-intersection-observer";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    TwoStepEvaluateProfessor,
    TextArea,
    TextInput,
    EvaluateProfessorFormLinear,
} from "@/components";
import { trpc } from "@/trpc";
import { REACT_MODAL_STYLES } from "@/constants";
import { Button } from "@/components/forms/Button";
import { useAuth, useSortedCourses } from "@/hooks";
import { getApiErrorMessage } from "@/utils";
import { NotFoundRedirect } from "./NotFoundRedirect";

type ValueOf<T> = T[keyof T];

type ProfessorPageLoaderData = { notFound: true } | { notFound: false };

function isProfessorNotFoundError(error: unknown): boolean {
    return error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
}

export function ProfessorPageRoute() {
    const loaderData = useLoaderData() as ProfessorPageLoaderData;

    if (loaderData.notFound) {
        return <NotFoundRedirect variant="professor" />;
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
    // Parent remounts this modal with a key when opening so currentMessage is fresh.
    const [message, setMessage] = useState(currentMessage ?? "");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onConfirm(message.trim());
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={onClose} style={REACT_MODAL_STYLES}>
            <div className="w-screen rounded-sm bg-white p-5 shadow-sm sm:w-140">
                <form className="relative text-left" onSubmit={handleSubmit}>
                    <button
                        className="absolute top-0 right-0 cursor-pointer p-3 font-bold"
                        onClick={onClose}
                        type="button"
                    >
                        X
                    </button>
                    <h2 className="mb-4 text-3xl font-semibold">Lock Professor</h2>
                    <p className="mb-4 text-gray-600">
                        Enter the banner message shown to visitors when this professor is locked.
                        New ratings will be disabled.
                    </p>
                    <div className="mb-4 flex w-full flex-col text-inherit">
                        <label className="text-xs whitespace-nowrap" htmlFor="lockProfessorMessage">
                            Banner message
                            <textarea
                                id="lockProfessorMessage"
                                name="lockedMessage"
                                placeholder="This professor is not accepting new ratings."
                                className="mt-1 block h-24 w-full rounded-sm border border-[#c3cdd5] bg-[#f2f5f8] p-2 text-black active:bg-[#f2feff]"
                                value={message}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                    setMessage(e.target.value)
                                }
                            />
                        </label>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <Button type="submit" disabled={isPending}>
                            Lock Professor
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export function ProfessorPage() {
    const { id } = useParams<{ id: string }>();

    const [courseVisibility, setCourseVisibility] = useState<boolean[]>([]);
    const firstVisibleCourseIndex = courseVisibility.findIndex(Boolean);
    const [selectedRatingIds, setSelectedRatingIds] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirmShown, setBulkDeleteConfirmShown] = useState(false);
    const [bulkDeleteReason, setBulkDeleteReason] = useState("");
    const [bulkDeleteScopeId, setBulkDeleteScopeId] = useState(id);

    // Reset bulk-delete UI when navigating to a different professor (during render).
    if (id !== bulkDeleteScopeId) {
        setBulkDeleteScopeId(id);
        setSelectedRatingIds(new Set());
        setBulkDeleteConfirmShown(false);
        setBulkDeleteReason("");
    }

    const { data: professorData, error: fetchError } = trpc.professors.get.useQuery(
        {
            id: id ?? "",
        },
        { meta: { suppressGlobalErrorToast: true } },
    );
    const trpcContext = trpc.useUtils();
    const { isAuthenticated } = useAuth();
    const [lockModalShown, setLockModalShown] = useState(false);
    const lockProfessorMutation = trpc.admin.lockProfessor.useMutation({
        onSuccess: () => {
            void trpcContext.professors.get.invalidate({ id: id ?? "" });
            setLockModalShown(false);
            toast.success("Professor lock status updated");
        },
    });

    const bulkDeleteRatingsMutation = trpc.admin.removeRatingsBulk.useMutation({
        onSuccess: (_data, variables) => {
            void trpcContext.professors.get.invalidate({ id: variables.professorId });
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

    const sortedCourses = useSortedCourses(id);

    const [professorEvaluationShownDesktop, setProfessorEvaluationShownDesktop] = useState(false);
    const [professorEvaluationShownMobile, setProfessorEvaluationShownMobile] = useState(false);

    if (fetchError && !professorData) {
        return <Navigate to="/" replace />;
    }

    return (
        <div>
            <Modal
                isOpen={professorEvaluationShownDesktop}
                onRequestClose={() => setProfessorEvaluationShownDesktop(false)}
                style={REACT_MODAL_STYLES}
            >
                <div className="w-162 rounded-sm bg-white p-5 opacity-100 shadow-sm">
                    <TwoStepEvaluateProfessor
                        professor={professorData}
                        closeForm={() => setProfessorEvaluationShownDesktop(false)}
                    />
                </div>
            </Modal>

            <LockProfessorModal
                key={lockModalShown ? `open:${professorData?.lockedMessage ?? ""}` : "closed"}
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

            <Modal
                isOpen={bulkDeleteConfirmShown}
                onRequestClose={() =>
                    !bulkDeleteRatingsMutation.isPending && setBulkDeleteConfirmShown(false)
                }
                style={REACT_MODAL_STYLES}
            >
                <div className="w-screen max-w-md rounded-sm bg-white p-5 shadow-sm">
                    <h2 className="mb-2 text-xl font-semibold">Delete selected ratings?</h2>
                    <p className="mb-4 text-gray-600">
                        You are about to permanently delete {selectedRatingIds.size} rating
                        {selectedRatingIds.size === 1 ? "" : "s"}. This action will be logged to
                        Discord.
                    </p>
                    <label
                        className="mb-1 block text-sm font-medium text-gray-700"
                        htmlFor="bulk-delete-reason"
                    >
                        Reason for deletion (required, included in audit log)
                        <textarea
                            id="bulk-delete-reason"
                            placeholder="e.g. Spam, off-topic, policy violation"
                            className="mt-1 mb-4 block h-24 w-full resize-y rounded-sm border border-gray-300 bg-gray-50 p-2 text-black"
                            value={bulkDeleteReason}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setBulkDeleteReason(e.target.value)
                            }
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            onClick={() => setBulkDeleteConfirmShown(false)}
                            disabled={bulkDeleteRatingsMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
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
                                    toast.warn(
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
                </div>
            </Modal>

            <div className="mx-auto flex w-full justify-center px-2 pt-4 pb-3 md:justify-between md:pt-10 lg:max-w-5xl">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">{professorData?.department} Professor</h2>

                    <h1 className="text-5xl font-bold">
                        {professorData?.lastName}, {professorData?.firstName}
                    </h1>

                    {Boolean(topTags.length) && (
                        <div className="mt-4 mb-2 flex flex-wrap gap-2">
                            {topTags.map((tag) => (
                                <ProfessorTag key={tag} tagName={tag} />
                            ))}
                        </div>
                    )}

                    <StatsCard className="mt-4 mb-3 block md:hidden" professor={professorData} />

                    <div className="mt-4 hidden md:flex md:flex-wrap md:items-center md:gap-2">
                        {!professorData?.locked && (
                            <Button
                                onClick={() => setProfessorEvaluationShownDesktop(true)}
                                type="button"
                            >
                                Evaluate Professor
                            </Button>
                        )}
                        {isAuthenticated &&
                            professorData &&
                            (professorData.locked ? (
                                <Button
                                    type="button"
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
                                <Button type="button" onClick={() => setLockModalShown(true)}>
                                    <LockClosedIcon className="mr-1 inline h-4 w-4" />
                                    Lock Professor
                                </Button>
                            ))}
                    </div>

                    <div className="m-auto mt-4 flex flex-wrap items-center justify-center gap-2 md:hidden">
                        {!professorData?.locked && (
                            <Button
                                onClick={() =>
                                    setProfessorEvaluationShownMobile(
                                        !professorEvaluationShownMobile,
                                    )
                                }
                                type="button"
                            >
                                Evaluate Professor
                            </Button>
                        )}
                        {isAuthenticated &&
                            professorData &&
                            (professorData.locked ? (
                                <Button
                                    type="button"
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
                                <Button type="button" onClick={() => setLockModalShown(true)}>
                                    <LockClosedIcon className="mr-1 inline h-4 w-4" />
                                    Lock Professor
                                </Button>
                            ))}
                    </div>
                </div>{" "}
                <div>
                    <StatsCard
                        className="mt-4 mb-3 ml-8 hidden md:block"
                        professor={professorData}
                    />
                </div>
            </div>

            {professorData?.locked && (
                <div className="mx-auto mt-2 w-full px-2 lg:max-w-5xl">
                    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-4 py-3 text-amber-900">
                        <LockClosedIcon className="h-5 w-5 shrink-0" />
                        <p className="font-medium">
                            {professorData.lockedMessage ||
                                "This professor is not accepting new ratings."}
                        </p>
                    </div>
                </div>
            )}

            {/* Mobile divider */}
            <div className="h-1 w-full bg-cal-poly-green sm:hidden" />

            {/* Desktop Divider */}
            <div className="mx-auto mt-2 hidden px-2 sm:block lg:max-w-5xl">
                <div className="h-1 w-full bg-cal-poly-green" />
            </div>
            <AnimateHeight duration={500} height={professorEvaluationShownMobile ? "auto" : 0}>
                <div className="bg-cal-poly-green p-5 text-white">
                    <EvaluateProfessorFormLinear
                        professor={professorData}
                        closeForm={() => setProfessorEvaluationShownMobile(false)}
                    />
                </div>
            </AnimateHeight>

            {isAuthenticated && selectedRatingIds.size > 0 && (
                <div className="mx-auto mt-4 w-full px-2 lg:max-w-5xl">
                    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <span className="font-medium text-red-900">
                            {selectedRatingIds.size} rating{selectedRatingIds.size === 1 ? "" : "s"}{" "}
                            selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRatingIds(new Set())}
                                className="text-sm text-red-700 underline"
                            >
                                Clear selection
                            </button>
                            <Button
                                type="button"
                                onClick={() => setBulkDeleteConfirmShown(true)}
                                disabled={bulkDeleteRatingsMutation.isPending}
                            >
                                Delete selected
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {professorData &&
                sortedCourses &&
                sortedCourses.map(({ courseName, ratings }, i) => (
                    <Fragment key={courseName}>
                        <InView
                            as="div"
                            className="relative pt-4"
                            id={courseName}
                            onChange={(status) => {
                                courseVisibility[i] = status;
                                setCourseVisibility([...courseVisibility]);
                            }}
                        >
                            <div className="container m-auto flex flex-col px-2 md:max-w-5xl">
                                <h3 className="my-3 ml-2 text-4xl font-semibold">{courseName}</h3>
                                {ratings.map((rating) => (
                                    <RatingCard
                                        key={rating.id}
                                        rating={rating}
                                        professorId={professorData.id}
                                        showBulkDeleteCheckbox={isAuthenticated}
                                        isSelected={selectedRatingIds.has(rating.id)}
                                        onToggleSelect={() => toggleRatingSelection(rating.id)}
                                    />
                                ))}
                            </div>
                        </InView>
                        {/* Add space outside the interaction observer to get scroll to highlight correct course */}
                        <div className="block h-2 w-full" />
                    </Fragment>
                ))}
            {!sortedCourses?.length && (
                <h2 className="mt-10 text-center text-4xl text-cal-poly-green">
                    Be the first to add a rating!
                </h2>
            )}
            <ClassScroll
                courses={sortedCourses}
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
                innerClassName={(_, i) =>
                    `text-lg font-semibold mt-2 rounded-xl px-2 py-[0.1rem] text-center ${
                        firstVisibleCourseIndex === i
                            ? "bg-cal-poly-gold text-white"
                            : "text-cal-poly-green"
                    }`
                }
            />
            {/* Mobile class scroll needs room to see all ratings */}
            <div className="block h-16 w-full xl:hidden" />
            <ClassScroll
                courses={sortedCourses}
                outerClassName={`${
                    professorEvaluationShownMobile ? "hidden" : "flex"
                } items-center xl:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hide`}
                innerClassName={() =>
                    "text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
                }
            />
        </div>
    );
}

function ClassScroll({
    courses,
    outerClassName,
    innerClassName,
}: {
    courses: ReturnType<typeof useSortedCourses>;
    outerClassName: string;
    innerClassName: (course: string, index: number) => string;
}) {
    return (
        <div className={outerClassName}>
            {courses?.map(({ courseName }, i) => (
                <AnchorLink
                    key={courseName}
                    href={`#${courseName}`}
                    className={innerClassName(courseName, i)}
                >
                    {courseName}
                </AnchorLink>
            ))}
        </div>
    );
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
        // Box shadow taken from figma
        <div
            className={`flex min-w-88 flex-col gap-1 rounded-lg px-6 py-5 shadow-[0_0_50px_rgba(0,0,0,0.15)] sm:min-w-108 ${className}`}
        >
            <div className="mb-3 flex justify-between align-bottom">
                <div className="flex items-center">
                    <span className="text-6xl font-bold">
                        {naEvalZero(professor?.overallRating)}
                    </span>
                    <span className="ml-1 hidden text-4xl font-bold sm:block">/4</span>
                </div>
                <div className="flex flex-col justify-end gap-0.5">
                    <p className="text-right text-sm font-medium">
                        {professor?.numEvals} Evaluations
                    </p>
                    <StarRatings
                        rating={professor?.overallRating}
                        starRatedColor="#BD8B13"
                        numberOfStars={4}
                        starDimension="1.8em"
                        starSpacing="3px"
                    />
                </div>
            </div>
            <div className="flex justify-between rounded-sm bg-gray-200 px-3 py-2 font-medium">
                <p>Recognizes Difficulties</p>
                <div className="flex items-center">
                    {/* Hack since star ratings will not items-center properly */}
                    <div className="mb-[0.13rem]">
                        <StarRatings
                            rating={professor?.studentDifficulties}
                            starRatedColor="#BD8B13"
                            numberOfStars={4}
                            starDimension="1.1rem"
                            starSpacing="1px"
                        />
                    </div>
                    <span className="mr-1 ml-4 hidden sm:block">
                        {naEvalZero(professor?.studentDifficulties)}
                    </span>
                </div>
            </div>
            <div className="mt-2 flex justify-between rounded-sm bg-gray-200 px-3 py-2 font-medium">
                <p>Presents Clearly</p>
                <div className="flex items-center">
                    {/* Hack since star ratings will not items-center properly */}
                    <div className="mb-[0.13rem]">
                        <StarRatings
                            rating={professor?.materialClear}
                            starRatedColor="#BD8B13"
                            numberOfStars={4}
                            starDimension="1.1rem"
                            starSpacing="1px"
                        />
                    </div>
                    <span className="mr-1 ml-4 hidden sm:block">
                        {naEvalZero(professor?.materialClear)}
                    </span>
                </div>
            </div>
        </div>
    );
}

interface RatingCardProps {
    professorId: string;
    rating: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>[0];
    showBulkDeleteCheckbox?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}
function RatingCard({
    rating,
    professorId,
    showBulkDeleteCheckbox = false,
    isSelected = false,
    onToggleSelect,
}: RatingCardProps) {
    return (
        <div className="relative my-2 flex w-full flex-col rounded-3xl border-4 border-cal-poly-green bg-white px-6 py-3 md:flex-row">
            <div className="mr-4 hidden shrink-0 flex-col gap-1 text-center md:flex">
                <div className="mb-2">
                    {/* Only show stars for ratings from the new site */}
                    {new Date(rating.postDate).getFullYear() >= 2022 && (
                        <StarRatings
                            rating={rating?.overallRating}
                            starRatedColor="#BD8B13"
                            numberOfStars={4}
                            starDimension="1.1rem"
                            starSpacing="1px"
                        />
                    )}
                </div>
                <p className="whitespace-nowrap"> Grade Received: {rating.grade}</p>
                <p>{rating.courseType}</p>
                <p>{rating.gradeLevel}</p>
            </div>

            <div className="m-auto flex gap-4 align-middle text-sm md:hidden">
                {/* Only show stars for ratings from the new site */}
                {new Date(rating.postDate).getFullYear() >= 2022 && (
                    <StarRatings
                        rating={rating?.overallRating}
                        starRatedColor="#BD8B13"
                        numberOfStars={4}
                        starDimension="1.1rem"
                        starSpacing="1px"
                    />
                )}
                {/* Weird padding to algin star ratings */}
                <p className="pt-[0.07rem]"> Grade Received: {rating.grade}</p>
                <p className="pt-[0.07rem]">{rating.gradeLevel}</p>
            </div>

            {/* Desktop divider */}
            <div className="mt-2 mr-4 mb-2 hidden w-[0.08rem] shrink-0 bg-black md:flex" />
            {/* Mobile divider */}
            <div className="m-auto my-2 flex h-[0.08rem] w-4/5 bg-black md:hidden" />

            <div className="grow py-3">
                <p className="mb-2 text-xl font-semibold">
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </p>
                <p>{rating.rating}</p>
                <div className="mt-2 flex justify-between">
                    {/* A little hack to get the desired behavior with overflowing line and keeping report at bottom right */}
                    <div className="pt-0.5">
                        <div className="flex flex-wrap gap-1 md:gap-3">
                            {rating.tags
                                // Attempt to sort tags from small to large to have them on the same line
                                ?.sort((a, b) => a.length - b.length)
                                ?.map((tag) => (
                                    <ProfessorTag key={tag} tagName={tag} />
                                ))}
                        </div>
                    </div>
                    <div className="flex flex-col-reverse items-end gap-2">
                        <div className="flex items-center gap-2">
                            {showBulkDeleteCheckbox && (
                                <label
                                    className="flex cursor-pointer items-center gap-2"
                                    htmlFor={`rating-select-${rating.id}`}
                                >
                                    <input
                                        id={`rating-select-${rating.id}`}
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={onToggleSelect}
                                        className="rounded border-gray-300"
                                        aria-label="Select rating for bulk delete"
                                    />
                                    <span className="text-sm text-gray-600">Select</span>
                                </label>
                            )}
                            <ReportButton
                                className="ml-2 md:ml-10"
                                professorId={professorId}
                                ratingId={rating.id}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
            <Modal
                isOpen={formShown}
                style={REACT_MODAL_STYLES}
                onRequestClose={() => setFormShown(false)}
            >
                <div className="w-screen rounded-sm bg-white p-5 shadow-sm sm:w-140">
                    <ReportForm
                        professorId={professorId}
                        ratingId={ratingId}
                        closeForm={() => setFormShown(false)}
                    />
                </div>
            </Modal>

            <button aria-label="Report Rating" type="button" onClick={() => setFormShown(true)}>
                <FlagIcon className="m-auto mt-1 h-6 w-6 cursor-pointer text-gray-500 transition-all hover:text-red-500" />
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
        .pipe(z.email().optional()),
    reason: z
        .string()
        .min(1, { error: "Leaving a reason will help the team make an informed decision" }),
});

type ReportFormInputs = z.infer<typeof reportFormParser>;

function ReportForm({ closeForm, professorId, ratingId }: ReportFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormInputs>({
        resolver: zodResolver(reportFormParser),
    });

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
                className="absolute top-0 right-0 cursor-pointer p-3 font-bold"
                onClick={closeForm}
                type="button"
            >
                X
            </button>
            <h2 className="mb-4 text-3xl font-semibold">Report Rating</h2>
            <TextInput
                wrapperClassName="w-full!"
                label="Email (Optional)"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register("email")}
            />
            <TextArea
                label="Reason For Reporting"
                placeholder="This Review was offensive and contained inappropriate language."
                wrapperClassName="mt-2"
                className="h-40!"
                error={errors.reason?.message}
                {...register("reason")}
            />
            {reportMutation.error && (
                <p className="mt-2 text-sm text-red-500">
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

type ProfessorTagProps = {
    tagName: string;
};
function ProfessorTag({ tagName }: ProfessorTagProps) {
    return (
        <div className="flex items-center rounded-sm bg-cal-poly-light-green px-2 py-0.5 text-xs text-cal-poly-green md:text-base">
            <TagIcon className="h-2 w-2 md:h-3 md:w-3" />
            <span className="ml-1 font-medium md:ml-2">{tagName}</span>
        </div>
    );
}
