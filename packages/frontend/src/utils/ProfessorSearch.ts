import { TruncatedProfessor } from "@backend/types/schema";
import { namesAreNicknames } from "./nameNicknames";

export type ProfessorSearchType = "name" | "class";

export interface ProfessorSearchOptions {
    now?: number;
    includeStale?: boolean;
}

const RATING_PRIOR = 10;
const GLOBAL_MEAN = 2.75;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
/** Hide from casual search if the latest rating is older than this. */
export const STALE_RATING_YEARS = 3;
/** Exact last name (100 + 5) or first+last can still surface a stale professor. */
const STRONG_NAME_SCORE = 101;

interface NameIndex {
    firstParts: string[];
    lastParts: string[];
    firstCollapsed: string;
    lastCollapsed: string;
}

export function professorSearch(
    allProfessors: TruncatedProfessor[],
    type: ProfessorSearchType,
    value: string,
    options: ProfessorSearchOptions = {},
): TruncatedProfessor[] {
    const now = options.now ?? Date.now();
    const includeStale = options.includeStale ?? false;

    switch (type) {
        case "name": {
            const tokens = tokenize(value);
            if (tokens.length === 0) {
                return rankByQuality(allProfessors, now, includeStale);
            }

            return allProfessors
                .map((professor) => ({
                    professor,
                    nameScore: nameMatchScore(tokens, indexName(professor)),
                }))
                .filter(
                    (entry) =>
                        entry.nameScore > 0 &&
                        (includeStale ||
                            !isStaleProfessor(entry.professor, now) ||
                            entry.nameScore >= STRONG_NAME_SCORE),
                )
                .sort((a, b) => compareByRelevance(a, b, now))
                .map((entry) => entry.professor);
        }
        case "class": {
            const courseName = value.trim().toUpperCase();
            const matches = courseName
                ? allProfessors.filter((professor) =>
                      professor.courses.some((course) => course.includes(courseName)),
                  )
                : allProfessors;
            return rankByQuality(matches, now, includeStale);
        }
        default:
            throw new Error(`Invalid Search Type: ${type}`);
    }
}

function rankByQuality(
    professors: TruncatedProfessor[],
    now: number,
    includeStale: boolean,
): TruncatedProfessor[] {
    const visible = includeStale
        ? professors
        : professors.filter((professor) => !isStaleProfessor(professor, now));
    return [...visible].sort((a, b) =>
        compareByRelevance({ professor: a, nameScore: 0 }, { professor: b, nameScore: 0 }, now),
    );
}

export function isStaleProfessor(professor: TruncatedProfessor, now = Date.now()): boolean {
    if (!professor.lastRatingDate) {
        // Older index blobs omit this field; don't hide the entire catalog.
        return false;
    }
    const time = Date.parse(professor.lastRatingDate);
    if (!Number.isFinite(time)) {
        return false;
    }
    return now - time > STALE_RATING_YEARS * MS_PER_YEAR;
}

function compareByRelevance(
    a: { professor: TruncatedProfessor; nameScore: number },
    b: { professor: TruncatedProfessor; nameScore: number },
    now: number,
): number {
    if (a.nameScore !== b.nameScore) {
        return b.nameScore - a.nameScore;
    }
    const qualityDelta =
        professorQualityScore(b.professor, now) - professorQualityScore(a.professor, now);
    if (qualityDelta !== 0) {
        return qualityDelta;
    }
    return `${a.professor.lastName}, ${a.professor.firstName}`.localeCompare(
        `${b.professor.lastName}, ${b.professor.firstName}`,
    );
}

export function professorQualityScore(professor: TruncatedProfessor, now = Date.now()): number {
    if (professor.numEvals <= 0) {
        return 0;
    }

    const popularity = Math.min(1, Math.log(1 + professor.numEvals) / Math.log(1 + 100));
    const bayesian =
        (RATING_PRIOR * GLOBAL_MEAN + professor.numEvals * professor.overallRating) /
        (RATING_PRIOR + professor.numEvals);

    return (
        0.5 * popularity + 0.3 * (bayesian / 4) + 0.2 * recencyScore(professor.lastRatingDate, now)
    );
}

