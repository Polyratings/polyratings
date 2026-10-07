/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { classifyInstructorMapping } from "../src/schedule/instructorMatch.js";
import { truncatedProfessorParser } from "../src/types/schema.js";

const DEFAULT_PROFESSORS_URL =
    "https://raw.githubusercontent.com/Polyratings/polyratings-data/data/professor-dump.json";
const DEFAULT_SCHEDULE_API_URL = "https://cal-poly-schedule-scraper.cp-scraper.workers.dev";
const DEFAULT_TERM_CODE = "2268";

type TermSectionsResponse = {
    termCode: string;
    sections: { instructorRaw: string }[];
};

type AuditRow = {
    instructorRaw: string;
    sectionCount: number;
    confidence: string;
    polyratingsProfessorId?: string;
    professorName?: string;
    department?: string;
    candidateCount?: number;
    candidateNames?: string;
};

function parseArgs(argv: string[]): {
    termCode: string;
    outputDir: string;
    professorsUrl: string;
    professorsFile?: string;
    scheduleApiUrl?: string;
    scheduleApiKey?: string;
} {
    const args = new Map<string, string>();
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg?.startsWith("--")) {
            const key = arg.slice(2);
            const value = argv[i + 1];
            if (value != null && !value.startsWith("--")) {
                args.set(key, value);
                i += 1;
            } else {
                args.set(key, "true");
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

async function loadProfessors(input: {
    professorsUrl: string;
    professorsFile?: string;
}): Promise<ReturnType<typeof truncatedProfessorParser.parse>[]> {
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

async function loadDistinctInstructorRaws(input: {
    termCode: string;
    scheduleApiUrl?: string;
    scheduleApiKey?: string;
}): Promise<Map<string, number>> {
    const baseUrl = input.scheduleApiUrl?.replace(/\/$/, "");
    const apiKey = input.scheduleApiKey;
    if (!baseUrl || !apiKey) {
        throw new Error(
            "Schedule API credentials required. Set SCHEDULE_API_URL and SCHEDULE_READ_API_KEY or pass --schedule-url / --schedule-key.",
        );
    }

    const response = await fetch(`${baseUrl}/v1/terms/${encodeURIComponent(input.termCode)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch term ${input.termCode} (${response.status})`);
    }

    const json = (await response.json()) as TermSectionsResponse;
    const counts = new Map<string, number>();
    for (const section of json.sections) {
        const raw = section.instructorRaw.trim();
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    return counts;
}

function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function writeCsv(filePath: string, rows: AuditRow[]): void {
    const header = [
        "instructorRaw",
        "sectionCount",
        "confidence",
        "polyratingsProfessorId",
        "professorName",
        "department",
        "candidateCount",
        "candidateNames",
    ];
    const lines = [
        header.join(","),
        ...rows.map((row) =>
            [
                csvEscape(row.instructorRaw),
                String(row.sectionCount),
                row.confidence,
                row.polyratingsProfessorId ?? "",
                row.professorName ?? "",
                row.department ?? "",
                row.candidateCount != null ? String(row.candidateCount) : "",
                row.candidateNames ?? "",
            ].join(","),
        ),
    ];
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function toAuditRow(
    instructorRaw: string,
    sectionCount: number,
    classification: ReturnType<typeof classifyInstructorMapping>,
): AuditRow {
    const candidateNames = (candidates: { firstName: string; lastName: string }[]) =>
        candidates.map((prof) => `${prof.firstName} ${prof.lastName}`).join(" | ");

    if (classification.confidence === "reject") {
        return { instructorRaw, sectionCount, confidence: "reject" };
    }
    if (classification.confidence === "unmatched") {
        return { instructorRaw, sectionCount, confidence: "unmatched" };
    }
    if (classification.confidence === "low" || classification.confidence === "ambiguous") {
        return {
            instructorRaw,
            sectionCount,
            confidence: classification.confidence,
            candidateCount: classification.candidates.length,
            candidateNames: candidateNames(classification.candidates),
        };
    }

    return {
        instructorRaw,
        sectionCount,
        confidence: classification.confidence,
        polyratingsProfessorId: classification.professor.id,
        professorName: `${classification.professor.firstName} ${classification.professor.lastName}`,
        department: classification.professor.department,
        candidateCount: classification.candidates.length,
        candidateNames: candidateNames(classification.candidates),
    };
}

async function main(): Promise<void> {
    const devVars = loadDevVars();
    const config = parseArgs(process.argv.slice(2));
    config.scheduleApiUrl ??= devVars.SCHEDULE_API_URL;
    config.scheduleApiKey ??= devVars.SCHEDULE_READ_API_KEY;

    console.log(`Loading professors...`);
    const professors = await loadProfessors(config);
    console.log(`Loaded ${professors.length} professors`);

    console.log(`Fetching distinct instructorRaw for term ${config.termCode}...`);
    const instructorCounts = await loadDistinctInstructorRaws(config);
    console.log(`Found ${instructorCounts.size} distinct instructor strings`);

    const rows = [...instructorCounts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([instructorRaw, sectionCount]) =>
            toAuditRow(
                instructorRaw,
                sectionCount,
                classifyInstructorMapping(instructorRaw, professors),
            ),
        );

    const byConfidence = {
        high: rows.filter((row) => row.confidence === "high"),
        medium: rows.filter((row) => row.confidence === "medium"),
        low: rows.filter((row) => row.confidence === "low"),
        ambiguous: rows.filter((row) => row.confidence === "ambiguous"),
        unmatched: rows.filter((row) => row.confidence === "unmatched"),
        reject: rows.filter((row) => row.confidence === "reject"),
    };

    const autoLink = [...byConfidence.high, ...byConfidence.medium];
    fs.mkdirSync(config.outputDir, { recursive: true });
    writeCsv(path.join(config.outputDir, "audit-high-confidence.csv"), autoLink);
    writeCsv(path.join(config.outputDir, "audit-ambiguous.csv"), [
        ...byConfidence.low,
        ...byConfidence.ambiguous,
    ]);
    writeCsv(path.join(config.outputDir, "audit-unmatched-schedule.csv"), byConfidence.unmatched);
    writeCsv(path.join(config.outputDir, "audit-rejected.csv"), byConfidence.reject);

    const matchedProfessorIds = new Set(
        autoLink.map((row) => row.polyratingsProfessorId).filter((id): id is string => id != null),
    );
    const unmatchedPolyratings = professors
        .filter((prof) => !matchedProfessorIds.has(prof.id))
        .map(
            (prof): AuditRow => ({
                instructorRaw: "",
                sectionCount: 0,
                confidence: "unmatched_polyratings",
                polyratingsProfessorId: prof.id,
                professorName: `${prof.firstName} ${prof.lastName}`,
                department: prof.department,
            }),
        );
    writeCsv(path.join(config.outputDir, "audit-unmatched-polyratings.csv"), unmatchedPolyratings);

    const summary = {
        termCode: config.termCode,
        distinctInstructorRaws: instructorCounts.size,
        professors: professors.length,
        high: byConfidence.high.length,
        medium: byConfidence.medium.length,
        autoLinkTotal: autoLink.length,
        low: byConfidence.low.length,
        ambiguous: byConfidence.ambiguous.length,
        unmatchedSchedule: byConfidence.unmatched.length,
        reject: byConfidence.reject.length,
        unmatchedPolyratings: unmatchedPolyratings.length,
    };
    fs.writeFileSync(
        path.join(config.outputDir, "audit-summary.json"),
        `${JSON.stringify(summary, null, 2)}\n`,
    );

    console.log(JSON.stringify(summary, null, 2));
    console.log(`Wrote CSV artifacts to ${path.resolve(config.outputDir)}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
