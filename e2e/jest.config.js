/** @type {import('jest').Config} */
module.exports = {
  testRunner: 'jest-circus/runner',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.detox.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  setupFilesAfterEnv: ['<rootDir>/init.js'],
  verbose: true,
};
