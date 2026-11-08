import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly identifier: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly otpInput: Locator;
  readonly verifyOtp: Locator;
  readonly failureMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.identifier = page.getByLabel(/email or phone/i);
    this.password = page.locator('input[type="password"]');
    this.submit = page.getByRole('button', { name: /^login/i });
    this.otpInput = page.getByPlaceholder('• • • •');
    this.verifyOtp = page.getByRole('button', { name: /verify otp/i });
    this.failureMessage = page.getByText('Login failed. Please input correct email/phone number or password.');
    this.forgotPasswordLink = page.getByText('Forgot password?');
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.identifier).toBeVisible();
  }

  async submitCredentials(identifier: string, password: string): Promise<void> {
    await this.identifier.fill(identifier);
    await this.password.fill(password);
    await this.submit.click();
  }

  /** Admin and System accounts go straight to the dashboard (no OTP). */
  async loginDirect(identifier: string, password: string): Promise<void> {
    await this.open();
    await this.submitCredentials(identifier, password);
    await expect(this.page).toHaveURL(/\/profile/);
    await expect(this.dashboardTitle).toBeVisible();
  }

  /** Agents/customers/merchants must pass the e-mailed 4-digit OTP; `getOtp` fetches it. */
  async loginWithOtp(identifier: string, password: string, getOtp: () => Promise<string>): Promise<void> {
    await this.open();
    await this.submitCredentials(identifier, password);
    await expect(this.otpInput).toBeVisible();
    await this.otpInput.fill(await getOtp());
    await this.verifyOtp.click();
    await expect(this.page).toHaveURL(/\/profile/);
    await expect(this.dashboardTitle).toBeVisible();
  }
}
