import { searchAgents, doLocalSearch, clearSearchCache } from '../services/searchService';

jest.mock('algoliasearch', () => {
  const mockSearch = jest.fn();
  const mockInitIndex = jest.fn(() => ({ search: mockSearch }));
  const mockClient = { initIndex: mockInitIndex };
  return jest.fn(() => mockClient);
});

describe('searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSearchCache();
    process.env.ALGOLIA_APP_ID = 'test-id';
  });

  afterEach(() => {
    delete process.env.ALGOLIA_APP_ID;
  });

  it('should call Algolia search and return hits', async () => {
    const mockHits = [{ id: 1, name: 'Agent 1' }];
    const mockSearch = require('algoliasearch')().initIndex().search;
    mockSearch.mockResolvedValueOnce({ hits: mockHits });

    const results = await searchAgents('test', { category: 'DeFi' });

    expect(mockSearch).toHaveBeenCalledWith('test', {
      filters: 'category:DeFi',
    });
    expect(results.data).toEqual(mockHits);
    expect(results.isFallback).toBe(false);
  });

  it('should fallback to local search if Algolia fails', async () => {
    const mockSearch = require('algoliasearch')().initIndex().search;
    mockSearch.mockRejectedValueOnce(new Error('Algolia API rate limit'));

    const results = await searchAgents('QuantX', { category: 'DeFi' });

    // QuantX is in the fallback catalog and matches DeFi
    expect(results.isFallback).toBe(true);
    expect(results.data.length).toBeGreaterThan(0);
    expect(results.data[0].name).toBe('QuantX');
  });

  it('should fallback to local search if ALGOLIA_APP_ID is missing', async () => {
    delete process.env.ALGOLIA_APP_ID;
    
    const results = await searchAgents('AutoWriter', {});

    // AutoWriter is in the fallback catalog
    expect(results.isFallback).toBe(true);
    expect(results.data.length).toBeGreaterThan(0);
    expect(results.data[0].name).toBe('AutoWriter');
  });

  describe('doLocalSearch', () => {
    it('should fuzzy match by name', () => {
      const hits = doLocalSearch('qtx', {}); // QuantX fuzzy match
      expect(hits.length).toBe(1);
      expect(hits[0].name).toBe('QuantX');
    });

    it('should filter by network and category', () => {
      const hits = doLocalSearch('', { category: 'DeFi', network: 'Mainnet' });
      expect(hits.length).toBeGreaterThan(0);
      hits.forEach(hit => {
        expect(hit.category).toBe('DeFi');
        expect(hit.network).toBe('Mainnet');
      });
    });

    it('should filter by min rating and max price', () => {
      const hits = doLocalSearch('', { minRating: 4.8, maxPrice: 500 });
      expect(hits.length).toBeGreaterThan(0);
      hits.forEach(hit => {
        expect(hit.rating).toBeGreaterThanOrEqual(4.8);
        expect(hit.price).toBeLessThanOrEqual(500);
      });
    });
  });
});