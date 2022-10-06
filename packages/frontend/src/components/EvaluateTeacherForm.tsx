import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import {
    GRADE_LEVELS,
    GRADES,
    DEPARTMENT_LIST,
    COURSE_TYPES,
    Department,
} from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferQueryOutput, trpc } from "@/trpc";
import { Select, TextArea } from "./forms";
import { TextInput } from "./forms/TextInput";
import { Button } from "./forms/Button";

export const CLASS_INFORMATION = [
    {
        label: "Year",
        inputName: "gradeLevel",
        options: GRADE_LEVELS,
    },
    {
        label: "Grade Achieved",
        inputName: "grade",
        options: GRADES,
    },
    {
        label: "Reason For Taking",
        inputName: "courseType",
        options: COURSE_TYPES,
    },
] as const;

export const NUMERICAL_RATINGS = [
    { label: "Overall Rating", inputName: "overallRating" },
    { label: "Recognizes Student Difficulties", inputName: "recognizesStudentDifficulties" },
    { label: "Presents Material Clearly", inputName: "presentsMaterialClearly" },
] as const;

const evaluateProfessorFormParser = z.object({
    knownCourse: z.string(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z.string().min(20, { message: "Review text must be at least 20 characters long" }),
    unknownCourseDepartment: z.enum(DEPARTMENT_LIST).optional(),
    unknownCourseNumber: z
        .number()
        .min(100, { message: "Invalid" })
        .max(599, { message: "Invalid" })
        .optional(),
    gradeLevel: z.enum(GRADE_LEVELS),
    grade: z.enum(GRADES),
    courseType: z.enum(COURSE_TYPES),
});

type EvaluateTeacherFormInputs = z.infer<typeof evaluateProfessorFormParser>;

type Teacher = inferQueryOutput<"getProfessor">;

interface EvaluateTeacherFormProps {
    professor?: Teacher | null;
    closeForm?: () => void;
}
export function EvaluateTeacherForm({ professor, closeForm }: EvaluateTeacherFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        setError,
        formState: { errors },
    } = useForm<EvaluateTeacherFormInputs>({
        resolver: zodResolver(evaluateProfessorFormParser),
        defaultValues: {
            knownCourse: Object.keys(professor?.reviews || {})[0],
        },
    });

    const knownCourseValue = watch("knownCourse");
    const trpcContext = trpc.useContext();
    const { mutateAsync: finalizeRatingUpload, error: finalizeError } =
        trpc.useMutation("processRating");
    const {
        mutate: uploadNewRating,
        isLoading,
        error: startError,
    } = trpc.useMutation("addNewRating", {
        onSuccess: async (id) => {
            try {
                await finalizeRatingUpload(id);
                toast.success("Thank you for your review");
                trpcContext.invalidateQueries(["getProfessor", { id }]);
                closeForm?.();
            } catch {
                // No need to catch error since it is displayed in the ui
            }
        },
    });

    const onSubmit: SubmitHandler<EvaluateTeacherFormInputs> = async (formResult) => {
        const courseNum = formResult.knownCourse
            ? parseInt(formResult.knownCourse.split(" ")[1], 10)
            : formResult.unknownCourseNumber;

        const department = formResult.knownCourse
            ? (formResult.knownCourse.split(" ")[0] as Department)
            : formResult.unknownCourseDepartment;

        if (!courseNum) {
            setError("unknownCourseNumber", { type: "Custom", message: "Required" });
        }

        if (!department) {
            setError("unknownCourseDepartment", { type: "Custom", message: "Required" });
        }

        if (!department || !courseNum) {
            return;
        }

        uploadNewRating({
            professor: professor?.id ?? "",
            courseNum,
            department,
            overallRating: formResult.overallRating,
            presentsMaterialClearly: formResult.presentsMaterialClearly,
            recognizesStudentDifficulties: formResult.recognizesStudentDifficulties,
            grade: formResult.grade,
            courseType: formResult.courseType,
            rating: formResult.ratingText,
            gradeLevel: formResult.gradeLevel,
        });
    };

    const departmentGroups = Object.keys(professor?.reviews || {})?.reduce((acc, curr) => {
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
            if (departmentA === professor?.department) {
                return -1;
            }
            if (departmentB === professor?.department) {
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
            <button
                className="absolute right-0 top-0 p-3 font-bold cursor-pointer hidden sm:block"
                onClick={closeForm}
                type="button"
            >
                X
            </button>

            <h2 className="text-2xl font-bold hidden sm:block mb-4">
                Evaluate {professor?.lastName}, {professor?.firstName}
            </h2>

            <div className="flex justify-between flex-wrap">
                <Select
                    label="Course"
                    options={[
                        ...sortedCourses.map((course) => ({ value: course, label: course })),
                        { label: "Other", value: "" },
                    ]}
                    {...register("knownCourse")}
                    error={errors.knownCourse?.message}
                />

                {!knownCourseValue && (
                    <>
                        <Select
                            options={DEPARTMENT_LIST.map((d) => ({ label: d, value: d }))}
                            label="Department"
                            {...register("unknownCourseDepartment")}
                            error={errors.unknownCourseDepartment?.message}
                        />
                        <TextInput
                            label="Course Num"
                            type="number"
                            placeholder="class #"
                            {...register("unknownCourseNumber", {
                                required: {
                                    value: !knownCourseValue,
                                    message: "Class Number is required",
                                },
                            })}
                            error={errors.unknownCourseDepartment?.message}
                        />
                    </>
                )}
            </div>
            <div className="flex sm:block justify-between">
                <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-between flex-wrap">
                    {NUMERICAL_RATINGS.map((rating) => (
                        <Select
                            key={rating.label}
                            label={rating.label}
                            {...register(rating.inputName)}
                            options={[4, 3, 2, 1, 0].map((n) => ({
                                label: `${n}`,
                                value: `${n}`,
                            }))}
                            error={errors[rating.inputName]?.message}
                        />
                    ))}
                </div>
                <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-between flex-wrap">
                    {CLASS_INFORMATION.map((dropdown) => (
                        <Select
                            key={dropdown.label}
                            {...register(dropdown.inputName)}
                            options={dropdown.options.map((option) => ({
                                label: option,
                                value: option,
                            }))}
                            label={dropdown.label}
                            error={errors[dropdown.inputName]?.message}
                        />
                    ))}
                </div>
            </div>
            <TextArea
                {...register("ratingText")}
                wrapperClassName="mt-4"
                label="Rating"
                error={errors.ratingText?.message}
            />
            <div className="flex justify-center mt-2">
                {professor && (
                    <div>
                        <Button
                            className={`${
                                isLoading ? "hidden" : "block"
                            } !bg-cal-poly-gold md:!bg-cal-poly-green`}
                            type="submit"
                        >
                            Submit
                        </Button>
                        {/* Exact size for no layer shift */}
                        <ClipLoader color="#1F4715" loading={isLoading} size={34} />
                    </div>
                )}
            </div>
            <div className="text-red-500 text-sm">{startError ?? finalizeError}</div>
        </form>
    );
}
