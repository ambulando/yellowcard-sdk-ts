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

  create(req: ReceivePaymentRequest): Promise<ReceivePaymentResponse> {
    return this.client.post<ReceivePaymentResponse>('/business/receive', req);
  }

  // https://sandbox.api.yellowcard.io/business/receive/{id}/accept
  accept(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/v2/business/receive/${id}/accept`, undefined);
  }

  // https://sandbox.api.yellowcard.io/business/receive/{id}/deny
  deny(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/v2/business/receive/${id}/deny`, undefined);
  }

  // https://sandbox.api.yellowcard.io/business/receive/{id}/cancel
  cancel(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/v2/business/receive/${id}/cancel`, undefined);
  }

  // https://sandbox.api.yellowcard.io/business/receive/{id}/refund
  refund(id: string): Promise<Payment> {
    return this.client.post<Payment>(`/v2/business/receive/${id}/refund`, undefined);
  }

  // https://sandbox.api.yellowcard.io/business/receive/{id}
  get(id: string): Promise<Payment> {
    return this.client.get<Payment>(`/v2/business/receive/${id}`);
  }

  // https://sandbox.api.yellowcard.io/business/receive/sequence-id/{id}
  getBySequenceId(id: string): Promise<Payment> {
    return this.client.get<Payment>(`/v2/business/receive/sequence-id/${id}`);
  }

  // https://sandbox.api.yellowcard.io/business/receives
  getAll(data: SearchData): Promise<PaymentCollection> {
    const query = new URLSearchParams(
      Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)] as [string, string])
    ).toString();
    const path = query ? `/v2/business/receives?${query}` : '/v2/business/receives';
    return this.client.get<PaymentCollection>(path);
  }


}
