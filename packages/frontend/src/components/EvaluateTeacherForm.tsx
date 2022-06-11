import { RefObject, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import {
    CourseType,
    Grade,
    GradeLevel,
    Teacher,
    AddReviewRequest,
    NewReviewBase,
    GradeOptions,
    GradeLevelOptions,
    CourseTypeOptions,
    DEPARTMENT_LIST,
} from "@polyratings/client";
import { ReviewService } from "@/services";
import { useService } from "@/hooks";

interface EvaluateTeacherFormInputs {
    knownClass: string | undefined;
    overallRating: string;
    recognizesStudentDifficulties: string;
    presentsMaterialClearly: string;
    reviewText: string;
    unknownClassDepartment: string;
    unknownClassNumber: string;
    year: GradeLevel;
    grade: Grade;
    reasonForTaking: CourseType;
}

interface EvaluateTeacherFormProps {
    teacher?: Teacher | null;
    setTeacher?: (teacher: Teacher) => void;
    closeForm?: () => void;
    overrideSubmitHandler?: (review: NewReviewBase) => void | Promise<void>;
    innerRef?: RefObject<HTMLFormElement>;
}
export function EvaluateTeacherForm({
    teacher,
    setTeacher,
    closeForm,
    overrideSubmitHandler,
    innerRef,
}: EvaluateTeacherFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<EvaluateTeacherFormInputs>({
        defaultValues: {
            knownClass: Object.keys(teacher?.reviews || {})[0],
        },
    });

    const knownClassValue = watch("knownClass");
    const reviewService = useService(ReviewService);
    const [networkErrorText, setNetworkErrorText] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit: SubmitHandler<EvaluateTeacherFormInputs> = async (formResult) => {
        setLoading(true);
        const courseNum =
            formResult.knownClass && formResult.knownClass !== "other"
                ? parseInt(formResult.knownClass.split(" ")[1], 10)
                : parseInt(formResult.unknownClassNumber, 10);
        const department =
            formResult.knownClass && formResult.knownClass !== "other"
                ? formResult.knownClass.split(" ")[0]
                : formResult.unknownClassDepartment;

        const reviewBase: NewReviewBase = {
            gradeLevel: formResult.year,
            grade: formResult.grade,
            courseType: formResult.reasonForTaking,
            courseNum,
            department,
            overallRating: parseFloat(formResult.overallRating),
            presentsMaterialClearly: parseFloat(formResult.presentsMaterialClearly),
            recognizesStudentDifficulties: parseFloat(formResult.recognizesStudentDifficulties),
            rating: formResult.reviewText,
        };

        if (overrideSubmitHandler) {
            overrideSubmitHandler(reviewBase);
        } else {
            try {
                // The non-null assertion is safe since the override is for when there is no teacher
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const body: AddReviewRequest = { professor: teacher!.id, ...reviewBase };
                const updatedProfessor = await reviewService.uploadReview(body);
                if (setTeacher) {
                    setTeacher(updatedProfessor);
                }
                toast.success("Thank you for your review");
                if (closeForm) {
                    closeForm();
                }
            } catch (e) {
                setNetworkErrorText((e as Error).toString());
            }
        }
        setLoading(false);
    };

    const numericalRatings: { label: string; inputName: keyof EvaluateTeacherFormInputs }[] = [
        { label: "Overall Rating", inputName: "overallRating" },
        { label: "Recognizes Student Difficulties", inputName: "recognizesStudentDifficulties" },
        { label: "Presents Material Clearly", inputName: "presentsMaterialClearly" },
    ];

    const classInformation: {
        label: string;
        inputName: keyof EvaluateTeacherFormInputs;
        options: Readonly<string[]>;
    }[] = [
        {
            label: "Year",
            inputName: "year",
            options: GradeLevelOptions,
        },
        {
            label: "Grade Achieved",
            inputName: "grade",
            options: GradeOptions,
        },
        {
            label: "Reason For Taking",
            inputName: "reasonForTaking",
            options: CourseTypeOptions,
        },
    ];

    const departmentGroups = Object.keys(teacher?.reviews || {})?.reduce((acc, curr) => {
        const [department] = curr.split(" ");
        if (acc[department]) {
            acc[department].push(curr);
        } else {
            acc[department] = [curr];
        }
        return acc;
    }, {} as Record<string, string[]>);

    const sortedCourses = Object.values(departmentGroups)
        .map((group) =>
            group.sort((courseA, courseB) => {
                const numberA = parseFloat(courseA.split(" ")[1]);
                const numberB = parseFloat(courseB.split(" ")[1]);
                return numberA - numberB;
            }),
        )
        .sort((groupA, groupB) => {
            const [departmentA] = groupA[0].split(" ");
            const [departmentB] = groupB[0].split(" ");
            if (departmentA === teacher?.department) {
                return -1;
            }
            if (departmentB === teacher?.department) {
                return 1;
            }
            if (departmentA < departmentB) {
                return -1;
            }
            if (departmentA > departmentB) {
                return 1;
            }
            return 0;
        })
        .flat();

    return (
        <form className="relative w-full" onSubmit={handleSubmit(onSubmit)} ref={innerRef}>
            {teacher && (
                <button
                    className="absolute right-0 top-0 p-3 font-bold cursor-pointer hidden sm:block"
                    onClick={closeForm}
                    type="button"
                    title="Close Form"
                >
                    X
                </button>
            )}
            {teacher && (
                <h2 className="text-2xl font-bold hidden sm:block mb-4">
                    Evaluate {teacher.lastName}, {teacher.firstName}
                </h2>
            )}

            <h4>Class</h4>
            <div className="flex flex-col sm:flex-row sm:justify-between">
                {teacher && (
                    <>
                        {/* Think this is needed since the label will be hidden */}
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="known-class-select" className="hidden">
                            Course Select
                        </label>
                        <select
                            className="h-7 rounded w-40 text-black"
                            id="known-class-select"
                            {...register("knownClass")}
                        >
                            {sortedCourses.map((c) => (
                                <option value={c} key={c}>
                                    {c}
                                </option>
                            ))}
                            <option value="">Other</option>
                        </select>
                    </>
                )}

                {!knownClassValue && (
                    <div className="text-black pt-1 sm:pt-0">
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="department-select" className="hidden">
                            Department
                        </label>
                        <select
                            id="department-select"
                            className="h-7 rounded"
                            {...register("unknownClassDepartment")}
                        >
                            {DEPARTMENT_LIST.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label htmlFor="course-number-select" className="hidden">
                            Course Number
                        </label>
                        <input
                            id="course-number-select"
                            className="h-7 w-16 ml-2 rounded appearance-none"
                            type="number"
                            placeholder="class #"
                            {...register("unknownClassNumber", {
                                required: {
                                    value: !knownClassValue,
                                    message: "Class Number is required",
                                },
                            })}
                        />
                    </div>
                )}
            </div>
            <ErrorMessage
                errors={errors}
                name="unknownClassNumber"
                as="div"
                className="text-red-500 text-sm"
            />
            <div className="mt-2">
                {numericalRatings.map((rating) => (
                    <div key={rating.label}>
                        <fieldset className="mt-1 flex justify-between">
                            <legend className="hidden">{rating.label}</legend>
                            <h3>{rating.label}</h3>
                            <div className="flex">
                                <select
                                    {...register(rating.inputName)}
                                    className="text-black rounded md:hidden"
                                >
                                    {[4, 3, 2, 1, 0].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                                {[0, 1, 2, 3, 4].map((n) => (
                                    <div key={n} className="hidden md:flex items-center">
                                        <input
                                            type="radio"
                                            className="mr-1 form-radio w-[0.8rem] h-[0.8rem] border-2 border-black rounded-full"
                                            value={n}
                                            id={`${rating.label}-radio-${n}`}
                                            {...register(rating.inputName)}
                                        />
                                        <label
                                            htmlFor={`${rating.label}-radio-${n}`}
                                            className="mr-3 hidden md:block"
                                        >
                                            {n}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                        <ErrorMessage
                            errors={errors}
                            name={rating.inputName}
                            as="div"
                            className="text-red-500 text-sm"
                        />
                    </div>
                ))}
            </div>
            <div className="mt-2">
                {classInformation.map((dropdown) => (
                    <div key={dropdown.label}>
                        <label
                            htmlFor={`${dropdown.label}-select`}
                            className="mt-1 flex justify-between"
                        >
                            <div>{dropdown.label}</div>
                            <select
                                {...register(dropdown.inputName)}
                                className="w-40 text-black rounded"
                                id={`${dropdown.label}-select`}
                            >
                                {dropdown.options.map((option) => (
                                    <option value={option} key={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                ))}
            </div>
            {/* Spacer for label since it is inline */}
            <div className="mt-4" />
            <label htmlFor="rating-writeup">
                Review:
                <textarea
                    id="rating-writeup"
                    {...register("reviewText", {
                        required: { value: true, message: "Writing a review is required" },
                        minLength: {
                            value: 20,
                            message: "Review text must be at least 20 characters long",
                        },
                    })}
                    className="w-full h-64 rounded text-black p-2"
                />
            </label>
            <ErrorMessage
                errors={errors}
                name="reviewText"
                as="div"
                className="text-red-500 text-sm"
            />
            <div className="flex justify-center mt-2">
                {teacher && (
                    <div>
                        <button
                            className="bg-cal-poly-gold sm:bg-cal-poly-green text-white rounded-lg p-2 shadow w-24"
                            style={{ display: loading ? "none" : "block" }}
                            type="submit"
                        >
                            Submit
                        </button>
                        {/* Exact size for no layer shift */}
                        <ClipLoader color="#1F4715" loading={loading} size={34} />
                    </div>
                )}
            </div>
            <div className="text-red-500 text-sm">{networkErrorText}</div>
        </form>
    );
}
