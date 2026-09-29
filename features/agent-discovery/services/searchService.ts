import algoliasearch from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID || '',
  process.env.ALGOLIA_API_KEY || ''
);

const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || '');

// Mock catalog for local fallback
export const FALLBACK_CATALOG = [
  {
    id: 1,
    name: 'DataBot Pro',
    description: 'Advanced data analysis and insights for complex datasets.',
    author: 'DataTeam',
    category: 'DeFi',
    price: 150,
    rating: 4.8,
    users: 1250,
    icon: '📊',
    network: 'Testnet',
    verified: true,
  },
  {
    id: 2,
    name: 'AutoWriter',
    description: 'AI-powered content generation for blogs and social media.',
    author: 'ContentStudio',
    category: 'Gaming',
    price: 50,
    rating: 4.6,
    users: 890,
    icon: '✍️',
    network: 'Mainnet',
    verified: false,
  },
  {
    id: 3,
    name: 'CodeAssistant',
    description: 'Intelligent code generation and debugging in multiple languages.',
    author: 'DevTools',
    category: 'NFT',
    price: 300,
    rating: 4.9,
    users: 2100,
    icon: '💻',
    network: 'Mainnet',
    verified: true,
  },
  {
    id: 4,
    name: 'Sentinel AI',
    description: 'Enhanced security and threat detection for your infrastructure.',
    author: 'CyberShield',
    category: 'DeFi',
    price: 500,
    rating: 4.7,
    users: 540,
    icon: '🛡️',
    network: 'Mainnet',
    verified: true,
  },
  {
    id: 5,
    name: 'Flux Designer',
    description: 'Generative art and UI design components from simple prompts.',
    author: 'CreativeFlow',
    category: 'NFT',
    price: 200,
    rating: 4.5,
    users: 1670,
    icon: '🎨',
    network: 'Testnet',
    verified: false,
  },
  {
    id: 6,
    name: 'QuantX',
    description: 'Financial analysis and market trend prediction engine.',
    author: 'FinTechAI',
    category: 'DeFi',
    price: 1000,
    rating: 4.9,
    users: 3200,
    icon: '📈',
    network: 'Mainnet',
    verified: true,
  },
];

const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { data: any[]; expiresAt: number, isFallback: boolean }>();
const inFlightSearches = new Map<string, Promise<{ data: any[], isFallback: boolean }>>();

const buildCacheKey = (query: string, filters: any) =>
  JSON.stringify({
    query: query.trim().toLowerCase(),
    filters: Object.entries(filters || {}).sort(([a], [b]) => a.localeCompare(b)),
  });

export function doLocalSearch(query: string, filters: any) {
  const q = query.toLowerCase();
  
  // Create a regex for fuzzy matching: e.g. "abc" -> /a.*b.*c/i
  const regex = new RegExp(q.split('').join('.*'), 'i');

  return FALLBACK_CATALOG.filter(agent => {
    // text match
    let matchesQuery = true;
    if (q) {
       matchesQuery = regex.test(agent.name) || agent.name.toLowerCase().includes(q) || agent.description.toLowerCase().includes(q);
    }
    
    // filters match
    let matchesFilters = true;
    if (filters.category && filters.category !== 'All') {
      matchesFilters = matchesFilters && agent.category === filters.category;
    }
    if (filters.network && filters.network !== 'All') {
      matchesFilters = matchesFilters && agent.network === filters.network;
    }
    if (filters.verified !== undefined && filters.verified !== '') {
      const isVerif = String(filters.verified) === 'true';
      matchesFilters = matchesFilters && agent.verified === isVerif;
    }
    if (filters.minRating && Number(filters.minRating) > 0) {
      matchesFilters = matchesFilters && agent.rating >= Number(filters.minRating);
    }
    if (filters.minPrice && Number(filters.minPrice) > 0) {
      matchesFilters = matchesFilters && agent.price >= Number(filters.minPrice);
    }
    if (filters.maxPrice && Number(filters.maxPrice) > 0) {
      matchesFilters = matchesFilters && agent.price <= Number(filters.maxPrice);
    }
    
    return matchesQuery && matchesFilters;
  });
}

export const searchAgents = async (query: string, filters: any = {}) => {
  const cacheKey = buildCacheKey(query, filters);
  const now = Date.now();
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const existingRequest = inFlightSearches.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      if (!process.env.ALGOLIA_APP_ID) {
        throw new Error('Algolia credentials missing');
      }
      const response = await index.search(query, {
        filters: Object.entries(filters)
          .filter(([_, v]) => v !== '' && v !== undefined && v !== 'All')
          .map(([key, value]) => `${key}:${value}`)
          .join(' AND '),
      });
      const hits = response.hits as any[];
      const res = { data: hits, isFallback: false };
      searchCache.set(cacheKey, { ...res, expiresAt: now + SEARCH_CACHE_TTL_MS });
      return res;
    } catch (error) {
      console.warn('Algolia search failed, falling back to local index:', error);
      const hits = doLocalSearch(query, filters);
      const res = { data: hits, isFallback: true };
      searchCache.set(cacheKey, { ...res, expiresAt: now + SEARCH_CACHE_TTL_MS });
      return res;
    } finally {
      inFlightSearches.delete(cacheKey);
    }
  })();

  inFlightSearches.set(cacheKey, request);
  return request;
};

export const clearSearchCache = () => {
  searchCache.clear();
};