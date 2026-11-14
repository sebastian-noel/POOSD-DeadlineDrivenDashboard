import { test, expect, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:4301';
const password = 'BrowserTestPassword123!';

async function signIn(page: Page, email = 'alice@example.com') {
  const response = await page.request.post(`${API}/api/v1/auth/login`, { data: { email, password } });
  expect(response.status()).toBe(200);
  const { accessToken } = await response.json();
  await page.addInitScript((token) => localStorage.setItem('token', token), accessToken);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  return { Authorization: `Bearer ${accessToken}` };
}

async function navigate(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).first().click();
  await expect(page.getByRole('button', { name, exact: true }).first()).toHaveAttribute('aria-current', 'page');
  if (name !== 'Dashboard') await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  expect((await request.post(`${API}/__test/reset`)).ok()).toBeTruthy();
});

test('milestones and tasks persist across pages, reloads, server search, and accounts', async ({ page, browser }) => {
  const headers = await signIn(page);
  await navigate(page, 'Milestones');
  await expect(page.getByText('No milestones yet. Add one with New milestone.')).toBeVisible();
  await page.getByRole('button', { name: 'New milestone', exact: true }).click();
  await page.getByLabel('MILESTONE', { exact: true }).fill('Finish integration');
  await page.getByLabel('DUE DATE (OPTIONAL)').fill('2099-11-20');
  await page.getByRole('button', { name: 'Add milestone', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Finish integration').first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('milestones.png'), fullPage: true });

  await navigate(page, 'Tasks');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('TASK', { exact: true }).fill('Write API endpoints');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const checkbox = page.getByRole('checkbox', { name: 'Mark "Write API endpoints" as done', exact: true });
  await expect(checkbox).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('tasks.png'), fullPage: true });
  await page.reload();
  await navigate(page, 'Tasks');
  await expect(checkbox).toBeVisible();

  const searchRequest = page.waitForResponse((r) => r.url().includes('/search?q=API%20end') && r.status() === 200);
  await page.getByRole('searchbox').fill('API end');
  await searchRequest;
  await expect(checkbox).toBeVisible();
  await page.getByRole('searchbox').fill('no match');
  await expect(page.getByText('No tasks match “no match”.')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await checkbox.click();
  await expect(page.getByRole('checkbox', { name: 'Mark "Write API endpoints" as not done', exact: true })).toBeChecked();
  await expect.poll(async () => {
    const data = await (await page.request.get(`${API}/api/v1/tasks`, { headers })).json();
    return data.items[0].status;
  }).toBe('done');
  await navigate(page, 'Milestones');
  await page.getByRole('tab', { name: 'Completed', exact: true }).click();
  await expect(page.getByText('Finish integration').first()).toBeVisible();
  await expect(page.getByText('Finished · 1 of 1 tasks')).toBeVisible();
  await navigate(page, 'Dashboard');
  await expect(page.getByText('Write API endpoints').first()).toBeVisible();

  const context = await browser.newContext();
  const bob = await context.newPage();
  await signIn(bob, 'bob@example.com');
  await navigate(bob, 'Tasks');
  await expect(bob.getByText('No tasks yet. Add one with New task.')).toBeVisible();
  await expect(bob.getByText('Write API endpoints')).toHaveCount(0);
  await navigate(bob, 'Milestones');
  await expect(bob.getByText('Finish integration')).toHaveCount(0);
  await context.close();
});

test('failed creates stay in the modal and failed checkoffs roll back visibly', async ({ page }) => {
  const headers = await signIn(page);
  const milestone = await (await page.request.post(`${API}/api/v1/milestones`, { headers, data: { title: 'Failure checks' } })).json();
  await page.request.post(`${API}/api/v1/tasks`, { headers, data: { title: 'Retry this task', milestoneId: milestone.id } });
  await page.reload();
  await navigate(page, 'Tasks');
  await page.route('**/api/v1/tasks/*', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 500, json: { error: 'INTERNAL_ERROR', message: 'Could not save task' } });
    else await route.continue();
  });
  const checkbox = page.getByRole('checkbox', { name: 'Mark "Retry this task" as done', exact: true });
  await checkbox.click();
  await expect(page.getByRole('alert')).toContainText('Could not save task');
  await expect(checkbox).not.toBeChecked();
  await page.unroute('**/api/v1/tasks/*');
  await checkbox.click();
  await expect(page.getByRole('checkbox', { name: 'Mark "Retry this task" as not done', exact: true })).toBeChecked();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await navigate(page, 'Milestones');
  await page.route('**/api/v1/milestones', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Could not save milestone' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'New milestone', exact: true }).click();
  await page.getByLabel('MILESTONE', { exact: true }).fill('Keep my draft');
  await page.getByRole('button', { name: 'Add milestone', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Could not save milestone');
  await expect(page.getByLabel('MILESTONE', { exact: true })).toHaveValue('Keep my draft');
});

test('planning lists load records beyond the first API page', async ({ page }) => {
  const headers = await signIn(page);
  for (let i = 0; i < 101; i += 1) {
    const response = await page.request.post(`${API}/api/v1/milestones`, { headers, data: { title: `Milestone ${i}`, dueAt: new Date(Date.UTC(2099, 0, i + 1)).toISOString() } });
    expect(response.status()).toBe(201);
    const milestone = await response.json();
    expect((await page.request.post(`${API}/api/v1/tasks`, { headers, data: { milestoneId: milestone.id, title: `Task ${i}`, dueAt: new Date(Date.UTC(2099, 0, i + 1)).toISOString() } })).status()).toBe(201);
  }
  await page.reload();
  await navigate(page, 'Tasks');
  await expect(page.getByRole('checkbox', { name: 'Mark "Task 100" as done', exact: true })).toBeVisible();
  await navigate(page, 'Milestones');
  await expect(page.getByText('Milestone 100', { exact: true })).toBeVisible();
});


test('Next due task completion updates the milestone, task list and dashboard', async ({ page }) => {
  const headers = await signIn(page);
  const milestone = await (await page.request.post(`${API}/api/v1/milestones`, {
    headers, data: { title: 'Upcoming handoff', dueAt: '2099-11-20T12:00:00Z' },
  })).json();
  await page.request.post(`${API}/api/v1/tasks`, { headers, data: { title: 'Finish API integration', milestoneId: milestone.id } });
  await page.reload();
  await navigate(page, 'Milestones');
  await expect(page.getByRole('progressbar', { name: 'Upcoming handoff progress' })).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('checkbox', { name: 'Mark "Finish API integration" as done', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Upcoming handoff progress' })).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByText('No unfinished milestones with a due date.')).toBeVisible();
  await page.reload();
  await navigate(page, 'Tasks');
  await expect(page.getByRole('checkbox', { name: 'Mark "Finish API integration" as not done', exact: true })).toBeChecked();
  await navigate(page, 'Dashboard');
  await expect(page.getByRole('progressbar', { name: 'Upcoming handoff progress' })).toHaveAttribute('aria-valuenow', '100');
});

test('search failures are shown instead of presenting stale matches', async ({ page }) => {
  await signIn(page);
  await navigate(page, 'Tasks');
  await page.route('**/api/v1/search?*', (route) => route.fulfill({ status: 503, json: { error: 'UNAVAILABLE', message: 'Search is temporarily unavailable' } }));
  await page.getByRole('searchbox').fill('partial');
  await expect(page.getByRole('alert')).toContainText('Search is temporarily unavailable');
  await expect(page.getByText('Search is unavailable.', { exact: true })).toBeVisible();
  await page.unroute('**/api/v1/search?*');
  await page.getByRole('searchbox').fill('different');
  await expect(page.getByText('No tasks match “different”.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
