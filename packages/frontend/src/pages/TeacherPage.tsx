/* eslint-disable react/no-unstable-nested-components */
import { useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import AnimateHeight from "react-animate-height";
import AnchorLink from "react-anchor-link-smooth-scroll";
import StarRatings from "react-star-ratings";
import { ValueOf } from "type-fest";
import { Backdrop, ClassSection, EvaluateTeacherForm } from "@/components";
import { inferQueryOutput, trpc } from "@/trpc";

interface ClassReviews {
    course: string;
    reviews: ValueOf<inferQueryOutput<"getProfessor">["reviews"]>;
}

export function TeacherPage() {
    const { id } = useParams<{ id: string }>();

    const { data: teacherData, error: fetchError } = trpc.useQuery(["getProfessor", id]);

    // Put classes for teachers primary department first. This is to cut down on review spamming
    // of other departments. It is possible for a teacher to teach outside of the department but
    // it is ok if those reviews come after the primary department

    // Sort Into Departments
    const teacherByDepartments = Object.entries(teacherData?.reviews || {}).reduce(
        (acc, [course, reviews]) => {
            const obj: ClassReviews = { course, reviews };
            const [department] = course.split(" ");
            if (acc[department]) {
                acc[department].push(obj);
            } else {
                acc[department] = [obj];
            }
            return acc;
        },
        {} as { [department: string]: ClassReviews[] },
    );

    // Sort departments by class number
    Object.values(teacherByDepartments).forEach((deparment) =>
        deparment.sort((a, b) => {
            const [, aNumber] = a.course.split(" ");
            const [, bNumber] = b.course.split(" ");
            return parseInt(aNumber, 10) - parseInt(bNumber, 10);
        }),
    );

    const primaryClasses = teacherByDepartments[teacherData?.department ?? ""] ?? [];
    const otherClasses = Object.entries(teacherByDepartments)
        .filter(([department]) => department !== teacherData?.department)
        .flatMap(([, classReviews]) => classReviews);

    const teacherReviews = [...primaryClasses, ...otherClasses].map((classReview) => {
        // Be carful the array is sorted in place. This is fine here but if moved could cause issues.
        classReview.reviews.sort((a, b) => Date.parse(b.postDate) - Date.parse(a.postDate));
        return classReview;
    });

    const history = useHistory();
    if (fetchError) {
        history.push("/");
    }
    const [teacherEvaluationShownDesktop, setTeacherEvaluationShownDesktop] = useState(false);
    const [teacherEvaluationShownMobile, setTeacherEvaluationShownMobile] = useState(false);

    const NaEvalZero = (val: number | undefined) => {
        if (teacherData?.numEvals) {
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
                {teacherReviews &&
                    teacherReviews.map(({ course }) => (
                        <AnchorLink key={course} href={`#${course}`} className={innerClassName}>
                            {course}
                        </AnchorLink>
                    ))}
            </div>
        );
    }

    return (
        <div>
            {teacherEvaluationShownDesktop && (
                <Backdrop>
                    <div
                        className="bg-gray-300 opacity-100 rounded shadow p-5"
                        style={{ width: "40rem" }}
                    >
                        <EvaluateTeacherForm
                            teacher={teacherData}
                            closeForm={() => setTeacherEvaluationShownDesktop(false)}
                        />
                    </div>
                </Backdrop>
            )}

            <div className="lg:max-w-5xl w-full mx-auto hidden sm:flex justify-between py-2 px-2">
                <div>
                    <h2 className="text-4xl text-cal-poly-green">
                        {teacherData?.lastName}, {teacherData?.firstName}
                    </h2>
                    <div>
                        {Boolean(teacherData?.overallRating) && (
                            <StarRatings
                                rating={teacherData?.overallRating}
                                starRatedColor="#BD8B13"
                                numberOfStars={4}
                                starDimension="1.5rem"
                                starSpacing="5px "
                            />
                        )}
                    </div>
                    <button
                        onClick={() => setTeacherEvaluationShownDesktop(true)}
                        className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2"
                        type="button"
                    >
                        Evaluate Teacher
                    </button>
                </div>{" "}
                <div className="text-right">
                    <h2 className="text-4xl text-cal-poly-green">
                        {NaEvalZero(teacherData?.overallRating)} / 4.00
                    </h2>
                    <p>{teacherData?.numEvals} evaluations</p>
                    <p>
                        {" "}
                        Recognizes Student Difficulties:{" "}
                        {NaEvalZero(teacherData?.studentDifficulties)}
                    </p>
                    <p>Presents Material Clearly: {NaEvalZero(teacherData?.materialClear)}</p>
                </div>
            </div>

            <div className="sm:hidden container py-2 text-center">
                <h2 className="text-4xl text-cal-poly-green">
                    {teacherData?.lastName}, {teacherData?.firstName}
                </h2>
                <p>{teacherData?.department}</p>
                <p>Overall Rating: {NaEvalZero(teacherData?.overallRating)} / 4.00</p>
                <p>
                    Recognizes Student Difficulties: {NaEvalZero(teacherData?.studentDifficulties)}
                </p>
                <p>Presents Material Clearly: {NaEvalZero(teacherData?.materialClear)}</p>
                <button
                    onClick={() => setTeacherEvaluationShownMobile(!teacherEvaluationShownMobile)}
                    className="bg-cal-poly-green text-white rounded-lg p-2 shadow mt-2"
                    type="button"
                >
                    {teacherEvaluationShownMobile ? "Close Evaluation" : "Evaluate Teacher"}
                </button>
            </div>

            {/* Mobile divider */}
            <div className="sm:hidden bg-cal-poly-green h-1 w-full" />

            {/* Desktop Divider */}
            <div className="hidden sm:block lg:max-w-5xl mx-auto mt-2 px-2">
                <div className="bg-cal-poly-green h-1 w-full" />
            </div>
            <AnimateHeight duration={500} height={teacherEvaluationShownMobile ? "auto" : 0}>
                <div className="bg-cal-poly-green text-white p-5">
                    <EvaluateTeacherForm
                        teacher={teacherData}
                        closeForm={() => setTeacherEvaluationShownMobile(false)}
                    />
                </div>
            </AnimateHeight>

            {teacherData &&
                teacherReviews &&
                teacherReviews.map(({ course, reviews }) => (
                    <ClassSection
                        key={course}
                        ratings={reviews}
                        course={course}
                        professorId={teacherData.id}
                    />
                ))}
            {!teacherReviews?.length && (
                <h2 className="text-4xl text-center text-cal-poly-green mt-10">
                    Be the first to add a rating!
                </h2>
            )}
            <ClassScroll
                outerClassName="hidden xl:flex flex-col fixed ml-4 top-1/2 transform -translate-y-1/2 max-h-10/12 overflow-y-auto"
                innerClassName="text-cal-poly-green text-lg font-semibold mt-2"
            />
            {/* Mobile class scroll needs room to see all reviews */}
            <div className="block xl:hidden h-16 w-full" />
            <ClassScroll
                outerClassName="flex items-center xl:hidden h-14 fixed bg-cal-poly-green w-full bottom-0 overflow-x-auto scrollbar-hidden"
                innerClassName="text-md font-semibold h-8 bg-cal-poly-gold text-white ml-4 rounded-xl py-1 px-2 whitespace-nowrap"
            />
        </div>
    );
}
