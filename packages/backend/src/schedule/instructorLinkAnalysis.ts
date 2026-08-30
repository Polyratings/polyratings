import { canonicalScheduleCourseNum, scheduleCourseKeyCandidates } from "@backend/schedule/courseKeys";
import {
    classifyInstructorMapping,
    findAllMatchingProfessors,
    isPlaceholderInstructor,
    type InstructorMatchConfidence,
} from "@backend/schedule/instructorMatch";
import type { SectionOffering } from "@backend/schedule/schema";
import type { TruncatedProfessor } from "@backend/types/schema";

export type ScheduleSection = Pick<SectionOffering, "courseKey" | "section" | "classNbr" | "instructorRaw">;

export type ParsedCourseKey = {
    department: string;
    courseNum: string;
    catalogNum: number | null;
};

export type InstructorTeachingProfile = {
    instructorRaw: string;
    sectionCount: number;
    courseKeys: string[];
    departments: string[];
    primaryDepartment: string | null;
    labSectionCount: number;
    isMultiInstructor: boolean;
};

export type MatchedLinkVerdict =
    | "verified"
    | "likely_correct"
    | "weak_evidence"
    | "likely_mismatch"
    | "likely_wrong";

export type MatchedLinkAnalysis = {
    kind: "matched";
    instructorRaw: string;
    nameConfidence: InstructorMatchConfidence;
    polyratingsProfessorId: string;
    professorName: string;
    professorDepartment: string;
    professorNumEvals: number;
    sectionCount: number;
    verdict: MatchedLinkVerdict;
    verdictScore: number;
    courseOverlapCount: number;
    courseOverlapRatio: number;
    departmentOverlapCount: number;
    departmentOverlapRatio: number;
    homeDepartmentMatch: boolean;
    teachingDepartments: string[];
    overlappingCourses: string[];
    sampleCourses: string[];
    professorCourses: string[];
    notes: string[];
};

export type UnmatchedScheduleVerdict =
    | "likely_new_faculty"
    | "likely_ta_or_adjunct"
    | "near_match_name_fix"
    | "possible_duplicate_entry"
    | "unknown";

export type UnmatchedScheduleAnalysis = {
    kind: "unmatched_schedule";
    instructorRaw: string;
    sectionCount: number;
    verdict: UnmatchedScheduleVerdict;
    teachingDepartments: string[];
    primaryDepartment: string | null;
    sampleCourses: string[];
    nearMatchProfessorId?: string;
    nearMatchProfessorName?: string;
    nearMatchReason?: string;
    notes: string[];
};

export type AbsentProfessorVerdict =
    | "likely_retired"
    | "possibly_on_leave"
    | "low_activity"
    | "inactive_record";

export type AbsentProfessorAnalysis = {
    kind: "absent_polyratings";
    polyratingsProfessorId: string;
    professorName: string;
    department: string;
    numEvals: number;
    verdict: AbsentProfessorVerdict;
    courses: string[];
    notes: string[];
};

export type ReviewNeededAnalysis = {
    kind: "review_needed";
    instructorRaw: string;
    sectionCount: number;
    nameConfidence: InstructorMatchConfidence;
    candidateNames: string[];
    deptDisambiguationSuggestion?: string;
    notes: string[];
};

export type InstructorAnalysisRecord =
    | MatchedLinkAnalysis
    | UnmatchedScheduleAnalysis
    | ReviewNeededAnalysis;

const COURSE_KEY_PATTERN = /^([A-Z]{2,5})\s+([\dA-Z]+)$/;

export function parseCourseKey(courseKey: string): ParsedCourseKey | null {
    const match = courseKey.trim().toUpperCase().match(COURSE_KEY_PATTERN);
    if (!match) {
        return null;
    }

    const department = match[1]!;
    const courseNum = match[2]!;
    const numeric = Number.parseInt(courseNum.replace(/\D/g, ""), 10);
    return {
        department,
        courseNum,
        catalogNum: Number.isNaN(numeric) ? null : canonicalScheduleCourseNum(numeric),
    };
}

