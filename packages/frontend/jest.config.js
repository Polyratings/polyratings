/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["./jest.env.js"],
    moduleNameMapper: {
        "\\.(css|less|sass|scss|svg|webp|png)$": "<rootDir>/jest.asset-transformer.js",
        "^@/(.*)$": "<rootDir>/src/$1",
    },
};
