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
    MAX_PROFESSOR_TAGS_PER_RATING,
} from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { UserIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { trpc } from "@/trpc";
import { Select, TextArea } from "./forms";
import { TextInput } from "./forms/TextInput";
import { Button } from "./forms/Button";
import { useSortedCourses } from "@/hooks";

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

    const { onSubmit, hookForm, startError, finalizeError, isLoading } = useEvaluationForm(
        professor,
        closeForm,
    );
    const { control, trigger: triggerValidation } = hookForm;

    const [formStep, setFormStep] = useState<"first" | "second">("first");

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

            <div className="w-[24rem] my-4 m-auto">
                <div className="flex mb-1">
                    <div
                        className={`w-1/2 text-center text-sm ${
                            formStep === "first" ? "font-semibold" : "font-normal"
                        }`}
                    >
                        Write Review
                    </div>
                    <div
                        className={`w-1/2 text-center text-sm ${
                            formStep === "second" ? "font-semibold" : "font-normal"
                        }`}
                    >
                        Course Accessibility
                    </div>
                </div>
                <div className="h-1 rounded bg-gray-200 relative transition-all">
                    <div
                        className={`absolute w-1/2 h-1 rounded bg-cal-poly-green ${
                            formStep === "first" ? "left-0" : "left-1/2"
                        }`}
                    />
                </div>
            </div>

            {formStep === "first" && <EvaluateProfessorStep {...hookForm} professor={professor} />}

            {formStep === "second" && (
                <Controller
                    control={control}
                    name="tags"
                    render={({ field: { onChange } }) => (
                        <TagSelection onChange={onChange} variant="desktop" />
                    )}
                />
            )}

            <div
                className={`flex justify-center gap-6 mt-2 ${
                    isLoading || formStep !== "first" ? "hidden" : "block"
                } `}
            >
                <Button variant="secondary" type="submit">
                    Skip Course Accessability
                </Button>
                <Button
                    type="button"
                    onClick={async () =>
                        (await triggerValidation(undefined, { shouldFocus: true })) &&
                        setFormStep("second")
                    }
                >
                    Next
                </Button>
            </div>

            <div
                className={`flex justify-center gap-6 mt-2 ${
                    isLoading || formStep !== "second" ? "hidden" : "block"
                } `}
            >
                <Button type="button" variant="secondary" onClick={() => setFormStep("first")}>
                    Back
                </Button>
                <Button type="submit">Submit</Button>
            </div>

            <div className="flex justify-center">
                {/* Exact size for no layer shift */}
                <ClipLoader color="#1F4715" loading={isLoading} size={34} />
            </div>
            <div className="text-red-500 text-sm">{startError ?? finalizeError}</div>
        </form>
    );
}

