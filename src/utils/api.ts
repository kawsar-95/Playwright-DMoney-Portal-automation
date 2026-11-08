import type { APIRequestContext } from '@playwright/test';
import { env } from '../config/env';
import type { NewUser, RegisteredUser } from '../types';

/**
 * Thin API helpers used ONLY for test data set-up and for reading values that the portal
 * delivers by e-mail (login OTP, password-reset link). Everything the assignment asks to be
 * verified is driven and asserted through the UI.
 */
export class DmoneyApi {
  constructor(private readonly request: APIRequestContext) {}

  async adminToken(): Promise<string> {
    const res = await this.request.post(`${env.apiUrl}/user/login`, {
      data: { email: env.admin.email, password: env.admin.password },
    });
    if (!res.ok()) throw new Error(`Admin API login failed: ${res.status()} ${await res.text()}`);
    return (await res.json()).token as string;
  }

  private async adminGet(path: string) {
    const token = await this.adminToken();
    const res = await this.request.get(`${env.apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
    return res.json();
  }

  /** Creates an ACTIVE customer (register + admin activation) so the cash-in target is never capped out. */
  async createActiveCustomer(user: NewUser): Promise<RegisteredUser> {
    const reg = await this.request.post(`${env.apiUrl}/user/register`, {
      data: { name: user.name, email: user.email, password: user.password, phone_number: user.phone, nid: user.nid, role: user.role },
    });
    if (reg.status() !== 201) throw new Error(`Customer registration failed: ${reg.status()} ${await reg.text()}`);
    const { user: created } = await reg.json();

    const token = await this.adminToken();
    const upd = await this.request.patch(`${env.apiUrl}/user/update/${created.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-auth-secret-key': env.apiSecretKey },
      data: { name: user.name, email: user.email, phone_number: user.phone, nid: user.nid, role: user.role, status: 'active' },
    });
    if (!upd.ok()) throw new Error(`Customer activation failed: ${upd.status()} ${await upd.text()}`);
    return { ...user, id: created.id, status: 'active' };
  }

  /** The 4-digit login OTP the portal "e-mails" to the user (valid 2 minutes). */
  async loginOtp(userId: number): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { user } = await this.adminGet(`/user/search/id/${userId}`);
      if (user.otp) return String(user.otp);
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`No OTP was issued for user ${userId}`);
  }

  /** The token embedded in the "reset password" e-mail link. */
  async resetToken(userId: number): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { user } = await this.adminGet(`/user/search/id/${userId}`);
      if (user.reset_token) return String(user.reset_token);
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`No reset token was issued for user ${userId}`);
  }
}
