import { test, expect } from '@playwright/test';
import { enableNetworkChaos, expectNoCrash, trackUncaughtErrors } from './utils/chaos';

/**
 * Network chaos suite.
 *
 * Verifies the UI degrades gracefully when the network does not: slow APIs
 * must show loading states, failing APIs must show an error with a way to
 * retry, and nothing may escape to an unhandled crash or a blank screen.
 *
 * Faults are seeded; set CHAOS_SEED to replay a failing randomised run.
 */

const BUG_REPORTS_API = /\/api\/bug-reports/;
const OPERATIONS_API = /\/api\/operational-health/;

test.describe('network chaos: targeted scenarios', () => {
  test('high latency shows the loading state, then the content', async ({ page }) => {
    const uncaught = trackUncaughtErrors(page);
    const chaos = await enableNetworkChaos(page, { urlPattern: BUG_REPORTS_API, latencyMs: [2500, 3000], seed: 1 });

    await page.goto('/bug-reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading bug reports...')).toBeVisible();
    await expect(page.getByRole('heading', { name: /bug reports dashboard/i })).toBeVisible({ timeout: 15_000 });

    expect(chaos.stats.totalDelayMs).toBeGreaterThanOrEqual(2500);
    await expectNoCrash(page, uncaught, '/bug-reports under latency');
  });

  test('HTTP 5xx shows an error with a retry button that recovers', async ({ page }) => {
    const uncaught = trackUncaughtErrors(page);
    const chaos = await enableNetworkChaos(page, {
      urlPattern: BUG_REPORTS_API,
      latencyMs: [500, 800],
      errorRate: 1,
      seed: 2,
    });

    await page.goto('/bug-reports', { waitUntil: 'domcontentloaded' });
    const alert = page.getByRole('alert').filter({ hasText: /error loading reports/i });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    expect(chaos.stats.failed).toBeGreaterThan(0);
    await expectNoCrash(page, uncaught, '/bug-reports under 5xx');

    await chaos.disable();
    await alert.getByRole('button', { name: /retry/i }).click();
    await expect(page.getByRole('heading', { name: /bug reports dashboard/i })).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, uncaught, '/bug-reports after retry');
  });

  test('dropped packets show an error with a retry button that recovers', async ({ page }) => {
    const uncaught = trackUncaughtErrors(page);
    const chaos = await enableNetworkChaos(page, { urlPattern: OPERATIONS_API, dropRate: 1, seed: 3 });

    await page.goto('/dashboard/operations', { waitUntil: 'domcontentloaded' });
    const alert = page.getByRole('alert').filter({ has: page.getByRole('button', { name: /retry/i }) });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    expect(chaos.stats.dropped).toBeGreaterThan(0);
    await expectNoCrash(page, uncaught, '/dashboard/operations with dropped packets');

    await chaos.disable();
    await alert.getByRole('button', { name: /retry/i }).click();
    await expect(page.getByText('Unresolved exceptions')).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, uncaught, '/dashboard/operations after retry');
  });

  test('slow operations API shows the loading state', async ({ page }) => {
    const uncaught = trackUncaughtErrors(page);
    await enableNetworkChaos(page, { urlPattern: OPERATIONS_API, latencyMs: [2000, 3000], seed: 4 });

    await page.goto('/dashboard/operations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Loading operational health...')).toBeVisible();
    await expect(page.getByText('Unresolved exceptions')).toBeVisible({ timeout: 15_000 });
    await expectNoCrash(page, uncaught, '/dashboard/operations under latency');
  });
});

/**
 * Randomised sweep: every data-driven route under mixed latency, 5xx and
 * packet loss. The only requirement is survival — a handled error state or
 * the route error boundary is fine; an unhandled crash or blank page is not.
 */
const CHAOS_ROUTES = [
  '/',
  '/bug-reports',
  '/dashboard',
  '/dashboard/operations',
  '/governance',
  '/marketplace',
  '/security',
  '/waitlist',
];

test.describe('network chaos: randomised route sweep', () => {
  const baseSeed = Number(process.env.CHAOS_SEED ?? 20260929);

  CHAOS_ROUTES.forEach((route, index) => {
    const seed = baseSeed + index;

    test(`${route} survives latency, 5xx and packet loss (seed ${seed})`, async ({ page }) => {
      test.setTimeout(60_000);
      const uncaught = trackUncaughtErrors(page);
      const chaos = await enableNetworkChaos(page, {
        latencyMs: [500, 3000],
        errorRate: 0.4,
        dropRate: 0.1,
        seed,
      });

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 0, `${route} document request`).toBeLessThan(500);

      // Let every in-flight (delayed / failing) API request settle.
      await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined);

      test.info().annotations.push({
        type: 'chaos',
        description: `seed=${chaos.seed} intercepted=${chaos.stats.intercepted} failed=${chaos.stats.failed} dropped=${chaos.stats.dropped}`,
      });
      await expectNoCrash(page, uncaught, `${route} under chaos`);
    });
  });
});
