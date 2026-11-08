import { expect, type Locator, type Page } from '@playwright/test';
import type { StatementRow } from '../types';
import { BasePage } from './BasePage';

export const STATEMENT_HEADERS = [
  'Transaction ID',
  'Sender Account',
  'Receiver Account',
  'Type',
  'Debit',
  'Credit',
  'Balance',
  'Date',
] as const;

export class SelfStatementPage extends BasePage {
  readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('tbody tr');
  }

  async open(): Promise<void> {
    await this.page.getByRole('link', { name: 'Self Statement' }).first().click();
    await expect(this.page).toHaveURL(/\/agent\/self-statement$/);
    await expect(this.page.getByText(/^Transaction History \(Total: \d+\)/)).toBeVisible();
    await expect(this.rows.first()).toBeVisible();
  }

  async headers(): Promise<string[]> {
    return (await this.page.locator('thead th').allInnerTexts()).map((h) => h.trim());
  }

  private async currentPageRows(): Promise<StatementRow[]> {
    const raw = await this.rows.evaluateAll((trs) =>
      trs.map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim()),
      ),
    );
    return raw.map(([transactionId, sender, receiver, type, debit, credit, balance, date]) => ({
      transactionId, sender, receiver, type, debit, credit, balance, date,
    }));
  }

  /**
   * Every row of the table across pages.
   *
   * Quirk: the paginator counts the account's ALL-TIME history, while the table only shows the rows
   * of each server page that fall inside the From/To date filter (today by default). The server
   * returns newest first, so once a page has no matching rows, no older page will either.
   */
  async extractAllRows(maxPages = 50): Promise<StatementRow[]> {
    const byId = new Map<string, StatementRow>();
    const next = this.page.getByRole('button', { name: 'Go to next page' });
    const range = this.page.getByText(/^\d+–\d+ of \d+$/);
    for (let pageNo = 0; pageNo < maxPages; pageNo++) {
      const rows = (await this.currentPageRows()).filter((r) => /^TXN/.test(r.transactionId ?? ''));
      if (rows.length === 0) break;
      rows.forEach((r) => byId.set(r.transactionId, r));
      if (!(await next.isVisible()) || !(await next.isEnabled())) break;
      const before = await range.innerText();
      await next.click();
      await expect(range).not.toHaveText(before);
    }
    return [...byId.values()];
  }

  /** Total shown in the "Transaction History (Total: N)" title. */
  async reportedTotal(): Promise<number> {
    const text = await this.page.getByText(/^Transaction History \(Total: \d+\)/).innerText();
    return Number(/Total: (\d+)/.exec(text)![1]);
  }
}
