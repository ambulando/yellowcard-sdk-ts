import {DEFAULT_BASE_URL, HttpClient, SANDBOX_BASE_URL} from './client.js';
import {AccountsService} from './services/accounts.js';
import {NetworksService} from './services/networks.js';
import {PaymentsService} from './services/receive';
import {RatesService} from './services/rates.js';

export { APIError, isNotFound, isUnauthorized } from './errors.js';
export { DEFAULT_BASE_URL, SANDBOX_BASE_URL };
export type { ClientOptions } from './client.js';
export type { Rate } from './services/rates.js';
export type { Network, Channel } from './services/networks.js';
export type { Account } from './services/accounts.js';
export type { Webhook, WebhookRequest } from './services/webhook';
export type { Vault, Vaults } from './services/vaults';
export type { ReceivePaymentResponse, ReceivePaymentRequest, Payment, BankInfo, Recipient, Source, SearchData, PaymentCollection } from './services/receive';

export class YellowCard {
  readonly accounts: AccountsService;
  readonly networks: NetworksService;
  readonly payments: PaymentsService;
  readonly rates: RatesService;

  constructor(
    apiKey: string,
    secretKey: string,
    options: import('./client.js').ClientOptions = {},
  ) {
    const http = new HttpClient(apiKey, secretKey, options);
    this.accounts = new AccountsService(http);
    this.networks = new NetworksService(http);
    this.payments = new PaymentsService(http);
    this.rates = new RatesService(http);
  }
}
