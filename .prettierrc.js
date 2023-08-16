module.exports = {
    printWidth: 120,
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
