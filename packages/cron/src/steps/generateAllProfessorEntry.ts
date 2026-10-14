import { cloudflareNamespaceInformation } from "@backend/generated/tomlGenerated";
import { professorParser, truncatedProfessorParser } from "@backend/types/schema";
import { professorToTruncatedProfessor } from "@backend/types/schemaHelpers";
import { ALL_PROFESSOR_KEY } from "@backend/utils/const";
import { bulkRecord } from "../utils/bulkRecord";
import { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function generateAllProfessorEntry(env: CronEnv) {
    Logger.info("Getting Prod professors");
    const allProfessors = await bulkRecord(env.authenticatedProductionClient, "professors");

    // Remove all professor key since we are generating it here
    delete allProfessors.all;

    const professors = professorParser.array().parse(Object.values(allProfessors));
    const truncatedProfessorList = truncatedProfessorParser
        .array()
        .parse(professors.map(professorToTruncatedProfessor));

    const prodProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.prod,
    );
    const betaProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.beta,
    );
    const devProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.dev,
    );

    const payload = JSON.stringify(truncatedProfessorList);
    const writes = [
        {
            name: "prod",
            promise: prodProfessors.putValues([{ key: ALL_PROFESSOR_KEY, value: payload }]),
        },
        {
            name: "beta",
            promise: betaProfessors.putValues([{ key: ALL_PROFESSOR_KEY, value: payload }]),
        },
        {
            name: "dev",
            promise: devProfessors.putValues([{ key: ALL_PROFESSOR_KEY, value: payload }]),
        },
    ];
    const results = await Promise.allSettled(writes.map((write) => write.promise));
    const failures = results.flatMap((result, index) =>
        result.status === "rejected" ? [`${writes[index].name}: ${String(result.reason)}`] : [],
    );
    if (failures.length) {
        throw new Error(`Failed to write all-professor entry: ${failures.join("; ")}`);
    }
}
