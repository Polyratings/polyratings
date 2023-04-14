/* eslint-disable react/no-unstable-nested-components */
import { Fragment, useState } from "react";
import { IndexRouteObject, useNavigate, useParams } from "react-router-dom";
import AnimateHeight from "react-animate-height";
import AnchorLink from "react-anchor-link-smooth-scroll";
import StarRatings from "react-star-ratings";
import { ValueOf } from "type-fest";
import Modal from "react-modal";
import { TagIcon } from "@heroicons/react/24/solid";
import { FlagIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { InView } from "react-intersection-observer";
import { EvaluateProfessorForm, TextArea, TextInput } from "@/components";
import { trpc } from "@/trpc";
import { REACT_MODAL_STYLES } from "@/constants";
import { Button } from "@/components/forms/Button";
import { useSortedCourses } from "@/hooks";

const TAG_DEMO = false;

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

    const naEvalZero = (val: number | undefined) => {
        if (professorData?.numEvals) {
            return val?.toFixed(2);
        }
        return "N/A";
    };

    return (
        <div>
            <Modal
                isOpen={professorEvaluationShownDesktop}
                onRequestClose={() => setProfessorEvaluationShownDesktop(false)}
                style={REACT_MODAL_STYLES}
            >
                <div className="bg-white opacity-100 rounded shadow p-5 w-[40rem]">
                    <EvaluateProfessorForm
                        professor={professorData}
                        closeForm={() => setProfessorEvaluationShownDesktop(false)}
                    />
                </div>
            </Modal>

            <div className="lg:max-w-5xl w-full mx-auto hidden sm:flex justify-between pt-10 pb-3 px-2">
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold">{professorData?.department} Professor</h2>

                    <h1 className="text-5xl font-bold">
                        {professorData?.lastName}, {professorData?.firstName}
                    </h1>

                    {TAG_DEMO && (
                        <div className="flex gap-2 flex-wrap mt-4 mb-2">
                            <ProfessorTag tagName="Records Lectures" />
                            <ProfessorTag tagName="Flexible Attendance Policy" />
                            <ProfessorTag tagName="Zoom Office Hours" />
                            <ProfessorTag tagName="High Availability" />
                        </div>
                    )}

                    <div>
                        <Button
                            onClick={() => setProfessorEvaluationShownDesktop(true)}
                            className="mt-4"
                            type="button"
                        >
                            Evaluate Professor
                        </Button>
                    </div>
                </div>{" "}
                <div>
                    <StatsCard className="mt-4 mb-3 ml-8" professor={professorData} />
                </div>
            </div>

            <div className="sm:hidden container py-2 text-center">
                <h2 className="text-4xl text-cal-poly-green">
                    {professorData?.lastName}, {professorData?.firstName}
                </h2>
                <p>{professorData?.department}</p>
                <p>Overall Rating: {naEvalZero(professorData?.overallRating)} / 4.00</p>
                <p>
                    Recognizes Student Difficulties:{" "}
                    {naEvalZero(professorData?.studentDifficulties)}
                </p>
                <p>Presents Material Clearly: {naEvalZero(professorData?.materialClear)}</p>
                <Button
                    onClick={() =>
                        setProfessorEvaluationShownMobile(!professorEvaluationShownMobile)
                    }
                    className="mt-2"
                    type="button"
                >
                    {professorEvaluationShownMobile ? "Close Evaluation" : "Evaluate Professor"}
                </Button>
            </div>

            {/* Mobile divider */}
            <div className="sm:hidden bg-cal-poly-green h-1 w-full" />

            {/* Desktop Divider */}
            <div className="hidden sm:block lg:max-w-5xl mx-auto mt-2 px-2">
                <div className="bg-cal-poly-green h-1 w-full" />
            </div>
            <AnimateHeight duration={500} height={professorEvaluationShownMobile ? "auto" : 0}>
                <div className="bg-cal-poly-green text-white p-5">
                    <EvaluateProfessorForm
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
                            className="pt-4 relative"
                            id={courseName}
                            onChange={(status) => {
                                courseVisibility[i] = status;
                                setCourseVisibility([...courseVisibility]);
                            }}
                        >
                            <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                                <h3 className="text-4xl font-semibold my-3 ml-2">{courseName}</h3>
                                {ratings.map((rating) => (
                                    <RatingCard
                                        key={rating.id}
                                        rating={rating}
                                        professorId={professorData.id}
                                    />
                                ))}
                            </div>
                        </InView>
                        {/* Add space outside the interaction observer to get scroll to highlight correct course */}
                        <div className="block h-2 w-full" />
                    </Fragment>
                ))}
            {!sortedCourses?.length && (
                <h2 className="text-4xl text-center text-cal-poly-green mt-10">
                    Be the first to add a rating!
                </h2>
            )}
            <ClassScroll
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
                innerClassName={(_, i) =>
                    `text-lg font-semibold mt-2 rounded-xl px-2 py-[0.1rem] ${
                        firstVisibleCourseIndex === i
                            ? "bg-cal-poly-gold text-white"
                            : "text-cal-poly-green"
                    }`
                }
            />
            {/* Mobile class scroll needs room to see all ratings */}
            <div className="block xl:hidden h-16 w-full" />
            <ClassScroll
                outerClassName="flex items-center xl:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden"
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
            className={`flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.15)] rounded-lg gap-1 py-5 px-6 min-w-[27rem] ${className}`}
        >
            <div className="flex justify-between mb-3 align-bottom">
                <div className="flex items-center">
                    <span className="text-6xl font-bold">
                        {naEvalZero(professor?.overallRating)}
                    </span>
                    <span className="text-4xl font-bold ml-1">/4</span>
                </div>
                <div className="flex flex-col justify-end gap-[0.125rem]">
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
            <div className="flex justify-between font-medium bg-gray-200 px-3 py-2 rounded">
                <p>Recognizes Student Difficulties</p>
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
                    <span className="ml-4 mr-1">{naEvalZero(professor?.studentDifficulties)}</span>
                </div>
            </div>
            <div className="flex justify-between font-medium bg-gray-200 px-3 py-2 rounded">
                <p>Presents Material Clearly</p>
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
                    <span className="ml-4 mr-1">{naEvalZero(professor?.materialClear)}</span>
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
        <div className="bg-white w-full rounded-3xl py-3 px-6 my-2 border-cal-poly-green border-4 flex flex-col md:flex-row relative">
            <div className="hidden md:flex flex-col gap-1 w-32 flex-shrink-0 m-auto mr-4 text-center">
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
                <div> Grade Relieved: {rating.grade}</div>
                <div>{rating.courseType}</div>
                <div>{rating.gradeLevel}</div>
            </div>

            <div className="flex md:hidden flex-col flex-shrink-0 m-auto text-center text-sm">
                <div>Grade Received: {rating.grade}</div>
                <div>
                    Posted:{" "}
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <div className="absolute right-5 top-2">
                    <ReportButton professorId={professorId} ratingId={rating.id} />
                </div>
            </div>

            {/* Desktop divider */}
            <div className="hidden md:flex bg-black w-[0.08rem] mr-4 mt-2 mb-2 flex-shrink-0" />
            {/* Mobile divider */}
            <div className="flex md:hidden bg-cal-poly-green w-4/5 h-1 m-auto my-2" />

            <div className="flex-grow py-3">
                <p className="text-xl font-semibold mb-2">
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </p>
                <p>{rating.rating}</p>
                <div className="flex justify-between mt-2">
                    {/* A little hack to get the desired behavior with overflowing line and keeping report at bottom right */}
                    <div className="pt-[0.125rem]">
                        <div className="flex gap-3 flex-wrap">
                            <ProfessorTag tagName="Flexible Attendance Policy" />
                            <ProfessorTag tagName="Zoom Office Hours" />
                            <ProfessorTag tagName="High Availability" />
                        </div>
                    </div>
                    <div className="flex flex-col-reverse">
                        <ReportButton
                            className="ml-10"
                            professorId={professorId}
                            ratingId={rating.id}
                        />
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
                <div className="bg-white rounded shadow p-5 w-[35rem]">
                    <ReportForm
                        professorId={professorId}
                        ratingId={ratingId}
                        closeForm={() => setFormShown(false)}
                    />
                </div>
            </Modal>

            <button type="button" onClick={() => setFormShown(true)}>
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
    reason: z
        .string()
        .min(1, { message: "Leaving a reason will help the team make an informed decision" }),
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
            <button
                className="absolute right-0 top-0 p-3 font-bold cursor-pointer"
                onClick={closeForm}
                type="button"
            >
                X
            </button>
            <h2 className="text-3xl font-semibold mb-4">Report Rating</h2>
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
    if (!TAG_DEMO) {
        // eslint-disable-next-line react/jsx-no-useless-fragment
        return <></>;
    }

    return (
        <div className="flex items-center rounded px-2 py-[0.125rem] bg-cal-poly-light-green text-cal-poly-green">
            <TagIcon className="w-3 h-3" />
            <span className="font-medium ml-2">{tagName}</span>
        </div>
    );
}
