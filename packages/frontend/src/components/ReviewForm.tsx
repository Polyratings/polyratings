/* eslint-disable react/no-unstable-nested-components */
import { Controller, FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router";
import {
    COURSE_TYPES,
    DEPARTMENT_LIST,
    Department,
    GRADES,
    GRADE_LEVELS,
    MAX_PROFESSOR_TAGS_PER_RATING,
    PROFESSOR_TAGS,
} from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import {
    useEffect,
    useState,
    type CSSProperties,
    type FormEventHandler,
    type ReactNode,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/trpc";
import {
    cn,
    formError,
    formErrors,
    getApiErrorMessage,
    toSelectOptions,
    withClearErrorOnChange,
} from "@/utils";
import {
    Button,
    Combobox,
    DepartmentCombobox,
    Select,
    StarRatingInput,
    TextArea,
    TextInput,
} from "./forms";
import { useSortedCourses } from "@/hooks";
import campusBackground from "@/assets/home-header.webp";
import { StaticPageHeader } from "./StaticPageHeader";
import {
    ADD_PROFESSOR_FORM_STEPS,
    isReviewFormOnConfirmStep,
    REVIEW_FORM_STEPS,
    ReviewFormStepper,
} from "./ReviewFormStepper";
import { ReviewPreview } from "./ReviewPreview";
import {
    ReviewSubmissionAgreement,
    reviewSubmissionAgreementParser,
} from "./ReviewSubmissionAgreement";

const OTHER_COURSE_VALUE = "__other__";
const DESKTOP_FORM_QUERY = "(min-width: 640px)";

export const CLASS_INFORMATION = [
    { label: "Year", inputName: "gradeLevel" as const, options: GRADE_LEVELS },
    { label: "Grade Achieved", inputName: "grade" as const, options: GRADES },
    { label: "Reason For Taking", inputName: "courseType" as const, options: COURSE_TYPES },
];

export const NUMERICAL_RATINGS = [
    { label: "Overall Rating", inputName: "overallRating" as const },
    { label: "Recognizes Difficulties", inputName: "recognizesStudentDifficulties" as const },
    { label: "Presents Clearly", inputName: "presentsMaterialClearly" as const },
];

const fieldClassName = "w-full min-w-0";
const fieldGridClassName = "grid grid-cols-1 items-start gap-5 sm:gap-4";

const PROFESSOR_DETAILS_FIELDS = [
    "professorFirstName",
    "professorLastName",
    "professorDepartment",
] as const;

const REVIEW_FIELDS = [
    "knownCourse",
    "overallRating",
    "recognizesStudentDifficulties",
    "presentsMaterialClearly",
    "ratingText",
    "courseDepartment",
    "courseNum",
    "gradeLevel",
    "grade",
    "courseType",
] as const;

type Professor = inferProcedureOutput<AppRouter["professors"]["get"]>;

export type ReviewFormProps =
    { mode: "new-professor" } | { mode: "evaluate"; professor: Professor };

const sharedReviewFields = {
    overallRating: z.string().min(1, formError(formErrors.rating)),
    recognizesStudentDifficulties: z.string().min(1, formError(formErrors.rating)),
    presentsMaterialClearly: z.string().min(1, formError(formErrors.rating)),
    ratingText: z.string().trim().min(20, formError(formErrors.ratingText)),
    courseDepartment: z.enum(DEPARTMENT_LIST, formError(formErrors.coursePrefix)),
    courseNum: z
        .string()
        .trim()
        .refine((value) => {
            const courseNum = Number(value);
            return Number.isInteger(courseNum) && courseNum >= 100 && courseNum <= 599;
        }, formError(formErrors.courseNum)),
    gradeLevel: z.enum(GRADE_LEVELS, formError(formErrors.year)),
    grade: z.enum(GRADES, formError(formErrors.grade)),
    courseType: z.enum(COURSE_TYPES, formError(formErrors.courseType)),
    tags: z.enum(PROFESSOR_TAGS).array().optional(),
    acceptedSubmissionTerms: reviewSubmissionAgreementParser,
    knownCourse: z.string().optional(),
    professorFirstName: z.string().optional(),
    professorLastName: z.string().optional(),
    // Evaluate mode never collects a department, so the empty default must stay valid.
    professorDepartment: z.enum(DEPARTMENT_LIST).or(z.literal("")).optional(),
};

const newProfessorFormParser = z.object({
    ...sharedReviewFields,
    professorFirstName: z.string().trim().min(1, formError(formErrors.firstName)),
    professorLastName: z.string().trim().min(1, formError(formErrors.lastName)),
    professorDepartment: z.enum(DEPARTMENT_LIST, formError(formErrors.department)),
});

const evaluateFormParser = z.object({
    ...sharedReviewFields,
    knownCourse: z.string().min(1, formError(formErrors.course)),
});

type ReviewFormValues = {
    professorFirstName: string;
    professorLastName: string;
    professorDepartment: (typeof DEPARTMENT_LIST)[number] | "";
    knownCourse: string;
    courseDepartment: (typeof DEPARTMENT_LIST)[number] | "";
    courseNum: string;
    overallRating: string;
    recognizesStudentDifficulties: string;
    presentsMaterialClearly: string;
    ratingText: string;
    gradeLevel: (typeof GRADE_LEVELS)[number] | "";
    grade: (typeof GRADES)[number] | "";
    courseType: (typeof COURSE_TYPES)[number] | "";
    tags?: (typeof PROFESSOR_TAGS)[number][];
    acceptedSubmissionTerms: boolean;
};

function isOtherCourse(value: string | undefined) {
    return value === OTHER_COURSE_VALUE;
}

function isKnownCourse(value: string | undefined) {
    return Boolean(value) && !isOtherCourse(value);
}

function useDesktopReviewForm() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window === "undefined" ? false : window.matchMedia(DESKTOP_FORM_QUERY).matches,
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(DESKTOP_FORM_QUERY);
        const onChange = () => setIsDesktop(mediaQuery.matches);
        onChange();
        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery.removeEventListener("change", onChange);
    }, []);

    return isDesktop;
}

