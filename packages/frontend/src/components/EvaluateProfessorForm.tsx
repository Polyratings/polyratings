/* eslint-disable react/no-unstable-nested-components */
import { useForm, SubmitHandler, UseFormReturn, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferProcedureOutput } from "@trpc/server";
import { UserIcon } from "@heroicons/react/24/solid";
import { ReactElement, useState } from "react";
import { AppRouter } from "@backend/index";
import {
    GRADE_LEVELS,
    GRADES,
    DEPARTMENT_LIST,
    COURSE_TYPES,
    Department,
    PROFESSOR_TAGS,
    MAX_PROFESSOR_TAGS_PER_RATING,
} from "@backend/utils/const";
import { trpc } from "@/trpc";
import { useSortedCourses } from "@/hooks";
import { Select, TextArea } from "./forms";
import { TextInput } from "./forms/TextInput";
import { Button } from "./forms/Button";

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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { onSubmit, hookForm, networkError, isLoading } = useEvaluationForm(professor, closeForm);
    const { control, trigger: triggerValidation } = hookForm;

    return (
        <form className="relative w-full" onSubmit={onSubmit}>
            <button
                className="absolute right-0 top-0 hidden cursor-pointer p-3 font-bold sm:block"
                onClick={closeForm}
                type="button"
            >
                X
            </button>

            <div className="mb-4 flex items-end">
                <UserIcon className="fill-cal-poly-green mb-[0.1rem] mr-2 h-6 w-6" />
                <h2 className="hidden text-2xl font-bold sm:block">
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
                isLoading={isLoading}
                triggerValidation={triggerValidation}
            />

            <div className="text-sm text-red-500">{networkError?.message}</div>
        </form>
    );
}

export type FormStep = "first" | "second";
export type FormBarProps = {
    isLoading: boolean;
    // Fine to use any since trigger does not use the type param
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerValidation: UseFormReturn<any>["trigger"];
    firstStep: () => ReactElement;
    secondStep: () => ReactElement;
};
export function FormBar({ isLoading, triggerValidation, firstStep, secondStep }: FormBarProps) {
    const [formStep, setFormStep] = useState<FormStep>("first");

    return (
        <>
            <div className="m-auto my-4 w-[24rem]">
                <div className="mb-1 flex">
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
                <div className="relative h-1 rounded bg-gray-200 transition-all">
                    <div
                        className={`bg-cal-poly-green absolute h-1 w-1/2 rounded ${
                            formStep === "first" ? "left-0" : "left-1/2"
                        }`}
                    />
                </div>
            </div>

            {formStep === "first" && firstStep()}
            {formStep === "second" && secondStep()}

            <div
                className={`mt-2 flex justify-center gap-6 ${
                    isLoading || formStep !== "first" ? "hidden" : "block"
                } `}
            >
                <Button variant="secondary" type="submit">
                    Skip Course Accessibility
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
                className={`mt-2 flex justify-center gap-6 ${
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
        </>
    );
}

export function EvaluateProfessorFormLinear({ professor, closeForm }: EvaluateProfessorFormProps) {
    // Professor should really be valid at this point
    if (!professor) {
        return <div />;
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { onSubmit, hookForm, isLoading, networkError } = useEvaluationForm(professor, closeForm);
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

            <div className={`flex justify-center ${isLoading ? "hidden" : "block"}`}>
                <Button variant="tertiary" type="submit">
                    Submit
                </Button>
            </div>

            <div className="flex justify-center">
                {/* Exact size for no layer shift */}
                <ClipLoader color="white" loading={isLoading} size={34} />
            </div>
            <div className="text-sm text-red-500">{networkError?.message}</div>
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
            <div className="flex flex-wrap justify-between">
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
            <div className="flex justify-between sm:block">
                <div className="mt-2 flex flex-col flex-wrap justify-between gap-2 sm:flex-row">
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
                <div className="mt-2 flex flex-col flex-wrap justify-between gap-2 sm:flex-row">
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

type TagSelectionVariant =
    | "desktop-primary"
    | "desktop-secondary"
    | "mobile-primary"
    | "mobile-secondary";

export type TagSelectionProps = {
    onChange: (tags: string[]) => void;
    variant: TagSelectionVariant;
};
export function TagSelection({ onChange, variant }: TagSelectionProps) {
    const [tagState, setTagState] = useState(
        PROFESSOR_TAGS.map((tagText) => ({ tagText, selected: false })),
    );

    const selectedTags = tagState.filter(({ selected }) => selected);

    const variantMap: Record<TagSelectionVariant, SelectableTagVariant> = {
        "mobile-primary": "primary",
        "mobile-secondary": "secondary",
        "desktop-primary": "primary",
        "desktop-secondary": "secondary",
    };

    return (
        <>
            {variant.startsWith("desktop") && (
                <h2 className="mb-4 text-2xl font-bold">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h2>
            )}
            {variant.startsWith("mobile") && (
                <h3 className="mb-2 text-xs">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h3>
            )}
            <div className="mb-4 flex flex-wrap gap-2">
                {tagState.map((tag, i) => (
                    <SelectableTag
                        variant={variantMap[variant]}
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

type SelectableTagVariant = "primary" | "secondary";

export interface SelectableTagProps extends React.ComponentProps<"button"> {
    variant: SelectableTagVariant;
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
        primary: "bg-cal-poly-light-green border-[0.1rem]",
        secondary: "border-cal-poly-gold border-2 font-bold bg-white",
    };

    const unselectedVariantMap = {
        primary: `${disabled ? "bg-gray-100" : "bg-white"} border-cal-poly-green border-[0.1rem]`,
        secondary: `${disabled ? "bg-gray-300" : "bg-white"} border-2`,
    };

    const pseudoExpander =
        "after:content-[attr(title)] after:block after:font-bold after:h-1 after:text-transparent after:overflow-hidden";

    const className = selected
        ? `${pseudoExpander} font-semibold ${selectedVariantMap[variant]} ${buttonClassName}`
        : `${pseudoExpander} font-[350] ${unselectedVariantMap[variant]} ${buttonClassName}`;

    return (
        <button
            type="button"
            {...buttonProps}
            title={tagText}
            disabled={disabled && !selected}
            // Use different y padding to account for weird font height
            className={`${className} font-nunito text-cal-poly-green h-9 rounded-lg px-2 pb-1 pt-[.313rem]`}
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
    const {
        mutate: uploadRating,
        isLoading,
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
        isLoading,
        networkError,
        onSubmit: hookForm.handleSubmit(onSubmitHandler),
    };
}
