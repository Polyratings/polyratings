import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { ValueOf } from "type-fest";
import { z } from "zod";
import Modal from "react-modal";
import { FlagIcon } from "@heroicons/react/24/solid";
import { inferQueryOutput, trpc } from "@/trpc";
import { TextArea, TextInput } from "./forms";
import { REACT_MODAL_STYLES } from "@/constants";
import { Button } from "./forms/Button";

export interface ClassSectionProps {
    ratings: ValueOf<inferQueryOutput<"getProfessor">["reviews"]>;
    professorId: string;
    course: string;
}

export function ClassSection({ ratings, course, professorId }: ClassSectionProps) {
    return (
        <div className="pt-4 relative" id={course}>
            <h2 className="text-center text-4xl text-cal-poly-green">{course}</h2>
            <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                {ratings.map((rating, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <ReviewCard key={i} rating={rating} professorId={professorId} />
                ))}
            </div>
        </div>
    );
}

interface ReviewCard {
    professorId: string;
    rating: ValueOf<inferQueryOutput<"getProfessor">["reviews"]>[0];
}
function ReviewCard({ rating, professorId }: ReviewCard) {
    return (
        <div className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex flex-col md:flex-row relative">
            <div className="hidden md:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
                <div>{rating.gradeLevel}</div>
                <div>{rating.grade}</div>
                <div>{rating.courseType}</div>
                <div>
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <ReportButton professorId={professorId} ratingId={rating.id} />
            </div>

            <div className="flex md:hidden flex-col flex-shrink-0 m-auto text-center text-sm">
                <div>Grade Received: {rating.grade}</div>
                <div>
                    Posted:{" "}
                    {new Date(rating.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <div className="absolute right-5 top-2">
                    <ReportButton professorId={professorId} ratingId={rating.id} />
                </div>
            </div>

            {/* Desktop divider */}
            <div className="hidden md:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0" />
            {/* Mobile divider */}
            <div className="flex md:hidden bg-cal-poly-green w-4/5 h-1 m-auto my-2" />

            <div className="flex-grow">{rating.rating}</div>
        </div>
    );
}

interface ReportButtonProps {
    professorId: string;
    ratingId: string;
}
function ReportButton({ professorId, ratingId }: ReportButtonProps) {
    const [formShown, setFormShown] = useState(false);
    return (
        <div>
            <Modal
                isOpen={formShown}
                style={REACT_MODAL_STYLES}
                onRequestClose={() => setFormShown(false)}
            >
                <div className="bg-white rounded shadow p-5 w-[35rem]">
                    <ReportForm
                        professorId={professorId}
                        ratingId={ratingId}
                        closeForm={() => setFormShown(false)}
                    />
                </div>
            </Modal>

            <button type="button" onClick={() => setFormShown(true)}>
                <FlagIcon className="h-6 w-6 m-auto mt-1 text-gray-500 hover:text-red-500 transition-all cursor-pointer" />
            </button>
        </div>
    );
}

interface ReportFormProps {
    closeForm: () => void;
    professorId: string;
    ratingId: string;
}

const reportFormParser = z.object({
    email: z.string().email().optional(),
    reason: z
        .string()
        .min(1, { message: "Leaving a reason will help the team make an informed decision" }),
});

type ReportFormInputs = z.infer<typeof reportFormParser>;

function ReportForm({ closeForm, professorId, ratingId }: ReportFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormInputs>();

    const reportMutation = trpc.useMutation("reportRating");

    const onSubmit: SubmitHandler<ReportFormInputs> = async (formResult) => {
        // Silently log error and tell the user that there report was successful
        // While dishonest it will lead to a better experience in the case there is an error
        reportMutation.mutate({
            professorId,
            ratingId,
            email: formResult.email ?? "",
            reason: formResult.reason,
        });
        closeForm();
        toast.success("Thank you for the report. The team will review it soon");
    };

    return (
        <form className="relative text-left" onSubmit={handleSubmit(onSubmit)}>
            <button
                className="absolute right-0 top-0 p-3 font-bold cursor-pointer"
                onClick={closeForm}
                type="button"
            >
                X
            </button>
            <h2 className="text-3xl font-semibold mb-4">Report Rating</h2>
            <TextInput
                wrapperClassName="!w-full"
                label="Email (Optional)"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register("email")}
            />
            <TextArea
                label="Reason For Reporting"
                placeholder="This Review was offensive and contained inappropriate language."
                wrapperClassName="mt-2"
                className="!h-40"
                {...register("reason")}
            />
            <div className="flex justify-center">
                <Button className="mt-4" type="submit">
                    Submit
                </Button>
            </div>
        </form>
    );
}
