/* eslint-disable react/no-unstable-nested-components */
import { Fragment, useState } from "react";
import type { IndexRouteObject } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import AnimateHeight from "react-animate-height";
import AnchorLink from "react-anchor-link-smooth-scroll";
import StarRatings from "react-star-ratings";
import type { ValueOf } from "type-fest";
import Modal from "react-modal";
import { TagIcon } from "@heroicons/react/24/solid";
import { FlagIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@backend/index";
import { InView } from "react-intersection-observer";
import { TwoStepEvaluateProfessor, TextArea, TextInput, EvaluateProfessorFormLinear } from "@/components";
import { trpc } from "@/trpc";
import { REACT_MODAL_STYLES } from "@/constants";
import { Button } from "@/components/forms/Button";
import { useSortedCourses } from "@/hooks";

export function professorPageLoaderFactory(trpcContext: ReturnType<(typeof trpc)["useContext"]>) {
    const professorPageLoader: IndexRouteObject["loader"] = ({ params }) =>
        trpcContext.professors.get.getData({ id: params.id ?? "" }) ??
        trpcContext.professors.get.fetch({ id: params.id ?? "" });

    return professorPageLoader;
}

export function ProfessorPage() {
    const { id } = useParams<{ id: string }>();

    const [courseVisibility, setCourseVisibility] = useState<boolean[]>([]);
    const firstVisibleCourseIndex = courseVisibility.findIndex(Boolean);

    const { data: professorData, error: fetchError } = trpc.professors.get.useQuery({
        id: id ?? "",
    });

    const topTags = Object.entries(professorData?.tags ?? {})
        .sort(([, aNum], [, bNum]) => bNum - aNum)
        .map(([tagName]) => tagName)
        .slice(0, 4);

    const navigate = useNavigate();
    if (fetchError) {
        navigate("/");
    }

    const sortedCourses = useSortedCourses(id);

    const [professorEvaluationShownDesktop, setProfessorEvaluationShownDesktop] = useState(false);
    const [professorEvaluationShownMobile, setProfessorEvaluationShownMobile] = useState(false);

    function ClassScroll({
        outerClassName,
        innerClassName,
    }: {
        outerClassName: string;
        innerClassName: (course: string, index: number) => string;
    }) {
        return (
            <div className={outerClassName}>
                {sortedCourses &&
                    sortedCourses.map(({ courseName }, i) => (
                        <AnchorLink key={courseName} href={`#${courseName}`} className={innerClassName(courseName, i)}>
                            {courseName}
                        </AnchorLink>
                    ))}
            </div>
        );
    }

    return (
        <div>
            <Modal
                isOpen={professorEvaluationShownDesktop}
                onRequestClose={() => setProfessorEvaluationShownDesktop(false)}
                style={REACT_MODAL_STYLES}
            >
                <div className="w-[40.5rem] rounded bg-white p-5 opacity-100 shadow">
                    <TwoStepEvaluateProfessor
                        professor={professorData}
                        closeForm={() => setProfessorEvaluationShownDesktop(false)}
                    />
                </div>
            </Modal>

            <div className="mx-auto flex w-full justify-center px-2 pb-3 pt-4 md:justify-between md:pt-10 lg:max-w-5xl">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">{professorData?.department} Professor</h2>

                    <h1 className="text-5xl font-bold">
                        {professorData?.lastName}, {professorData?.firstName}
                    </h1>

                    {Boolean(topTags.length) && (
                        <div className="mb-2 mt-4 flex flex-wrap gap-2">
                            {topTags.map((tag) => (
                                <ProfessorTag key={tag} tagName={tag} />
                            ))}
                        </div>
                    )}

                    <StatsCard className="mb-3 mt-4 block md:hidden" professor={professorData} />

                    <div className="hidden md:block">
                        <Button onClick={() => setProfessorEvaluationShownDesktop(true)} className="mt-4" type="button">
                            Evaluate Professor
                        </Button>
                    </div>

                    <div className="m-auto block md:hidden">
                        <Button
                            onClick={() => setProfessorEvaluationShownMobile(!professorEvaluationShownMobile)}
                            className="mt-4"
                            type="button"
                        >
                            Evaluate Professor
                        </Button>
                    </div>
                </div>{" "}
                <div>
                    <StatsCard className="mb-3 ml-8 mt-4 hidden md:block" professor={professorData} />
                </div>
            </div>

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
                                    <RatingCard key={rating.id} rating={rating} professorId={professorData.id} />
                                ))}
                            </div>
                        </InView>
                        {/* Add space outside the interaction observer to get scroll to highlight correct course */}
                        <div className="block h-2 w-full" />
                    </Fragment>
                ))}
            {!sortedCourses?.length && (
                <h2 className="mt-10 text-center text-4xl text-cal-poly-green">Be the first to add a rating!</h2>
            )}
            <ClassScroll
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
                innerClassName={(_, i) =>
                    `text-lg font-semibold mt-2 rounded-xl px-2 py-[0.1rem] text-center ${
                        firstVisibleCourseIndex === i ? "bg-cal-poly-gold text-white" : "text-cal-poly-green"
                    }`
                }
            />
            {/* Mobile class scroll needs room to see all ratings */}
            <div className="block h-16 w-full xl:hidden" />
            <ClassScroll
                outerClassName={`${
                    professorEvaluationShownMobile ? "hidden" : "flex"
                } items-center xl:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden`}
                innerClassName={() =>
                    "text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
                }
            />
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
            className={`flex min-w-[22rem] flex-col gap-1 rounded-lg px-6 py-5 shadow-[0_0_50px_rgba(0,0,0,0.15)] sm:min-w-[27rem] ${className}`}
        >
            <div className="mb-3 flex justify-between align-bottom">
                <div className="flex items-center">
                    <span className="text-6xl font-bold">{naEvalZero(professor?.overallRating)}</span>
                    <span className="ml-1 hidden text-4xl font-bold sm:block">/4</span>
                </div>
                <div className="flex flex-col justify-end gap-[0.125rem]">
                    <p className="text-right text-sm font-medium">{professor?.numEvals} Evaluations</p>
                    <StarRatings
                        rating={professor?.overallRating}
                        starRatedColor="#BD8B13"
                        numberOfStars={4}
                        starDimension="1.8em"
                        starSpacing="3px"
                    />
                </div>
            </div>
            <div className="flex justify-between rounded bg-gray-200 px-3 py-2 font-medium">
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
                    <span className="ml-4 mr-1 hidden sm:block">{naEvalZero(professor?.studentDifficulties)}</span>
                </div>
            </div>
            <div className="mt-2 flex justify-between rounded bg-gray-200 px-3 py-2 font-medium">
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
                    <span className="ml-4 mr-1 hidden sm:block">{naEvalZero(professor?.materialClear)}</span>
                </div>
            </div>
        </div>
    );
}