export function EvaluateProfessorFormLinear({ professor, closeForm }: EvaluateProfessorFormProps) {
    // Professor should really be valid at this point
    if (!professor) {
        return <div />;
    }
    const { onSubmit, hookForm, isLoading, startError, finalizeError } = useEvaluationForm(
        professor,
        closeForm,
    );
    const { control } = hookForm;

    return (
        <form className="relative w-full" onSubmit={onSubmit}>
            <EvaluateProfessorStep {...hookForm} professor={professor} />

            <Controller
                control={control}
                name="tags"
                render={({ field: { onChange } }) => (
                    <TagSelection onChange={onChange} variant="mobile" />
                )}
            />

            <div className={`flex justify-center ${isLoading ? "hidden" : "block"}`}>
                <Button variant="tertiary" type="submit">
                    Submit
                </Button>
            </div>

            <div className="flex justify-center">
                {/* Exact size for no layer shift */}
                <ClipLoader color="white" loading={isLoading} size={34} />
            </div>
            <div className="text-red-500 text-sm">{startError ?? finalizeError}</div>
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
}: UseFormReturn<EvaluateProfessorFormInputs> & Pick<EvaluateProfessorFormProps, "professor">) {
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

type Platform = "desktop" | "mobile";

type TagSelectionProps = {
    onChange: (tags: string[]) => void;
    variant: Platform;
};
function TagSelection({ onChange, variant }: TagSelectionProps) {
    const [tagState, setTagState] = useState(
        PROFESSOR_TAGS.map((tagText) => ({ tagText, selected: false })),
    );

    const selectedTags = tagState.filter(({ selected }) => selected);

    return (
        <>
            {variant === "desktop" && (
                <h2 className="font-bold text-2xl mb-4">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h2>
            )}
            {variant === "mobile" && (
                <h3 className="text-xs mb-2">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h3>
            )}
            <div className="flex gap-2 flex-wrap mb-4">
                {tagState.map((tag, i) => (
                    <SelectableTag
                        variant={variant}
                        key={tag.tagText}
                        disabled={
                            selectedTags.length === MAX_PROFESSOR_TAGS_PER_RATING && !tag.selected
                        }
                        {...tag}
                        onClick={() => {
                            const copy = [...tagState];
                            copy[i].selected = !copy[i].selected;
                            onChange(
                                copy
                                    .filter(({ selected }) => selected)
                                    .map(({ tagText }) => tagText),
                            );
                            setTagState(copy);
                        }}
                    />
                ))}
            </div>
        </>
    );
}

export interface SelectableTagProps extends React.ComponentProps<"button"> {
    variant: Platform;
    tagText: string;
    selected: boolean;
}
function SelectableTag({
    variant,
    tagText,
    selected,
    className: buttonClassName,
    disabled,
    ...buttonProps
}: SelectableTagProps) {
    const selectedVariantMap = {
        desktop: "bg-cal-poly-light-green border-[0.1rem]",
        mobile: "border-cal-poly-gold border-2 font-bold bg-white",
    };

    const unselectedVariantMap = {
        desktop: `${disabled ? "bg-gray-100" : "bg-white"} border-cal-poly-green border-[0.1rem]`,
        mobile: `${disabled ? "bg-gray-300" : "bg-white"} border-2`,
    };

    const pseudoExpander =
        "after:content-[attr(title)] after:block after:font-bold after:h-1 after:text-transparent after:overflow-hidden";

    const className = selected
        ? `${pseudoExpander} py-1 px-2 h-9 font-nunito font-semibold text-cal-poly-green rounded-lg ${selectedVariantMap[variant]} ${buttonClassName}`
        : `${pseudoExpander} font-nunito font-[350] text-cal-poly-green py-1 px-2 h-9 rounded-lg ${unselectedVariantMap[variant]} ${buttonClassName}`;

    return (
        <button
            type="button"
            {...buttonProps}
            title={tagText}
            disabled={disabled && !selected}
            className={`${className}`}
        >
            {tagText}
        </button>
    );
}

const evaluateProfessorFormParser = z.object({
    knownCourse: z.string(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z.string().min(20, { message: "Rating text must be at least 20 characters long" }),
    unknownCourseDepartment: z.enum(DEPARTMENT_LIST).optional(),
    unknownCourseNumber: z.coerce
        .number()
        .min(100, { message: "Invalid" })
        .max(599, { message: "Invalid" })
        .optional(),
    gradeLevel: z.enum(GRADE_LEVELS),
    grade: z.enum(GRADES),
    courseType: z.enum(COURSE_TYPES),
    tags: z.enum(PROFESSOR_TAGS).array().optional(),
});

type EvaluateProfessorFormInputs = z.infer<typeof evaluateProfessorFormParser>;

function useEvaluationForm(
    professor: inferProcedureOutput<AppRouter["professors"]["get"]>,
    closeForm: () => void,
) {
    const hookForm = useForm<EvaluateProfessorFormInputs>({
        resolver: zodResolver(evaluateProfessorFormParser),
        defaultValues: {
            knownCourse: Object.keys(professor.reviews || {})[0],
        },
    });
    const { setError } = hookForm;

    const trpcContext = trpc.useContext();
    const { mutateAsync: finalizeRatingUpload, error: finalizeError } =
        trpc.ratings.process.useMutation();
    const {
        mutate: uploadNewRating,
        isLoading,
        error: startError,
    } = trpc.ratings.add.useMutation({
        onSuccess: async (id) => {
            try {
                await finalizeRatingUpload(id);
                toast.success("Thank you for your rating");
                trpcContext.professors.get.invalidate({ id: professor.id ?? "" });
                closeForm?.();
            } catch {
                // No need to catch error since it is displayed in the ui
            }
        },
    });

    const onSubmitHandler: SubmitHandler<EvaluateProfessorFormInputs> = async (formResult) => {
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
            professor: professor.id ?? "",
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
        isLoading,
        startError,
        finalizeError,
        onSubmit: hookForm.handleSubmit(onSubmitHandler),
    };
}
