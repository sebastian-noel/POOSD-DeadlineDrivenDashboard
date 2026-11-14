import { test, expect, type Page } from '@playwright/test';
import { API, navigate, signIn } from './planner-helpers.ts';

async function active(page: Page, headers: Record<string, string>) {
  return (await (await page.request.get(`${API}/api/v1/focus-sessions/active`, { headers })).json()).session;
}

async function sessions(page: Page, headers: Record<string, string>) {
  return (await (await page.request.get(`${API}/api/v1/focus-sessions?limit=100`, { headers })).json()).items;
}

async function task(page: Page, headers: Record<string, string>, title: string) {
  const milestone = await (await page.request.post(`${API}/api/v1/milestones`, { headers, data: { title: 'Focus work' } })).json();
  return (await (await page.request.post(`${API}/api/v1/tasks`, { headers, data: { title, milestoneId: milestone.id } })).json()).id as string;
}

async function seed(page: Page, body: Record<string, unknown>) {
  const response = await page.request.post(`${API}/__test/focus`, { data: body });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

test.beforeEach(async ({ request }) => {
  expect((await request.post(`${API}/__test/reset`)).ok()).toBeTruthy();
});

test('a focus session is shared between views, pinned to its task and restored on reload', async ({ page }) => {
  const headers = await signIn(page);
  const firstTask = await task(page, headers, 'Review API contract');
  await task(page, headers, 'Next task');
  await page.reload();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  const started = await active(page, headers);
  expect(started.taskId).toBe(firstTask);
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await expect(page.getByText('Review API contract', { exact: true })).toBeVisible();
  await expect(page.getByText('No completed focus sessions yet.')).toBeVisible();
  await navigate(page, 'Tasks');
  await page.getByRole('checkbox', { name: 'Mark "Review API contract" as done', exact: true }).click();
  await navigate(page, 'Focus timer');
  await expect(page.getByText('Review API contract', { exact: true })).toBeVisible();
  expect((await sessions(page, headers)).length).toBe(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  expect((await active(page, headers)).status).toBe('paused');
  await page.screenshot({ path: test.info().outputPath('focus-paused.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  expect((await active(page, headers)).id).toBe(started.id);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  expect(await active(page, headers)).toBeNull();
  expect((await sessions(page, headers))[0].status).toBe('cancelled');
});

test('failed starts and cancellations do not fake a successful state change', async ({ page }) => {
  const headers = await signIn(page);
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await page.route('**/api/v1/focus-sessions', async (route) => route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not start focus session' } }));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not start focus session');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  expect(await active(page, headers)).toBeNull();
  await page.unroute('**/api/v1/focus-sessions');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await page.route('**/api/v1/focus-sessions/*', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not cancel session' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not cancel session');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  expect((await active(page, headers)).status).toBe('running');
  await page.unroute('**/api/v1/focus-sessions/*');
  await page.getByRole('tab', { name: 'Short break', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Short break', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await active(page, headers)).toBeNull();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  expect((await sessions(page, headers)).length).toBe(1);
});

test('expired focus saves are retryable and update actual history and dashboard time', async ({ page, browser }) => {
  const headers = await signIn(page);
  const taskId = await task(page, headers, 'Read API documentation');
  await seed(page, { taskId, elapsedSeconds: 61, targetSeconds: 60 });
  let fail = true;
  await page.route('**/api/v1/focus-sessions/*', async (route) => {
    if (route.request().method() === 'PATCH' && fail) await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not save completed session' } });
    else await route.continue();
  });
  await page.reload();
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('alert')).toContainText('Could not save completed session');
  await expect(page.getByText('Save pending', { exact: true })).toBeVisible();
  await expect(page.getByText('No completed focus sessions yet.')).toBeVisible();
  expect((await active(page, headers)).status).toBe('running');
  fail = false;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Short break', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const recent = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Recent sessions', exact: true }) });
  await expect(recent).toContainText('Read API documentation');
  await expect(recent).toContainText('1 min');
  expect(await active(page, headers)).toBeNull();
  await page.screenshot({ path: test.info().outputPath('focus-history.png'), fullPage: true });
  await navigate(page, 'Dashboard');
  await expect(page.locator('.stat-card').filter({ hasText: 'Focus time this week' }).locator('.t-stat')).toHaveText('1m');

  const context = await browser.newContext();
  const bob = await context.newPage();
  await signIn(bob, 'bob@example.com');
  await navigate(bob, 'Focus timer');
  await expect(bob.getByText('No completed focus sessions yet.')).toBeVisible();
  await expect(bob.getByText('Read API documentation', { exact: true })).toHaveCount(0);
  await context.close();
});

test('a session opened on another device is adopted and returning to the app reconciles pauses', async ({ page }) => {
  const headers = await signIn(page);
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  const other = await (await page.request.post(`${API}/api/v1/focus-sessions`, { headers, data: { targetSeconds: 600 } })).json();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  expect((await active(page, headers)).id).toBe(other.id);
  expect((await sessions(page, headers)).length).toBe(1);
  await page.request.patch(`${API}/api/v1/focus-sessions/${other.id}`, { headers, data: { action: 'pause' } });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  await expect(page.getByRole('timer')).toHaveText(/^(09:5[0-9]|10:00)$/);
});

test('saved settings set target lengths and long breaks follow completed focus blocks', async ({ page }) => {
  const headers = await signIn(page);
  await navigate(page, 'Settings');
  await page.getByLabel('Focus length', { exact: true }).fill('1');
  await page.getByLabel('Short break', { exact: true }).fill('2');
  await page.getByLabel('Long break', { exact: true }).fill('3');
  await page.getByLabel('Long break after', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('timer')).toHaveText('01:00');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  expect((await active(page, headers)).targetSeconds).toBe(60);
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await seed(page, { targetSeconds: 60, elapsedSeconds: 61 });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('tab', { name: 'Long break', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('timer')).toContainText('02:');
  expect((await sessions(page, headers)).filter((session: { status: string }) => session.status === 'completed')).toHaveLength(1);
});

test('history follows pagination and initial sync failures can be retried', async ({ page }) => {
  await signIn(page);
  await seed(page, { status: 'completed', elapsedSeconds: 120, targetSeconds: 120 });
  for (let index = 0; index < 100; index += 1) await seed(page, { status: 'cancelled' });
  await page.route('**/api/v1/focus-sessions/active', (route) => route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not load focus session' } }));
  await page.reload();
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('alert')).toContainText('Could not load focus session');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await page.unroute('**/api/v1/focus-sessions/active');
  await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await expect(page.locator('.recent-sessions')).toContainText('2 min');
  await expect(page.getByText('Session 2 of 4 today', { exact: true }).first()).toBeVisible();
});


test('the shared countdown catches up after delayed browser timer callbacks', async ({ page }) => {
  await page.clock.install();
  const headers = await signIn(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('timer')).toHaveText('24:50');
  await navigate(page, 'Focus timer');
  await expect(page.getByRole('timer')).toHaveText('24:50');
  await page.clock.fastForward(5_000);
  await expect(page.getByRole('timer')).toHaveText('24:45');
  expect((await sessions(page, headers)).length).toBe(1);
});
