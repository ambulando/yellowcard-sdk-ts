import { YellowCard } from '../../src/index.js';
import { hasCredentials, YC_API_KEY, YC_SECRET_KEY } from './env.js';

// Live tests hit the real sandbox. They are skipped automatically when
// .env.test (YC_API_KEY / YC_SECRET_KEY) is absent.
const describeLive = hasCredentials ? describe : describe.skip;

describeLive('NetworksService (live sandbox)', () => {
  const yc = new YellowCard(YC_API_KEY, YC_SECRET_KEY, { sandbox: true });

  it('lists networks', async () => {
    const networks = await yc.networks.list();

    expect(Array.isArray(networks)).toBe(true);
    if (networks.length > 0) {
      const [n] = networks;
      expect(typeof n.id).toBe('string');
      expect(typeof n.code).toBe('string');
      expect(typeof n.country).toBe('string');
    }
  }, 30_000);

  it('lists channels', async () => {
    const channels = await yc.networks.channels();

    expect(Array.isArray(channels)).toBe(true);
    if (channels.length > 0) {
      expect(typeof channels[0]).toBe('object');
    }
  }, 30_000);
});
