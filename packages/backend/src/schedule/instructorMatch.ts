export type ProfessorName = {
    firstName: string;
    lastName: string;
};

const PLACEHOLDER_INSTRUCTORS = new Set(["tba", "tbd", "staff", "to be announced"]);

function normalizeNamePart(part: string): string {
    return part
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

function splitInstructors(instructorRaw: string): string[] {
    const trimmed = instructorRaw.trim();
    if (trimmed.length === 0 || PLACEHOLDER_INSTRUCTORS.has(trimmed.toLowerCase())) {
        return [];
    }

    return trimmed
        .split(/\s*\/\s*/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

type ParsedInstructorName = { first?: string; last?: string };

function parseInstructorNameCandidates(raw: string): ParsedInstructorName[] {
    const normalized = raw.trim();
    if (normalized.length === 0) {
        return [];
    }

    if (normalized.includes(",")) {
        const [lastPart, ...firstParts] = normalized.split(",");
        const last = normalizeNamePart(lastPart ?? "");
        const first = normalizeNamePart(firstParts.join(" "));
        return [
            {
                ...(last.length > 0 ? { last } : {}),
                ...(first.length > 0 ? { first } : {}),
            },
        ];
    }

    const parts = normalized
        .split(/\s+/)
        .map(normalizeNamePart)
        .filter((part) => part.length > 0);

    if (parts.length >= 3) {
        return [
            { first: parts[0], last: parts.slice(1).join(" ") },
            { first: parts[0], last: parts[parts.length - 1] },
        ];
    }

    if (parts.length === 2) {
        return [{ first: parts[0], last: parts[1] }];
    }

    if (parts.length === 1) {
        return [{ last: parts[0] }];
    }

    return [];
}

function firstNameMatches(instructorFirst: string | undefined, professorFirst: string): boolean {
    if (instructorFirst == null || instructorFirst.length === 0) {
        return false;
    }

    if (instructorFirst === professorFirst) {
        return true;
    }

    const instructorInitial = instructorFirst.replace(/\.$/, "");
    if (instructorInitial.length === 1) {
        return professorFirst.startsWith(instructorInitial);
    }

    if (professorFirst.length === 1) {
        return instructorFirst.startsWith(professorFirst);
    }

    const [shorter, longer] =
        instructorFirst.length <= professorFirst.length
            ? [instructorFirst, professorFirst]
            : [professorFirst, instructorFirst];

    return shorter.length >= 3 && longer.startsWith(shorter);
}

function instructorFirstNames(instructorRaw: string): string[] {
    return splitInstructors(instructorRaw).flatMap((instructor) =>
        parseInstructorNameCandidates(instructor).flatMap((parsed) =>
            parsed.first ? [parsed.first] : [],
        ),
    );
}

function instructorMatchesProfessor(instructor: string, professor: ProfessorName): boolean {
    const professorFirst = normalizeNamePart(professor.firstName);
    const professorLast = normalizeNamePart(professor.lastName);

    if (professorLast.length === 0) {
        return false;
    }

    return parseInstructorNameCandidates(instructor).some((parsed) => {
        if (parsed.last !== professorLast) {
            return false;
        }

        if (professorFirst.length === 0) {
            return true;
        }

        return firstNameMatches(parsed.first, professorFirst);
    });
}

export function matchesProfessor(instructorRaw: string, professor: ProfessorName): boolean {
    return splitInstructors(instructorRaw).some((instructor) =>
        instructorMatchesProfessor(instructor, professor),
    );
}

export function isPlaceholderInstructor(instructorRaw: string): boolean {
    const trimmed = instructorRaw.trim();
    return trimmed.length === 0 || PLACEHOLDER_INSTRUCTORS.has(trimmed.toLowerCase());
}

export function findAllMatchingProfessors<T extends ProfessorName>(
    instructorRaw: string,
    professors: T[],
): T[] {
    return professors.filter((professor) => matchesProfessor(instructorRaw, professor));
}

function hasExactFirstNameMatch(instructorRaw: string, professor: ProfessorName): boolean {
    const professorFirst = normalizeNamePart(professor.firstName);
    if (professorFirst.length === 0) {
        return true;
    }

    return instructorFirstNames(instructorRaw).some((first) => first === professorFirst);
}

export function findMatchingProfessor<T extends ProfessorName>(
    instructorRaw: string,
    professors: T[],
): T | undefined {
    const candidates = findAllMatchingProfessors(instructorRaw, professors);

    if (candidates.length === 0) {
        return undefined;
    }

    if (candidates.length === 1) {
        return candidates[0];
    }

    const instructorFirsts = instructorFirstNames(instructorRaw);
    const exactMatches = candidates.filter((professor) =>
        instructorFirsts.some((first) => normalizeNamePart(professor.firstName) === first),
    );

    if (exactMatches.length === 1) {
        return exactMatches[0];
    }

    return undefined;
}

export type InstructorMatchConfidence = "high" | "medium" | "low" | "ambiguous" | "unmatched" | "reject";

export type InstructorMappingClassification<T extends ProfessorName = ProfessorName> =
    | { confidence: "reject"; instructorRaw: string }
    | { confidence: "unmatched"; instructorRaw: string }
    | { confidence: "low"; instructorRaw: string; candidates: T[] }
    | { confidence: "ambiguous"; instructorRaw: string; candidates: T[] }
    | {
          confidence: "high" | "medium";
          instructorRaw: string;
          professor: T;
          candidates: T[];
      };

export function classifyInstructorMapping<T extends ProfessorName>(
    instructorRaw: string,
    professors: T[],
): InstructorMappingClassification<T> {
    if (isPlaceholderInstructor(instructorRaw)) {
        return { confidence: "reject", instructorRaw };
    }

    const candidates = findAllMatchingProfessors(instructorRaw, professors);
    if (candidates.length === 0) {
        return { confidence: "unmatched", instructorRaw };
    }

    if (candidates.length === 1) {
        const professor = candidates[0]!;
        if (hasExactFirstNameMatch(instructorRaw, professor)) {
            return { confidence: "high", instructorRaw, professor, candidates };
        }
        return { confidence: "low", instructorRaw, candidates };
    }

    const professor = findMatchingProfessor(instructorRaw, candidates);
    if (professor) {
        return { confidence: "medium", instructorRaw, professor, candidates };
    }

    return { confidence: "ambiguous", instructorRaw, candidates };
}
