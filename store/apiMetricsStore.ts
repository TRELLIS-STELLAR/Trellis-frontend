import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ALERT_RULES,
  type AlertRule,
  type ExceptionEvent,
} from '@/lib/operational-health';
import {
  subscribeIdempotencyTelemetry,
  type IdempotencyTelemetryCounters,
  type IdempotencyTelemetryEvent,
} from '@/lib/idempotency';
import { recordMetricPoint } from '@/lib/metric-definitions';
import { createPersistStorage } from './persistence';

/** Bound the in-memory exception buffer so a long session cannot grow unbounded. */
const MAX_EXCEPTION_EVENTS = 500;
/** Bound the idempotency event buffer the same way. */
const MAX_IDEMPOTENCY_EVENTS = 500;

interface ApiMetricsState {
  totalRequests: number;
  cacheHits: number;
  networkRequests: number;
  batchedRequests: number;
  lastRequestAt: string | null;
  exceptionEvents: ExceptionEvent[];
  alertRules: AlertRule[];
  /** Running idempotency counters (see `lib/idempotency.ts`). */
  idempotency: IdempotencyTelemetryCounters;
  /** Recent idempotency events, oldest first, for the hit-rate chart. */
  idempotencyEvents: IdempotencyTelemetryEvent[];
  hasHydrated: boolean;
}

