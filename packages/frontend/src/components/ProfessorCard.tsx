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
                className="border-cal-poly-gold text-cal-poly-green flex h-32 w-full cursor-pointer items-center justify-between border-4 bg-white"
                style={{ borderRadius: "1.5rem" }}
            >
                <h3 className="pl-3 text-3xl font-medium">
                    {professor?.lastName}, {professor?.firstName}
                </h3>
                <div className="shrink-0 pr-3 text-right text-xl font-medium">
                    <div>{professor?.department}</div>
                    <div className="flex items-center justify-end">
                        <img className="h-4 pr-1" src={star} alt="" />
                        <div>{professor?.overallRating.toFixed(2)}</div>
                    </div>
                    <div>{professor?.numEvals} evals</div>
                </div>
            </div>
        </Link>
    );
}
