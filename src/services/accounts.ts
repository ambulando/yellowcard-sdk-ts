import type { HttpClient } from '../client.js';

export interface Account {
  available: number;
  currency: string;
  currencyType: string;
}

export class AccountsService {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<Account[]> {
    return  this.client.get<{ accounts: Account[] }>('/business/account')
      .then(r => r.accounts);
  }
}
