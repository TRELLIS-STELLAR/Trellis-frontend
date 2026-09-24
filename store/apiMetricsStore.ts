import { create } from 'zustand';

interface ApiMetricsState {
  totalRequests: number;
  cacheHits: number;
  networkRequests: number;
  batchedRequests: number;
  lastRequestAt: string | null;
}

interface ApiMetricsActions {
  recordRequest: (payload: {
    cacheHit: boolean;
    networkRequest: boolean;
    batched: boolean;
  }) => void;
}

export type ApiMetricsStore = ApiMetricsState & ApiMetricsActions;

export const useApiMetricsStore = create<ApiMetricsStore>((set) => ({
  totalRequests: 0,
  cacheHits: 0,
  networkRequests: 0,
  batchedRequests: 0,
  lastRequestAt: null,
  recordRequest: ({ cacheHit, networkRequest, batched }) =>
    set((state) => ({
      totalRequests: state.totalRequests + 1,
      cacheHits: state.cacheHits + (cacheHit ? 1 : 0),
      networkRequests: state.networkRequests + (networkRequest ? 1 : 0),
      batchedRequests: state.batchedRequests + (batched ? 1 : 0),
      lastRequestAt: new Date().toISOString(),
    })),
}));
