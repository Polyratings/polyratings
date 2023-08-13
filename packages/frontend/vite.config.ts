import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
    base: process.env.GITHUB_WORKFLOW ? "/polyratings-revamp/" : "/",
    cacheDir: "../../node_modules/.vite/frontend",

    server: {
        port: 4200,
        host: "localhost",
    },

    preview: {
        port: 4300,
        host: "localhost",
    },

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

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [
    //    viteTsConfigPaths({
    //      root: '../../',
    //    }),
    //  ],
    // },

    test: {
        cache: {
            dir: "../../node_modules/.vitest",
        },
        environment: "jsdom",
        globals: true,
        setupFiles: "./vitest-setup.js",
    },
});
