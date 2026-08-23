/* eslint-disable no-console */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import toml from "toml";

type KvNamespace = {
    binding: string;
    id: string;
};

type WranglerFile = {
    env?: Record<string, { kv_namespaces?: KvNamespace[] }>;
};

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const wranglerRelPath = "packages/backend/wrangler.toml";

function parseEnvKv(tomlText: string, envName: string): Record<string, string> {
    const parsed = toml.parse(tomlText) as WranglerFile;
    const namespaces = parsed.env?.[envName]?.kv_namespaces;
    if (!Array.isArray(namespaces)) {
        throw new Error(`Missing env.${envName}.kv_namespaces in wrangler.toml`);
    }
    return Object.fromEntries(namespaces.map((ns) => [ns.binding, ns.id]));
}

function gitShow(ref: string): string {
    return execFileSync("git", ["show", `${ref}:${wranglerRelPath}`], {
        cwd: repoRoot,
        encoding: "utf8",
    });
}

function idSet(bindingMap: Record<string, string>): Set<string> {
    return new Set(Object.values(bindingMap));
}

const currentToml = fs.readFileSync(path.join(repoRoot, wranglerRelPath), "utf8");
const currentDev = parseEnvKv(currentToml, "dev");

const masterToml = gitShow("origin/master");
const betaToml = gitShow("origin/beta");

const masterDev = parseEnvKv(masterToml, "dev");
const betaDev = parseEnvKv(betaToml, "dev");
const prodIds = new Set([
    ...idSet(parseEnvKv(masterToml, "prod")),
    ...idSet(parseEnvKv(betaToml, "prod")),
]);

const failures: string[] = [];

for (const [binding, id] of Object.entries(currentDev)) {
    if (prodIds.has(id)) {
        failures.push(`${binding}: id ${id} is a prod KV namespace`);
    } else {
        const allowed = new Set([masterDev[binding], betaDev[binding]].filter(Boolean));
        if (!allowed.has(id)) {
            failures.push(`${binding}: id ${id} is not env.dev on origin/master or origin/beta`);
        }
    }
}

if (failures.length > 0) {
    console.error("PR env.dev KV allowlist failed:");
    for (const line of failures) {
        console.error(`- ${line}`);
    }
    process.exit(1);
}

console.log("PR env.dev KV ids match origin/master / origin/beta and are not prod.");
