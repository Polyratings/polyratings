import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@backend/index";
import { trpc } from "@/trpc";
import { ScheduleMeta, ScheduleSectionsTable } from "./ScheduleSectionsTable";

type Professor = inferProcedureOutput<AppRouter["professors"]["get"]>;

interface ProfessorTeachingScheduleProps {
    professor: Pick<Professor, "firstName" | "lastName">;
}

export function ProfessorTeachingSchedule({ professor }: ProfessorTeachingScheduleProps) {
    const { data, isPending } = trpc.schedule.getSectionsForProfessor.useQuery(
        {
            firstName: professor.firstName,
            lastName: professor.lastName,
        },
        { meta: { suppressGlobalErrorToast: true } },
    );

    if (isPending || !data?.available) {
        return null;
    }

    if (!data.sections.length) {
        return (
            <section
                className="lg:max-w-5xl w-full mx-auto px-2 mt-4"
                aria-label="Teaching this term"
            >
                <h2 className="text-xl font-semibold text-cal-poly-green mb-1">
                    Teaching this term
                </h2>
                <ScheduleMeta termLabel={data.termLabel} scrapedAt={data.scrapedAt} />
                <p className="text-sm text-gray-500 mt-2">
                    No sections matched this professor in the current term schedule.
                </p>
            </section>
        );
    }

    return (
        <section
            className="lg:max-w-5xl w-full mx-auto px-2 mt-4 mb-2"
            aria-label="Teaching this term"
        >
            <h2 className="text-xl font-semibold text-cal-poly-green mb-1">Teaching this term</h2>
            <ScheduleMeta termLabel={data.termLabel} scrapedAt={data.scrapedAt} className="mb-3" />
            <ScheduleSectionsTable sections={data.sections} showCourse showInstructor={false} />
        </section>
    );
}
