import type { HttpClient } from '../client.js';
import { ValidationError } from '../errors.js';
import type { CustomerType, ChannelType, SearchData } from './receive.js';

export interface Sender {
  name?: string;
  country?: string;
  phone?: string;
  address?: string;
  dob?: string;
  email?: string;
  idNumber?: string;
  idType?: string;
  businessId?: string;
  businessName?: string;
  additionalIdType?: string;
  additionalIdNumber?: string;
}

export interface SendDestination {
  accountNumber: string;
  accountType: ChannelType;
  networkId: string;
  accountName: string;
  accountBank?: string;
  networkName?: string;
  country?: string;
  phoneNumber?: string;
  branch?: string;
  branchCode?: string;
  // LATAM (BRL): Pix key type — one of CPF | CNPJ | EMAIL | PHONE | RANDOM_KEY
  pixKeyType?: string;
}

export interface SubmitSendRequest {
  sequenceId: string;
  reason: string;
  sender: Sender;
  destination: SendDestination;
  customerUID: string;
  customerType: CustomerType;
  forceAccept: boolean;
  channelId?: string;
  // amount and localAmount are interchangeable — exactly one is required.
  amount?: number;
  localAmount?: number;
  channelType?: ChannelType;
  country?: string;
  currency?: string;
  // LATAM root-level fields (currency-specific)
  cuit?: string; // ARS
  identificationType?: string; // COP
  identificationNumber?: string; // COP
  accountType?: string; // COP
}

export interface Send {
  id: string;
  channelId: string;
  sequenceId: string;
  currency: string;
  country: string;
  amount: number;
  reason: string;
  convertedAmount: number;
  status: string;
  rate: number;
  partnerId: string;
  requestSource: string;
  attempt: number;
  forceAccept: boolean;
  directSettlement: boolean;
  fiatWallet: string;
  sender: Sender;
  destination: SendDestination;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface SendCollection {
  payments: Send[];
}

// Validates a SubmitSendRequest against the rules the submit-send endpoint documents.
// Returns a human-readable issue per violation.
// https://docs.yellowcard.engineering/reference/submit-payment
export function validateSubmitSendRequest(req: SubmitSendRequest): string[] {
  const issues: string[] = [];
  const missing = (v: unknown) => v === undefined || v === null || v === '';

  // Always-required top-level fields.
  if (missing(req.sequenceId)) issues.push('sequenceId is required');
  if (missing(req.reason)) issues.push('reason is required');
  if (missing(req.customerUID)) issues.push('customerUID is required');
  if (missing(req.customerType)) issues.push('customerType is required');
  if (req.forceAccept === undefined || req.forceAccept === null) issues.push('forceAccept is required');

  // Enumerated values.
  if (!missing(req.customerType) && req.customerType !== 'retail' && req.customerType !== 'institution') {
    issues.push(`customerType must be one of "retail" | "institution" (got "${req.customerType}")`);
  }
  if (!missing(req.channelType) && req.channelType !== 'bank' && req.channelType !== 'momo') {
    issues.push(`channelType must be one of "bank" | "momo" (got "${req.channelType}")`);
  }

  // Amount: exactly one of amount / localAmount, and integers when supplied.
  const hasAmount = req.amount !== undefined && req.amount !== null;
  const hasLocalAmount = req.localAmount !== undefined && req.localAmount !== null;
  if (!hasAmount && !hasLocalAmount) issues.push('one of amount or localAmount is required');
  if (hasAmount && hasLocalAmount) issues.push('amount and localAmount are mutually exclusive — provide only one');
  if (hasAmount && !Number.isInteger(req.amount)) issues.push('amount must be an integer');
  if (hasLocalAmount && !Number.isInteger(req.localAmount)) issues.push('localAmount must be an integer');

  // country/currency are required only when routing by channelType.
  if (!missing(req.channelType)) {
    if (missing(req.country)) issues.push('country is required when channelType is used');
    if (missing(req.currency)) issues.push('currency is required when channelType is used');
  }

  // Destination — always required, with a required subset of fields.
  if (!req.destination) {
    issues.push('destination is required');
  } else {
    const d = req.destination;
    for (const f of ['accountNumber', 'accountType', 'networkId', 'accountName'] as const) {
      if (missing(d[f])) issues.push(`destination.${f} is required`);
    }
    if (!missing(d.accountType) && d.accountType !== 'bank' && d.accountType !== 'momo') {
      issues.push(`destination.accountType must be one of "bank" | "momo" (got "${d.accountType}")`);
    }
  }

  // Sender KYC — the required set depends on customerType.
  const s = req.sender;
  if (req.customerType === 'retail') {
    if (!s) {
      issues.push('sender is required when customerType is "retail"');
    } else {
      for (const f of ['name', 'country', 'address', 'dob', 'idNumber', 'idType'] as const) {
        if (missing(s[f])) issues.push(`sender.${f} is required when customerType is "retail"`);
      }
      // Nigerian retail senders need a second ID.
      if (s.country === 'NG') {
        if (missing(s.additionalIdType)) issues.push('sender.additionalIdType is required for retail senders in NG');
        if (missing(s.additionalIdNumber)) issues.push('sender.additionalIdNumber is required for retail senders in NG');
      }
    }
  } else if (req.customerType === 'institution') {
    if (!s) {
      issues.push('sender is required when customerType is "institution"');
    } else {
      if (missing(s.businessId)) issues.push('sender.businessId is required when customerType is "institution"');
      if (missing(s.businessName)) issues.push('sender.businessName is required when customerType is "institution"');
    }
  }

  return issues;
}

export class SendService {
  constructor(private readonly client: HttpClient) {}

  // https://docs.yellowcard.engineering/reference/submit-payment
  async create(req: SubmitSendRequest): Promise<Send> {
    const issues = validateSubmitSendRequest(req);
    if (issues.length > 0) throw new ValidationError(issues);
    return this.client.post<Send>('/business/send', req);
  }

  // https://docs.yellowcard.engineering/reference/accept-payment-request
  async accept(id: string): Promise<Send> {
    return this.client.post<Send>(`/business/send/${id}/accept`, undefined);
  }

  // https://docs.yellowcard.engineering/reference/deny-payment-request
  async deny(id: string): Promise<Send> {
    return this.client.post<Send>(`/business/send/${id}/deny`, undefined);
  }

  // https://docs.yellowcard.engineering/reference/deny-payment-request-1
  async failPendingLiquidity(id: string): Promise<Send> {
    return this.client.post<Send>(`/business/payments/${id}/fail-pending-liquidity`, undefined);
  }

  // https://docs.yellowcard.engineering/reference/lookup-payment
  async get(id: string): Promise<Send> {
    return this.client.get<Send>(`/business/send/${id}`);
  }

  // https://docs.yellowcard.engineering/reference/lookup-payment-by-sequenceid
  async getBySequenceId(id: string): Promise<Send> {
    return this.client.get<Send>(`/business/payments/sequence-id/${id}`);
  }

  // https://docs.yellowcard.engineering/reference/list-payments
  async getAll(data: SearchData = {}): Promise<Send[]> {
    const query = new URLSearchParams(
      Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)] as [string, string])
    ).toString();
    const path = query ? `/business/sends?${query}` : '/business/sends';
    return this.client.get<SendCollection>(path).then(resp => resp.payments);
  }
}
