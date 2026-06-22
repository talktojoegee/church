import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/gallery',
  '/give',
  '/messages',
  '/our-outreaches',
  '/stories',
  '/stories/submit',
  '/upcoming-events',
  '/login',
];

for (const route of PUBLIC_ROUTES) {
  test(`public page loads: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `JS errors on ${route}`).toEqual([]);
  });
}

test('public home shows church content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/church|welcome|worship/i);
});