export function ReviewFormPageLayout({
    title,
    backLink,
    children,
}: {
    title: ReactNode;
    backLink?: { href: string; label: string };
    children: ReactNode;
}) {
    return (
        <main
            id="main"
            tabIndex={-1}
            className={cn(
                "flex min-h-full flex-col bg-background text-foreground outline-none",
                "sm:bg-cover sm:bg-center sm:bg-no-repeat sm:bg-[image:var(--form-photo)]",
            )}
            style={{ "--form-photo": `url(${campusBackground})` } as CSSProperties}
        >
            <div className="flex-1 px-4 py-5 sm:bg-black/30 sm:px-6 sm:py-10 dark:sm:bg-black/60">
                <div
                    className={cn(
                        "mx-auto max-w-3xl text-foreground",
                        "sm:rounded-lg sm:border sm:border-border sm:bg-background sm:p-8",
                        "sm:shadow-lg sm:ring-1 sm:ring-accent/30",
                    )}
                >
                    {backLink ? (
                        <Link
                            to={backLink.href}
                            className={cn(
                                "mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand",
                                "hover:underline",
                                "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                            )}
                        >
                            <ChevronLeftIcon className="size-4" aria-hidden />
                            {backLink.label}
                        </Link>
                    ) : null}
                    <StaticPageHeader className="mb-4 md:mb-4">{title}</StaticPageHeader>
                    {children}
                </div>
            </div>
        </main>
    );
}

export function ReviewForm(props: ReviewFormProps) {
    const { mode } = props;
    const professor = professorFromProps(props);
    const isDesktop = useDesktopReviewForm();
    const { hookForm, onSubmit, isLoading, networkError } = useReviewForm(props);
    const { control, watch } = hookForm;
    const values = watch();
    const professorName =
        mode === "evaluate" && professor
            ? { firstName: professor.firstName, lastName: professor.lastName }
            : { firstName: values.professorFirstName, lastName: values.professorLastName };
    const department =
        mode === "evaluate" && professor ? professor.department : values.professorDepartment;
    const errorFallback =
        mode === "new-professor"
            ? "We could not add this professor."
            : "We could not submit this rating.";
    const tagsStep = (
        <FormSection
            title="Tags"
            description={
                values.tags?.length
                    ? `${values.tags.length} of ${MAX_PROFESSOR_TAGS_PER_RATING} selected`
                    : `Optional. Select up to ${MAX_PROFESSOR_TAGS_PER_RATING}.`
            }
        >
            <Controller
                control={control}
                name="tags"
                render={({ field: { onChange, value } }) => (
                    <TagSelection value={value} onChange={onChange} />
                )}
            />
        </FormSection>
    );
    const preview = (
        <>
            <ReviewPreview
                lastName={professorName.lastName}
                firstName={professorName.firstName}
                department={department}
                courseName={`${values.courseDepartment} ${values.courseNum}`.trim()}
                overallRating={values.overallRating}
                ratingText={values.ratingText}
                grade={values.grade}
                courseType={values.courseType}
                gradeLevel={values.gradeLevel}
                tags={values.tags}
            />
            <ReviewSubmissionAgreement />
        </>
    );

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = (event) => {
        if (isDesktop && !isReviewFormOnConfirmStep(event.currentTarget)) {
            event.preventDefault();
            return;
        }
        onSubmit(event);
    };

    return (
        <FormProvider {...hookForm}>
            <form onSubmit={handleFormSubmit}>
                {isDesktop ? (
                    <ReviewFormStepper
                        isLoading={isLoading}
                        aria-label={
                            mode === "new-professor" ? "Add professor steps" : "Evaluation steps"
                        }
                        steps={
                            mode === "new-professor"
                                ? [
                                      {
                                          ...ADD_PROFESSOR_FORM_STEPS[0],
                                          fields: [...PROFESSOR_DETAILS_FIELDS],
                                          content: <ProfessorDetailsStep />,
                                      },
                                      {
                                          ...ADD_PROFESSOR_FORM_STEPS[1],
                                          fields: [...REVIEW_FIELDS],
                                          content: <ReviewStep {...props} />,
                                      },
                                      {
                                          ...ADD_PROFESSOR_FORM_STEPS[2],
                                          content: tagsStep,
                                      },
                                      {
                                          ...ADD_PROFESSOR_FORM_STEPS[3],
                                          content: preview,
                                      },
                                  ]
                                : [
                                      {
                                          ...REVIEW_FORM_STEPS[0],
                                          fields: [...REVIEW_FIELDS],
                                          content: <ReviewStep {...props} />,
                                      },
                                      {
                                          ...REVIEW_FORM_STEPS[1],
                                          content: tagsStep,
                                      },
                                      {
                                          ...REVIEW_FORM_STEPS[2],
                                          content: preview,
                                      },
                                  ]
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-8">
                        {mode === "new-professor" ? <ProfessorDetailsStep /> : null}
                        <ReviewStep {...props} />
                        {tagsStep}
                        <ReviewSubmissionAgreement />
                        <div className={`flex justify-center ${isLoading ? "hidden" : "block"}`}>
                            <Button className="w-full" variant="primary" type="submit">
                                Submit
                            </Button>
                        </div>
                        <div className="flex justify-center">
                            {isLoading ? <Spinner className="size-[34px] text-brand" /> : null}
                        </div>
                    </div>
                )}

                <div className="text-sm text-red-500">
                    {networkError ? getApiErrorMessage(networkError, errorFallback) : null}
                </div>
            </form>
        </FormProvider>
    );
}

function useReviewForm(props: ReviewFormProps) {
    const { mode } = props;
    const professor = professorFromProps(props);
    const hookForm = useForm<ReviewFormValues>({
        resolver: zodResolver(
            mode === "new-professor" ? newProfessorFormParser : evaluateFormParser,
        ) as never,
        reValidateMode: "onSubmit",
        defaultValues: {
            professorFirstName: "",
            professorLastName: "",
            professorDepartment: "" as ReviewFormValues["professorDepartment"],
            knownCourse: "",
            courseDepartment: "" as ReviewFormValues["courseDepartment"],
            overallRating: "",
            recognizesStudentDifficulties: "",
            presentsMaterialClearly: "",
            ratingText: "",
            courseNum: "",
            gradeLevel: "" as ReviewFormValues["gradeLevel"],
            grade: "" as ReviewFormValues["grade"],
            courseType: "" as ReviewFormValues["courseType"],
            acceptedSubmissionTerms: false,
        },
    });

    const navigate = useNavigate();
    const utils = trpc.useUtils();
    const { setValue, watch } = hookForm;
    const knownCourse = watch("knownCourse");

    useEffect(() => {
        if (mode !== "evaluate" || !professor) {
            return;
        }
        if (isKnownCourse(knownCourse)) {
            const [department, courseNum] = knownCourse.split(" ");
            setValue("courseDepartment", department as Department);
            setValue("courseNum", courseNum);
            return;
        }
        if (isOtherCourse(knownCourse)) {
            setValue("courseDepartment", "" as ReviewFormValues["courseDepartment"]);
            setValue("courseNum", "");
        }
    }, [knownCourse, mode, professor, setValue]);

    const addProfessor = trpc.professors.add.useMutation({
        meta: { suppressGlobalErrorToast: true },
    });
    const addRating = trpc.ratings.add.useMutation({
        meta: { suppressGlobalErrorToast: true },
        onSuccess: (updatedProfessor) => {
            toast.success("Thank you for your rating");
            utils.professors.get.setData({ id: updatedProfessor.id }, updatedProfessor);
            navigate(`/professor/${updatedProfessor.id}`);
        },
    });

    const onSubmitHandler = async (data: ReviewFormValues) => {
        if (mode === "new-professor") {
            try {
                const successMessage = await addProfessor.mutateAsync({
                    firstName: data.professorFirstName,
                    lastName: data.professorLastName,
                    department: data.professorDepartment as Department,
                    rating: {
                        overallRating: Number(data.overallRating),
                        presentsMaterialClearly: Number(data.presentsMaterialClearly),
                        recognizesStudentDifficulties: Number(data.recognizesStudentDifficulties),
                        grade: data.grade as (typeof GRADES)[number],
                        department: data.courseDepartment as Department,
                        courseNum: Number(data.courseNum),
                        courseType: data.courseType as (typeof COURSE_TYPES)[number],
                        gradeLevel: data.gradeLevel as (typeof GRADE_LEVELS)[number],
                        rating: data.ratingText,
                        tags: data.tags,
                    },
                });
                toast.success(successMessage.message);
                if (successMessage.professorId) {
                    utils.professors.get.invalidate({ id: successMessage.professorId });
                    navigate(`/professor/${successMessage.professorId}`);
                } else {
                    navigate("/");
                }
                utils.professors.get.invalidate();
            } catch {
                // Inline via networkError
            }
            return;
        }

        addRating.mutate({
            professor: professor?.id ?? "",
            courseNum: Number(data.courseNum),
            department: data.courseDepartment as Department,
            overallRating: Number(data.overallRating),
            presentsMaterialClearly: Number(data.presentsMaterialClearly),
            recognizesStudentDifficulties: Number(data.recognizesStudentDifficulties),
            grade: data.grade as (typeof GRADES)[number],
            courseType: data.courseType as (typeof COURSE_TYPES)[number],
            rating: data.ratingText,
            gradeLevel: data.gradeLevel as (typeof GRADE_LEVELS)[number],
            tags: data.tags,
        });
    };

    return {
        hookForm,
        isLoading: addProfessor.isPending || addRating.isPending,
        networkError: addProfessor.error ?? addRating.error,
        onSubmit: hookForm.handleSubmit(onSubmitHandler),
    };
}

function FormSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <fieldset className={cn("min-w-0", className)}>
            <legend
                className={cn(
                    "float-left w-full text-lg font-semibold tracking-tight text-foreground",
                    description ? "mb-1" : "mb-4",
                )}
            >
                {title}
            </legend>
            <div className="clear-both">
                {description ? (
                    <p className="mb-4 text-sm text-muted-foreground">{description}</p>
                ) : null}
                {children}
            </div>
        </fieldset>
    );
}

function ProfessorDetailsStep() {
    const { register, clearErrors, control } = useFormContext<ReviewFormValues>();
    const { errors } = useFormState({ control, name: [...PROFESSOR_DETAILS_FIELDS] });
    const registerField = withClearErrorOnChange(register, clearErrors);

    return (
        <FormSection title="Professor details">
            <div className={cn(fieldGridClassName, "sm:grid-cols-2")}>
                <TextInput
                    label="First Name"
                    placeholder="Jane"
                    wrapperClassName={fieldClassName}
                    {...registerField("professorFirstName")}
                    error={errors.professorFirstName?.message}
                />
                <TextInput
                    label="Last Name"
                    placeholder="Mustang"
                    wrapperClassName={fieldClassName}
                    {...registerField("professorLastName")}
                    error={errors.professorLastName?.message}
                />
                <DepartmentCombobox
                    label="Department"
                    placeholder="Please select"
                    wrapperClassName={cn(fieldClassName, "sm:col-span-2")}
                    {...registerField("professorDepartment")}
                    error={errors.professorDepartment?.message}
                />
            </div>
        </FormSection>
    );
}

function professorFromProps(props: ReviewFormProps) {
    if (props.mode !== "evaluate") {
        return undefined;
    }
    const { professor } = props;
    return professor;
}

function professorIdFromProps(props: ReviewFormProps) {
    return professorFromProps(props)?.id;
}

function ReviewStep(props: ReviewFormProps) {
    const { mode } = props;
    const professorId = professorIdFromProps(props);
    const { register, clearErrors, control, watch } = useFormContext<ReviewFormValues>();
    const { errors } = useFormState({ control, name: [...REVIEW_FIELDS] });
    const registerField = withClearErrorOnChange(register, clearErrors);
    const knownCourseValue = watch("knownCourse");
    const sortedCourses = useSortedCourses(professorId).map(({ courseName }) => courseName);
    const showManualCourse = mode === "new-professor" || isOtherCourse(knownCourseValue);

    return (
        <div className="flex flex-col gap-8">
            <FormSection title="Course details">
                <div className="flex flex-col gap-5 sm:gap-4">
                    {mode === "evaluate" ? (
                        <Combobox
                            label="Course"
                            placeholder="Please select"
                            options={toSelectOptions(sortedCourses)}
                            noResultsOption={{ label: "Other", value: OTHER_COURSE_VALUE }}
                            wrapperClassName={fieldClassName}
                            {...registerField("knownCourse")}
                            error={errors.knownCourse?.message}
                        />
                    ) : null}
                    {showManualCourse ? (
                        <div className={cn(fieldGridClassName, "sm:grid-cols-2")}>
                            <DepartmentCombobox
                                label="Course Prefix"
                                placeholder="Please select"
                                wrapperClassName={fieldClassName}
                                {...registerField("courseDepartment")}
                                error={errors.courseDepartment?.message}
                            />
                            <TextInput
                                label="Course Number"
                                type="number"
                                placeholder="1234"
                                wrapperClassName={fieldClassName}
                                {...registerField("courseNum")}
                                error={errors.courseNum?.message}
                            />
                        </div>
                    ) : null}
                    <div className={cn(fieldGridClassName, "sm:grid-cols-3")}>
                        {CLASS_INFORMATION.map((dropdown) => (
                            <Select
                                key={dropdown.label}
                                {...registerField(dropdown.inputName)}
                                options={dropdown.options.map((option) => ({
                                    label: option,
                                    value: option,
                                }))}
                                label={dropdown.label}
                                wrapperClassName={fieldClassName}
                                error={errors[dropdown.inputName]?.message}
                            />
                        ))}
                    </div>
                </div>
            </FormSection>
            <FormSection title="Ratings">
                <div className="flex flex-col gap-5 sm:gap-4">
                    <div className={cn(fieldGridClassName, "sm:grid-cols-3")}>
                        {NUMERICAL_RATINGS.map((rating) => (
                            <StarRatingInput
                                key={rating.label}
                                label={rating.label}
                                wrapperClassName={fieldClassName}
                                {...registerField(rating.inputName)}
                                error={errors[rating.inputName]?.message}
                            />
                        ))}
                    </div>
                    <TextArea
                        {...registerField("ratingText")}
                        error={errors.ratingText?.message}
                        wrapperClassName={fieldClassName}
                        label="Written review"
                    />
                </div>
            </FormSection>
        </div>
    );
}

type ProfessorTag = (typeof PROFESSOR_TAGS)[number];

const TAG_GROUPS = [
    {
        label: "Format & availability",
        tags: [
            "Hybrid Option",
            "Recorded Lectures",
            "Zoom Office Hours",
            "High In-Person Availability",
            "Fast Response Time",
        ],
    },
    {
        label: "Materials",
        tags: [
            "Uploads Slides",
            "Class Handouts",
            "Supplemental Study Material",
            "Does Not Use Canvas",
        ],
    },
    {
        label: "Policies",
        tags: [
            "Flexible Attendance Policy",
            "Inflexible Attendance Policy",
            "Flexible Deadline Policy",
            "Inflexible Deadline Policy",
            "Flexible Grading Policy",
            "Inflexible Grading Policy",
            "Honor DRC Accommodations",
        ],
    },
    {
        label: "In class",
        tags: ["Pop Quizzes", "No Breaks During Lecture"],
    },
] as const satisfies readonly { label: string; tags: readonly ProfessorTag[] }[];

const EXCLUSIVE_TAG_PAIRS: readonly [ProfessorTag, ProfessorTag][] = [
    ["Flexible Attendance Policy", "Inflexible Attendance Policy"],
    ["Flexible Deadline Policy", "Inflexible Deadline Policy"],
    ["Flexible Grading Policy", "Inflexible Grading Policy"],
];

type GroupedTag = (typeof TAG_GROUPS)[number]["tags"][number];
type MissingGroupedTag = Exclude<ProfessorTag, GroupedTag>;
type ExtraGroupedTag = Exclude<GroupedTag, ProfessorTag>;
type AssertTagGroupsCoverAll = [MissingGroupedTag | ExtraGroupedTag] extends [never] ? true : never;
const tagGroupsCoverAll: AssertTagGroupsCoverAll = true;
void tagGroupsCoverAll;

function oppositeExclusiveTag(tag: ProfessorTag): ProfessorTag | undefined {
    const pair = EXCLUSIVE_TAG_PAIRS.find((options) => options.includes(tag));
    return pair?.find((option) => option !== tag);
}

function toggleTagSelection(current: ProfessorTag[], tag: ProfessorTag): ProfessorTag[] {
    if (current.includes(tag)) {
        return current.filter((selected) => selected !== tag);
    }

    const opposite = oppositeExclusiveTag(tag);
    const withoutOpposite = opposite
        ? current.filter((selected) => selected !== opposite)
        : current;

    if (withoutOpposite.length >= MAX_PROFESSOR_TAGS_PER_RATING) {
        return current;
    }

    return [...withoutOpposite, tag];
}

function exclusivePairsIn(tags: readonly ProfessorTag[]) {
    return EXCLUSIVE_TAG_PAIRS.filter(
        ([left, right]) => tags.includes(left) && tags.includes(right),
    );
}

function unpairedTags(tags: readonly ProfessorTag[]) {
    const paired = new Set(exclusivePairsIn(tags).flat());
    return tags.filter((tag) => !paired.has(tag));
}

function pairTopic(left: ProfessorTag) {
    return left.replace(/^Flexible /, "");
}

function tagButtonState(value: ProfessorTag[], tagText: ProfessorTag) {
    const selected = value.includes(tagText);
    const nextSelection = toggleTagSelection(value, tagText);
    return {
        selected,
        nextSelection,
        disabled: !selected && !nextSelection.includes(tagText),
    };
}

export type TagSelectionProps = {
    value?: ProfessorTag[];
    onChange: (tags: ProfessorTag[]) => void;
};

export function TagSelection({ value = [], onChange }: TagSelectionProps) {
    return (
        <div className="flex flex-col gap-5">
            {TAG_GROUPS.map((group) => {
                const pairs = exclusivePairsIn(group.tags);
                const singles = unpairedTags(group.tags);
                return (
                    <fieldset key={group.label} className="min-w-0">
                        <legend className="mb-2 text-sm font-medium text-foreground">
                            {group.label}
                        </legend>
                        <div className="flex flex-col gap-3">
                            {pairs.map(([left, right]) => {
                                const topic = pairTopic(left);
                                return (
                                    <div
                                        key={left}
                                        className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
                                    >
                                        <p className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">
                                            {topic}
                                        </p>
                                        <div
                                            className="flex flex-wrap gap-2"
                                            role="group"
                                            aria-label={topic}
                                        >
                                            <TagChoice
                                                tagText={left}
                                                label="Flexible"
                                                value={value}
                                                onChange={onChange}
                                            />
                                            <TagChoice
                                                tagText={right}
                                                label="Inflexible"
                                                value={value}
                                                onChange={onChange}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {singles.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {singles.map((tagText) => (
                                        <TagChoice
                                            key={tagText}
                                            tagText={tagText}
                                            value={value}
                                            onChange={onChange}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </fieldset>
                );
            })}
        </div>
    );
}

function TagChoice({
    tagText,
    label,
    value,
    onChange,
}: {
    tagText: ProfessorTag;
    label?: string;
    value: ProfessorTag[];
    onChange: (tags: ProfessorTag[]) => void;
}) {
    const { selected, nextSelection, disabled } = tagButtonState(value, tagText);
    return (
        <SelectableTag
            tagText={tagText}
            label={label}
            selected={selected}
            disabled={disabled}
            onClick={() => onChange(nextSelection)}
        />
    );
}

function SelectableTag({
    tagText,
    label,
    selected,
    className: buttonClassName,
    disabled,
    ...buttonProps
}: React.ComponentProps<"button"> & {
    tagText: string;
    label?: string;
    selected: boolean;
}) {
    const visibleLabel = label ?? tagText;
    const pseudoExpander =
        "after:content-[attr(data-label)] after:block after:font-bold after:h-1 after:text-transparent after:overflow-hidden";

    return (
        <button
            type="button"
            {...buttonProps}
            title={tagText}
            data-label={visibleLabel}
            aria-label={tagText}
            aria-pressed={selected}
            disabled={disabled && !selected}
            className={cn(
                pseudoExpander,
                "h-9 rounded-lg border-[0.1rem] px-2 pb-1 pt-[.313rem] font-nunito text-brand",
                "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                    ? "border-brand bg-cal-poly-light-green font-semibold"
                    : cn("border-brand font-[350]", disabled ? "bg-field" : "bg-card"),
                buttonClassName,
            )}
        >
            {visibleLabel}
        </button>
    );
}
