import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5178',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'node tests/planner-server.mjs', url: 'http://127.0.0.1:4301/api/v1/health', timeout: 120_000 },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort', url: 'http://127.0.0.1:5178',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:4301' } },
  ],
});
