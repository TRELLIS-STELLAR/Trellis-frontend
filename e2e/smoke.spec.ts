import { test, expect, Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/analytics',
  '/bug-report',
  '/bug-reports',
  '/create',
  '/dashboard',
  '/dashboard/referrals',
  '/governance',
  '/learn',
  '/marketplace',
  '/portfolio',
  '/provenance',
  '/security',
  '/settings/notifications',
  '/settings/wallet',
  '/simulations',
  '/staking',
  '/submissions',
  '/telemetry',
  '/testing',
  '/trading',
  '/waitlist',
];

const IGNORED_CONSOLE_PATTERNS = [
  /favicon/i,
  /Download the React DevTools/i,
  /service worker/i,
  /SW registration/i,
  /Manifest/i,
  /apple-touch-icon/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /net::ERR/i,
];

function isIgnoredError(message: string): boolean {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));
}

async function collectPageErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isIgnoredError(text)) {
        errors.push(text);
      }
    }
  });
  return errors;
}

test.describe('route smoke tests', () => {
  for (const route of ROUTES) {
    test(`${route} renders without crashing`, async ({ page }) => {
      const errors = await collectPageErrors(page);
      const response = await page.goto(route, { waitUntil: 'load' });

      expect(response, `no response for ${route}`).not.toBeNull();
      expect(
        response!.status(),
        `${route} returned HTTP ${response!.status()}`,
      ).toBeLessThan(400);

      await expect(page.locator('body')).toBeVisible();
      expect(errors, `console/page errors on ${route}: ${errors.join(' | ')}`).toEqual([]);
    });
  }
});