interface RatingCardProps {
    professorId: string;
    rating: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>[0];
}
function RatingCard({ rating, professorId }: RatingCardProps) {
    return (
        <div className="relative my-2 flex w-full flex-col rounded-3xl border-4 border-cal-poly-green bg-white px-6 py-3 md:flex-row">
            <div className="mr-4 hidden flex-shrink-0 flex-col gap-1 text-center md:flex">
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
            <div className="my-2 mr-4 hidden w-[0.08rem] flex-shrink-0 bg-black md:flex" />
            {/* Mobile divider */}
            <div className="m-auto my-2 flex h-[0.08rem] w-4/5 bg-black md:hidden" />

            <div className="flex-grow py-3">
                <p className="mb-2 text-xl font-semibold">
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </p>
                <p>{rating.rating}</p>
                <div className="mt-2 flex justify-between">
                    {/* A little hack to get the desired behavior with overflowing line and keeping report at bottom right */}
                    <div className="pt-[0.125rem]">
                        <div className="flex flex-wrap gap-1 md:gap-3">
                            {rating.tags
                                // Attempt to sort tags from small to large to have them on the same line
                                ?.sort((a, b) => a.length - b.length)
                                ?.map((tag) => <ProfessorTag key={tag} tagName={tag} />)}
                        </div>
                    </div>
                    <div className="flex flex-col-reverse">
                        <ReportButton className="ml-2 md:ml-10" professorId={professorId} ratingId={rating.id} />
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
            <Modal isOpen={formShown} style={REACT_MODAL_STYLES} onRequestClose={() => setFormShown(false)}>
                <div className="w-screen rounded bg-white p-5 shadow sm:w-[35rem]">
                    <ReportForm professorId={professorId} ratingId={ratingId} closeForm={() => setFormShown(false)} />
                </div>
            </Modal>

            <button aria-label="Report Rating" type="button" onClick={() => setFormShown(true)}>
                <FlagIcon className="h-6 w-6 m-auto mt-1 text-gray-500 hover:text-red-500 transition-all cursor-pointer" />
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
    email: z.string().email().optional(),
    reason: z.string().min(1, { message: "Leaving a reason will help the team make an informed decision" }),
});

type ReportFormInputs = z.infer<typeof reportFormParser>;

function ReportForm({ closeForm, professorId, ratingId }: ReportFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormInputs>();

    const reportMutation = trpc.ratings.report.useMutation();

    const onSubmit: SubmitHandler<ReportFormInputs> = async (formResult) => {
        // Silently log error and tell the user that there report was successful
        // While dishonest it will lead to a better experience in the case there is an error
        reportMutation.mutate({
            professorId,
            ratingId,
            email: formResult.email ?? "",
            reason: formResult.reason,
        });
        closeForm();
        toast.success("Thank you for the report. The team will review it soon");
    };

    return (
        <form className="relative text-left" onSubmit={handleSubmit(onSubmit)}>
            <button className="absolute right-0 top-0 cursor-pointer p-3 font-bold" onClick={closeForm} type="button">
                X
            </button>
            <h2 className="mb-4 text-3xl font-semibold">Report Rating</h2>
            <TextInput
                wrapperClassName="!w-full"
                label="Email (Optional)"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register("email")}
            />
            <TextArea
                label="Reason For Reporting"
                placeholder="This Review was offensive and contained inappropriate language."
                wrapperClassName="mt-2"
                className="!h-40"
                {...register("reason")}
            />
            <div className="flex justify-center">
                <Button className="mt-4" type="submit">
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
        <div className="flex items-center rounded bg-cal-poly-light-green px-2 py-[0.125rem] text-xs text-cal-poly-green md:text-base">
            <TagIcon className="h-2 w-2 md:h-3 md:w-3" />
            <span className="ml-1 font-medium md:ml-2">{tagName}</span>
        </div>
    );
}
