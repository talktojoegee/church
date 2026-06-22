import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'admin@church.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!';

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/members',
  '/branches',
  '/departments',
  '/groups',
  '/attendance',
  '/events',
  '/sermons',
  '/testimonies',
  '/outreaches',
  '/finance',
  '/hr',
  '/communication',
  '/follow-up',
  '/reports',
  '/users',
  '/roles',
  '/settings',
  '/audit',
  '/website',
  '/profile',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
});

for (const route of DASHBOARD_ROUTES) {
  test(`dashboard page loads: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);
    // Auth guard should not redirect back to login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `JS errors on ${route}`).toEqual([]);
  });
}

test('login → dashboard shows user context', async ({ page }) => {
  await expect(page.locator('body')).toContainText(/dashboard|members|overview/i);
});
