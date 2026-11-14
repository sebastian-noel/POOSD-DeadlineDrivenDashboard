import { test, expect } from '@playwright/test';
import { API, navigate, signIn } from './planner-helpers.ts';

test.beforeEach(async ({ request }) => {
  expect((await request.post(`${API}/__test/reset`)).ok()).toBeTruthy();
});

test('saved profile and preferences survive reload and another device without leaking to another account', async ({ page, browser }) => {
  const headers = await signIn(page);
  await navigate(page, 'Settings');
  await expect(page.getByLabel('Email address')).toHaveAttribute('readonly', '');
  await expect(page.getByRole('switch', { name: 'Daily summary', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Default view')).toBeDisabled();
  await page.getByLabel('Display name').fill('Sebastian Planner');
  await page.getByLabel('Focus length', { exact: true }).fill('45');
  await page.getByLabel('Short break', { exact: true }).fill('10');
  await page.getByLabel('Week starts on').selectOption('Monday');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
  const saved = await (await page.request.get(`${API}/api/v1/me`, { headers })).json();
  expect(saved.displayName).toBe('Sebastian Planner');
  expect(saved.settings.focusMinutes).toBe(45);
  await page.reload();
  await navigate(page, 'Settings');
  await expect(page.getByLabel('Display name')).toHaveValue('Sebastian Planner');
  await expect(page.getByLabel('Focus length', { exact: true })).toHaveValue('45');
  await expect(page.getByLabel('Week starts on')).toHaveValue('Monday');
  await page.screenshot({ path: test.info().outputPath('settings-saved.png'), fullPage: true });
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('timer')).toHaveText('45:00');
  await navigate(page, 'Calendar');
  await expect(page.locator('.cal-weekdays').locator(':scope > *').first()).toHaveText('Mon');
  const context = await browser.newContext();
  const device = await context.newPage();
  await signIn(device);
  await navigate(device, 'Settings');
  await expect(device.getByLabel('Focus length', { exact: true })).toHaveValue('45');
  await signIn(device, 'bob@example.com');
  await navigate(device, 'Settings');
  await expect(device.getByLabel('Focus length', { exact: true })).toHaveValue('25');
  await expect(device.getByLabel('Display name')).not.toHaveValue('Sebastian Planner');
  await context.close();
});

test('failed saves keep edits available for retry and never announce success', async ({ page }) => {
  const headers = await signIn(page);
  await navigate(page, 'Settings');
  await page.getByLabel('Display name').fill('Retry name');
  await page.getByLabel('Focus length', { exact: true }).fill('35');
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not save preferences.' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your edits are still here');
  await expect(page.getByText('Settings saved', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Display name')).toHaveValue('Retry name');
  const unchanged = await (await page.request.get(`${API}/api/v1/me`, { headers })).json();
  expect(unchanged.settings.focusMinutes).toBe(25);
  expect(unchanged.displayName).not.toBe('Retry name');
  await page.screenshot({ path: test.info().outputPath('settings-retry.png'), fullPage: true });
  await page.unroute('**/api/v1/me');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await (await page.request.get(`${API}/api/v1/me`, { headers })).json()).settings.focusMinutes).toBe(35);
});

test('a pending save disables editing and an expired session returns to login', async ({ page }) => {
  await signIn(page);
  await navigate(page, 'Settings');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await pending;
    await route.fulfill({ status: 401, json: { error: 'UNAUTHORIZED', message: 'Your session expired.' } });
  });
  await page.getByLabel('Focus length', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Display name')).toBeDisabled();
  release();
  await expect(page.getByRole('heading', { name: 'Log In', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});


test('a delayed save response cannot restore an account after logout', async ({ page }) => {
  await signIn(page);
  await navigate(page, 'Settings');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    const response = await route.fetch();
    await pending;
    await route.fulfill({ response });
  });
  await page.getByLabel('Display name').fill('Saved before logout');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Log In', exact: true })).toBeVisible();
  const completed = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith('/api/v1/me'));
  release();
  await completed;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByRole('heading', { name: 'Log In', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
