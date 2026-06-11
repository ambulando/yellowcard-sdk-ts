# @ambulando/yellowcard-sdk

TypeScript SDK for the [YellowCard API](https://docs.yellowcard.engineering/) — a crypto exchange and payment platform serving African markets.

## Requirements

- Node.js 18+

## Installation

```bash
npm install @ambulando/yellowcard-sdk
```

## Quick start

```ts
import { YellowCard } from '@ambulando/yellowcard-sdk';

const client = new YellowCard('your-api-key', 'your-secret-key');
```

Use the sandbox environment for development:

```ts
const client = new YellowCard('your-api-key', 'your-secret-key', { sandbox: true });
```

## Services

### Rates

```ts
// List rates, optionally filtered by currency
const rates = await client.rates.list('USD');
```

### Networks & Channels

```ts
// List supported networks (optionally filter by country code)
const networks = await client.networks.list();
const ngNetworks = await client.networks.list('NG');

// List payment channels (optionally filter by country code)
const channels = await client.networks.channels();
const ghChannels = await client.networks.channels('GH');
```

### Payments (receive)

```ts
// Create a receive payment
const payment = await client.payments.create({
  sequenceId: 'order-12345',
  amount: 100,
  currency: 'NGN',
  channelId: 'your-channel-id',
  recipient: {
    name: 'Jane Doe',
    phone: '+233241234567',
    country: 'GH',
  },
  reason: 'salary',
});

// Retrieve a payment
const payment = await client.payments.get('payment-id');
const payment = await client.payments.getBySequenceId('order-12345');

// List payments with optional filters
const result = await client.payments.getAll({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  perPage: 20,
  orderBy: 'desc',
});

// Lifecycle actions
await client.payments.accept('payment-id');
await client.payments.deny('payment-id');
await client.payments.cancel('payment-id');
await client.payments.refund('payment-id');
```

### Accounts

```ts
// List all business accounts and balances
const accounts = await client.accounts.list();
```

### Vaults (custody)

The `Vaults` service manages custody vaults and addresses. Instantiate it directly with an `HttpClient`:

```ts
import { HttpClient } from '@ambulando/yellowcard-sdk/client';
import { Vaults } from '@ambulando/yellowcard-sdk/services/vaults';

const http = new HttpClient('your-api-key', 'your-secret-key');
const vaults = new Vaults(http);

const vault = await vaults.create('my-vault');
const all = await vaults.getAll();
const single = await vaults.get('vault-id');
const configs = await vaults.getConfig('vault-id');
const address = await vaults.createAddress({ token: 'ETH', vaultId: 'vault-id' });
```

### Webhooks

```ts
import { HttpClient } from '@ambulando/yellowcard-sdk/client';
import { PaymentsService as WebhookService } from '@ambulando/yellowcard-sdk/services/webhook';

const http = new HttpClient('your-api-key', 'your-secret-key');
const webhooks = new WebhookService(http);

await webhooks.create({ url: 'https://example.com/hook', active: true });
await webhooks.update({ id: 'wh-1', active: false });
await webhooks.remove('wh-1');
const list = await webhooks.list();
```

## Error handling

All API errors throw an `APIError` with `statusCode`, `code`, and `message` fields:

```ts
import { YellowCard, APIError, isNotFound, isUnauthorized } from '@ambulando/yellowcard-sdk';

try {
  const payment = await client.payments.get('unknown-id');
} catch (err) {
  if (isNotFound(err)) {
    console.error('Payment not found');
  } else if (isUnauthorized(err)) {
    console.error('Check your API credentials');
  } else if (err instanceof APIError) {
    console.error(`API error ${err.statusCode} (${err.code}): ${err.message}`);
  }
}
```

## Authentication

Every request is signed with HMAC-SHA256. The SDK handles this automatically — no configuration required beyond passing your API key and secret to the constructor.

Headers sent on every request:

| Header | Description |
|--------|-------------|
| `Authorization` | `YcHmacV1 {apiKey}:{signature}` |
| `X-YC-Timestamp` | ISO 8601 timestamp of the request |

The signature covers `timestamp + path + method + SHA256(body)`.

## Configuration

`ClientOptions` (third argument to `YellowCard`):

| Option | Type | Description |
|--------|------|-------------|
| `sandbox` | `boolean` | Point to `https://sandbox.yellowcard.io` |
| `baseURL` | `string` | Override the base URL entirely |
| `fetch` | `typeof fetch` | Custom fetch implementation (useful for testing or proxying) |

## Development

```bash
npm test              # run tests (Jest)
npm run test:watch    # watch mode
npm run build         # compile ESM + CJS + .d.ts into dist/
npm run typecheck     # type-check without emitting
```

## Publishing

```bash
npm run build
npm pack --dry-run

npm version patch   # 0.1.0 → 0.1.1
npm publish --access public
```

> `--access public` is required for scoped packages (`@ambulando/...`) on first publish.

For a pre-release: `npm version 1.0.0-beta.1 && npm publish --tag beta`