interface ApiMetricsActions {
  recordRequest: (payload: {
    cacheHit: boolean;
    networkRequest: boolean;
    batched: boolean;
  }) => void;
  /** Appends one or more sanitized exceptions, keeping the newest 500. */
  recordException: (event: ExceptionEvent | ExceptionEvent[]) => void;
  /** Replaces the buffer, e.g. after hydrating from `/api/operational-health`. */
  setExceptionEvents: (events: ExceptionEvent[]) => void;
  clearExceptions: () => void;
  /** Upserts a maintainer alert rule by id. */
  addAlertRule: (rule: AlertRule) => void;
  removeAlertRule: (ruleId: string) => void;
  setAlertRules: (rules: AlertRule[]) => void;
  /** Counts one idempotency outcome and keeps the newest 500 events. */
  recordIdempotencyEvent: (event: IdempotencyTelemetryEvent) => void;
  clearIdempotencyTelemetry: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export type ApiMetricsStore = ApiMetricsState & ApiMetricsActions;

const emptyIdempotencyCounters = (): IdempotencyTelemetryCounters => ({
  idempotency_requests: 0,
  idempotency_hits: 0,
  idempotency_collisions: 0,
  idempotency_retries: 0,
  idempotency_expired: 0,
});

const COUNTER_FOR_KIND: Partial<Record<IdempotencyTelemetryEvent['kind'], keyof IdempotencyTelemetryCounters>> = {
  hit: 'idempotency_hits',
  collision: 'idempotency_collisions',
  retry: 'idempotency_retries',
  expired: 'idempotency_expired',
};

const initialApiMetricsState: ApiMetricsState = {
  totalRequests: 0,
  cacheHits: 0,
  networkRequests: 0,
  batchedRequests: 0,
  lastRequestAt: null,
  exceptionEvents: [],
  alertRules: [...DEFAULT_ALERT_RULES],
  idempotency: emptyIdempotencyCounters(),
  idempotencyEvents: [],
  hasHydrated: false,
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const useApiMetricsStore = create<ApiMetricsStore>()(
  persist(
    (set) => ({
      ...initialApiMetricsState,
      recordRequest: ({ cacheHit, networkRequest, batched }) =>
        set((state) => ({
          totalRequests: state.totalRequests + 1,
          cacheHits: state.cacheHits + (cacheHit ? 1 : 0),
          networkRequests: state.networkRequests + (networkRequest ? 1 : 0),
          batchedRequests: state.batchedRequests + (batched ? 1 : 0),
          lastRequestAt: new Date().toISOString(),
        })),
      recordException: (event) =>
        set((state) => {
          const incoming = Array.isArray(event) ? event : [event];
          const merged = [...state.exceptionEvents, ...incoming]
            .sort((a, b) => a.ts - b.ts)
            .slice(-MAX_EXCEPTION_EVENTS);
          return { exceptionEvents: merged };
        }),
      setExceptionEvents: (events) =>
        set({ exceptionEvents: [...events].sort((a, b) => a.ts - b.ts).slice(-MAX_EXCEPTION_EVENTS) }),
      clearExceptions: () => set({ exceptionEvents: [] }),
      addAlertRule: (rule) =>
        set((state) => ({
          alertRules: state.alertRules.some((existing) => existing.id === rule.id)
            ? state.alertRules.map((existing) => (existing.id === rule.id ? rule : existing))
            : [...state.alertRules, rule],
        })),
      removeAlertRule: (ruleId) =>
        set((state) => ({ alertRules: state.alertRules.filter((rule) => rule.id !== ruleId) })),
      setAlertRules: (rules) => set({ alertRules: [...rules] }),
      recordIdempotencyEvent: (event) =>
        set((state) => {
          const counter = COUNTER_FOR_KIND[event.kind];
          const idempotency = {
            ...state.idempotency,
            idempotency_requests: state.idempotency.idempotency_requests + 1,
          };
          if (counter) idempotency[counter] += 1;
          return {
            idempotency,
            idempotencyEvents: [...state.idempotencyEvents, event].slice(-MAX_IDEMPOTENCY_EVENTS),
          };
        }),
      clearIdempotencyTelemetry: () =>
        set({ idempotency: emptyIdempotencyCounters(), idempotencyEvents: [] }),
      setHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: 'trellis-api-metrics-store',
      version: 2,
      storage: createPersistStorage(),
      partialize: (state) => ({
        totalRequests: state.totalRequests,
        cacheHits: state.cacheHits,
        networkRequests: state.networkRequests,
        batchedRequests: state.batchedRequests,
        lastRequestAt: state.lastRequestAt,
        idempotency: state.idempotency,
        idempotencyEvents: state.idempotencyEvents,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return initialApiMetricsState;
        }

        // v1 had no idempotency fields; every field is validated, so the same
        // path upgrades v1 and repairs a corrupt v2 payload.
        const state = persistedState as Partial<ApiMetricsState>;
        const counters = state.idempotency ?? ({} as Partial<IdempotencyTelemetryCounters>);
        const idempotency = emptyIdempotencyCounters();
        for (const key of Object.keys(idempotency) as Array<keyof IdempotencyTelemetryCounters>) {
          if (isCount(counters[key])) idempotency[key] = counters[key] as number;
        }

        return {
          ...initialApiMetricsState,
          totalRequests: isCount(state.totalRequests) ? state.totalRequests : 0,
          cacheHits: isCount(state.cacheHits) ? state.cacheHits : 0,
          networkRequests: isCount(state.networkRequests) ? state.networkRequests : 0,
          batchedRequests: isCount(state.batchedRequests) ? state.batchedRequests : 0,
          lastRequestAt: typeof state.lastRequestAt === 'string' ? state.lastRequestAt : null,
          idempotency,
          idempotencyEvents: Array.isArray(state.idempotencyEvents)
            ? state.idempotencyEvents
                .filter((event) => event && typeof event.ts === 'number' && typeof event.kind === 'string')
                .slice(-MAX_IDEMPOTENCY_EVENTS)
            : [],
        };
      },
      onRehydrateStorage: () => () => {
        useApiMetricsStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/**
 * Bridges idempotency telemetry into the metrics store (dashboard) and the
 * OTLP exporter. Only the operation scope and outcome leave the module — never
 * the key or payload.
 */
subscribeIdempotencyTelemetry((event) => {
  useApiMetricsStore.getState().recordIdempotencyEvent(event);
  recordMetricPoint({
    name: 'idempotency.requests',
    kind: 'counter',
    value: 1,
    timestamp: event.ts,
    attributes: { scope: event.scope, outcome: event.kind },
  });
  const metricName =
    event.kind === 'hit'
      ? 'idempotency.hits'
      : event.kind === 'collision'
      ? 'idempotency.collisions'
      : event.kind === 'retry'
      ? 'idempotency.retries'
      : event.kind === 'expired'
      ? 'idempotency.expired'
      : null;
  if (metricName) {
    recordMetricPoint({
      name: metricName,
      kind: 'counter',
      value: 1,
      timestamp: event.ts,
      attributes: { scope: event.scope, reason: event.reason },
    });
  }
});
