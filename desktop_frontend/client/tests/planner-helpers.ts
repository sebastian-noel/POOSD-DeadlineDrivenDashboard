import { expect, type Page } from '@playwright/test';

export const API = 'http://127.0.0.1:4301';
const password = 'BrowserTestPassword123!';

export async function signIn(page: Page, email = 'alice@example.com') {
  const response = await page.request.post(`${API}/api/v1/auth/login`, { data: { email, password } });
  expect(response.status()).toBe(200);
  const { accessToken } = await response.json();
  await page.addInitScript((token) => localStorage.setItem('token', token), accessToken);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  return { Authorization: `Bearer ${accessToken}` };
}

export async function navigate(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).first().click();
  await expect(page.getByRole('button', { name, exact: true }).first()).toHaveAttribute('aria-current', 'page');
  if (name !== 'Dashboard') await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
}

