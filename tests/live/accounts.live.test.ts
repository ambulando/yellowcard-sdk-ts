import { YellowCard } from '../../src';
import { hasCredentials, YC_API_KEY, YC_SECRET_KEY } from './env.js';

// Live tests hit the real sandbox. They are skipped automatically when
// .env.test (YC_API_KEY / YC_SECRET_KEY) is absent.
const describeLive = hasCredentials ? describe : describe.skip;

describeLive('AccountsService (live sandbox)', () => {
  const yc = new YellowCard(YC_API_KEY, YC_SECRET_KEY, { sandbox: true });

  it('lists accounts', async () => {
    const accounts = await yc.accounts.list();

    expect(Array.isArray(accounts)).toBe(true);
    if (accounts.length > 0) {
      const [a] = accounts;
      expect(typeof a.currency).toBe('string');
      expect(typeof a.currencyType).toBe('string');
      expect(typeof a.available).toBe('number');
    }
  }, 30_000);
});
