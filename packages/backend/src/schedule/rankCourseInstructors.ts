import { findMatchingProfessor } from "@backend/schedule/instructorMatch";
import type { SectionOffering } from "@backend/schedule/schema";
import type { TruncatedProfessor } from "@backend/types/schema";

export const MIN_EVALS_FOR_TOP_RATED = 3;

export type RankedCourseInstructor = {
    professor: TruncatedProfessor;
    sections: SectionOffering[];
};

export type UnmatchedCourseInstructor = {
    instructorRaw: string;
    sections: SectionOffering[];
};

export type RankedCourseInstructorsResult = {
    topRated: RankedCourseInstructor[];
    otherRated: RankedCourseInstructor[];
    unrated: RankedCourseInstructor[];
    unmatched: UnmatchedCourseInstructor[];
};

function compareProfessors(a: TruncatedProfessor, b: TruncatedProfessor): number {
    if (b.overallRating !== a.overallRating) {
        return b.overallRating - a.overallRating;
    }
    return b.numEvals - a.numEvals;
}

export function rankCourseInstructors(
    sections: SectionOffering[],
    professors: TruncatedProfessor[],
): RankedCourseInstructorsResult {
    const matchedByProfessorId = new Map<string, RankedCourseInstructor>();
    const unmatchedByRaw = new Map<string, UnmatchedCourseInstructor>();

    for (const section of sections) {
        const professor = findMatchingProfessor(section.instructorRaw, professors);
        if (professor) {
            const existing = matchedByProfessorId.get(professor.id);
            if (existing) {
                existing.sections.push(section);
            } else {
                matchedByProfessorId.set(professor.id, {
                    professor,
                    sections: [section],
                });
            }
        } else {
            const raw = section.instructorRaw.trim() || "TBA";
            const existing = unmatchedByRaw.get(raw);
            if (existing) {
                existing.sections.push(section);
            } else {
                unmatchedByRaw.set(raw, { instructorRaw: raw, sections: [section] });
            }
        }
    }

    const matched = [...matchedByProfessorId.values()].sort((a, b) =>
        compareProfessors(a.professor, b.professor),
    );

    const topRated: RankedCourseInstructor[] = [];
    const otherRated: RankedCourseInstructor[] = [];
    const unrated: RankedCourseInstructor[] = [];

    for (const entry of matched) {
        if (entry.professor.numEvals === 0) {
            unrated.push(entry);
        } else if (entry.professor.numEvals >= MIN_EVALS_FOR_TOP_RATED) {
            topRated.push(entry);
        } else {
            otherRated.push(entry);
        }
    }

    const unmatched = [...unmatchedByRaw.values()].sort((a, b) =>
        a.instructorRaw.localeCompare(b.instructorRaw),
    );

    return { topRated, otherRated, unrated, unmatched };
}
