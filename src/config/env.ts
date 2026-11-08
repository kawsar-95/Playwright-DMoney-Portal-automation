import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://dmoneyportal.roadtocareer.net',
  apiUrl: process.env.API_URL ?? 'https://dmoney.roadtocareer.net',
  admin: { email: required('ADMIN_EMAIL'), password: required('ADMIN_PASSWORD') },
  system: { email: required('SYSTEM_EMAIL'), password: required('SYSTEM_PASSWORD') },
  agentPassword: required('AGENT_PASSWORD'),
  agentNewPassword: required('AGENT_NEW_PASSWORD'),
  apiSecretKey: required('API_SECRET_KEY'),
  customerPhone: process.env.CUSTOMER_PHONE || undefined,
};