function recencyScore(lastRatingDate: string | undefined, now: number): number {
    if (!lastRatingDate) {
        // Missing dates (pre-backfill) are treated as neutral so we don't bury everyone.
        return 0.7;
    }
    const time = Date.parse(lastRatingDate);
    if (!Number.isFinite(time)) {
        return 0.7;
    }
    const ageYears = Math.max(0, (now - time) / MS_PER_YEAR);
    return Math.exp(-ageYears / 4);
}

function tokenize(value: string): string[] {
    return normalizeName(value).split(" ").filter(Boolean);
}

function normalizeName(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function indexName(professor: TruncatedProfessor): NameIndex {
    const firstParts = tokenize(professor.firstName);
    const lastParts = tokenize(professor.lastName);
    return {
        firstParts,
        lastParts,
        firstCollapsed: firstParts.join(""),
        lastCollapsed: lastParts.join(""),
    };
}

function nameMatchScore(tokens: string[], name: NameIndex): number {
    if (tokens.length === 1) {
        const first = scoreAgainst(tokens[0], name.firstParts, name.firstCollapsed);
        const last = scoreAgainst(tokens[0], name.lastParts, name.lastCollapsed);
        // Slight last-name preference for directory-style single-token queries.
        return Math.max(first, last > 0 ? last + 5 : 0);
    }

    let best = 0;
    for (let i = 1; i < tokens.length; i += 1) {
        const left = tokens.slice(0, i);
        const right = tokens.slice(i);
        best = Math.max(
            best,
            combineScores(
                scorePhrase(left, name.firstParts, name.firstCollapsed),
                scorePhrase(right, name.lastParts, name.lastCollapsed),
            ),
            combineScores(
                scorePhrase(left, name.lastParts, name.lastCollapsed),
                scorePhrase(right, name.firstParts, name.firstCollapsed),
            ),
        );
    }
    return best;
}

function combineScores(left: number, right: number): number {
    if (left <= 0 || right <= 0) {
        return 0;
    }
    return left + right;
}

function scorePhrase(tokens: string[], parts: string[], collapsed: string): number {
    if (tokens.length === 1) {
        return scoreAgainst(tokens[0], parts, collapsed);
    }

    const collapsedScore = scoreAgainst(tokens.join(""), parts, collapsed);
    const sequential = tokens.reduce(
        (state, token) => {
            if (state.failed) {
                return state;
            }
            const remaining = parts.slice(state.partIndex);
            const matchIndex = remaining.findIndex((part) => partMatch(token, part) > 0);
            if (matchIndex === -1) {
                return { total: 0, partIndex: parts.length, failed: true };
            }
            return {
                total: state.total + partMatch(token, remaining[matchIndex]),
                partIndex: state.partIndex + matchIndex + 1,
                failed: false,
            };
        },
        { total: 0, partIndex: 0, failed: false },
    );
    const sequentialScore = sequential.failed ? 0 : sequential.total / tokens.length;
    return Math.max(collapsedScore, sequentialScore);
}

function scoreAgainst(token: string, parts: string[], collapsed: string): number {
    let best = parts.reduce((highest, part) => Math.max(highest, partMatch(token, part)), 0);
    if (collapsed === token) {
        best = Math.max(best, 95);
    } else if (collapsed.startsWith(token)) {
        best = Math.max(best, 60 + 20 * (token.length / Math.max(collapsed.length, 1)));
    } else if (token.length >= 3 && collapsed.includes(token)) {
        best = Math.max(best, 15);
    }
    return best;
}

function partMatch(token: string, part: string): number {
    if (!token || !part) {
        return 0;
    }
    if (part === token) {
        return 100;
    }
    if (namesAreNicknames(token, part)) {
        // Below exact, above ordinary prefixes, so "chris" still prefers Chris to Christopher.
        return 88;
    }
    if (part.startsWith(token)) {
        return 70 + 30 * (token.length / part.length);
    }
    if (token.length >= 3 && part.includes(token)) {
        return 20 * (token.length / part.length);
    }
    return 0;
}
