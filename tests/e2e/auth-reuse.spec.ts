import { expect, test } from '@playwright/test';
import { BasePage } from '../../src/pages/BasePage';
import { adminAuthFile, systemAuthFile } from '../global-setup';

/**
 * Proves the storageState saved by global-setup.ts actually restores a logged-in session:
 * each block opens the dashboard directly, with no login step, as that role.
 */
test.describe('Reused authentication state', { tag: '@smoke' }, () => {
  test.describe('Admin', () => {
    test.use({ storageState: adminAuthFile });

    test('TC-AUTH01 starts already logged in as Admin', async ({ page }) => {
      await page.goto('/profile');
      const base = new BasePage(page);
      await expect(base.dashboardTitle).toBeVisible();
      await expect(base.header.getByText('Admin', { exact: true }).first()).toBeVisible();
    });
  });

  test.describe('System', () => {
    test.use({ storageState: systemAuthFile });

    test('TC-AUTH02 starts already logged in as System', async ({ page }) => {
      await page.goto('/profile');
      const base = new BasePage(page);
      await expect(base.dashboardTitle).toBeVisible();
      await expect(base.header.getByText('SYSTEM', { exact: true })).toBeVisible();
    });
  });
});
