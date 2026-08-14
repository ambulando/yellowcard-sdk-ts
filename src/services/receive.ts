import type { HttpClient } from '../client.js';
import { ValidationError } from '../errors.js';

export type CustomerType = 'retail' | 'institution';
export type ChannelType = 'bank' | 'momo';
export type SortRangeBy = 'createdAt' | 'updatedAt';
export type OrderBy = 'desc' | 'asc';

export interface ReceivePaymentRequest {
  recipient?: Recipient;
  source?: Source;
  forceAccept?: boolean;
  customerType?: CustomerType;
  directSettlement?: boolean;
  settlementInfo?: SettlementInfo;
  channelId?: string;
  sequenceId?: string;
  amount?: number;
  localAmount?: number;
  redirectUrl?: string;
  customerUID?: string;
  country?: string;
  currency?: string;
  channelType?: ChannelType;
}

export interface Payment {
  recipient: Recipient;
  source: Source;
  channelId: string;
  sequenceId: string;
  amount: number;
  currency: string;
  country: string;
  partnerId: string;
  apiKey: string;
  id: string;
  status: string;
  convertedAmount: number;
  rate: number;
  serviceFeeAmountLocal: number;
  serviceFeeAmountUSD: number;
  partnerFeeAmountLocal: number;
  partnerFeeAmountUSD: number;
  fiatWallet: string;
  requestSource: string;
  directSettlement: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recipient {
  name: string;
  country: string;
  address: string;
  dob: string;
  email: string;
  idNumber: string;
  idType: string;
  additionalIdType: string;
  additionalIdNumber: string;
  phone: string;
  businessId: string;
  businessName: string;
}

export interface BankInfo {
  name: string;
  accountNumber: string;
  accountName: string;
}

export interface Source {
  accountType: string;
  accountNumber: string;
  networkId: string;
}

export interface SettlementInfo {
  walletAddress: string;
  cryptoCurrency: string;
  cryptoNetwork: string;
  walletTag?: string;
}


export interface PaymentCollection {
  collections: Payment[]
}

export interface SearchData {
  endDate?: string;
  startDate?: string;
  startAt?: number;
  perPage?: number;
  rangeBy?: SortRangeBy;
  sortBy?: SortRangeBy;
  orderBy?: OrderBy;
}

// Collects every rule the submit-receive endpoint documents for
// ReceivePaymentRequest and returns a human-readable issue per violation.
// Rules per https://docs.yellowcard.engineering/reference/submit-collection-request
// (accept-collection-request itself carries no body — only the {id} path param).
export function validateReceivePaymentRequest(req: ReceivePaymentRequest): string[] {
  const issues: string[] = [];
  const missing = (v: unknown) => v === undefined || v === null || v === '';

  // Always-required top-level fields.
  if (missing(req.channelId)) issues.push('channelId is required');
  if (missing(req.sequenceId)) issues.push('sequenceId is required');
  if (missing(req.customerUID)) issues.push('customerUID is required');
  if (missing(req.customerType)) issues.push('customerType is required');

  // Enumerated values.
  if (!missing(req.customerType) && req.customerType !== 'retail' && req.customerType !== 'institution') {
    issues.push(`customerType must be one of "retail" | "institution" (got "${req.customerType}")`);
  }
  if (!missing(req.channelType) && req.channelType !== 'bank' && req.channelType !== 'momo') {
    issues.push(`channelType must be one of "bank" | "momo" (got "${req.channelType}")`);
  }

  // Numeric fields must be integers when supplied.
  if (req.amount !== undefined && !Number.isInteger(req.amount)) issues.push('amount must be an integer');
  if (req.localAmount !== undefined && !Number.isInteger(req.localAmount)) issues.push('localAmount must be an integer');

  // country/currency are required only when routing by channelType.
  if (!missing(req.channelType)) {
    if (missing(req.country)) issues.push('country is required when channelType is used');
    if (missing(req.currency)) issues.push('currency is required when channelType is used');
  }

  // Recipient KYC — the required set depends on customerType.
  const r = req.recipient;
  if (req.customerType === 'retail') {
    if (!r) {
      issues.push('recipient is required when customerType is "retail"');
    } else {
      for (const f of ['name', 'phone', 'email', 'country', 'address', 'dob', 'idNumber', 'idType'] as const) {
        if (missing(r[f])) issues.push(`recipient.${f} is required when customerType is "retail"`);
      }
      // Nigerian retail recipients need a second ID.
      if (r.country === 'NG') {
        if (missing(r.additionalIdType)) issues.push('recipient.additionalIdType is required for retail recipients in NG');
        if (missing(r.additionalIdNumber)) issues.push('recipient.additionalIdNumber is required for retail recipients in NG');
      }
    }
  } else if (req.customerType === 'institution') {
    if (!r) {
      issues.push('recipient is required when customerType is "institution"');
    } else {
      if (missing(r.businessId)) issues.push('recipient.businessId is required when customerType is "institution"');
      if (missing(r.businessName)) issues.push('recipient.businessName is required when customerType is "institution"');
      if (missing(r.email)) issues.push('recipient.email is required');
    }
  }

  // Source account: accountType is required whenever a source is provided.
  if (req.source) {
    if (missing(req.source.accountType)) {
      issues.push('source.accountType is required');
    } else if (req.source.accountType !== 'bank' && req.source.accountType !== 'momo') {
      issues.push(`source.accountType must be one of "bank" | "momo" (got "${req.source.accountType}")`);
    }
  }

  // redirectUrl, when present, must be an absolute http(s) URL.
  if (!missing(req.redirectUrl) && !/^https?:\/\//i.test(req.redirectUrl as string)) {
    issues.push('redirectUrl must be a valid URL including the http:// or https:// scheme');
  }

  // Direct settlement requires the crypto payout destination.
  if (req.directSettlement === true) {
    const s = req.settlementInfo;
    if (!s) {
      issues.push('settlementInfo is required when directSettlement is true');
    } else {
      if (missing(s.walletAddress)) issues.push('settlementInfo.walletAddress is required when directSettlement is true');
      if (missing(s.cryptoCurrency)) issues.push('settlementInfo.cryptoCurrency is required when directSettlement is true');
      if (missing(s.cryptoNetwork)) issues.push('settlementInfo.cryptoNetwork is required when directSettlement is true');
    }
  }

  return issues;
}

export class PaymentsService {
  constructor(private readonly client: HttpClient) {}

  // https://docs.yellowcard.engineering/reference/submit-collection-request
  async create(req: ReceivePaymentRequest): Promise<Payment> {
    const issues = validateReceivePaymentRequest(req);
    if (issues.length > 0) throw new ValidationError(issues);
    return this.client.post<Payment>('/business/receive', req);
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
