import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PasswordResetPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async requestResetLink(identifier: string): Promise<void> {
    await this.page.goto('/login');
    await this.page.getByText('Forgot password?').click();
    await expect(this.page).toHaveURL(/\/forgot-password$/);
    await this.page.getByLabel(/email or phone/i).fill(identifier);
    await this.page.getByRole('button', { name: /send reset link/i }).click();
    await expect(this.page.getByText(/reset link has been sent/i)).toBeVisible();
  }

  /** Opens the link from the "e-mail" and sets the new password. */
  async setNewPassword(token: string, newPassword: string): Promise<void> {
    await this.page.goto(`/reset-password?token=${token}`);
    const fields = this.page.locator('input[type="password"]');
    await fields.nth(0).fill(newPassword);
    await fields.nth(1).fill(newPassword);
    await this.page.getByRole('button', { name: /reset password/i }).click();
    await expect(this.page.getByText('Your password has been reset successfully.')).toBeVisible();
  }
}
