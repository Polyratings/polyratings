/* eslint-disable no-console */
const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const projectName = process.env.CF_PAGES_PROJECT_NAME ?? "polyratings";
const branch = process.env.PAGES_BRANCH;

if (!accountId || !apiToken || !branch) {
    throw new Error("CF_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and PAGES_BRANCH are required");
}

type PagesDeployment = {
    id: string;
    environment?: string;
    aliases?: string[] | null;
    deployment_trigger?: {
        metadata?: {
            branch?: string;
        };
    };
};

type ListResponse = {
    success: boolean;
    errors?: { message: string }[];
    result?: PagesDeployment[];
    result_info?: {
        page: number;
        total_pages: number;
    };
};

async function cfFetch(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            ...init?.headers,
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`${init?.method ?? "GET"} ${path} failed (${response.status}): ${body}`);
    }
    return response;
}

function matchesBranch(deployment: PagesDeployment): boolean {
    if (deployment.environment === "production") {
        return false;
    }
    if (deployment.deployment_trigger?.metadata?.branch === branch) {
        return true;
    }
    return (deployment.aliases ?? []).some(
        (alias) => alias === branch || alias.startsWith(`${branch}.`),
    );
}

async function listPage(page: number): Promise<ListResponse> {
    const response = await cfFetch(
        `/accounts/${accountId}/pages/projects/${projectName}/deployments?env=preview&page=${page}&per_page=25`,
    );
    const payload = (await response.json()) as ListResponse;
    if (!payload.success) {
        throw new Error(
            payload.errors?.map((error) => error.message).join("; ") ?? "Pages list failed",
        );
    }
    return payload;
}

async function listPreviewDeployments(): Promise<PagesDeployment[]> {
    const first = await listPage(1);
    const extraPages = Array.from(
        { length: Math.max(0, (first.result_info?.total_pages ?? 1) - 1) },
        (_, index) => index + 2,
    );
    const rest = await Promise.all(extraPages.map((page) => listPage(page)));
    return [first, ...rest].flatMap((payload) =>
        (payload.result ?? []).filter((deployment) => matchesBranch(deployment)),
    );
}

async function main(): Promise<void> {
    const deployments = await listPreviewDeployments();
    if (deployments.length === 0) {
        console.log(`No Pages preview deployments found for branch ${branch}`);
        return;
    }
    await Promise.all(
        deployments.map(async (deployment) => {
            await cfFetch(
                `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deployment.id}?force=true`,
                { method: "DELETE" },
            );
            console.log(`Deleted Pages deployment ${deployment.id} (${branch})`);
        }),
    );
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
