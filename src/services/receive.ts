import type { HttpClient } from '../client.js';

type CustomerType = 'retail'| 'institution'
type ChannelType = 'momo'|'bank'

export interface ReceivePaymentRequest {
  recipient?: Recipient;
  source?: Source;
  channelId?: string;
  sequenceId?: string;
  amount?: number;
  currency?: string;
  country?: string;
  reason?: string;
  forceAccept?: boolean;
  customerType?: CustomerType;
  channelType?: ChannelType;
}

export interface ReceivePaymentResponse {
  recipient?: Recipient;
  source?: Source;
  channelId?: string;
  sequenceId?: string;
  amount?: number;
  currency?: string;
  country?: string;
  partnerId?: string;
  apiKey?: string;
  id?: string;
  status?: string;
  convertedAmount?: number;
  rate?: number;
  serviceFeeAmountLocal?: number;
  serviceFeeAmountUSD?: number;
  partnerFeeAmountLocal?: number;
  partnerFeeAmountUSD?: number;
  fiatWallet?: string;
  requestSource?: string;
  directSettlement?: boolean;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Recipient {
  address?: string;
  country?: string;
  dob?: string;
  email?: string;
  idNumber?: string;
  idType?: string;
  name?: string;
  phone?: string;
}

export interface BankInfo {
  accountName?: string;
  accountNumber?: string;
  name?: string;
}

export interface Source {
  accountNumber?: string;
  accountType?: string;
  networkId?: string;
}

export interface Payment {
  partnerId?: string;
  currency?: string;
  rate?: number;
  bankInfo?: BankInfo;
  status?: string;
  createdAt?: string;
  source?: Source;
  sequenceId?: string;
  country?: string;
  reference?: string;
  convertedAmount?: number;
  recipient?: Recipient;
  channelId?: string;
  expiresAt?: string;
  updatedAt?: string;
  amount?: number;
  id?: string;
  depositId?: string;
}

export interface PaymentCollection {
  collections: Payment[]
}

export interface SearchData {
  endDate?: string;
  startDate?: string;
  startAt?: number;
  perPage?: number;
  rangeBy?: 'createdAt' | 'updatedAt';
  sortBy?: 'createdAt' | 'updatedAt';
  orderBy?: 'desc' | 'asc';
}

export class PaymentsService {
  constructor(private readonly client: HttpClient) {}

  // https://docs.yellowcard.engineering/reference/submit-collection-request
  async create(req: ReceivePaymentRequest): Promise<ReceivePaymentResponse> {
    return this.client.post<ReceivePaymentResponse>('/business/receive', req);
  }

  // https://docs.yellowcard.engineering/reference/accept-collection-request
  async accept(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/business/receive/${id}/accept`, undefined);
  }

  // POST /business/receive/{id}/deny — not present in the public API reference
  async deny(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/business/receive/${id}/deny`, undefined);
  }

  // https://docs.yellowcard.engineering/docs/cancellation-refunds-collection-requests
  async cancel(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/business/receive/${id}/cancel`, undefined);
  }

  // https://docs.yellowcard.engineering/docs/cancellation-refunds-collection-requests
  async refund(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/business/receive/${id}/refund`, undefined);
  }

  // https://docs.yellowcard.engineering/reference/lookup-collection
  async get(id: string): Promise<Payment> {
    return this.client.get<Payment>(`/business/receive/${id}`);
  }

  // https://docs.yellowcard.engineering/reference/lookup-collection-by-sequenceid
  async getBySequenceId(id: string): Promise<Payment> {
    return this.client.get<Payment>(`/business/receive/sequence-id/${id}`);
  }

  // https://docs.yellowcard.engineering/docs/list-collections-guide-api
  async getAll(data: SearchData): Promise<Payment[]> {
    const query = new URLSearchParams(
      Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)] as [string, string])
    ).toString();
    const path = query ? `/business/receives?${query}` : '/business/receives';
    return this.client.get<PaymentCollection>(path).then(resp => resp.collections);
  }

}
