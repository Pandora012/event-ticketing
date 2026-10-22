import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './apps/web/tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: 'node apps/api/src/server.js',
      url: 'http://127.0.0.1:4100/api/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev -w @eventify/web -- --port 3100',
      url: 'http://localhost:3100',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
