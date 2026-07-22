import type {HttpClient} from "../client";

export interface Vault {
  id?: string;
  vaultLabel?: string;
  vaultAccountId?: string;
  partnerId?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Only returned by `get(id)` — the list endpoint omits balances. */
  assets?: VaultAsset[];
}

export interface VaultAsset {
  /** Currency/network pair, e.g. `USDC_SOL`. */
  id?: string;
  available?: string;
  pending?: string;
  depositAddress?: string;
}

export interface AssetConfig {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  resources?: AssetResource[];
  zones?: string[];
  networks?: AssetNetworks;
  defaultNetwork?: string;
  isUTXOBased?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Keyed by network code, e.g. `ERC20`, `SOL`, `XLM`. */
export interface AssetNetworks {
  [network: string]: AssetNetwork
}

export interface AssetNetwork {
  network?: string;
  name?: string;
  nativeAsset?: string;
  chainCurrencyId?: string;
  addressRegex?: string;
  requiresMemo?: boolean;
  activities?: string[];
  explorerUrl?: string;
  enabled?: boolean;
}

export interface AssetResource {
  id?: string;
  type?: string;
  content?: string;
}

export interface Address {
  address?: string;
  token?: string;
  vaultId?: string;
}

export interface AddressRequest {
  /** Currency/network pair for the asset, e.g. `USDC_SOL`. */
  token: string;
  vaultId: string;
}

export class VaultService {
  constructor(private readonly client: HttpClient) {}

  // https://docs.yellowcard.engineering/reference/post_vaults
  async create(name: string): Promise<Vault> {
    return this.client.post<Vault>('/business/vaults', {name})
  }

  // https://docs.yellowcard.engineering/reference/get_vaults
  async getAll(): Promise<Vault[]> {
    return this.client.get<{vaults: Vault[]}>('/business/vaults')
      .then((result) => result.vaults)
  }

  // https://docs.yellowcard.engineering/reference/get_vaults-id
  async get(id: string): Promise<Vault> {
    return this.client.get<Vault>(`/business/vaults/${id}`);
  }

  // https://docs.yellowcard.engineering/reference/get_vaults-config
  async getAssetConfig(): Promise<AssetConfig[]> {
    return this.client.get<AssetConfig[]>('/business/vaults/config');
  }

  /** @deprecated renamed to {@link getAssetConfig} to match the API reference. */
  async getConfig(): Promise<AssetConfig[]> {
    return this.getAssetConfig();
  }

  // https://docs.yellowcard.engineering/reference/post_addresses
  async createAddress(req: AddressRequest): Promise<Address> {
    return this.client.post<Address>('/business/addresses', req);
  }

}
