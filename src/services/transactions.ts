import type {HttpClient} from "../client";
import {ValidationError} from "../errors";
import {Payment} from "./receive";

export interface SendRequest {
  destination: Destination
  countryCode: string
  token: string
  vaultId: string
  amount: number
  sequenceId: string
  travelRuleData: Record<string, string>
}

export interface SendResponse {
  id: string
  sequenceId: string
  partnerId: string
  amount: number
  networkFee: number
  token: string
  countryCode: string
  type: string
  status: string
  destinationAddress: string
  destinationType: string
  destinationVaultId: string
  sourceAddress: string
  sourceVaultId: string
  createdAt: number
  updatedAt: number
}


export interface Destination {
  type: "USD_BALANCE"|"INTERNAL"|"EXTERNAL"
  address: string
  vaultId: string
}

export interface TransactionsRequest {
  vaultId: string
  sourceVaultId: string
  destinationVaultId: string
  startDate: Date
  endDate: Date
  token: string
  status: 'created'|'processing'|'failed'|'complete'
  sourceAddress: string
  pageSize: number
  cursor: string
}

export interface Transactions {
  transactions: Transaction[];
}

export interface Transaction {
  id: string
  sequenceId: string
  partnerId: string
  transactionHash: string
  externalId: string
  amount: string
  networkFee: string
  token: string
  currency: string
  network: string
  type: string
  status: string
  destinationType: string
  sourceAddress: string
  destinationAddress: string
  destinationTag: string
  sourceVaultId: string
  destinationVaultId: string
  apiKey: string
  countryCode: string
  travelRuleData: Record<string, string>
  error: string
  createdAt: string
  updatedAt: string
}

export interface TravelRuleField {
  displayName: string
  fieldType: string
  required: boolean
  payloadName: string
}

export interface TravelRuleConfig {
  id: string
  countryCode: string
  minAmount: number
  status: string
  timeoutAction: string
  counterPartyRepair: string
  repairWaitTime: number
  repairCount: number
  dataFields: TravelRuleField[]
}

export interface TravelRuleValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates travelRuleData against a TravelRuleConfig's dataFields.
 * Checks that every required field is present and non-empty, and that
 * values match the field's declared fieldType (basic checks for date/number).
 */
export function validateTravelRuleData(
  config: TravelRuleConfig,
  data: Record<string, string> = {},
): TravelRuleValidationResult {
  const errors: string[] = [];

  for (const field of config.dataFields) {
    const label = `"${field.displayName}" (${field.payloadName})`;
    const value = data[field.payloadName];

    if (value === undefined || value === null || String(value).trim() === '') {
      if (field.required) errors.push(`Required field ${label} is missing`);
      continue;
    }

    if (field.fieldType.toLowerCase() === 'date' && Number.isNaN(Date.parse(value))) {
      errors.push(`Field ${label} is not a valid date: "${value}"`);
    } else if (field.fieldType.toLowerCase() === 'number' && Number.isNaN(Number(value))) {
      errors.push(`Field ${label} is not a valid number: "${value}"`);
    }
  }

  return {valid: errors.length === 0, errors};
}

export interface FeeRequest {
  token: string
}

export interface Fee {
  gasFee: number
  gasToken?: string
}

export class TransactionService {
  constructor(private readonly client: HttpClient) {
  }

  // https://docs.yellowcard.engineering/reference/post_sends-fee
  async fees(req: FeeRequest): Promise<Fee> {
    return this.client.post<Fee>('custody/sends/fee', req);
  }

  async SendTransaction(req: SendRequest): Promise<SendResponse> {
    const validation = await this.validateTravelRuleData(req.countryCode, req.travelRuleData)
    if (!validation.valid) {
      throw new ValidationError(validation.errors)
    }
    return this.client.post<SendResponse>('custody/sends', req);
  }

  async getTransactions(req: TransactionsRequest): Promise<Transactions> {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(req)) {
      if (value === undefined || value === null) continue;
      q.set(key, value instanceof Date ? value.toISOString() : String(value));
    }
    const query = q.toString();
    const path = query ? `custody/sends?${query}` : 'custody/sends';
    return this.client.get<Transactions>(path);
  }

  // https://docs.yellowcard.engineering/reference/get_sends-id
  async getTransaction(id: string): Promise<Transaction> {
    return this.client.get<Transaction>(`custody/sends/${id}`);
  }

  // https://docs.yellowcard.engineering/reference/travel-rule-config
  async travelRuleConfig(countryCode: string): Promise<TravelRuleConfig> {
    const query = new URLSearchParams({countryCode}).toString();
    return this.client.get<TravelRuleConfig>(`custody/travel-rule/config?${query}`);
  }

  // Fetches the country's travel rule config and validates the given data against it.
  async validateTravelRuleData(
    countryCode: string,
    data: Record<string, string>,
  ): Promise<TravelRuleValidationResult> {
    const config = await this.travelRuleConfig(countryCode);
    return validateTravelRuleData(config, data);
  }
}