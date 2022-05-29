import { Review } from "@polyratings/client";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "react-toastify";
import Modal from "react-modal";
import { useService } from "@/hooks";
import { Logger, ReviewService } from "@/services";
import { REACT_MODAL_STYLES } from "@/constants";

export interface ClassSectionProps {
    reviews: Review[];
    professorId: string;
    taughtClass: string;
}

export function ClassSection({ reviews, taughtClass, professorId }: ClassSectionProps) {
    return (
        <div className="pt-4 relative" id={taughtClass}>
            <h2 className="text-center text-4xl text-cal-poly-green">{taughtClass}</h2>
            <div className="container md:max-w-5xl flex flex-col m-auto px-2">
                {reviews.map((review, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <ReviewCard key={i} review={review} professorId={professorId} />
                ))}
            </div>
        </div>
    );
}

interface ReviewCard {
    professorId: string;
    review: Review;
}
function ReviewCard({ review, professorId }: ReviewCard) {
    return (
        <div className="bg-white w-full rounded-3xl py-2 px-4 my-2 border-cal-poly-gold border-4 flex flex-col md:flex-row relative">
            <div className="hidden md:flex flex-col w-32 flex-shrink-0 m-auto mr-4 text-center text-sm">
                <div>{review.gradeLevel}</div>
                <div>{review.grade}</div>
                <div>{review.courseType}</div>
                <div>
                    {new Date(review.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <ReportButton professorId={professorId} ratingId={review.id} />
            </div>

            <div className="flex md:hidden flex-col flex-shrink-0 m-auto text-center text-sm">
                <div>Grade Received: {review.grade}</div>
                <div>
                    Posted:{" "}
                    {new Date(review.postDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                    })}
                </div>
                <div className="absolute right-5 top-2">
                    <ReportButton professorId={professorId} ratingId={review.id} />
                </div>
            </div>

            {/* Desktop divider */}
            <div className="hidden md:flex bg-cal-poly-green w-1 mr-4 mt-2 mb-2 flex-shrink-0" />
            {/* Mobile divider */}
            <div className="flex md:hidden bg-cal-poly-green w-4/5 h-1 m-auto my-2" />

            <div className="flex-grow">{review.rating}</div>
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
        <>
            <button type="button" title="Report Rating" onClick={() => setFormShown(true)}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 m-auto mt-1 text-gray-500 hover:text-red-500 transition-all cursor-pointer"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
            <Modal
                isOpen={formShown}
                onRequestClose={() => setFormShown(false)}
                style={REACT_MODAL_STYLES}
            >
                <div
                    className="bg-gray-300 opacity-100 rounded shadow p-5"
                    style={{ width: "35rem" }}
                >
                    <ReportForm
                        professorId={professorId}
                        ratingId={ratingId}
                        closeForm={() => setFormShown(false)}
                    />
                </div>
            </Modal>
        </>
    );
}

interface ReportFormProps {
    closeForm: () => void;
    professorId: string;
    ratingId: string;
}
interface ReportFormInputs {
    email: string;
    reason: string;
}
function ReportForm({ closeForm, professorId, ratingId }: ReportFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReportFormInputs>();

    const [loading, setLoading] = useState(false);
    const reviewService = useService(ReviewService);
    const logger = useService(Logger);

    const onSubmit: SubmitHandler<ReportFormInputs> = async (formResult) => {
        setLoading(true);
        try {
            reviewService.reportReview({
                professorId,
                ratingId,
                email: formResult.email,
                reason: formResult.reason,
            });
        } catch (e) {
            // Silently log error and tell the user that there report was successful
            // While dishonest it will lead to a better experience in the case there is an error
            logger.error(e);
        }
        setLoading(false);
        closeForm();
        toast.success("Thank you for the report. The team will review it soon");
    };

    return (
        <form className="relative text-left" onSubmit={handleSubmit(onSubmit)}>
            <button
                className="absolute right-0 top-0 p-3 font-bold cursor-pointer"
                onClick={closeForm}
                type="button"
                title="Close Form"
            >
                X
            </button>
            <h2 className="text-3xl font-semibold mb-4">Report Rating</h2>
            <label htmlFor="report-reason" className="font-semibold">
                Email (Optional)
                <input
                    id="report-email"
                    {...register("email", {
                        required: false,
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "invalid email address",
                        },
                    })}
                    placeholder="name@example.com"
                    className="h-10 border-gray-300 border w-full rounded pl-2 mb-4"
                />
            </label>
            <label htmlFor="report-reason" className="font-semibold">
                Reason For Reporting
                <textarea
                    id="report-reason"
                    {...register("reason", {
                        required: {
                            value: true,
                            message:
                                "Leaving a reason will help the team make an informed decision",
                        },
                    })}
                    placeholder="This Review was offensive and contained inappropriate language."
                    className="border-gray-300 border w-full h-40 rounded pl-2"
                />
            </label>

            <ErrorMessage errors={errors} name="reason" as="div" className="text-red-500 text-sm" />
            <button
                className="bg-cal-poly-green text-white rounded-lg p-2 shadow w-24 m-auto mt-1"
                style={{ display: loading ? "none" : "block" }}
                type="submit"
            >
                Submit
            </button>
            {/* Exact size for no layer shift */}
            <div className="flex justify-center">
                <ClipLoader color="#1F4715" loading={loading} size={34} />
            </div>
        </form>
    );
}
