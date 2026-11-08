import { expect, test } from '@playwright/test';
import { env } from '../../src/config/env';
import { LoginPage } from '../../src/pages/LoginPage';
import { RegisterPage } from '../../src/pages/RegisterPage';
import { buildUser } from '../../src/utils/data';

/** Negative checks: part of the full regression run only (no @smoke tag). */
test.describe('Authentication & registration validation', { tag: '@negative' }, () => {
  test('NEG01 Login with a wrong password is rejected', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.submitCredentials(env.admin.email, 'definitely-wrong');
    await expect(login.failureMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('NEG02 Registration with a non-Gmail address is rejected', async ({ page }) => {
    const user = { ...buildUser('Agent', env.agentPassword) };
    user.email = user.email.replace('@gmail.com', '@example.com');
    const register = new RegisterPage(page);
    let registerCalls = 0;
    page.on('request', (r) => { if (r.url().endsWith('/user/register') && r.method() === 'POST') registerCalls++; });
    await register.open();
    await register.fill(user);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText('Only Gmail addresses (@gmail.com) are allowed for registration.')).toBeVisible();
    await expect(register.successMessage).toHaveCount(0);
    expect(registerCalls, 'the form must not reach the register API').toBe(0);
  });
});
