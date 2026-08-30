export const CANONICAL_ORIGIN = "https://polyratings.dev";
export const SITE_NAME = "Polyratings";

export const SITEMAP_STATIC_PATHS = [
    "/",
    "/about",
    "/faq",
    "/search/name",
    "/search/class",
] as const;

export interface SitemapProfessor {
    id: string;
    lastRatingDate?: string;
}

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function toLastmod(isoDate: string | undefined): string | undefined {
    if (!isoDate) {
        return undefined;
    }
    const timestamp = Date.parse(isoDate);
    if (Number.isNaN(timestamp)) {
        return undefined;
    }
    return new Date(timestamp).toISOString().slice(0, 10);
}

function urlEntry(path: string, lastmod?: string): string {
    const loc = `${CANONICAL_ORIGIN}${path}`;
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
    return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}\n  </url>`;
}

export function buildSitemapXml(professors: SitemapProfessor[]): string {
    const staticEntries = SITEMAP_STATIC_PATHS.map((path) => urlEntry(path));
    const professorEntries = professors.map((professor) =>
        urlEntry(`/professor/${professor.id}`, toLastmod(professor.lastRatingDate)),
    );
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...professorEntries].join("\n")}
</urlset>
`;
}
