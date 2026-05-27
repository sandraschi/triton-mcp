import { test, expect } from '@playwright/test';

const BE = 'http://localhost:11024';

test.describe('Frontend', () => {
    test('Dashboard loads', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/$/);
    });

    test('Models page loads', async ({ page }) => {
        await page.goto('/models');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/models/);
    });

    test('Config page loads', async ({ page }) => {
        await page.goto('/config');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/config/);
    });

    test('Inference page loads', async ({ page }) => {
        await page.goto('/inference');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/inference/);
    });

    test('Metrics page loads', async ({ page }) => {
        await page.goto('/metrics');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/metrics/);
    });

    test('Status page loads', async ({ page }) => {
        await page.goto('/status');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/status/);
    });

    test('Help page loads with tabs', async ({ page }) => {
        await page.goto('/help');
        await expect(page.locator('h1, h2, [class*="title"]').first()).toBeVisible();
        await expect(page).toHaveURL(/\/help/);
        await expect(page.locator('button:has-text("Overview")')).toBeVisible();
        await expect(page.locator('button:has-text("Tools")')).toBeVisible();
        await expect(page.locator('button:has-text("Models")')).toBeVisible();
    });
});

test.describe('REST API', () => {
    test('GET /api/v1/status returns 200', async ({ request }) => {
        const resp = await request.get(`${BE}/api/v1/status`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(body.server).toBe('triton-mcp');
    });

    test('GET /api/v1/tools lists tools', async ({ request }) => {
        const resp = await request.get(`${BE}/api/v1/tools`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(body.tools).toBeDefined();
        expect(Array.isArray(body.tools)).toBe(true);
        expect(body.count).toBeGreaterThanOrEqual(5);
    });
});
