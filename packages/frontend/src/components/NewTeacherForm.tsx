import { useForm } from "react-hook-form";
// import { EvaluateTeacherForm } from "./EvaluateTeacherForm";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "react-toastify";
import { useHistory } from "react-router";
import { COURSE_TYPES, DEPARTMENT_LIST, GRADES, GRADE_LEVELS } from "@backend/utils/const";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc";
import { Checkbox, Select, TextArea, TextInput } from "./forms";
import { CLASS_INFORMATION, NUMERICAL_RATINGS } from "./EvaluateTeacherForm";

export const NEW_TEACHER_FORM_WIDTH = 475;

const newProfessorFormParser = z.object({
    professorFirstName: z.string().min(1),
    professorLastName: z.string().min(1),
    professorDepartment: z.enum(DEPARTMENT_LIST),
    sameDepartment: z.boolean(),
    overallRating: z.string().transform(Number),
    recognizesStudentDifficulties: z.string().transform(Number),
    presentsMaterialClearly: z.string().transform(Number),
    ratingText: z.string().min(20, { message: "Review text must be at least 20 characters long" }),
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

export function NewTeacherForm() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<NewProfessorFormInputs>({
        resolver: (values, ctx, op) => {
            console.log(values);
            return zodResolver(newProfessorFormParser)(values, ctx, op);
        },
        defaultValues: {
            sameDepartment: true,
        },
    });

    const professorDepartment = watch("professorDepartment");
    const sameAsProfessorDepartment = watch("sameDepartment");

    if (sameAsProfessorDepartment) {
        setValue("courseDepartment", professorDepartment);
    }

    const {
        mutateAsync: addNewProfessorMutation,
        isLoading,
        error: networkError,
    } = trpc.useMutation("addNewProfessor");
    const history = useHistory();

    const onSubmit = async ({
        professorFirstName,
        professorLastName,
        professorDepartment,
        overallRating,
        presentsMaterialClearly,
        recognizesStudentDifficulties,
        grade,
        courseDepartment,
        courseNum,
        courseType,
        gradeLevel,
        ratingText,
    }: NewProfessorFormInputs) => {
        try {
            await addNewProfessorMutation({
                firstName: professorFirstName,
                lastName: professorLastName,
                department: professorDepartment,
                rating: {
                    overallRating,
                    presentsMaterialClearly,
                    recognizesStudentDifficulties,
                    grade,
                    department: courseDepartment,
                    courseNum,
                    courseType,
                    gradeLevel,
                    rating: ratingText,
                },
            });
            toast.success(
                "Thank you for adding a professor. It will be reviewed manually and will be available soon",
            );
            history.push("/");
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
                    <button
                        className="bg-cal-poly-green text-white rounded-lg p-2 shadow w-24"
                        type="submit"
                        style={{ display: isLoading ? "none" : "block" }}
                    >
                        Submit
                    </button>
                    {/* Exact size for no layer shift when replacing button */}
                    <ClipLoader color="#1F4715" loading={isLoading} size={34} />
                </div>
                <div className="text-red-500 text-sm">{networkError?.message}</div>
            </form>
        </div>
    );
}

export const hello = "";
