import { expect, type Page, type Response } from '@playwright/test';
import type { NewUser } from '../types';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly successMessage = this.page.getByText('Registration successful. Your account is pending approval by an admin.');

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByRole('link', { name: 'Sign Up' }).first().click();
    await expect(this.page).toHaveURL(/\/register$/);
  }

  async fill(user: NewUser): Promise<void> {
    await this.page.locator('input[name="name"]').fill(user.name);
    await this.page.locator('input[name="email"]').fill(user.email);
    await this.page.locator('input[name="password"]').fill(user.password);
    await this.page.locator('input[name="phone_number"]').fill(user.phone);
    await this.page.locator('input[name="nid"]').fill(user.nid);
    await this.page.getByRole('combobox').click();
    await this.page.getByRole('option', { name: new RegExp(user.role, 'i') }).click();
  }

  /** Submits the form and returns the registration API response. */
  async submit(): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/user/register') && r.request().method() === 'POST'),
      this.page.getByRole('button', { name: /create account/i }).click(),
    ]);
    return response;
  }
}
