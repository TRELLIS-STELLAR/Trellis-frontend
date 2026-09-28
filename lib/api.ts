/* Utility functions for API calls */
import { useApiMetricsStore } from "@/store/apiMetricsStore";
import {
  IdempotencyStore,
  IdempotentRunResult,
  createIdempotencyKey,
  executeIdempotent,
  fingerprintRequest,
} from "@/lib/idempotency";
import {
  CacheOptions,
  clearCachedValues,
  getOrFetchCachedValue,
  subscribeToCachedValue,
} from "@/lib/cache-manager";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const REQUEST_CACHE_TTL_MS = 60_000;

const makeCacheKey = (endpoint: string, options: RequestInit) =>
  JSON.stringify({
    endpoint,
    method: (options.method || "GET").toUpperCase(),
    body: typeof options.body === "string" ? options.body : null,
  });

export function subscribeToApiResponse<T>(endpoint: string, listener: (value: T) => void): () => void {
  const cacheKey = `api:${makeCacheKey(endpoint, { method: 'GET' })}`;
  return subscribeToCachedValue(cacheKey, listener);
}

const reportRequest = (payload: { cacheHit: boolean; networkRequest: boolean; batched: boolean }) => {
  useApiMetricsStore.getState().recordRequest(payload);
};

export async function apiCall(
  endpoint: string,
  options: RequestInit = {},
  cacheOptions: CacheOptions = {}
) {
  const method = (options.method || "GET").toUpperCase();

  const url = `${API_URL}${endpoint}`;
  const fetchData = async () => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    reportRequest({ cacheHit: false, networkRequest: true, batched: false });
    return data;
  };

  if (method !== "GET") {
    return fetchData();
  }

  const cacheKey = `api:${makeCacheKey(endpoint, options)}`;
  return getOrFetchCachedValue(cacheKey, fetchData, {
    staleTime: cacheOptions.staleTime ?? REQUEST_CACHE_TTL_MS,
    cacheTime: cacheOptions.cacheTime ?? REQUEST_CACHE_TTL_MS * 5,
    onCacheHit: () => reportRequest({ cacheHit: true, networkRequest: false, batched: false }),
  });
}

export interface IdempotentPostOptions {
  /**
   * Explicit key. Omit it and one is derived from the endpoint and payload, so
   * a repeated attempt at the same request reuses the same key with no caller
   * bookkeeping. Pass a key when "the same body" is a new intent — see
   * `beginIdempotentAttempt` for that case.
   */
  key?: string;
  /** How long a stored outcome may be replayed (default 24h). */
  ttlMs?: number;
  store?: IdempotencyStore;
  /** Groups derived keys; defaults to the endpoint. */
  scope?: string;
}

export const apiClient = {
  get: (endpoint: string, cacheOptions?: CacheOptions) => apiCall(endpoint, { method: 'GET' }, cacheOptions),
  subscribe: subscribeToApiResponse,
  post: (endpoint: string, data: any) =>
    apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint: string, data: any) =>
    apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint: string) => apiCall(endpoint, { method: 'DELETE' }),

  /**
   * POST an operation that must not be applied twice (payments, claims,
   * payouts). Sends the key as `Idempotency-Key` so the server can recognise
   * the retry, and returns whether the result was replayed from a stored
   * outcome instead of a second request reaching the network.
   */
  postIdempotent: async <T = unknown>(
    endpoint: string,
    data: unknown,
    options: IdempotentPostOptions = {},
  ): Promise<IdempotentRunResult<T>> => {
    const body = JSON.stringify(data);
    const fingerprint = fingerprintRequest({ endpoint, method: 'POST', body });
    const key =
      options.key ?? (await createIdempotencyKey(options.scope ?? endpoint, { endpoint, data }));

    return executeIdempotent<T>(
      { key, fingerprint, ttlMs: options.ttlMs, store: options.store },
      () =>
        apiCall(endpoint, {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key },
        }) as Promise<T>,
    );
  },

  batchGet: async (endpoints: string[]) => {
    const uniqueEndpoints = Array.from(new Set(endpoints));
    const requests = uniqueEndpoints.map((endpoint) => apiClient.get(endpoint));
    const responses = await Promise.all(requests);
    uniqueEndpoints.forEach(() =>
      reportRequest({ cacheHit: false, networkRequest: false, batched: true })
    );
    return responses;
  },
  clearCache: () => clearCachedValues('api:'),
};
