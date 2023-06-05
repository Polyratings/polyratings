/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

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

    plugins: [
        react(),
        tsconfigPaths({
            root: "../../",
        }),
    ],
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
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        environment: "jsdom",
        globals: true,
        setupFiles: "./vitest-setup.js",
    },
});
