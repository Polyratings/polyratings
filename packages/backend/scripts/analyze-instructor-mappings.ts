/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import {
    analyzeInstructorLinks,
    findBetterProfessorByContext,
    type AbsentProfessorAnalysis,
    type MatchedLinkAnalysis,
    type ReviewNeededAnalysis,
    type ScheduleSection,
    type UnmatchedScheduleAnalysis,
} from "../src/schedule/instructorLinkAnalysis.js";
import { classifyInstructorMapping } from "../src/schedule/instructorMatch.js";
import { truncatedProfessorParser } from "../src/types/schema.js";

const DEFAULT_PROFESSORS_URL =
    "https://raw.githubusercontent.com/Polyratings/polyratings-data/data/professor-dump.json";
const DEFAULT_SCHEDULE_API_URL = "https://cal-poly-schedule-scraper.cp-scraper.workers.dev";
const DEFAULT_TERM_CODE = "2268";

function parseArgs(argv: string[]) {
    const args = new Map<string, string>();
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg?.startsWith("--")) {
            const key = arg.slice(2);
            const value = argv[i + 1];
            if (value != null && !value.startsWith("--")) {
                args.set(key, value);
                i += 1;
            }
        }
    }

    return {
        termCode: args.get("term") ?? process.env.AUDIT_TERM_CODE ?? DEFAULT_TERM_CODE,
        outputDir: args.get("output") ?? "audit-output",
        professorsUrl: args.get("professors-url") ?? DEFAULT_PROFESSORS_URL,
        professorsFile: args.get("professors-file"),
        scheduleApiUrl:
            args.get("schedule-url") ??
            process.env.SCHEDULE_API_URL ??
            DEFAULT_SCHEDULE_API_URL,
        scheduleApiKey: args.get("schedule-key") ?? process.env.SCHEDULE_READ_API_KEY,
    };
}

function loadDevVars(): Record<string, string> {
    const devVarsPath = path.resolve(import.meta.dirname, "../.dev.vars");
    if (!fs.existsSync(devVarsPath)) {
        return {};
    }

    return Object.fromEntries(
        fs
            .readFileSync(devVarsPath, "utf8")
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"))
            .map((line) => {
                const separator = line.indexOf("=");
                if (separator === -1) {
                    return [line, ""];
                }
                return [line.slice(0, separator), line.slice(separator + 1)];
            }),
    );
}

async function loadProfessors(input: { professorsUrl: string; professorsFile?: string }) {
    const rawJson = input.professorsFile
        ? fs.readFileSync(path.resolve(input.professorsFile), "utf8")
        : await (async () => {
              const response = await fetch(input.professorsUrl);
              if (!response.ok) {
                  throw new Error(`Failed to fetch professors (${response.status})`);
              }
              return response.text();
          })();

    const parsed: unknown = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
        throw new Error("Professor export must be a JSON array");
    }

    return parsed.map((entry) => truncatedProfessorParser.parse(entry));
}

async function loadTermSections(input: {
    termCode: string;
    scheduleApiUrl?: string;
    scheduleApiKey?: string;
}): Promise<ScheduleSection[]> {
    const baseUrl = input.scheduleApiUrl?.replace(/\/$/, "");
    const apiKey = input.scheduleApiKey;
    if (!baseUrl || !apiKey) {
        throw new Error("Schedule API credentials required");
    }

    const response = await fetch(`${baseUrl}/v1/terms/${encodeURIComponent(input.termCode)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch term ${input.termCode} (${response.status})`);
    }

    const json = (await response.json()) as { sections: ScheduleSection[] };
    return json.sections;
}

