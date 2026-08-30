import { CANONICAL_ORIGIN, SITE_NAME } from "@backend/utils/sitemap";

export { CANONICAL_ORIGIN, SITE_NAME };

export const DEFAULT_DESCRIPTION =
    "Student ratings of Cal Poly professors. Read reviews, compare courses, and find the right instructor.";

export const PRODUCTION_HOSTNAME = "polyratings.dev";

export function formatTitle(pageTitle?: string): string {
    return pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
}

export function canonicalUrl(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (normalized === "/") {
        return `${CANONICAL_ORIGIN}/`;
    }
    return `${CANONICAL_ORIGIN}${normalized.replace(/\/+$/, "")}`;
}

export function shouldNoindexHost(hostname: string): boolean {
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return false;
    }
    return hostname !== PRODUCTION_HOSTNAME;
}

export function robotsContent(options: { noindex?: boolean; hostname?: string }): string {
    if (options.noindex || (options.hostname && shouldNoindexHost(options.hostname))) {
        return "noindex, nofollow";
    }
    return "index, follow";
}

export function professorPageTitle(professor: { firstName: string; lastName: string }): string {
    return `${professor.lastName}, ${professor.firstName}`;
}

export function professorPageDescription(professor: {
    firstName: string;
    lastName: string;
    department: string;
    numEvals: number;
    overallRating: number;
}): string {
    const name = `${professor.firstName} ${professor.lastName}`;
    if (professor.numEvals <= 0) {
        return `Student ratings for ${name} (${professor.department}) at Cal Poly on Polyratings.`;
    }
    const reviews = professor.numEvals === 1 ? "review" : "reviews";
    return (
        `Student ratings for ${name} (${professor.department}) at Cal Poly. ` +
        `${professor.numEvals} ${reviews}, overall ${professor.overallRating.toFixed(2)} out of 4.`
    );
}

export function professorJsonLd(
    professor: {
        id: string;
        firstName: string;
        lastName: string;
        department: string;
        numEvals: number;
        overallRating: number;
    },
    path: string,
) {
    const name = `${professor.firstName} ${professor.lastName}`;
    const url = canonicalUrl(path);
    const person: Record<string, unknown> = {
        "@type": "Person",
        name,
        url,
        jobTitle: "Professor",
        affiliation: {
            "@type": "EducationalOrganization",
            name: "California Polytechnic State University, San Luis Obispo",
        },
        worksFor: {
            "@type": "EducationalOrganization",
            name: "California Polytechnic State University, San Luis Obispo",
        },
        description: professorPageDescription(professor),
    };
    if (professor.department) {
        person.department = { "@type": "Organization", name: professor.department };
    }
    if (professor.numEvals > 0) {
        person.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: professor.overallRating,
            bestRating: 4,
            worstRating: 0,
            ratingCount: professor.numEvals,
        };
    }

    return {
        "@context": "https://schema.org",
        "@graph": [
            person,
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: SITE_NAME,
                        item: `${CANONICAL_ORIGIN}/`,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Professors",
                        item: `${CANONICAL_ORIGIN}/search/name`,
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name,
                        item: url,
                    },
                ],
            },
        ],
    };
}
