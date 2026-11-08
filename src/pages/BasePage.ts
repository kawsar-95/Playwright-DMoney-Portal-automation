import { expect, type Locator, type Page } from '@playwright/test';
import { parseMoney } from '../utils/data';

/** Elements shared by every logged-in screen (top bar with balance + user menu). */
export class BasePage {
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.locator('header');
  }

  get dashboardTitle(): Locator {
    return this.header.getByText(/Dashboard$/);
  }

  /** Reloads (so the figure is fresh from the server), reveals the balance and returns it as a number. */
  async readBalance(): Promise<number> {
    await this.page.reload();
    await this.header.getByRole('button', { name: 'Balance' }).click();
    const amount = this.header.getByText(/৳\s*-?[\d,]+\.\d{2}/);
    await expect(amount).toBeVisible();
    return parseMoney((await amount.innerText()).trim());
  }

  async logout(): Promise<void> {
    // The user chip is the last block of the top bar; it opens a menu with Profile / Change Password / Logout.
    await this.header.locator(':scope > div > div:last-child').click();
    await this.page.getByRole('menuitem', { name: /logout/i }).click();
    await expect(this.page).toHaveURL(/\/login$/);
  }
}
