module.exports = {
    root: true,
    env: {
        browser: true,
        es2020: true,
    },
    parserOptions: {
        ecmaVersion: 2020,
    },
    extends: [
        // General Prettier defaults
        'airbnb',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    plugins:[
        'react',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    ignorePatterns: [
        // Ignore generated directories
        'node_modules/',
        'dist/',
    ],
    rules: {
        // Standard ESLint config
        indent: 'off',
        quotes: ['error', 'single'],
        camelcase: ['error', { properties: 'always' }],
        'linebreak-style': ['error', 'unix'],
        'eol-last': ['error', 'always'],
        'max-len': ['error', { code: 150, tabWidth: 4 }],
        'no-console': 'warn',
        'no-debugger': 'warn',
        'no-param-reassign': ['error', { props: false }],
        'no-bitwise': 'off',
        'no-shadow': 'off',
        'no-use-before-define': 'off',
        'no-restricted-imports': ['error', { patterns: ['..*', '!@/*'] }],
        'no-unused-vars': 'off',
        'no-useless-constructor': 'off',
        'no-empty-function': 'off',

        // TypeScript plugin config
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
        '@typescript-eslint/no-empty-function' : 'off',

        'react/react-in-jsx-scope': 'off',
        'react/jsx-filename-extension': [0],

        // Import plugin config (used to intelligently validate module import statements)
        'import/prefer-default-export': 'off',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'import/no-extraneous-dependencies': 'off',

        'react/jsx-props-no-spreading': 'off',
        'react/require-default-props': 'off',
        'react/prop-types': 'off',

        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'jsx-a11y/label-has-associated-control': 'off',
    },
    settings: {
        'import/resolver': {
          node: {
            extensions: ['.ts', '.tsx'],
          },
        },
    },
};
