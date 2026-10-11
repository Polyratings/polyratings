import { useLayoutEffect } from "react";
import { canonicalUrl, formatTitle, robotsContent, SITE_NAME } from "@/utils/seo";

interface PageMetaProps {
    title?: string;
    description: string;
    path: string;
    noindex?: boolean;
    jsonLd?: unknown;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
    const selector = `meta[${attr}="${key}"]`;
    const existing = document.head.querySelector(selector);
    const element = existing instanceof HTMLMetaElement ? existing : document.createElement("meta");
    if (!(existing instanceof HTMLMetaElement)) {
        element.setAttribute(attr, key);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
    const selector = `link[rel="${rel}"]`;
    const existing = document.head.querySelector(selector);
    const element = existing instanceof HTMLLinkElement ? existing : document.createElement("link");
    if (!(existing instanceof HTMLLinkElement)) {
        element.rel = rel;
        document.head.appendChild(element);
    }
    element.href = href;
}

function upsertJsonLd(jsonLd: unknown) {
    const existing = document.getElementById("page-json-ld");
    if (!jsonLd) {
        existing?.remove();
        return;
    }
    const script =
        existing instanceof HTMLScriptElement ? existing : document.createElement("script");
    script.id = "page-json-ld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    if (!existing) {
        document.head.appendChild(script);
    }
}

export function PageMeta({ title, description, path, noindex = false, jsonLd }: PageMetaProps) {
    const documentTitle = formatTitle(title);
    const canonical = canonicalUrl(path);
    const jsonLdSerialized = jsonLd === undefined ? undefined : JSON.stringify(jsonLd);

    useLayoutEffect(() => {
        document.title = documentTitle;
        upsertMeta("name", "description", description);
        upsertMeta(
            "name",
            "robots",
            robotsContent({ noindex, hostname: window.location.hostname }),
        );
        upsertLink("canonical", canonical);
        upsertMeta("property", "og:site_name", SITE_NAME);
        upsertMeta("property", "og:type", "website");
        upsertMeta("property", "og:title", documentTitle);
        upsertMeta("property", "og:description", description);
        upsertMeta("property", "og:url", canonical);
        upsertMeta("name", "twitter:card", "summary");
        upsertMeta("name", "twitter:title", documentTitle);
        upsertMeta("name", "twitter:description", description);
        upsertJsonLd(jsonLdSerialized ? JSON.parse(jsonLdSerialized) : undefined);
    }, [canonical, description, documentTitle, jsonLdSerialized, noindex]);

    return null;
}
