import { test, expect, type Page } from '@playwright/test';
import { API, navigate, signIn } from './planner-helpers.ts';

// Date inputs are stored as UTC instants but must display on the browser's local day.
test.use({ timezoneId: 'America/New_York' });
const now = new Date('2026-11-14T12:00:00-05:00');

function day(page: Page, date: string) {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return page.getByRole('listitem', { name: label, exact: true });
}

async function createMilestone(page: Page, headers: Record<string, string>, title: string, dueAt: string | null) {
  const response = await page.request.post(`${API}/api/v1/milestones`, { headers, data: { title, dueAt } });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

async function createTask(page: Page, headers: Record<string, string>, milestoneId: string, title: string, dueAt: string | null) {
  const response = await page.request.post(`${API}/api/v1/tasks`, { headers, data: { title, milestoneId, dueAt } });
  expect(response.status()).toBe(201);
}

test.beforeEach(async ({ page, request }) => {
  expect((await request.post(`${API}/__test/reset`)).ok()).toBeTruthy();
  await page.clock.install({ time: now });
});

test('calendar shows saved dates and creates tasks that persist across pages and reloads', async ({ page }) => {
  const headers = await signIn(page);
  const milestone = await createMilestone(page, headers, 'Research milestone', '2026-11-20T20:00:00Z');
  await createTask(page, headers, milestone, 'Write outline', '2026-11-17T20:00:00Z');
  await createTask(page, headers, milestone, 'Read sources', null);
  await page.reload();
  await navigate(page, 'Calendar');
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await expect(day(page, '2026-11-14')).toContainText('Read sources');
  await expect(day(page, '2026-11-17')).toContainText('Write outline');
  await expect(day(page, '2026-11-20')).toContainText('Research milestone');
  await page.screenshot({ path: test.info().outputPath('calendar.png'), fullPage: true });

  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('TASK', { exact: true }).fill('Prepare December report');
  await page.getByLabel('DUE DATE (OPTIONAL)').fill('2026-12-03');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'December 2026', exact: true })).toBeVisible();
  await expect(day(page, '2026-12-03')).toContainText('Prepare December report');
  const tasks = await (await page.request.get(`${API}/api/v1/tasks`, { headers })).json();
  expect(tasks.items.find((task: { title: string }) => task.title === 'Prepare December report').dueAt).toBe('2026-12-04T04:59:00.000Z');
  await page.reload();
  await navigate(page, 'Calendar');
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(day(page, '2026-12-03')).toContainText('Prepare December report');
  await navigate(page, 'Tasks');
  await expect(page.getByRole('checkbox', { name: 'Mark "Prepare December report" as done', exact: true })).toBeVisible();
});

test('completion updates calendar status and another account has an empty calendar', async ({ page, browser }) => {
  const headers = await signIn(page);
  const milestone = await createMilestone(page, headers, 'Finish research', '2026-11-17T20:00:00Z');
  await createTask(page, headers, milestone, 'Complete research task', '2026-11-17T20:00:00Z');
  await page.reload();
  await navigate(page, 'Calendar');
  await expect(day(page, '2026-11-17')).toContainText('Complete research task');
  await navigate(page, 'Tasks');
  await page.getByRole('checkbox', { name: 'Mark "Complete research task" as done', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark "Complete research task" as not done', exact: true })).toBeEnabled();
  await navigate(page, 'Calendar');
  await expect(day(page, '2026-11-17').locator('.cal-done')).toContainText('1 done');
  await expect(day(page, '2026-11-17').getByTitle('Finish research')).toHaveClass(/status-completed/);
  await expect(page.getByText('Nothing due soon.', { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('calendar-completed.png'), fullPage: true });

  const context = await browser.newContext({ timezoneId: 'America/New_York' });
  const bob = await context.newPage();
  await bob.clock.install({ time: now });
  await signIn(bob, 'bob@example.com');
  await navigate(bob, 'Calendar');
  await expect(bob.getByText('No tasks or milestones scheduled this month.')).toBeVisible();
  await expect(bob.getByTitle('Finish research')).toHaveCount(0);
  await context.close();
});

test('calendar uses server partial search and preserves drafts on failed creation', async ({ page }) => {
  const headers = await signIn(page);
  const milestone = await createMilestone(page, headers, 'Search milestone', '2026-11-20T20:00:00Z');
  await createTask(page, headers, milestone, 'Write API endpoints', '2026-11-17T20:00:00Z');
  await createTask(page, headers, milestone, 'Read notes', '2026-11-17T20:00:00Z');
  await page.reload();
  await navigate(page, 'Calendar');
  const searchResponse = page.waitForResponse((response) => response.url().includes('/search?q=API%20end') && response.status() === 200);
  await page.getByRole('searchbox').fill('API end');
  await searchResponse;
  await expect(day(page, '2026-11-17')).toContainText('Write API endpoints');
  await expect(day(page, '2026-11-17')).not.toContainText('Read notes');
  await expect(day(page, '2026-11-20').getByTitle('Search milestone')).toHaveCount(0);
  await page.getByRole('searchbox').fill('does not match');
  await expect(page.getByText('No matching tasks or milestones this month.')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.route('**/api/v1/tasks', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Task could not be saved' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('TASK', { exact: true }).fill('Keep calendar draft');
  await page.getByLabel('DUE DATE (OPTIONAL)').fill('2026-12-03');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Task could not be saved');
  await expect(page.getByLabel('TASK', { exact: true })).toHaveValue('Keep calendar draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await expect(page.getByTitle('Keep calendar draft')).toHaveCount(0);
});

test('due dates retain their local day while today and undated tasks advance at midnight', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-11-14T23:59:50-05:00'));
  const headers = await signIn(page);
  const milestone = await createMilestone(page, headers, 'Undated milestone', null);
  await createTask(page, headers, milestone, 'Late UTC timestamp', '2026-11-15T02:00:00Z');
  await createTask(page, headers, milestone, 'Overdue task', '2026-11-13T20:00:00Z');
  await createTask(page, headers, milestone, 'Undated task', null);
  await page.reload();
  await navigate(page, 'Calendar');
  await expect(day(page, '2026-11-13')).toContainText('Overdue task');
  await expect(day(page, '2026-11-14')).toContainText('Late UTC timestamp');
  await expect(day(page, '2026-11-14')).toContainText('Undated task');
  await expect(day(page, '2026-11-14')).toHaveAttribute('aria-current', 'date');
  await expect(page.getByTitle('Undated milestone')).toHaveCount(0);
  await page.clock.runFor(11_000);
  await expect(day(page, '2026-11-15')).toHaveAttribute('aria-current', 'date');
  await expect(day(page, '2026-11-15')).toContainText('Undated task');
  await expect(day(page, '2026-11-14')).toContainText('Late UTC timestamp');
  await expect(day(page, '2026-11-14')).not.toContainText('Undated task');
});

test('month controls and week-start preference work with real events', async ({ page }) => {
  await signIn(page);
  await navigate(page, 'Settings');
  await page.getByLabel('Week starts on').selectOption('Monday');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await navigate(page, 'Calendar');
  await expect(page.locator('.cal-weekdays > span').first()).toHaveText('Mon');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByRole('heading', { name: 'October 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await expect(day(page, '2026-11-14')).toHaveAttribute('aria-current', 'date');
});
