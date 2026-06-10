# yellowcard-sdk

TypeScript client for the [YellowCard API](https://docs.yellowcard.engineering/) — a crypto exchange and payment platform serving African markets.

## Requirements

- Node.js 18+

## Installation

```bash
npm install @ambulando/yellowcard-sdk
```

## Usage

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
// List all rates, optionally filtered by currency
const rates = await client.rates.list({ from: 'USD' });
const rates = await client.rates.list({ from: 'USD', to: 'GHS' });

// Get a specific currency pair
const rate = await client.rates.get('USD', 'GHS');
```

### Networks & Channels

```ts
// List all supported networks
const networks = await client.networks.list();

// List payment channels, optionally filtered by country code
const channels = await client.networks.channels();
const channels = await client.networks.channels('GH');
```

### Payments

```ts
// Create a payment
const payment = await client.payments.create({
  sequenceId: 'order-12345',   // caller-assigned idempotency key
  amount: 100,
  currency: 'USD',
  channelId: 'your-channel-id',
  destination: {
    accountName: 'Jane Doe',
    accountNumber: '0241234567',
    country: 'GH',
  },
  reason: 'salary',
});

// Retrieve a payment
const payment = await client.payments.get('payment-id');
const payment = await client.payments.getBySequenceId('order-12345');

// Cancel a pending payment
await client.payments.cancel('payment-id');
```

### Accounts

```ts
// List all business accounts and balances
const accounts = await client.accounts.list();
```

## Error handling

All API errors throw an `APIError` with `statusCode`, `code`, and `message` fields. Use the `isNotFound` and `isUnauthorized` helpers for common cases:

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

## Configuration

The third argument to `YellowCard` accepts a `ClientOptions` object:

| Option | Type | Description |
|--------|------|-------------|
| `sandbox` | `boolean` | Use the sandbox environment (`https://sandbox.yellowcard.io`) |
| `baseURL` | `string` | Override the base URL entirely |
| `fetch` | `typeof fetch` | Supply a custom fetch implementation (useful for testing or proxying) |

## Development

```bash
npm test          # run tests
npm run build     # compile to dist/
npm run typecheck # type-check without emitting
```

## Publishing to npm

1. Make sure you are logged in to npm:

   ```bash
   npm login
   ```

2. Build and verify the package contents:

   ```bash
   npm run build
   npm pack --dry-run
   ```

3. Bump the version in `package.json` following [semver](https://semver.org/):

   ```bash
   npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
   npm version minor   # 0.1.0 → 0.2.0 (new features)
   npm version major   # 0.1.0 → 1.0.0 (breaking changes)
   ```

4. Publish:

   ```bash
   npm publish --access public
   ```

   The `--access public` flag is required for scoped packages (`@ambulando/...`) on first publish.

> To publish a pre-release (e.g. a beta), use `npm version 1.0.0-beta.1` and then `npm publish --tag beta`.
