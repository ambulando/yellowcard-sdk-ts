import { YellowCard } from '../../src';
import { hasCredentials, YC_API_KEY, YC_SECRET_KEY } from './env.js';

// Live tests hit the real sandbox. They are skipped automatically when
// .env.test (YC_API_KEY / YC_SECRET_KEY) is absent.
const describeLive = hasCredentials ? describe : describe.skip;

describeLive('RatesService (live sandbox)', () => {
  const yc = new YellowCard(YC_API_KEY, YC_SECRET_KEY, { sandbox: true });

  it('lists rates for USD', async () => {
    const rates = await yc.rates.list('USD');

    expect(Array.isArray(rates)).toBe(true);
    if (rates.length > 0) {
      const [r] = rates;
      expect(typeof r.code).toBe('string');
      expect(['number', 'undefined']).toContain(typeof r.buy);
      expect(['number', 'undefined']).toContain(typeof r.sell);
    }
  }, 30_000);
});
