module.exports = {
  collectCoverageFrom: [
    '**/packages/*/**/*.js',
    '**/packages/*/**/*.ts',
    '!**/bin/**',
    '!**/cli/**',
    '!**/perf/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/build/**',
    '!**/vendor/**',
    '!e2e/**',
  ],
};
