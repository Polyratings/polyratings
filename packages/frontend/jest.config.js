/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.svg$": "./jest.svg-transformer.js"
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv:['./jest.env.js']
};
