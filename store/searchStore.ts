import { create } from 'zustand';
import { searchAgents } from '@/features/agent-discovery/services/searchService';

type SearchFilters = Record<string, string | number | boolean>;

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: any[];
  loading: boolean;
  error: string | null;
}

interface SearchActions {
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  fetchSearchResults: (params: {
    query: string;
    filters: SearchFilters;
  }) => Promise<void>;
}

export type SearchStore = SearchState & SearchActions;

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  filters: {},
  results: [],
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set({ filters }),
  fetchSearchResults: async ({ query, filters }) => {
    set({ loading: true, error: null });
    try {
      const results = await searchAgents(query, filters);
      set({ results, loading: false });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unknown error occurred',
      });
    }
  },
}));
