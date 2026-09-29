'use client';

import { useState } from 'react';
import { RecommendationCarousel } from '@/features/recommendations/components/RecommendationCarousel';
import { useSearch } from '@/features/agent-discovery/hooks/useSearch';

/**
 * The event type is declared locally so this component also type-checks in
 * environments where `@types/react` is not resolvable; `React.ChangeEvent` is
 * structurally identical.
 */
type InputChange = { target: { value: string } };

export default function Marketplace() {
  const { query, setQuery, filters, setFilters, results, loading, error, isFallback } = useSearch();
  const [showFilters, setShowFilters] = useState(false);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2 || Object.values(filters).some(v => v !== '' && v !== 'All' && v !== undefined);

  let statusMessage: string;
  if (loading) {
    statusMessage = 'Searching...';
  } else if (error) {
    statusMessage = `Search error: ${error}`;
  } else {
    const count = `${results.length} ${results.length === 1 ? 'match' : 'matches'}`;
    statusMessage = `${count} for “${trimmedQuery || 'all'}”${isFallback ? ' (local fallback index)' : ''}`;
  }

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({ category: 'All', network: 'All', verified: '', minRating: '', minPrice: '', maxPrice: '' });
  };

  return (
    <main className="pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 glow-text">Agent Marketplace</h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl">
            Discover and deploy high-performance AI agents from our curated repository.
          </p>
        </header>

        {/* Personalized Recommendations */}
        <section className="mb-20">
          <RecommendationCarousel />
        </section>

        <section className="pt-20 border-t border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white glow-text">All Agents</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(event: InputChange) => setQuery(event.target.value)}
                  placeholder="Describe what you need…"
                  aria-label="Search agents by description"
                  className="w-full sm:w-80 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-trellis-leaf/60 transition-smooth"
                />
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm transition-smooth ${showFilters ? 'bg-white/10' : 'hover:bg-white/10'}`}
                >
                  Filters {Object.values(filters).filter(v => v !== '' && v !== 'All' && v !== undefined).length > 0 && '(Active)'}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Filter Agents</h3>
                  <button onClick={clearFilters} className="text-sm text-trellis-leaf hover:underline">Clear all</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category</label>
                    <select 
                      value={String(filters.category || 'All')}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    >
                      <option value="All">All Categories</option>
                      <option value="DeFi">DeFi</option>
                      <option value="NFT">NFT</option>
                      <option value="Gaming">Gaming</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Stellar Network</label>
                    <select 
                      value={String(filters.network || 'All')}
                      onChange={(e) => handleFilterChange('network', e.target.value)}
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    >
                      <option value="All">Any Network</option>
                      <option value="Mainnet">Mainnet</option>
                      <option value="Testnet">Testnet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Verification Status</label>
                    <select 
                      value={String(filters.verified || '')}
                      onChange={(e) => handleFilterChange('verified', e.target.value)}
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    >
                      <option value="">Any Status</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Unverified Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Minimum Rating</label>
                    <input 
                      type="number" min="0" max="5" step="0.1"
                      value={String(filters.minRating || '')}
                      onChange={(e) => handleFilterChange('minRating', e.target.value)}
                      placeholder="e.g. 4.5"
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Price Range (Min)</label>
                    <input 
                      type="number" min="0"
                      value={String(filters.minPrice || '')}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      placeholder="Min price"
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Price Range (Max)</label>
                    <input 
                      type="number" min="0"
                      value={String(filters.maxPrice || '')}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      placeholder="Max price"
                      className="w-full px-3 py-2 bg-trellis-ground border border-white/10 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-8" aria-live="polite">
              {statusMessage}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {results.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-6 md:p-8 rounded-2xl border border-trellis-vine/20 hover:border-trellis-leaf/50 hover:shadow-xl hover:shadow-trellis-leaf/10 transition-all duration-300 nebula-bg cursor-pointer group flex flex-col h-full active:scale-[0.98] touch-manipulation"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-4xl bg-white/5 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-smooth">
                        {agent.icon || '🤖'}
                      </div>
                      {agent.verified && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">Verified</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-1 glow-text group-hover:text-trellis-amber transition-smooth flex items-center gap-2">
                        {agent.name}
                    </h3>
                    <p className="text-xs text-trellis-leaf mb-3">{agent.category} • {agent.network}</p>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed flex-grow">{agent.description}</p>
                    
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">by <span className="text-trellis-vine font-medium">{agent.author}</span></span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-yellow-500">⭐ <span className="text-gray-300 font-semibold">{agent.rating || 'N/A'}</span></span>
                            <span className="flex items-center gap-1 text-trellis-amber">💰 <span className="text-gray-300 font-semibold">{agent.price ? `${agent.price} XLM` : 'Free'}</span></span>
                          </div>
                        </div>
                        <button className="w-full min-h-[44px] py-3 bg-trellis-vine/20 hover:bg-trellis-vine/40 border border-trellis-vine/30 rounded-xl transition-smooth font-bold text-sm tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trellis-leaf active:scale-[0.99] touch-manipulation">
                            View Agent
                        </button>
                    </div>
                  </div>
              ))}
            </div>

            {!loading && results.length === 0 && (
              <p className="text-gray-400 text-sm mt-8">
                No agents match that description yet. Try different wording or clear filters.
              </p>
            )}
        </section>
      </div>
    </main>
  );
}
