import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

const DAYLIGHT_HERO = "/src/assets/home-header.webp";
const DUSK_HERO = "/src/assets/worst-of-worst-background.webp";

// The hero is a CSS background, so the preload scanner cannot see its URL.
// This classic script runs after the theme script and before the app module.
function heroPreload(): Plugin {
    return {
        name: "hero-preload",
        transformIndexHtml: {
            order: "post",
            handler(html, ctx) {
                let daylight = DAYLIGHT_HERO;
                let dusk = DUSK_HERO;
                if (ctx.bundle) {
                    const names = Object.keys(ctx.bundle);
                    const daylightName = names.find(
                        (name) => name.includes("home-header-") && name.endsWith(".webp"),
                    );
                    const duskName = names.find(
                        (name) =>
                            name.includes("worst-of-worst-background-") && name.endsWith(".webp"),
                    );
                    if (!daylightName || !duskName) {
                        this.error("Hero preload could not find the built background images.");
                    }
                    daylight = `/${daylightName}`;
                    dusk = `/${duskName}`;
                }

                const script = [
                    "<script>",
                    "      (function () {",
                    '          var link = document.createElement("link");',
                    '          link.rel = "preload";',
                    '          link.as = "image";',
                    '          link.setAttribute("fetchpriority", "high");',
                    '          link.href = document.documentElement.classList.contains("dark")',
                    `              ? "${dusk}"`,
                    `              : "${daylight}";`,
                    "          document.head.appendChild(link);",
                    "      })();",
                    "    </script>",
                ].join("\n");

                const themeKey = html.indexOf("polyratings-theme");
                const themeEnd = html.indexOf("</script>", themeKey);
                if (themeKey === -1 || themeEnd === -1) {
                    return html;
                }
                const insertAt = themeEnd + "</script>".length;
                return `${html.slice(0, insertAt)}\n    ${script}${html.slice(insertAt)}`;
            },
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss(), heroPreload()],
    resolve: {
        tsconfigPaths: true,
    },
    build: {
        sourcemap: true,
    },
    test: {
        dir: "./src",
        environment: "jsdom",
        globals: true,
        setupFiles: "./vitest-setup.ts",
    },
});
