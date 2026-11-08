import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { env } from '../../src/config/env';
import { AdminUsersPage } from '../../src/pages/AdminUsersPage';
import { CashInPage } from '../../src/pages/CashInPage';
import { LoginPage } from '../../src/pages/LoginPage';
import { PasswordResetPage } from '../../src/pages/PasswordResetPage';
import { RegisterPage } from '../../src/pages/RegisterPage';
import { SelfStatementPage, STATEMENT_HEADERS } from '../../src/pages/SelfStatementPage';
import type { RegisteredUser, StatementRow } from '../../src/types';
import { DmoneyApi } from '../../src/utils/api';
import { parseCsv, writeCsv } from '../../src/utils/csv';
import { buildUser, todayIso } from '../../src/utils/data';

/**
 * End-to-end journey: Agent registers -> Admin activates -> System funds the Agent ->
 * Agent pays a Customer -> password reset -> Self Statement exported to CSV.
 *
 * The steps are strictly ordered and share one browser session (so the headed run is one
 * continuous recording). Tests tagged @smoke are the positive checks; the negative checks
 * (old password rejected) are only part of the full regression run.
 */

const SYSTEM_DEPOSIT = 2000;
const CUSTOMER_DEPOSIT = 500;
const AGENT_COMMISSION_RATE = 0.025; // the portal credits the agent 2.5% on every cash-in
const EXPECTED_FINAL_BALANCE = SYSTEM_DEPOSIT - CUSTOMER_DEPOSIT + CUSTOMER_DEPOSIT * AGENT_COMMISSION_RATE; // 1512.50

const money = (n: number) => n.toFixed(2);

