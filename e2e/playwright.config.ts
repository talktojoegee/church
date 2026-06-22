import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'cd .. && pnpm --filter chms-web dev',
        url: WEB_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
