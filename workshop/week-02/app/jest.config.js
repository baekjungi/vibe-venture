"use strict";

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["<rootDir>/__tests__/fixtures/env.setup.js"],
  collectCoverageFrom: ["server.js"],
  coverageThreshold: {
    global: { lines: 60, functions: 60, branches: 50 },
  },
  // 통합 테스트에서 setInterval이 테스트 종료를 막지 않도록
  fakeTimers: { enableGlobally: false },
  testTimeout: 10000,
};
