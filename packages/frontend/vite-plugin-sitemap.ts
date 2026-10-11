import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
// Vite loads this file before tsconfig path aliases exist.
/* eslint-disable no-restricted-imports, import/no-relative-packages */
import { BETA_ENV, DEV_ENV, LOCAL_ENV, PROD_ENV } from "../backend/src/generated/tomlGenerated";
import { buildSitemapXml, type SitemapProfessor } from "../backend/src/utils/sitemap";
/* eslint-enable no-restricted-imports, import/no-relative-packages */

function apiUrlForMode(mode: string): string {
    const fromEnv = process.env.VITE_API_URL?.replace(/\/$/, "");
    if (fromEnv) {
        return fromEnv;
    }
    if (mode === "local-dev") {
        return LOCAL_ENV.url;
    }
    if (mode === "master" || mode === "production") {
        return PROD_ENV.url;
    }
    if (mode === "beta") {
        return BETA_ENV.url;
    }
    return DEV_ENV.url;
}

function unwrapProfessorList(body: unknown): SitemapProfessor[] {
    if (!body || typeof body !== "object") {
        return [];
    }
    const data = (body as { result?: { data?: unknown } }).result?.data;
    if (Array.isArray(data)) {
        return data as SitemapProfessor[];
    }
    if (data && typeof data === "object" && Array.isArray((data as { json?: unknown }).json)) {
        return (data as { json: SitemapProfessor[] }).json;
    }
    return [];
}

export function sitemapPlugin(): Plugin {
    let mode = "production";
    let outFile = "";

    return {
        name: "polyratings-sitemap",
        apply: "build",
        configResolved(config) {
            mode = config.mode;
            outFile = resolve(config.root, config.build.outDir, "sitemap.xml");
        },
        async closeBundle() {
            let professors: SitemapProfessor[] = [];
            try {
                const response = await fetch(`${apiUrlForMode(mode)}/professors.all`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                professors = unwrapProfessorList(await response.json());
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                configWarn(
                    `sitemap: could not load professors (${message}); writing static URLs only`,
                );
            }
            writeFileSync(outFile, buildSitemapXml(professors));
        },
    };
}

function configWarn(message: string) {
    // Build-time diagnostic for a missing professor index; not shipped to the browser.
    // eslint-disable-next-line no-console
    console.warn(message);
}
