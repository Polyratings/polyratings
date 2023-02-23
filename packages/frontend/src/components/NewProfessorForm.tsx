import { useForm } from "react-hook-form";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { COURSE_TYPES, DEPARTMENT_LIST, GRADES, GRADE_LEVELS } from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { trpc } from "@/trpc";
import { Checkbox, Select, TextArea, TextInput } from "./forms";
import { CLASS_INFORMATION, NUMERICAL_RATINGS } from "./EvaluateProfessorForm";
import { Button } from "./forms/Button";

const newProfessorFormParser = z.object({
    professorFirstName: z.string().min(1),
    professorLastName: z.string().min(1),
    professorDepartment: z.enum(DEPARTMENT_LIST),
    sameDepartment: z.boolean(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z.string().min(20, { message: "Rating text must be at least 20 characters long" }),
    courseDepartment: z.enum(DEPARTMENT_LIST),
    courseNum: z.preprocess(
        (val) => parseInt(z.string().parse(val), 10),
        z.number().min(100, { message: "Invalid" }).max(599, { message: "Invalid" }),
    ),
    gradeLevel: z.enum(GRADE_LEVELS),
    grade: z.enum(GRADES),
    courseType: z.enum(COURSE_TYPES),
});

type NewProfessorFormInputs = z.infer<typeof newProfessorFormParser>;

export function NewProfessorForm() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<NewProfessorFormInputs>({
        resolver: zodResolver(newProfessorFormParser),
        defaultValues: {
            sameDepartment: true,
            professorDepartment: DEPARTMENT_LIST[0],
        },
    });

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

    const {
        mutateAsync: addNewProfessorMutation,
        isLoading,
        error: networkError,
    } = trpc.professors.add.useMutation();
    const navigate = useNavigate();

    const onSubmit = async (data: NewProfessorFormInputs) => {
        try {
            await addNewProfessorMutation({
                firstName: data.professorFirstName,
                lastName: data.professorLastName,
                department: professorDepartment,
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
                },
            });
            toast.success(
                "Thank you for adding a professor. It will be reviewed manually and will be available soon",
            );
            navigate("/");
        } catch {
            // No need for error will be set by react-query
        }
    };

    return (
        <div
            className="p-5 opacity-100 rounded relative bg-white shadow-2xl"
            style={{ width: "40rem" }}
        >
            <form onSubmit={handleSubmit(onSubmit)}>
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

                <div className="flex justify-center mt-2">
                    <Button type="submit" style={{ display: isLoading ? "none" : "block" }}>
                        Submit
                    </Button>
                    {/* Exact size for no layer shift when replacing button */}
                    {/* <ClipLoader color="#1F4715" loading={isLoading} size={34} /> */}
                </div>
                <div className="text-red-500 text-sm">{networkError?.message}</div>
            </form>
        </div>
    );
}

export const hello = "";
