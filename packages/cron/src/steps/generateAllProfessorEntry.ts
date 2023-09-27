import { cloudflareNamespaceInformation } from "@backend/generated/tomlGenerated";
import { truncatedProfessorParser } from "@backend/types/schema";
import { z } from "zod";
import { ALL_PROFESSOR_KEY } from "@backend/utils/const";
import type { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function generateAllProfessorEntry(env: CronEnv) {
    Logger.info("Getting Prod professors");
    const allProfessors = await bulkRecord(env.authenticatedProductionClient, "professors");

    // Remove all professor key since we are generating it here
    delete allProfessors.all;

    const truncatedProfessorList = z.array(truncatedProfessorParser).parse(Object.values(allProfessors));

    const prodProfessors = new env.KVWrapper(cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.prod);
    const betaProfessors = new env.KVWrapper(cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.beta);
    const devProfessors = new env.KVWrapper(cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.dev);

    prodProfessors.putValues([
        { key: ALL_PROFESSOR_KEY, value: JSON.stringify(truncatedProfessorList) },
    ]);
    betaProfessors.putValues([
        { key: ALL_PROFESSOR_KEY, value: JSON.stringify(truncatedProfessorList) },
    ]);
    devProfessors.putValues([
        { key: ALL_PROFESSOR_KEY, value: JSON.stringify(truncatedProfessorList) },
    ]);
}
