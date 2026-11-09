import fs from 'node:fs';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { env } from '../src/config/env';
import { LoginPage } from '../src/pages/LoginPage';

/**
 * Logs in once per stable role (Admin, System) and saves the authenticated session to disk, so
 * new tests can start already logged in via `test.use({ storageState: adminAuthFile })` instead of
 * repeating the login flow. Agent/Customer/Merchant are excluded: those accounts are created fresh
 * by each test run (see `buildUser`), so there is no fixed credential to pre-authenticate here.
 */
export const authDir = path.join(__dirname, '..', 'playwright', '.auth');
export const adminAuthFile = path.join(authDir, 'admin.json');
export const systemAuthFile = path.join(authDir, 'system.json');

async function saveLoginState(baseURL: string, email: string, password: string, outFile: string): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  try {
    await new LoginPage(page).loginDirect(email, password);
    await page.context().storageState({ path: outFile });
  } catch (error) {
    // No test is running here, so Playwright won't auto-capture a trace/screenshot on failure:
    // log the page's actual URL so a CI timeout can be told apart from a wrong credential or selector.
    console.error(`global-setup login failed for ${email} at ${page.url()}`);
    throw error;
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? env.baseUrl;
  fs.mkdirSync(authDir, { recursive: true });
  await Promise.all([
    saveLoginState(baseURL, env.admin.email, env.admin.password, adminAuthFile),
    saveLoginState(baseURL, env.system.email, env.system.password, systemAuthFile),
  ]);
}
