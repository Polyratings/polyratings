/* eslint-disable react/no-unstable-nested-components */
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import {
    COURSE_TYPES,
    DEPARTMENT_LIST,
    GRADES,
    GRADE_LEVELS,
    PROFESSOR_TAGS,
} from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { trpc } from "@/trpc";
import { Checkbox, Select, TextArea, TextInput } from "./forms";
import {
    CLASS_INFORMATION,
    FormBar,
    NUMERICAL_RATINGS,
    TagSelection,
} from "./EvaluateProfessorForm";
import { Button } from "./forms/Button";

const newProfessorFormParser = z.object({
    professorFirstName: z.string().trim().min(1),
    professorLastName: z.string().trim().min(1),
    professorDepartment: z.enum(DEPARTMENT_LIST),
    sameDepartment: z.boolean(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z
        .string()
        .trim()
        .min(20, { message: "Rating text must be at least 20 characters long" }),
    courseDepartment: z.enum(DEPARTMENT_LIST),
    courseNum: z.preprocess(
        (val) => parseInt(z.string().parse(val), 10),
        z.number().min(100, { message: "Invalid" }).max(599, { message: "Invalid" }),
    ),
    gradeLevel: z.enum(GRADE_LEVELS),
    grade: z.enum(GRADES),
    courseType: z.enum(COURSE_TYPES),
    tags: z.enum(PROFESSOR_TAGS).array().optional(),
});

type NewProfessorFormInputs = z.infer<typeof newProfessorFormParser>;

export function NewProfessorFormTwoStep() {
    const { hookForm, onSubmit, isLoading, networkError } = useNewProfessorForm();
    const { control, trigger: triggerValidation } = hookForm;
    return (
        <div
            className="p-5 opacity-100 rounded relative bg-white shadow-2xl"
            style={{ width: "40rem" }}
        >
            <form onSubmit={onSubmit}>
                <FormBar
                    firstStep={() => <NewProfessorStep {...hookForm} />}
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

                <div className="text-red-500 text-sm">{networkError?.message}</div>
            </form>
        </div>
    );
}

export function NewProfessorLinear() {
    const { hookForm, onSubmit, isLoading, networkError } = useNewProfessorForm();
    const { control } = hookForm;
    return (
        <div
            className="p-5 opacity-100 rounded relative bg-white shadow-2xl"
            style={{ width: "40rem" }}
        >
            <form onSubmit={onSubmit}>
                <NewProfessorStep {...hookForm} />

                <div className="w-full h-4" />

                <Controller
                    control={control}
                    name="tags"
                    render={({ field: { onChange } }) => (
                        <TagSelection onChange={onChange} variant="mobile-primary" />
                    )}
                />

                <div className={`flex justify-center ${isLoading ? "hidden" : "block"}`}>
                    <Button variant="primary" type="submit">
                        Submit
                    </Button>
                </div>

                <div className="flex justify-center">
                    {/* Exact size for no layer shift */}
                    <ClipLoader color="white" loading={isLoading} size={34} />
                </div>

                <div className="text-red-500 text-sm">{networkError?.message}</div>
            </form>
        </div>
    );
}

function useNewProfessorForm() {
    const hookForm = useForm<NewProfessorFormInputs>({
        resolver: zodResolver(newProfessorFormParser),
        defaultValues: {
            sameDepartment: true,
            professorDepartment: DEPARTMENT_LIST[0],
        },
    });

    const {
        mutateAsync: addNewProfessorMutation,
        isLoading,
        error: networkError,
    } = trpc.professors.add.useMutation();
    const navigate = useNavigate();

    const utils = trpc.useUtils();

    const onSubmitHandler = async (data: NewProfessorFormInputs) => {
        try {
            const successMessage = await addNewProfessorMutation({
                firstName: data.professorFirstName,
                lastName: data.professorLastName,
                department: data.professorDepartment,
                rating: {
                    overallRating: data.overallRating,
                    presentsMaterialClearly: data.presentsMaterialClearly,
                    recognizesStudentDifficulties: data.recognizesStudentDifficulties,
                    grade: data.grade,
                    department: data.courseDepartment,
                    courseNum: data.courseNum,
                    courseType: data.courseType,
                    gradeLevel: data.gradeLevel,
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
            // No need for error will be set by react-query
        }
    };

    return {
        hookForm,
        isLoading,
        networkError,
        onSubmit: hookForm.handleSubmit(onSubmitHandler),
    };
}

function NewProfessorStep({
    register,
    watch,
    setValue,
    formState: { errors },
}: UseFormReturn<NewProfessorFormInputs>) {
    const professorDepartment = watch("professorDepartment");
    const sameAsProfessorDepartment = watch("sameDepartment");

    // UseEffect is needed to prevent an infinite rerenders
    // This used to not be needed but probably has to do with an internal
    // change to react-hook-forms
    useEffect(() => {
        if (sameAsProfessorDepartment) {
            setValue("courseDepartment", professorDepartment);
        }
    }, [professorDepartment]);
    return (
        <>
            <h2 className="text-2xl font-bold">Professor</h2>
            <div className="flex justify-between flex-wrap mt-2">
                <TextInput
                    label="First Name"
                    placeholder="First Name"
                    {...register("professorFirstName")}
                    error={errors.professorFirstName?.message}
                />

                <TextInput
                    label="Last Name"
                    placeholder="Last Name"
                    {...register("professorLastName")}
                    error={errors.professorLastName?.message}
                />

                <Select
                    options={DEPARTMENT_LIST.map((d) => ({ label: d, value: d }))}
                    label="Department"
                    wrapperClassName="mt-2 sm:mt-0"
                    {...register("professorDepartment")}
                    error={errors.professorDepartment?.message}
                />
            </div>

            <h2 className="text-2xl font-bold my-2">Rating</h2>

            <div className="flex justify-between flex-wrap">
                <Checkbox label="Same Department" {...register("sameDepartment")} />
                <Select
                    options={DEPARTMENT_LIST.map((d) => ({ label: d, value: d }))}
                    label="Department"
                    {...register("courseDepartment")}
                    disabled={sameAsProfessorDepartment}
                    error={errors.courseDepartment?.message}
                />
                <TextInput
                    label="Course Num"
                    type="number"
                    placeholder="class #"
                    {...register("courseNum")}
                    error={errors.courseNum?.message}
                />
            </div>
            <div className="flex sm:block justify-between">
                <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:gap-2 justify-between flex-wrap">
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
                <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:gap-2 justify-between flex-wrap">
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
                error={errors.ratingText?.message}
                wrapperClassName="mt-4"
                label="Rating"
            />
        </>
    );
}
