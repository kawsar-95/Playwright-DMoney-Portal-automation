import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CashInReceipt {
  message: string;
  transactionId: string;
  amount: string;
}

export class CashInPage extends BasePage {
  readonly phone: Locator;
  readonly amount: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.phone = page.locator('input[name="customer"]');
    this.amount = page.locator('input[name="amount"]');
    this.submit = page.getByRole('button', { name: /cash in/i });
  }

  async open(): Promise<void> {
    await this.page.getByRole('link', { name: 'Cash In' }).first().click();
    await expect(this.page).toHaveURL(/\/agent\/cash-in$/);
  }

  async cashIn(toPhone: string, amount: number): Promise<void> {
    await this.phone.fill(toPhone);
    await this.amount.fill(String(amount));
    await this.submit.click();
  }

  /** Reads the receipt card shown after a successful cash-in. */
  async receipt(): Promise<CashInReceipt> {
    const card = this.page.locator('main');
    const txnLabel = card.getByText('TRANSACTION ID');
    await expect(txnLabel).toBeVisible();
    const transactionId = (await txnLabel.locator('xpath=following-sibling::*[1]').innerText()).trim();
    const amount = (await card.getByText('TOTAL AMOUNT').locator('xpath=following-sibling::*[1]').innerText()).trim();
    const message = (await card.getByText(/successful$/).first().innerText()).trim();
    return { message, transactionId, amount };
  }
}
