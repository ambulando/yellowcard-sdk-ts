import {DEFAULT_BASE_URL, HttpClient, SANDBOX_BASE_URL} from './client.js';
import {AccountsService} from './services/accounts.js';
import {NetworksService} from './services/networks.js';
import {PaymentsService} from './services/receive';
import {RatesService} from './services/rates.js';
import {VaultService} from "./services/vaults";

export { APIError, isNotFound, isUnauthorized } from './errors.js';
export { DEFAULT_BASE_URL, SANDBOX_BASE_URL };
export type { ClientOptions } from './client.js';
export type { Rate } from './services/rates.js';
export type { Network, Channel } from './services/networks.js';
export type { Account } from './services/accounts.js';
export type { Webhook, WebhookRequest } from './services/webhook';
export type { Vault, VaultAsset, AssetConfig, AssetNetworks, AssetNetwork, AssetResource, Address, AddressRequest } from './services/vaults';
export type { ReceivePaymentResponse, ReceivePaymentRequest, Payment, BankInfo, Recipient, Source, SearchData, PaymentCollection } from './services/receive';

export class YellowCard {
  readonly accounts: AccountsService;
  readonly networks: NetworksService;
  readonly payments: PaymentsService;
  readonly rates: RatesService;
  readonly vaults: VaultService;
  readonly httpClient: HttpClient;

  constructor(
    apiKey: string,
    secretKey: string,
    options: import('./client.js').ClientOptions = {},
  ) {
    this.httpClient = new HttpClient(apiKey, secretKey, options);
    this.accounts = new AccountsService(this.httpClient);
    this.networks = new NetworksService(this.httpClient);
    this.payments = new PaymentsService(this.httpClient);
    this.rates = new RatesService(this.httpClient);
    this.vaults = new VaultService(this.httpClient);
  }
}