export function professorCoursePrefixes(professor: TruncatedProfessor): Set<string> {
    const prefixes = new Set<string>();
    prefixes.add(professor.department);
    for (const course of professor.courses) {
        const prefix = course.split(" ")[0]?.trim().toUpperCase();
        if (prefix) {
            prefixes.add(prefix);
        }
    }
    return prefixes;
}

export function scheduleCourseMatchesProfessor(
    courseKey: string,
    professor: TruncatedProfessor,
): boolean {
    const parsed = parseCourseKey(courseKey);
    if (!parsed || parsed.catalogNum == null) {
        return false;
    }

    const candidates = new Set(
        scheduleCourseKeyCandidates(parsed.department, parsed.catalogNum).map((key) =>
            key.toUpperCase(),
        ),
    );
    return professor.courses.some((course) => candidates.has(course.toUpperCase()));
}

function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

function levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j += 1) {
        matrix[0]![j] = j;
    }

    for (let i = 1; i <= b.length; i += 1) {
        for (let j = 1; j <= a.length; j += 1) {
            const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
            matrix[i]![j] = Math.min(
                matrix[i - 1]![j]! + 1,
                matrix[i]![j - 1]! + 1,
                matrix[i - 1]![j - 1]! + cost,
            );
        }
    }

    return matrix[b.length]![a.length]!;
}

function parseInstructorName(instructorRaw: string): { first?: string; last?: string } {
    const trimmed = instructorRaw.trim();
    if (trimmed.includes(",")) {
        const [lastPart, ...firstParts] = trimmed.split(",");
        return {
            last: normalizeName(lastPart ?? ""),
            first: normalizeName(firstParts.join(" ")),
        };
    }

    const parts = trimmed.split(/\s+/).map(normalizeName).filter((part) => part.length > 0);
    if (parts.length >= 2) {
        return { first: parts[0], last: parts.slice(1).join(" ") };
    }
    if (parts.length === 1) {
        return { last: parts[0] };
    }
    return {};
}

function isLikelyFullName(instructorRaw: string): boolean {
    const parsed = parseInstructorName(instructorRaw);
    return (parsed.first?.length ?? 0) >= 2 && (parsed.last?.length ?? 0) >= 2;
}

export function buildTeachingProfile(
    instructorRaw: string,
    sections: ScheduleSection[],
): InstructorTeachingProfile {
    const courseKeys = [...new Set(sections.map((section) => section.courseKey))];
    const departments = [
        ...new Set(
            courseKeys
                .map((courseKey) => parseCourseKey(courseKey)?.department)
                .filter((dept): dept is string => dept != null),
        ),
    ];

    const departmentCounts = new Map<string, number>();
    for (const section of sections) {
        const dept = parseCourseKey(section.courseKey)?.department;
        if (dept) {
            departmentCounts.set(dept, (departmentCounts.get(dept) ?? 0) + 1);
        }
    }

    const primaryDepartment =
        [...departmentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
        instructorRaw,
        sectionCount: sections.length,
        courseKeys,
        departments,
        primaryDepartment,
        labSectionCount: sections.filter(
            (section) =>
                section.section.toUpperCase().includes("LAB") ||
                /\dL$/i.test(section.courseKey.split(" ").slice(1).join(" ") ?? ""),
        ).length,
        isMultiInstructor: instructorRaw.includes("/"),
    };
}

