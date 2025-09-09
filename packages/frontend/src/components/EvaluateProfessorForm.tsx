/* eslint-disable react/no-unstable-nested-components */
import { useForm, SubmitHandler, UseFormReturn, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import {
    GRADE_LEVELS,
    GRADES,
    DEPARTMENT_LIST,
    COURSE_TYPES,
    Department,
    PROFESSOR_TAGS,
} from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { UserIcon } from "@heroicons/react/24/solid";

import { trpc } from "@/trpc";
import { Select, TextArea } from "./forms";
import { TextInput } from "./forms/TextInput";
import { Button } from "./forms/Button";
import { useSortedCourses } from "@/hooks";
import { FormBar } from "./FormBar";
import { TagSelection } from "./TagSelection";

interface EvaluateProfessorFormProps {
    professor?: inferProcedureOutput<AppRouter["professors"]["get"]>;
    closeForm: () => void;
}

export function TwoStepEvaluateProfessor({ professor, closeForm }: EvaluateProfessorFormProps) {
    // Professor should really be valid at this point
    if (!professor) {
        // eslint-disable-next-line react/jsx-no-useless-fragment
        return <></>;
    }

    const { onSubmit, hookForm, networkError, isPending } = useEvaluationForm(professor, closeForm);
    const { control, trigger: triggerValidation } = hookForm;

    return (
        <form className="relative w-full" onSubmit={onSubmit}>
            <button
                className="absolute right-0 top-0 p-3 font-bold cursor-pointer hidden sm:block"
                onClick={closeForm}
                type="button"
            >
                X
            </button>

            <div className="flex mb-4 items-end">
                <UserIcon className="w-6 h-6 mb-[0.1rem] mr-2 fill-cal-poly-green" />
                <h2 className="text-2xl font-bold hidden sm:block">
                    Evaluate {professor.lastName}, {professor.firstName}
                </h2>
            </div>

            <FormBar
                firstStep={() => <EvaluateProfessorStep {...hookForm} professor={professor} />}
                secondStep={() => (
                    <Controller
                        control={control}
                        name="tags"
                        render={({ field: { onChange } }) => (
                            <TagSelection onChange={onChange} variant="desktop-primary" />
                        )}
                    />
                )}
                isLoading={isPending}
                triggerValidation={triggerValidation}
            />

            <div className="text-red-500 text-sm">{networkError?.message}</div>
        </form>
    );
}

export function EvaluateProfessorFormLinear({ professor, closeForm }: EvaluateProfessorFormProps) {
    // Professor should really be valid at this point
    if (!professor) {
        return <div />;
    }
    const { onSubmit, hookForm, isPending, networkError } = useEvaluationForm(professor, closeForm);
    const { control } = hookForm;

    return (
        <form className="relative w-full" onSubmit={onSubmit}>
            <EvaluateProfessorStep {...hookForm} professor={professor} />

            <Controller
                control={control}
                name="tags"
                render={({ field: { onChange } }) => (
                    <TagSelection onChange={onChange} variant="mobile-secondary" />
                )}
            />

            <div className={`flex justify-center ${isPending ? "hidden" : "block"}`}>
                <Button variant="tertiary" type="submit">
                    Submit
                </Button>
            </div>

            <div className="flex justify-center">
                {/* Exact size for no layer shift */}
                <ClipLoader color="white" loading={isPending} size={34} />
            </div>
            <div className="text-red-500 text-sm">{networkError?.message}</div>
        </form>
    );
}

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
    { label: "Recognizes Difficulties", inputName: "recognizesStudentDifficulties" },
    { label: "Presents Clearly", inputName: "presentsMaterialClearly" },
] as const;

function EvaluateProfessorStep({
    watch,
    register,
    professor,
    formState: { errors },
}: UseFormReturn<EvaluateProfessorFormInputs, unknown, EvaluateProfessorFormOutputs> &
    Pick<EvaluateProfessorFormProps, "professor">) {
    const knownCourseValue = watch("knownCourse");

    const sortedCourses = useSortedCourses(professor?.id).map(({ courseName }) => courseName);

    return (
        <>
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
                wrapperClassName="my-4"
                label="Rating"
                error={errors.ratingText?.message}
            />
        </>
    );
}

const evaluateProfessorFormParser = z.object({
    knownCourse: z.string(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z.string().min(20, { error: "Rating text must be at least 20 characters long" }),
    unknownCourseDepartment: z.enum(DEPARTMENT_LIST).optional(),
    unknownCourseNumber: z.coerce
        .number()
        .min(100, { error: "Invalid" })
        .max(599, { error: "Invalid" })
        .optional(),
    gradeLevel: z.enum(GRADE_LEVELS),
    grade: z.enum(GRADES),
    courseType: z.enum(COURSE_TYPES),
    tags: z.enum(PROFESSOR_TAGS).array().optional(),
});

type EvaluateProfessorFormInputs = z.input<typeof evaluateProfessorFormParser>;
type EvaluateProfessorFormOutputs = z.output<typeof evaluateProfessorFormParser>;

function useEvaluationForm(
    professor: inferProcedureOutput<AppRouter["professors"]["get"]>,
    closeForm: () => void,
) {
    const hookForm = useForm<EvaluateProfessorFormInputs, unknown, EvaluateProfessorFormOutputs>({
        resolver: zodResolver(evaluateProfessorFormParser),
        defaultValues: {
            knownCourse: Object.keys(professor.reviews || {})[0],
        },
    });
    const { setError } = hookForm;

    const trpcContext = trpc.useUtils();
    const {
        mutate: uploadRating,
        isPending,
        error: networkError,
    } = trpc.ratings.add.useMutation({
        onSuccess: (updatedProfessor) => {
            try {
                toast.success("Thank you for your rating");
                trpcContext.professors.get.setData({ id: updatedProfessor.id }, updatedProfessor);
                closeForm?.();
            } catch {
                // No need to catch error since it is displayed in the ui
            }
        },
    });

    const onSubmitHandler: SubmitHandler<EvaluateProfessorFormOutputs> = async (formResult) => {
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

        uploadRating({
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
            tags: formResult.tags,
        });
    };

    return {
        hookForm,
        isPending,
        networkError,
        onSubmit: hookForm.handleSubmit(onSubmitHandler),
    };
}
