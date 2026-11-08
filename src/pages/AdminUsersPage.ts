import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type UserStatus = 'Pending' | 'Active' | 'Suspended';

export class AdminUsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.getByRole('link', { name: 'User List' }).first().click();
    await expect(this.page).toHaveURL(/\/admin\/users$/);
    await expect(this.page.getByText(/^Total: \d+/)).toBeVisible();
  }

  async searchByEmail(email: string): Promise<void> {
    await this.page.getByRole('combobox').first().click();
    await this.page.getByRole('option', { name: 'Search by Email' }).click();
    await this.page.getByPlaceholder('e.g., user@example.com').fill(email);
    await this.page.getByRole('button', { name: 'SEARCH' }).click();
  }

  rowFor(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  async viewUser(email: string): Promise<void> {
    await this.rowFor(email).getByRole('button', { name: 'VIEW' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users\/\d+$/);
  }

  /** Account status badge in the top-right of the user detail page. */
  get statusBadge(): Locator {
    return this.page.getByText(/^Account Status$/i).first().locator('xpath=following-sibling::*[1]');
  }

  async setStatus(status: UserStatus): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit User' }).click();
    await this.page.getByRole('combobox').nth(1).click();
    await this.page.getByRole('option', { name: status }).click();
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => /\/user\/update\/\d+$/.test(r.url()) && r.request().method() === 'PATCH'),
      this.page.getByRole('button', { name: 'Save Changes' }).click(),
    ]);
    expect(response.status()).toBe(200);
  }
}
