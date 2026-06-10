import type {HttpClient} from "../client";

export interface WebhookRequest {
  id?: string;
  active?: boolean;
  url?: string;
  state?: string;
}

export interface Webhook {
  partnerId?: string;
  url?: string;
  state?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  id?: string;
}

export class PaymentsService {
  constructor(private readonly client: HttpClient) {
  }

  async create(req: WebhookRequest): Promise<Webhook> {
    return this.client.post<Webhook>('/business/webhooks', req);
  }

  async update(req: WebhookRequest): Promise<Webhook> {
    return this.client.put<Webhook>('/business/webhooks', req);
  }

  async remove(id: string): Promise<void> {
    return this.client.delete(`/business/webhooks/${id}`);
  }

  async list(): Promise<Webhook[]> {
    return this.client.get<{webhooks: Webhook[]}>('/business/webhooks')
      .then(result => result.webhooks);
  }

}
