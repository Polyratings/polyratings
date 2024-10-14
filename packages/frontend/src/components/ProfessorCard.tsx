import { Link } from "react-router-dom";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import star from "@/assets/star.svg";

interface ProfessorCardProps {
    professor: inferProcedureOutput<AppRouter["professors"]["all"]>[0] | null;
}

export const PROFESSOR_CARD_HEIGHT_REM = 10;

export function ProfessorCard({ professor }: ProfessorCardProps) {
    return (
        <Link to={`/professor/${professor?.id}`}>
            <div
                // eslint-disable-next-line max-len
                className="w-full h-32 border-cal-poly-gold border-4 bg-white flex justify-between items-center text-cal-poly-green cursor-pointer"
                style={{ borderRadius: "1.5rem" }}
            >
                <h3 className="text-3xl font-medium pl-3">
                    {professor?.lastName}, {professor?.firstName}
                </h3>
                <div className="text-right text-xl pr-3 font-medium flex-shrink-0">
                    <div className="flex items-center justify-end">
                        <img className="pr-1 h-4" src={star} alt="" />
                        <div>{professor?.overallRating.toFixed(2)}</div>
                    </div>
                    <div>{professor?.numEvals} evals</div>
                </div>
            </div>
        </Link>
    );
}