function analyzeMatchedLink(
    instructorRaw: string,
    sections: ScheduleSection[],
    professor: TruncatedProfessor,
    nameConfidence: "high" | "medium",
): MatchedLinkAnalysis {
    const profile = buildTeachingProfile(instructorRaw, sections);
    const professorPrefixes = professorCoursePrefixes(professor);
    const overlappingCourses = profile.courseKeys.filter((courseKey) =>
        scheduleCourseMatchesProfessor(courseKey, professor),
    );
    const departmentOverlapCount = profile.departments.filter((dept) =>
        professorPrefixes.has(dept),
    ).length;

    const courseOverlapCount = overlappingCourses.length;
    const courseOverlapRatio =
        profile.courseKeys.length === 0 ? 0 : courseOverlapCount / profile.courseKeys.length;
    const departmentOverlapRatio =
        profile.departments.length === 0 ? 0 : departmentOverlapCount / profile.departments.length;
    const homeDepartmentMatch =
        profile.primaryDepartment != null && profile.primaryDepartment === professor.department;

    const notes: string[] = [];
    let verdict: MatchedLinkVerdict;
    let verdictScore = 0;

    if (courseOverlapCount > 0) {
        verdict = "verified";
        verdictScore = 100;
        notes.push(`Course overlap on ${courseOverlapCount}/${profile.courseKeys.length} distinct courses`);
    } else if (departmentOverlapRatio >= 0.5 || homeDepartmentMatch) {
        verdict = "likely_correct";
        verdictScore = 75;
        notes.push("Department alignment supports the name match");
        if (!homeDepartmentMatch && departmentOverlapRatio >= 0.5) {
            notes.push("Cross-department teaching detected via course prefixes");
        }
    } else if (departmentOverlapCount === 0 && profile.sectionCount >= 3) {
        verdict = profile.sectionCount >= 5 ? "likely_wrong" : "likely_mismatch";
        verdictScore = profile.sectionCount >= 5 ? 10 : 25;
        notes.push("No department or course overlap with professor history");
        notes.push(`Teaching primarily ${profile.primaryDepartment ?? "unknown"} courses`);
    } else {
        verdict = "weak_evidence";
        verdictScore = 50;
        notes.push("Name match only; insufficient course/dept corroboration");
    }

    if (nameConfidence === "medium") {
        verdictScore -= 10;
        notes.push("Name match required first-name disambiguation");
    }

    if (profile.isMultiInstructor) {
        notes.push("Multi-instructor section string; link may cover only one co-teacher");
    }

    return {
        kind: "matched",
        instructorRaw,
        nameConfidence,
        polyratingsProfessorId: professor.id,
        professorName: `${professor.firstName} ${professor.lastName}`,
        professorDepartment: professor.department,
        professorNumEvals: professor.numEvals,
        sectionCount: profile.sectionCount,
        verdict,
        verdictScore,
        courseOverlapCount,
        courseOverlapRatio,
        departmentOverlapCount,
        departmentOverlapRatio,
        homeDepartmentMatch,
        teachingDepartments: profile.departments,
        overlappingCourses,
        sampleCourses: profile.courseKeys.slice(0, 8),
        professorCourses: professor.courses.slice(0, 12),
        notes,
    };
}

function findNearMatchProfessor(
    instructorRaw: string,
    profile: InstructorTeachingProfile,
    professors: TruncatedProfessor[],
): TruncatedProfessor | undefined {
    const parsed = parseInstructorName(instructorRaw);
    if (!parsed.last) {
        return undefined;
    }

    let best: { professor: TruncatedProfessor; score: number; reason: string } | undefined;

    for (const professor of professors) {
        const profLast = normalizeName(professor.lastName);
        const profFirst = normalizeName(professor.firstName);
        const profFull = `${profFirst} ${profLast}`.trim();
        const instructorFull = `${parsed.first ?? ""} ${parsed.last}`.trim();

        if (profLast !== parsed.last) {
            continue;
        }

        let score = 40;
        let reason = "Same last name";

        if (parsed.first && profFirst === parsed.first) {
            score += 40;
            reason = "Same first and last name but not linked";
        } else if (parsed.first) {
            const distance = levenshtein(parsed.first, profFirst);
            if (distance <= 2) {
                score += 30 - distance * 5;
                reason = `Similar first name (${distance} edits)`;
            }
        }

        const distance = levenshtein(instructorFull, profFull);
        if (distance <= 3) {
            score += 20 - distance * 3;
            reason = `Near-full-name match (${distance} edits)`;
        }

        if (
            profile.primaryDepartment &&
            professorCoursePrefixes(professor).has(profile.primaryDepartment)
        ) {
            score += 25;
            reason += "; department aligns";
        }

        if (!best || score > best.score) {
            best = { professor, score, reason };
        }
    }

    return best && best.score >= 55 ? best.professor : undefined;
}

