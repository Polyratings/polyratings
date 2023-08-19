import { resolve } from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
    base: process.env.GITHUB_WORKFLOW ? "/polyratings-revamp/" : "/",
    plugins: [react(), tsconfigPaths()],
    build: {
        sourcemap: true,
        rollupOptions: {
            plugins: [
                visualizer({
                    filename: resolve(__dirname, "stats/stats.html"),
                    template: "treemap", // sunburst|treemap|network
                    sourcemap: true,
                }),
            ],
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./vitest-setup.js",
    },
});
