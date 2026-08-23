import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss()],
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
