import type { HttpClient } from '../client.js';

export interface Network {
  id: string;
  code: string;
  updatedAt: Date;
  createdAt: Date;
  accountNumberType: string;
  country: string;
  name: string;
  channelIds: string[];
  countryAccountNumberType: string;
}

export interface Channel {
  id?: string;
  max?: number;
  currency?: string;
  countryCurrency?: string;
  status?: string;
  widgetStatus?: string;
  feeLocal?: number;
  createdAt?: string;
  vendorId?: string;
  country?: string;
  feeUSD?: number;
  min?: number;
  channelType?: string;
  rampType?: string;
  apiStatus?: string;
  settlementType?: string;
  estimatedSettlementTime?: number;
  updatedAt?: string;
  widgetMin?: number;
  widgetMax?: number;
  countryMin?: number;
  countryMax?: number;
}

export class NetworksService {
  constructor(private readonly client: HttpClient) {}

  // https://sandbox.api.yellowcard.io/business/networks
  async list(country?: string): Promise<Network[]> {
    const path = country ? `/business/networks?country=${encodeURIComponent(country)}` : '/business/networks';
    return this.client.get<{ networks: Network[] }>(path)
      .then(result => result.networks);
  }

  // https://sandbox.api.yellowcard.io/business/channels
  async channels(country?: string): Promise<Channel[]> {
    const path = country ? `/business/channels?country=${encodeURIComponent(country)}` : '/business/channels';
    return this.client.get<{ channels: Channel[] }>(path)
      .then((resp) => resp.channels);
  }
}
