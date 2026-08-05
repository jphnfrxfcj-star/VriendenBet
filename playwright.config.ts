import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'env DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mielbet SESSION_SECRET=dev-secret-mielbet-please-change-123456 npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  ],
})