function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function writeCsv(filePath: string, header: string[], rows: string[][]): void {
    const lines = [header.join(","), ...rows.map((row) => row.map(csvEscape).join(","))];
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function matchedToRow(row: MatchedLinkAnalysis): string[] {
    return [
        row.instructorRaw,
        String(row.sectionCount),
        row.nameConfidence,
        row.verdict,
        String(row.verdictScore),
        row.polyratingsProfessorId,
        row.professorName,
        row.professorDepartment,
        String(row.professorNumEvals),
        String(row.courseOverlapCount),
        row.courseOverlapRatio.toFixed(2),
        String(row.departmentOverlapCount),
        row.departmentOverlapRatio.toFixed(2),
        row.homeDepartmentMatch ? "yes" : "no",
        row.teachingDepartments.join("|"),
        row.overlappingCourses.join("|"),
        row.sampleCourses.join("|"),
        row.notes.join(" ; "),
    ];
}

function unmatchedScheduleToRow(row: UnmatchedScheduleAnalysis): string[] {
    return [
        row.instructorRaw,
        String(row.sectionCount),
        row.verdict,
        row.primaryDepartment ?? "",
        row.teachingDepartments.join("|"),
        row.sampleCourses.join("|"),
        row.nearMatchProfessorId ?? "",
        row.nearMatchProfessorName ?? "",
        row.nearMatchReason ?? "",
        row.notes.join(" ; "),
    ];
}

function absentToRow(row: AbsentProfessorAnalysis): string[] {
    return [
        row.polyratingsProfessorId,
        row.professorName,
        row.department,
        String(row.numEvals),
        row.verdict,
        row.courses.join("|"),
        row.notes.join(" ; "),
    ];
}

function reviewToRow(row: ReviewNeededAnalysis): string[] {
    return [
        row.instructorRaw,
        String(row.sectionCount),
        row.nameConfidence,
        row.candidateNames.join("|"),
        row.deptDisambiguationSuggestion ?? "",
        row.notes.join(" ; "),
    ];
}

function buildMarkdownReport(input: {
    termCode: string;
    generatedAt: string;
    summary: Record<string, unknown>;
    samples: {
        verified: MatchedLinkAnalysis[];
        likelyWrong: MatchedLinkAnalysis[];
        newFaculty: UnmatchedScheduleAnalysis[];
        nearMatch: UnmatchedScheduleAnalysis[];
        retired: AbsentProfessorAnalysis[];
        review: ReviewNeededAnalysis[];
        contextMismatch: Array<{
            instructorRaw: string;
            linked: string;
            suggested: string;
        }>;
    };
}): string {
    const lines: string[] = [
        `# Instructor identity analysis — term ${input.termCode}`,
        "",
        `Generated: ${input.generatedAt}`,
        "",
        "## Summary",
        "",
        "```json",
        JSON.stringify(input.summary, null, 2),
        "```",
        "",
        "## Verified matches (course overlap)",
        "",
        ...input.samples.verified.slice(0, 15).map(
            (row) =>
                `- **${row.instructorRaw}** → ${row.professorName} (${row.professorDepartment}) — ${row.courseOverlapCount} course overlaps: ${row.overlappingCourses.slice(0, 4).join(", ")}`,
        ),
        "",
        "## Likely mismatches (name linked, dept/course contradicts)",
        "",
        ...(input.samples.likelyWrong.length > 0
            ? input.samples.likelyWrong.slice(0, 20).map(
                  (row) =>
                      `- **${row.instructorRaw}** → ${row.professorName} (${row.professorDepartment}) — teaching ${row.teachingDepartments.join(", ")}; samples: ${row.sampleCourses.slice(0, 3).join(", ")}`,
              )
            : ["- None flagged"]),
        "",
        "## Context suggests different professor",
        "",
        ...(input.samples.contextMismatch.length > 0
            ? input.samples.contextMismatch.slice(0, 15).map(
                  (row) =>
                      `- **${row.instructorRaw}** linked to ${row.linked}; dept/course context suggests **${row.suggested}**`,
              )
            : ["- None flagged"]),
        "",
        "## Likely new faculty (on schedule, not in Polyratings)",
        "",
        ...input.samples.newFaculty.slice(0, 25).map(
            (row) =>
                `- **${row.instructorRaw}** — ${row.sectionCount} sections, ${row.primaryDepartment ?? "?"} — ${row.sampleCourses.slice(0, 3).join(", ")}`,
        ),
        "",
        "## Near-match name fixes (unmatched schedule, similar Polyratings name)",
        "",
        ...input.samples.nearMatch.slice(0, 25).map(
            (row) =>
                `- Schedule **${row.instructorRaw}** ≈ Polyratings **${row.nearMatchProfessorName}** (${row.primaryDepartment ?? "?"})`,
        ),
        "",
        "## Likely retired / absent from schedule",
        "",
        ...input.samples.retired.slice(0, 25).map(
            (row) =>
                `- **${row.professorName}** (${row.department}, ${row.numEvals} evals) — ${row.courses.slice(0, 4).join(", ")}`,
        ),
        "",
        "## Manual review queue",
        "",
        ...input.samples.review.slice(0, 20).map(
            (row) =>
                `- **${row.instructorRaw}** (${row.nameConfidence}) — candidates: ${row.candidateNames.join(", ")}${row.deptDisambiguationSuggestion ? `; dept suggests ${row.deptDisambiguationSuggestion}` : ""}`,
        ),
        "",
    ];

    return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
    const devVars = loadDevVars();
    const config = parseArgs(process.argv.slice(2));
    config.scheduleApiKey ??= devVars.SCHEDULE_READ_API_KEY;

    console.log("Loading professors...");
    const professors = await loadProfessors(config);
    console.log(`Loaded ${professors.length} professors`);

    console.log(`Fetching term ${config.termCode} sections...`);
    const sections = await loadTermSections(config);
    console.log(`Loaded ${sections.length} sections`);

    const analysis = analyzeInstructorLinks({ sections, professors });

    const contextMismatch: Array<{
        instructorRaw: string;
        linked: string;
        suggested: string;
        sectionCount: number;
    }> = [];

    for (const row of analysis.matched) {
        const instructorSections = sections.filter(
            (section) => section.instructorRaw.trim() === row.instructorRaw,
        );
        const better = findBetterProfessorByContext(row.instructorRaw, instructorSections, professors);
        if (better && better.id !== row.polyratingsProfessorId) {
            contextMismatch.push({
                instructorRaw: row.instructorRaw,
                linked: row.professorName,
                suggested: `${better.firstName} ${better.lastName}`,
                sectionCount: row.sectionCount,
            });
        }
    }

    const matchedByVerdict = {
        verified: analysis.matched.filter((row) => row.verdict === "verified"),
        likely_correct: analysis.matched.filter((row) => row.verdict === "likely_correct"),
        weak_evidence: analysis.matched.filter((row) => row.verdict === "weak_evidence"),
        likely_mismatch: analysis.matched.filter((row) => row.verdict === "likely_mismatch"),
        likely_wrong: analysis.matched.filter((row) => row.verdict === "likely_wrong"),
    };

    const unmatchedByVerdict = {
        likely_new_faculty: analysis.unmatchedSchedule.filter(
            (row) => row.verdict === "likely_new_faculty",
        ),
        likely_ta_or_adjunct: analysis.unmatchedSchedule.filter(
            (row) => row.verdict === "likely_ta_or_adjunct",
        ),
        near_match_name_fix: analysis.unmatchedSchedule.filter(
            (row) => row.verdict === "near_match_name_fix",
        ),
        unknown: analysis.unmatchedSchedule.filter((row) => row.verdict === "unknown"),
    };

    const absentByVerdict = {
        likely_retired: analysis.absentProfessors.filter((row) => row.verdict === "likely_retired"),
        possibly_on_leave: analysis.absentProfessors.filter(
            (row) => row.verdict === "possibly_on_leave",
        ),
        low_activity: analysis.absentProfessors.filter((row) => row.verdict === "low_activity"),
        inactive_record: analysis.absentProfessors.filter(
            (row) => row.verdict === "inactive_record",
        ),
    };

    const summary = {
        termCode: config.termCode,
        sectionCount: sections.length,
        distinctInstructorRaws: analysis.byInstructorRaw.size,
        professors: professors.length,
        matched: {
            total: analysis.matched.length,
            verified: matchedByVerdict.verified.length,
            likely_correct: matchedByVerdict.likely_correct.length,
            weak_evidence: matchedByVerdict.weak_evidence.length,
            likely_mismatch: matchedByVerdict.likely_mismatch.length,
            likely_wrong: matchedByVerdict.likely_wrong.length,
        },
        unmatchedSchedule: {
            total: analysis.unmatchedSchedule.length,
            likely_new_faculty: unmatchedByVerdict.likely_new_faculty.length,
            likely_ta_or_adjunct: unmatchedByVerdict.likely_ta_or_adjunct.length,
            near_match_name_fix: unmatchedByVerdict.near_match_name_fix.length,
            unknown: unmatchedByVerdict.unknown.length,
        },
        reviewNeeded: analysis.reviewNeeded.length,
        absentProfessors: {
            total: analysis.absentProfessors.length,
            likely_retired: absentByVerdict.likely_retired.length,
            possibly_on_leave: absentByVerdict.possibly_on_leave.length,
            low_activity: absentByVerdict.low_activity.length,
            inactive_record: absentByVerdict.inactive_record.length,
        },
        contextMismatchSuggestions: contextMismatch.length,
        autoLinkSafe:
            matchedByVerdict.verified.length + matchedByVerdict.likely_correct.length,
        autoLinkReview:
            matchedByVerdict.weak_evidence.length +
            matchedByVerdict.likely_mismatch.length +
            matchedByVerdict.likely_wrong.length,
    };

    const outputDir = path.resolve(config.outputDir);
    const deepDir = path.join(outputDir, "deep-analysis");
    fs.mkdirSync(deepDir, { recursive: true });

    const generatedAt = new Date().toISOString();
    const fullReport = {
        generatedAt,
        termCode: config.termCode,
        summary,
        matched: analysis.matched,
        unmatchedSchedule: analysis.unmatchedSchedule,
        reviewNeeded: analysis.reviewNeeded,
        absentProfessors: analysis.absentProfessors,
        contextMismatch,
        instructors: Object.fromEntries(analysis.byInstructorRaw),
    };

    fs.writeFileSync(
        path.join(deepDir, "analysis-report.json"),
        `${JSON.stringify(fullReport, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(deepDir, "analysis-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

    const matchedHeader = [
        "instructorRaw",
        "sectionCount",
        "nameConfidence",
        "verdict",
        "verdictScore",
        "polyratingsProfessorId",
        "professorName",
        "professorDepartment",
        "professorNumEvals",
        "courseOverlapCount",
        "courseOverlapRatio",
        "departmentOverlapCount",
        "departmentOverlapRatio",
        "homeDepartmentMatch",
        "teachingDepartments",
        "overlappingCourses",
        "sampleCourses",
        "notes",
    ];

    writeCsv(
        path.join(deepDir, "matched-all.csv"),
        matchedHeader,
        analysis.matched.map(matchedToRow),
    );
    for (const [verdict, rows] of Object.entries(matchedByVerdict)) {
        writeCsv(
            path.join(deepDir, `matched-${verdict}.csv`),
            matchedHeader,
            rows.map(matchedToRow),
        );
    }

    const unmatchedHeader = [
        "instructorRaw",
        "sectionCount",
        "verdict",
        "primaryDepartment",
        "teachingDepartments",
        "sampleCourses",
        "nearMatchProfessorId",
        "nearMatchProfessorName",
        "nearMatchReason",
        "notes",
    ];
    writeCsv(
        path.join(deepDir, "unmatched-schedule-all.csv"),
        unmatchedHeader,
        analysis.unmatchedSchedule.map(unmatchedScheduleToRow),
    );
    for (const [verdict, rows] of Object.entries(unmatchedByVerdict)) {
        writeCsv(
            path.join(deepDir, `unmatched-schedule-${verdict}.csv`),
            unmatchedHeader,
            rows.map(unmatchedScheduleToRow),
        );
    }

    const absentHeader = [
        "polyratingsProfessorId",
        "professorName",
        "department",
        "numEvals",
        "verdict",
        "courses",
        "notes",
    ];
    writeCsv(
        path.join(deepDir, "absent-polyratings-all.csv"),
        absentHeader,
        analysis.absentProfessors.map(absentToRow),
    );
    for (const [verdict, rows] of Object.entries(absentByVerdict)) {
        writeCsv(
            path.join(deepDir, `absent-polyratings-${verdict}.csv`),
            absentHeader,
            rows.map(absentToRow),
        );
    }

    writeCsv(
        path.join(deepDir, "review-needed.csv"),
        [
            "instructorRaw",
            "sectionCount",
            "nameConfidence",
            "candidates",
            "deptDisambiguationSuggestion",
            "notes",
        ],
        analysis.reviewNeeded.map(reviewToRow),
    );

    writeCsv(
        path.join(deepDir, "context-mismatch-suggestions.csv"),
        ["instructorRaw", "sectionCount", "linkedProfessor", "suggestedProfessor"],
        contextMismatch.map((row) => [
            row.instructorRaw,
            String(row.sectionCount),
            row.linked,
            row.suggested,
        ]),
    );

    fs.writeFileSync(
        path.join(deepDir, "REPORT.md"),
        buildMarkdownReport({
            termCode: config.termCode,
            generatedAt,
            summary,
            samples: {
                verified: matchedByVerdict.verified.sort((a, b) => b.sectionCount - a.sectionCount),
                likelyWrong: [
                    ...matchedByVerdict.likely_wrong,
                    ...matchedByVerdict.likely_mismatch,
                ].sort((a, b) => b.sectionCount - a.sectionCount),
                newFaculty: unmatchedByVerdict.likely_new_faculty.sort(
                    (a, b) => b.sectionCount - a.sectionCount,
                ),
                nearMatch: unmatchedByVerdict.near_match_name_fix,
                retired: absentByVerdict.likely_retired,
                review: analysis.reviewNeeded,
                contextMismatch,
            },
        }),
    );

    // JSONL for streaming / tooling
    const jsonl = [
        ...analysis.matched.map((row) => JSON.stringify({ category: "matched", ...row })),
        ...analysis.unmatchedSchedule.map((row) =>
            JSON.stringify({ category: "unmatched_schedule", ...row }),
        ),
        ...analysis.reviewNeeded.map((row) => JSON.stringify({ category: "review_needed", ...row })),
        ...analysis.absentProfessors.map((row) =>
            JSON.stringify({ category: "absent_polyratings", ...row }),
        ),
    ].join("\n");
    fs.writeFileSync(path.join(deepDir, "analysis-records.jsonl"), `${jsonl}\n`);

    console.log(JSON.stringify(summary, null, 2));
    console.log(`Deep analysis written to ${deepDir}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
