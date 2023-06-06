module.exports = {
    plugins: [require("prettier-plugin-tailwindcss")],
    pluginSearchDirs: false,
    tailwindConfig: "./packages/frontend/tailwind.config.js",
    printWidth: 100,
    trailingComma: "all",
    useTabs: false,
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    overrides: [
        {
            files: "*.json",
            options: {
                parser: "json",
            },
        },
    ],
};
