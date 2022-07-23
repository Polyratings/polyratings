import { useForm, SubmitHandler } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import {
    GradeLevel,
    Grade,
    CourseType,
    GRADE_LEVELS,
    GRADES,
    DEPARTMENT_LIST,
    COURSE_TYPES,
    Department,
} from "@backend/utils/const";
import { inferQueryOutput, trpc } from "@/trpc";

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

type Teacher = inferQueryOutput<"getProfessor">;

interface EvaluateTeacherFormProps {
    teacher?: Teacher | null;
    closeForm?: () => void;
}
export function EvaluateTeacherForm({ teacher, closeForm }: EvaluateTeacherFormProps) {
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
    const trpcContext = trpc.useContext();
    const {
        mutate: uploadNewRating,
        isLoading,
        error,
    } = trpc.useMutation("addNewRating", {
        onSuccess: () => {
            toast.success("Thank you for your review");
            // TODO: Figure out how to invalidate individual professor
            trpcContext.invalidateQueries("getProfessor");
        },
    });

    const onSubmit: SubmitHandler<EvaluateTeacherFormInputs> = async (formResult) => {
        const courseNum =
            formResult.knownClass && formResult.knownClass !== "other"
                ? parseInt(formResult.knownClass.split(" ")[1], 10)
                : parseInt(formResult.unknownClassNumber, 10);
        const department =
            formResult.knownClass && formResult.knownClass !== "other"
                ? formResult.knownClass.split(" ")[0]
                : formResult.unknownClassDepartment;

        uploadNewRating({
            professor: teacher?.id ?? "",
            courseNum,
            department: department as Department,
            overallRating: Number(formResult.overallRating),
            presentsMaterialClearly: Number(formResult.presentsMaterialClearly),
            recognizesStudentDifficulties: Number(formResult.recognizesStudentDifficulties),
            grade: formResult.grade,
            courseType: formResult.reasonForTaking,
            rating: formResult.reviewText,
            gradeLevel: formResult.year,
        });
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
            options: GRADE_LEVELS,
        },
        {
            label: "Grade Achieved",
            inputName: "grade",
            options: GRADES,
        },
        {
            label: "Reason For Taking",
            inputName: "reasonForTaking",
            options: COURSE_TYPES,
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
        <form className="relative w-full" onSubmit={handleSubmit(onSubmit)}>
            {teacher && (
                <div
                    className="absolute right-0 top-0 p-3 font-bold cursor-pointer hidden sm:block"
                    onClick={closeForm}
                >
                    X
                </div>
            )}
            {teacher && (
                <h2 className="text-2xl font-bold hidden sm:block mb-4">
                    Evaluate {teacher.lastName}, {teacher.firstName}
                </h2>
            )}

            <h4>Class</h4>
            <div className="flex flex-col sm:flex-row sm:justify-between">
                {teacher && (
                    <select className="h-7 rounded w-40 text-black" {...register("knownClass")}>
                        {sortedCourses.map((c) => (
                            <option value={c} key={c}>
                                {c}
                            </option>
                        ))}
                        <option value="">Other</option>
                    </select>
                )}

                <div
                    className="text-black pt-1 sm:pt-0"
                    style={{ display: knownClassValue ? "none" : "block" }}
                >
                    <select className="h-7 rounded" {...register("unknownClassDepartment")}>
                        {DEPARTMENT_LIST.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <input
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
                        <div className="mt-1 flex justify-between">
                            <h4>{rating.label}</h4>
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
                                            {...register(rating.inputName)}
                                        />
                                        <label className="mr-3 hidden md:block">{n}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                        <div className="mt-1 flex justify-between">
                            <h4>{dropdown.label}</h4>
                            <select
                                {...register(dropdown.inputName)}
                                className="w-40 text-black rounded"
                            >
                                {dropdown.options.map((option) => (
                                    <option value={option} key={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
            <h4 className="mt-4">Review:</h4>
            <textarea
                {...register("reviewText", {
                    required: { value: true, message: "Writing a review is required" },
                    minLength: {
                        value: 20,
                        message: "Review text must be at least 20 characters long",
                    },
                })}
                className="w-full h-64 rounded text-black p-2"
            />
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
                            style={{ display: isLoading ? "none" : "block" }}
                            type="submit"
                        >
                            Submit
                        </button>
                        {/* Exact size for no layer shift */}
                        <ClipLoader color="#1F4715" loading={isLoading} size={34} />
                    </div>
                )}
            </div>
            <div className="text-red-500 text-sm">{error}</div>
        </form>
    );
}
