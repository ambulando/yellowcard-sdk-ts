import type { HttpClient } from '../client.js';

export interface Rate {
  buy?: number;
  sell?: number;
  locale?: string;
  rateId?: string;
  code?: string;
  updatedAt?: string;
}

export class RatesService {
  constructor(private readonly client: HttpClient) {}

  // https://sandbox.api.yellowcard.io/business/rates
  async list(currency: string): Promise<Rate[]> {
    const q = new URLSearchParams();
    if (currency) q.set('currency', currency);
    const qs = q.toString() ? `?${q}` : '';
    return  this.client.get<{ rates: Rate[] }>(`/business/rates${qs}`)
      .then(result => result.rates);
  }
}
