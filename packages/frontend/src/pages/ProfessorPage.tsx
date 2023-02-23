/* eslint-disable react/no-unstable-nested-components */
import { useState } from "react";
import { IndexRouteObject, useNavigate, useParams } from "react-router-dom";
import AnimateHeight from "react-animate-height";
import AnchorLink from "react-anchor-link-smooth-scroll";
import { ValueOf } from "type-fest";
import Modal from "react-modal";
import { FlagIcon } from "@heroicons/react/24/solid/index";
import { z } from "zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { EvaluateProfessorForm, TextArea, TextInput } from "@/components";
import { trpc } from "@/trpc";
import { REACT_MODAL_STYLES } from "@/constants";
import { Button } from "@/components/forms/Button";

interface CourseRatings {
    course: string;
    ratings: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>;
}

export function professorPageLoaderFactory(trpcContext: ReturnType<typeof trpc["useContext"]>) {
    const professorPageLoader: IndexRouteObject["loader"] = ({ params }) =>
        trpcContext.professors.get.getData({ id: params.id ?? "" }) ??
        trpcContext.professors.get.fetch({ id: params.id ?? "" });

    return professorPageLoader;
}

export function ProfessorPage() {
    const { id } = useParams<{ id: string }>();

    const { data: professorData, error: fetchError } = trpc.professors.get.useQuery({
        id: id ?? "",
    });

    // Put classes for professors primary department first. This is to cut down on rating spamming
    // of other departments. It is possible for a professor to teach outside of the department but
    // it is ok if those ratings come after the primary department

    // Sort Into Departments
    const professorByDepartments = Object.entries(professorData?.reviews || {}).reduce(
        (acc, [course, ratings]) => {
            const obj: CourseRatings = { course, ratings };
            const [department] = course.split(" ");
            if (acc[department]) {
                acc[department].push(obj);
            } else {
                acc[department] = [obj];
            }
            return acc;
        },
        {} as { [department: string]: CourseRatings[] },
    );

    // Sort departments by class number
    Object.values(professorByDepartments).forEach((department) =>
        department.sort((a, b) => {
            const [, aNumber] = a.course.split(" ");
            const [, bNumber] = b.course.split(" ");
            return parseInt(aNumber, 10) - parseInt(bNumber, 10);
        }),
    );

    const primaryClasses = professorByDepartments[professorData?.department ?? ""] ?? [];
    const otherClasses = Object.entries(professorByDepartments)
        .filter(([department]) => department !== professorData?.department)
        .flatMap(([, courseRatings]) => courseRatings);

    const professorRatings = [...primaryClasses, ...otherClasses].map((courseRating) => {
        // Be carful the array is sorted in place. This is fine here but if moved could cause issues.
        courseRating.ratings.sort((a, b) => Date.parse(b.postDate) - Date.parse(a.postDate));
        return courseRating;
    });

    const navigate = useNavigate();
    if (fetchError) {
        navigate("/");
    }
    const [professorEvaluationShownDesktop, setProfessorEvaluationShownDesktop] = useState(false);
    const [professorEvaluationShownMobile, setProfessorEvaluationShownMobile] = useState(false);

    const NaEvalZero = (val: number | undefined) => {
        if (professorData?.numEvals) {
            return val?.toFixed(2);
        }
        return "N/A";
    };

    function ClassScroll({
        outerClassName,
        innerClassName,
    }: {
        outerClassName: string;
        innerClassName: string;
    }) {
        return (
            <div className={outerClassName}>
                {professorRatings &&
                    professorRatings.map(({ course }) => (
                        <a key={course} href={`#${course}`} className={innerClassName}>
                            {course}
                        </a>
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
                <div className="bg-white opacity-100 rounded shadow p-5 w-[40rem]">
                    <EvaluateProfessorForm
                        professor={professorData}
                        closeForm={() => setProfessorEvaluationShownDesktop(false)}
                    />
                </div>
            </Modal>

            <div className="lg:max-w-5xl w-full mx-auto hidden sm:flex justify-between py-2 px-2">
                <div>
                    <h2 className="text-4xl text-cal-poly-green">
                        {professorData?.lastName}, {professorData?.firstName}
                    </h2>
                    <Button
                        onClick={() => setProfessorEvaluationShownDesktop(true)}
                        className="mt-2"
                        type="button"
                    >
                        Evaluate Professor
                    </Button>
                </div>{" "}
                <div className="text-right">
                    <h2 className="text-4xl text-cal-poly-green">
                        {NaEvalZero(professorData?.overallRating)} / 4.00
                    </h2>
                    <p>{professorData?.numEvals} evaluations</p>
                    <p>
                        {" "}
                        Recognizes Student Difficulties:{" "}
                        {NaEvalZero(professorData?.studentDifficulties)}
                    </p>
                    <p>Presents Material Clearly: {NaEvalZero(professorData?.materialClear)}</p>
                </div>
            </div>

            <div className="sm:hidden container py-2 text-center">
                <h2 className="text-4xl text-cal-poly-green">
                    {professorData?.lastName}, {professorData?.firstName}
                </h2>
                <p>{professorData?.department}</p>
                <p>Overall Rating: {NaEvalZero(professorData?.overallRating)} / 4.00</p>
                <p>
                    Recognizes Student Difficulties:{" "}
                    {NaEvalZero(professorData?.studentDifficulties)}
                </p>
                <p>Presents Material Clearly: {NaEvalZero(professorData?.materialClear)}</p>
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
                professorRatings &&
                professorRatings.map(({ course, ratings }) => (
                    <div key={course} className="pt-4 relative" id={course}>
                        <h2 className="text-center text-4xl text-cal-poly-green">{course}</h2>
                        <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                            {ratings.map((rating, i) => (
                                <RatingCard
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={i}
                                    rating={rating}
                                    professorId={professorData.id}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            {!professorRatings?.length && (
                <h2 className="text-4xl text-center text-cal-poly-green mt-10">
                    Be the first to add a rating!
                </h2>
            )}
            <ClassScroll
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
                innerClassName="text-cal-poly-green text-lg font-semibold mt-2"
            />
            {/* Mobile class scroll needs room to see all ratings */}
            <div className="block xl:hidden h-16 w-full" />
            <ClassScroll
                outerClassName="flex items-center xl:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden"
                innerClassName="text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
            />
        </div>
    );
}

interface RatingCardProps {
    professorId: string;
    rating: ValueOf<inferProcedureOutput<AppRouter["professors"]["get"]>["reviews"]>[0];
}
function RatingCard({ rating, professorId }: RatingCardProps) {
    return (
        <div className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex flex-col md:flex-row relative">
            <div className="hidden md:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
                <div>{rating.gradeLevel}</div>
                <div>{rating.grade}</div>
                <div>{rating.courseType}</div>
                <div>
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <ReportButton professorId={professorId} ratingId={rating.id} />
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
            <div className="hidden md:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0" />
            {/* Mobile divider */}
            <div className="flex md:hidden bg-cal-poly-green w-4/5 h-1 m-auto my-2" />

            <div className="flex-grow">{rating.rating}</div>
        </div>
    );
}

interface ReportButtonProps {
    professorId: string;
    ratingId: string;
}
function ReportButton({ professorId, ratingId }: ReportButtonProps) {
    const [formShown, setFormShown] = useState(false);
    return (
        <div>
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
