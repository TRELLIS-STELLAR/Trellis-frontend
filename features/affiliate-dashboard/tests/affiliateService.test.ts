import { affiliateService } from '../services/affiliateService';
import { apiClient } from '@/lib/api';

// 'G' + 55 base32 chars = valid Stellar address format.
const WALLET = `G${'A'.repeat(55)}`;

function mockFetchOnce(data: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
  }) as unknown as typeof fetch;
}

describe('affiliateService.getEarningsHistory (mocked fetch layer)', () => {
  beforeEach(() => {
    apiClient.clearCache();
    jest.clearAllMocks();
  });

  it('returns earnings history on success', async () => {
    const history = [
      { date: '2026-09-20', amount: 150, source: 'direct' },
      { date: '2026-09-21', amount: 50, source: 'direct' },
    ];
    mockFetchOnce(history);

    const result = await affiliateService.getEarningsHistory(WALLET);

    expect(result).toEqual(history);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/affiliates/earnings?wallet=${WALLET}&days=30`),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns an empty array when the backend has no earnings', async () => {
    mockFetchOnce([]);

    const result = await affiliateService.getEarningsHistory(WALLET);

    expect(result).toEqual([]);
  });

  it('throws when the backend is unreachable', async () => {
    mockFetchOnce({ error: 'Internal server error' }, false);

    await expect(affiliateService.getEarningsHistory(WALLET)).rejects.toThrow(
      'API error',
    );
  });
});
