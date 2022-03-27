import { Internal, cloudflareNamespaceInformation } from "@polyratings/client";
import { plainToInstance, instanceToPlain } from "class-transformer";
import { CronEnv } from "../entry";
import { Logger } from "../logger";

export async function generateAllProfessorEntry(env: CronEnv) {
    Logger.info("Getting Prod professors");
    const prodProfessorsPlain =
        await env.authenticatedProductionClient.admin.bulkKvRecord<Internal.PlainProfessorDTO>(
            "professors",
        );
    const prodTruncatedProfessors = plainToInstance(
        Internal.TruncatedProfessorDTO,
        Object.values(prodProfessorsPlain),
        {
            excludeExtraneousValues: true,
        },
    );

    const plainTruncatedProfessorList = instanceToPlain(prodTruncatedProfessors);

    const prodProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.prod,
    );
    const betaProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.beta,
    );
    const devProfessors = new env.KVWrapper(
        cloudflareNamespaceInformation.POLYRATINGS_TEACHERS.dev,
    );

    prodProfessors.putValues([{ key: "all", value: JSON.stringify(plainTruncatedProfessorList) }]);
    betaProfessors.putValues([{ key: "all", value: JSON.stringify(plainTruncatedProfessorList) }]);
    devProfessors.putValues([{ key: "all", value: JSON.stringify(plainTruncatedProfessorList) }]);
}
