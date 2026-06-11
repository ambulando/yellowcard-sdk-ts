import type {HttpClient} from "../client";

export interface Vault {
  id?: string;
  vaultLabel?: string;
  partnerId?: string;
  assets?: Assets[];
}

export interface Assets {
  id?: string;
  available?: string;
  pending?: string;
}

export interface Config {
  code?: string;
  resources?: Resources[];
  zones?: string[];
  updatedAt?: string;
  networks?: Networks;
  createdAt?: string;
  isUTXOBased?: boolean;
  description?: string;
  id?: string;
  name?: string;
  defaultNetwork?: string;
}

export interface Networks {
  [key: string]: Network
}

export interface Network {
  nativeAsset?: string;
  chainCurrencyId?: string;
  addressRegex?: string;
  requiresMemo?: boolean;
  activities?: string[];
  explorerUrl?: string;
  name?: string;
  enabled?: boolean;
  network?: string;
}

export interface Resources {
  type?: string;
  content?: string;
  id?: string;
}

export interface Address {
  address?: string;
  token?: string;
  vaultId?: string;
}

export interface AddressRequest {
  token: string;
  vaultId: string;
}

export class VaultService {
  constructor(private readonly client: HttpClient) {}

  // https://sandbox.api.yellowcard.io/custody/vaults
  async create(name: string): Promise<Vault> {
    return this.client.post<Vault>('/custody/vaults', {name})
  }

  // https://sandbox.api.yellowcard.io/custody/vaults
  async getAll(): Promise<Vault[]> {
    return this.client.get<{vaults: Vault[]}>('/custody/vaults')
      .then((result) => result.vaults)
  }

  // https://sandbox.api.yellowcard.io/custody/vaults/:id
  async get(id: string): Promise<Vault> {
    return this.client.get<Vault>(`/custody/vaults/${id}`);
  }

  // https://sandbox.api.yellowcard.io/custody/vaults/config
  async getConfig(): Promise<Config[]> {
    return this.client.get<Config[]>(`/custody/vaults/config`);
  }

  // https://sandbox.api.yellowcard.io/custody/addresses
  async createAddress(req: AddressRequest): Promise<Address> {
    return this.client.post<Address>(`/custody/addresses`, req);
  }

}