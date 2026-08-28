import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sitemapPlugin } from "./vite-plugin-sitemap";

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss(), sitemapPlugin()],
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
