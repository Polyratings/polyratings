/* eslint-disable */
export default {
    displayName: "backend",
    testEnvironment: "miniflare",
    preset: "../../jest.preset.js",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../coverage/packages/backend",
};
