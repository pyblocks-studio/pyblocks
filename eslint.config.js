module.exports = [
    {
        files: ['js/**/*.js', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly', document: 'readonly', localStorage: 'readonly', matchMedia: 'readonly',
                Blockly: 'readonly', Worker: 'readonly', Blob: 'readonly', URL: 'readonly', CustomEvent: 'readonly',
                ResizeObserver: 'readonly', self: 'readonly', importScripts: 'readonly', module: 'readonly', globalThis: 'readonly',
                setTimeout: 'readonly', clearTimeout: 'readonly', console: 'readonly', require: 'readonly'
            }
        },
        rules: {
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-undef': 'error',
            'no-unused-vars': ['error', {argsIgnorePattern: '^_'}]
        }
    },
    {ignores: ['vendor/**', 'node_modules/**']}
];
