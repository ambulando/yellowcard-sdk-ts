import base from './jest.config.js';

/**
 * Opt-in config for live tests that hit the real sandbox API.
 * Run with: npm run test:live
 */
/** @type {import('jest').Config} */
export default {
  ...base,
  testMatch: ['**/tests/live/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