function analyzeUnmatchedSchedule(
    instructorRaw: string,
    sections: ScheduleSection[],
    professors: TruncatedProfessor[],
): UnmatchedScheduleAnalysis {
    const profile = buildTeachingProfile(instructorRaw, sections);
    const notes: string[] = [];
    const nearMatch = findNearMatchProfessor(instructorRaw, profile, professors);

    let verdict: UnmatchedScheduleVerdict = "unknown";

    if (nearMatch) {
        verdict = "near_match_name_fix";
        notes.push("Existing Polyratings professor likely matches with a name/spelling fix");
    } else if (
        profile.sectionCount >= 3 &&
        isLikelyFullName(instructorRaw) &&
        profile.labSectionCount / profile.sectionCount < 0.5
    ) {
        verdict = "likely_new_faculty";
        notes.push("Multiple sections with a full name and no Polyratings record");
    } else if (profile.sectionCount <= 2 || profile.labSectionCount / profile.sectionCount >= 0.5) {
        verdict = "likely_ta_or_adjunct";
        notes.push("Low section count or mostly lab sections");
    }

    if (profile.isMultiInstructor) {
        notes.push("Multi-instructor string may need split matching");
    }

    return {
        kind: "unmatched_schedule",
        instructorRaw,
        sectionCount: profile.sectionCount,
        verdict,
        teachingDepartments: profile.departments,
        primaryDepartment: profile.primaryDepartment,
        sampleCourses: profile.courseKeys.slice(0, 8),
        nearMatchProfessorId: nearMatch?.id,
        nearMatchProfessorName: nearMatch
            ? `${nearMatch.firstName} ${nearMatch.lastName}`
            : undefined,
        nearMatchReason: nearMatch ? "Near-name match in same department context" : undefined,
        notes,
    };
}

function analyzeReviewNeeded(
    instructorRaw: string,
    sections: ScheduleSection[],
    confidence: "low" | "ambiguous",
    candidates: TruncatedProfessor[],
): ReviewNeededAnalysis {
    const profile = buildTeachingProfile(instructorRaw, sections);
    const notes: string[] = [];
    let deptDisambiguationSuggestion: string | undefined;

    const deptAligned = candidates.filter((candidate) =>
        profile.departments.some((dept) => professorCoursePrefixes(candidate).has(dept)),
    );

    if (deptAligned.length === 1) {
        const pick = deptAligned[0]!;
        deptDisambiguationSuggestion = `${pick.firstName} ${pick.lastName} (${pick.department})`;
        notes.push("Department/course context suggests a single candidate");
    } else if (deptAligned.length > 1) {
        notes.push(`${deptAligned.length} candidates align with teaching departments`);
    } else {
        notes.push("No candidate aligns with teaching departments");
    }

    if (confidence === "low") {
        notes.push("Initial-only or prefix name match — do not auto-link");
    }

    return {
        kind: "review_needed",
        instructorRaw,
        sectionCount: profile.sectionCount,
        nameConfidence: confidence,
        candidateNames: candidates.map((candidate) => `${candidate.firstName} ${candidate.lastName}`),
        deptDisambiguationSuggestion,
        notes,
    };
}

function analyzeAbsentProfessor(professor: TruncatedProfessor): AbsentProfessorAnalysis {
    const notes: string[] = [];
    let verdict: AbsentProfessorVerdict;

    if (professor.numEvals >= 15) {
        verdict = "likely_retired";
        notes.push("Established teaching history but absent from current schedule");
    } else if (professor.numEvals >= 5) {
        verdict = "possibly_on_leave";
        notes.push("Moderate eval history; may be on leave or teaching under another name");
    } else if (professor.numEvals > 0) {
        verdict = "low_activity";
        notes.push("Few ratings; may be adjunct or recently added");
    } else {
        verdict = "inactive_record";
        notes.push("No ratings on record");
    }

    if (professor.courses.length >= 5) {
        notes.push(`Taught ${professor.courses.length} distinct courses historically`);
    }

    return {
        kind: "absent_polyratings",
        polyratingsProfessorId: professor.id,
        professorName: `${professor.firstName} ${professor.lastName}`,
        department: professor.department,
        numEvals: professor.numEvals,
        verdict,
        courses: professor.courses.slice(0, 12),
        notes,
    };
}

