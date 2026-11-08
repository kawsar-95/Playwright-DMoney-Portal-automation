export type Role = 'Agent' | 'Customer' | 'Merchant';

export interface NewUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  nid: string;
  role: Role;
}

export interface RegisteredUser extends NewUser {
  id: number;
  status: string;
}

export interface StatementRow {
  transactionId: string;
  sender: string;
  receiver: string;
  type: string;
  debit: string;
  credit: string;
  balance: string;
  date: string;
}
