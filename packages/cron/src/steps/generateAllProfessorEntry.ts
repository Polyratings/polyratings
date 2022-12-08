import { cloudflareNamespaceInformation } from "@backend/generated/tomlGenerated";
import { truncatedProfessorParser } from "@backend/types/schema";
import { bulkRecord } from "src/utils/bulkRecord";
import { z } from "zod";
import { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function generateAllProfessorEntry(env: CronEnv) {
    Logger.info("Getting Prod professors");
    const allProfessors = await bulkRecord(env.authenticatedProductionClient, "professors");

    // Remove all professor key since we are generating it here
    delete allProfessors.all;

    const truncatedProfessorList = z
        .array(truncatedProfessorParser)
        .parse(Object.values(allProfessors));

    const prodProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.prod,
    );
    const betaProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.beta,
    );
    const devProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.dev,
    );

    prodProfessors.putValues([{ key: "all", value: JSON.stringify(truncatedProfessorList) }]);
    betaProfessors.putValues([{ key: "all", value: JSON.stringify(truncatedProfessorList) }]);
    devProfessors.putValues([{ key: "all", value: JSON.stringify(truncatedProfessorList) }]);
}
