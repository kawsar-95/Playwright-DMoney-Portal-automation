import { randomInt } from 'node:crypto';
import type { NewUser, Role } from '../types';

const digits = (n: number) => Array.from({ length: n }, () => randomInt(0, 10)).join('');

/** Unique user data. The portal only accepts @gmail.com addresses, an 11-digit 01XXXXXXXXX phone and a 7-13 digit NID. */
export function buildUser(role: Role, password: string): NewUser {
  const stamp = `${Date.now()}${digits(3)}`;
  return {
    name: `QA ${role} ${stamp.slice(-8)}`,
    email: `qa.${role.toLowerCase()}.${stamp}@gmail.com`,
    password,
    phone: `01${digits(9)}`,
    nid: digits(10),
    role,
  };
}

/** Today's date as YYYY-MM-DD in the machine's local time zone (used for the CSV file name). */
export function todayIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "৳ 1,512.50" / "1512.50" -> 1512.5 */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[^0-9.-]/g, '');
  return Number.parseFloat(cleaned);
}