test.describe.serial('DMoney Agent end-to-end journey', () => {
  let context: BrowserContext;
  let page: Page;
  let apiContext: APIRequestContext;
  let api: DmoneyApi;

  let login: LoginPage;
  let adminUsers: AdminUsersPage;
  let cashIn: CashInPage;
  let statement: SelfStatementPage;

  let agent: RegisteredUser;
  let customerPhone: string;
  let registrationStatus = '';
  let systemTxnId = '';
  let customerTxnId = '';
  let agentPassword = env.agentPassword;
  let statementRows: StatementRow[] = [];
  let csvPath = '';

  test.beforeAll(async ({ browser, playwright }) => {
    context = await browser.newContext({
      baseURL: env.baseUrl,
      viewport: { width: 1366, height: 900 },
      recordVideo: { dir: 'videos/raw', size: { width: 1366, height: 900 } },
    });
    page = await context.newPage();
    apiContext = await playwright.request.newContext();
    api = new DmoneyApi(apiContext);

    login = new LoginPage(page);
    adminUsers = new AdminUsersPage(page);
    cashIn = new CashInPage(page);
    statement = new SelfStatementPage(page);

    // Precondition: an existing, active Customer to receive the Agent's 500 Tk.
    // A fresh one is created because seeded customers have a balance cap and can be "full".
    if (env.customerPhone) {
      customerPhone = env.customerPhone;
    } else {
      const customer = await api.createActiveCustomer(buildUser('Customer', env.agentPassword));
      customerPhone = customer.phone;
    }
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('failure-screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    }
  });

  test.afterAll(async () => {
    const video = page.video();
    await context.close();
    await apiContext.dispose();
    if (video) {
      fs.mkdirSync('videos', { recursive: true });
      await video.saveAs(path.join('videos', 'agent-journey.webm'));
    }
  });

  // ---------------------------------------------------------------- Registration

  test('TC01 Agent registration is successful', { tag: '@smoke' }, async () => {
    agent = { ...buildUser('Agent', env.agentPassword), id: 0, status: '' };
    const register = new RegisterPage(page);
    await register.open();
    await register.fill(agent);
    const response = await register.submit();

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.message).toContain('Registration successful');
    expect(body.user).toMatchObject({ email: agent.email, phone_number: agent.phone, role: 'Agent' });
    agent.id = body.user.id;
    registrationStatus = body.user.status;
    await expect(register.successMessage).toBeVisible();
  });

  test('TC02 Newly created Agent is initially inactive', { tag: '@smoke' }, async () => {
    // Registration response: the account starts as "pending" (not active) until an admin approves it.
    expect(registrationStatus).toBe('pending');
  });

  // ---------------------------------------------------------------- Admin

  test('TC03 Admin login is successful', { tag: '@smoke' }, async () => {
    await login.loginDirect(env.admin.email, env.admin.password);
    await expect(login.header.getByText('Admin Dashboard')).toBeVisible();
    await expect(login.header.getByText('Admin', { exact: true }).first()).toBeVisible();
  });

  test('TC04 Newly created Agent appears in the Admin user list as pending', { tag: '@smoke' }, async () => {
    await adminUsers.open();
    await adminUsers.searchByEmail(agent.email);
    const row = adminUsers.rowFor(agent.email);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(agent.name);
    await expect(row).toContainText(agent.phone);
    await expect(row).toContainText('Agent');
    await expect(row).toContainText('PENDING');
  });

  test('TC05 Admin can activate the Agent', { tag: '@smoke' }, async () => {
    await adminUsers.viewUser(agent.email);
    await expect(adminUsers.statusBadge).toHaveText(/^pending$/i);
    await adminUsers.setStatus('Active');
    await expect(adminUsers.statusBadge).toHaveText(/^active$/i);
  });

  test('TC06 Agent remains active after page reload', { tag: '@smoke' }, async () => {
    await page.reload();
    await expect(adminUsers.statusBadge).toHaveText(/^active$/i);
  });

  // ---------------------------------------------------------------- System

  test('TC07 System login is successful (after Admin logout)', { tag: '@smoke' }, async () => {
    await adminUsers.logout();
    await login.loginDirect(env.system.email, env.system.password);
    await expect(login.header.getByText('SYSTEM', { exact: true })).toBeVisible();
  });

  test('TC08 System can deposit 2000 Tk to the Agent', { tag: '@smoke' }, async () => {
    await cashIn.open();
    await cashIn.cashIn(agent.phone, SYSTEM_DEPOSIT);
    const receipt = await cashIn.receipt();
    expect(receipt.message).toBe('SYSTEM deposit to Agent successful');
    expect(receipt.amount).toBe(`৳ ${money(SYSTEM_DEPOSIT)}`);
    expect(receipt.transactionId).toMatch(/^TXN/);
    systemTxnId = receipt.transactionId;
  });

  test('TC09 System deposit creates the correct transaction record', { tag: '@smoke' }, async () => {
    await statement.open();
    const record = (await statement.extractAllRows()).find((r) => r.transactionId === systemTxnId);
    expect(record, `transaction ${systemTxnId} should be in the System statement`).toBeDefined();
    expect(record).toMatchObject({
      sender: 'SYSTEM',
      receiver: agent.phone,
      type: 'System Deposit to Agent',
      debit: money(SYSTEM_DEPOSIT),
      credit: '-',
    });
  });

  // ---------------------------------------------------------------- Agent: balance + cash-in

  test('TC10 Agent can log in after activation', { tag: '@smoke' }, async () => {
    await statement.logout(); // System logout
    await login.loginWithOtp(agent.email, agentPassword, () => api.loginOtp(agent.id));
    await expect(login.header.getByText('Agent Dashboard')).toBeVisible();
  });

  test('TC11 Agent balance is exactly 2000 Tk', { tag: '@smoke' }, async () => {
    expect(await login.readBalance()).toBe(SYSTEM_DEPOSIT);
  });

  test('TC12 Agent can deposit 500 Tk to an existing Customer', { tag: '@smoke' }, async () => {
    await cashIn.open();
    await cashIn.cashIn(customerPhone, CUSTOMER_DEPOSIT);
    const receipt = await cashIn.receipt();
    expect(receipt.message).toBe('Deposit successful');
    expect(receipt.amount).toBe(`৳ ${money(CUSTOMER_DEPOSIT)}`);
    expect(receipt.transactionId).toMatch(/^TXN/);
    customerTxnId = receipt.transactionId;
  });

  test('TC13 Agent balance is updated correctly after the transaction', { tag: '@smoke' }, async () => {
    // 2000 - 500 sent + 12.50 commission (2.5% of 500)
    expect(await cashIn.readBalance()).toBe(EXPECTED_FINAL_BALANCE);
  });

  test('TC14 Customer deposit appears in the Agent Self Statement', { tag: '@smoke' }, async () => {
    await statement.open();
    const record = (await statement.extractAllRows()).find((r) => r.transactionId === customerTxnId);
    expect(record, `transaction ${customerTxnId} should be in the Agent statement`).toBeDefined();
    expect(record).toMatchObject({
      sender: agent.phone,
      receiver: customerPhone,
      debit: money(CUSTOMER_DEPOSIT),
      credit: money(CUSTOMER_DEPOSIT * AGENT_COMMISSION_RATE),
      balance: money(EXPECTED_FINAL_BALANCE),
    });
  });

  // ---------------------------------------------------------------- Logout, reset password

  test('TC15 Agent logout works successfully', { tag: '@smoke' }, async () => {
    await statement.logout();
    await expect(login.identifier).toBeVisible();
    // The session is really gone: a protected page bounces back to login.
    await page.goto('/agent/self-statement');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC16 Agent password reset works successfully', { tag: '@smoke' }, async () => {
    const reset = new PasswordResetPage(page);
    await reset.requestResetLink(agent.email);
    const token = await api.resetToken(agent.id);
    await reset.setNewPassword(token, env.agentNewPassword);
    agentPassword = env.agentNewPassword;
  });

  test('TC17 Login with the old password fails after reset', { tag: '@negative' }, async () => {
    await login.open();
    await login.submitCredentials(agent.email, env.agentPassword);
    await expect(login.failureMessage).toBeVisible();
    await expect(login.otpInput).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TC18 Login with the new password succeeds', { tag: '@smoke' }, async () => {
    await login.loginWithOtp(agent.email, agentPassword, () => api.loginOtp(agent.id));
    await expect(login.header.getByText('Agent Dashboard')).toBeVisible();
  });

  // ---------------------------------------------------------------- Self statement + CSV

  test('TC19 Self Statement contains the expected transaction data', { tag: '@smoke' }, async () => {
    await statement.open();
    expect(await statement.headers()).toEqual([...STATEMENT_HEADERS]);
    statementRows = await statement.extractAllRows();

    // Everything extracted must match what the page itself reports...
    expect(statementRows).toHaveLength(await statement.reportedTotal());
    // ...and for this brand-new agent that is exactly the two transactions of this journey.
    expect(statementRows).toHaveLength(2);

    const topUp = statementRows.find((r) => r.transactionId === systemTxnId);
    const payout = statementRows.find((r) => r.transactionId === customerTxnId);
    expect(topUp).toMatchObject({
      sender: 'SYSTEM', receiver: agent.phone, type: 'Top-up from SYSTEM',
      debit: '-', credit: money(SYSTEM_DEPOSIT), balance: money(SYSTEM_DEPOSIT),
    });
    expect(payout).toMatchObject({
      sender: agent.phone, receiver: customerPhone, type: 'Deposit Commission',
      debit: money(CUSTOMER_DEPOSIT), credit: money(CUSTOMER_DEPOSIT * AGENT_COMMISSION_RATE),
      balance: money(EXPECTED_FINAL_BALANCE),
    });
  });

  test('TC20 Self Statement data is saved to self_statement_<date>.csv', { tag: '@smoke' }, async ({}, testInfo) => {
    const fileName = `self_statement_${todayIso()}.csv`;
    csvPath = path.join('output', fileName);
    const rows = statementRows.map((r) => [
      r.transactionId, r.sender, r.receiver, r.type, r.debit, r.credit, r.balance, r.date,
    ]);
    writeCsv(csvPath, [...STATEMENT_HEADERS], rows);

    // Read the file back from disk and compare it with the table.
    expect(path.basename(csvPath)).toMatch(/^self_statement_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(fs.existsSync(csvPath)).toBe(true);
    const saved = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    expect(saved[0]).toEqual([...STATEMENT_HEADERS]);
    expect(saved.slice(1)).toEqual(rows);
    expect(saved.flat().join(',')).toContain(systemTxnId);
    expect(saved.flat().join(',')).toContain(customerTxnId);

    await testInfo.attach(fileName, { path: csvPath, contentType: 'text/csv' });
  });
});