export function analyzeInstructorLinks(input: {
    sections: ScheduleSection[];
    professors: TruncatedProfessor[];
}): {
    matched: MatchedLinkAnalysis[];
    unmatchedSchedule: UnmatchedScheduleAnalysis[];
    reviewNeeded: ReviewNeededAnalysis[];
    absentProfessors: AbsentProfessorAnalysis[];
    byInstructorRaw: Map<string, InstructorAnalysisRecord>;
} {
    const sectionsByInstructor = new Map<string, ScheduleSection[]>();
    for (const section of input.sections) {
        const raw = section.instructorRaw.trim();
        if (isPlaceholderInstructor(raw)) {
            continue;
        }
        const existing = sectionsByInstructor.get(raw) ?? [];
        existing.push(section);
        sectionsByInstructor.set(raw, existing);
    }

    const matched: MatchedLinkAnalysis[] = [];
    const unmatchedSchedule: UnmatchedScheduleAnalysis[] = [];
    const reviewNeeded: ReviewNeededAnalysis[] = [];
    const byInstructorRaw = new Map<string, InstructorAnalysisRecord>();
    const linkedProfessorIds = new Set<string>();

    for (const [instructorRaw, instructorSections] of sectionsByInstructor) {
        const classification = classifyInstructorMapping(instructorRaw, input.professors);

        if (classification.confidence === "high" || classification.confidence === "medium") {
            const analysis = analyzeMatchedLink(
                instructorRaw,
                instructorSections,
                classification.professor,
                classification.confidence,
            );
            matched.push(analysis);
            byInstructorRaw.set(instructorRaw, analysis);
            linkedProfessorIds.add(classification.professor.id);
            continue;
        }

        if (classification.confidence === "low" || classification.confidence === "ambiguous") {
            const analysis = analyzeReviewNeeded(
                instructorRaw,
                instructorSections,
                classification.confidence,
                classification.candidates,
            );
            reviewNeeded.push(analysis);
            byInstructorRaw.set(instructorRaw, analysis);
            continue;
        }

        if (classification.confidence === "unmatched") {
            const analysis = analyzeUnmatchedSchedule(
                instructorRaw,
                instructorSections,
                input.professors,
            );
            unmatchedSchedule.push(analysis);
            byInstructorRaw.set(instructorRaw, analysis);
        }
    }

    const absentProfessors = input.professors
        .filter((professor) => !linkedProfessorIds.has(professor.id))
        .map(analyzeAbsentProfessor)
        .sort((a, b) => b.numEvals - a.numEvals);

    return {
        matched,
        unmatchedSchedule,
        reviewNeeded,
        absentProfessors,
        byInstructorRaw,
    };
}

export function findBetterProfessorByContext(
    instructorRaw: string,
    sections: ScheduleSection[],
    professors: TruncatedProfessor[],
): TruncatedProfessor | undefined {
    const profile = buildTeachingProfile(instructorRaw, sections);
    const candidates = findAllMatchingProfessors(instructorRaw, professors);
    if (candidates.length <= 1) {
        return undefined;
    }

    const scored = candidates.map((candidate) => {
        const courseScore = profile.courseKeys.filter((courseKey) =>
            scheduleCourseMatchesProfessor(courseKey, candidate),
        ).length;
        const deptScore = profile.departments.filter((dept) =>
            professorCoursePrefixes(candidate).has(dept),
        ).length;
        return { candidate, score: courseScore * 10 + deptScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const second = scored[1];
    if (!top || top.score === 0 || (second && second.score === top.score)) {
        return undefined;
    }
    return top.candidate;
}
