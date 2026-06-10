import type { HttpClient } from '../client.js';

export interface Account {
  available: number;
  currency: string;
  currencyType: string;
}

export class AccountsService {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<Account[]> {
    const resp = await this.client.get<{ accounts: Account[] }>('/business/account');
    return resp.accounts;
  }
}
