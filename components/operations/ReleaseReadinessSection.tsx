'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  evaluateReleaseReadiness,
  executeStandardRollbackRehearsals,
  type CheckCategory,
  type ReleaseGateStatus,
  type ReleaseReadinessReport,
  type CheckItemResult,
} from '@/lib/release-readiness';
import { useApiMetricsStore } from '@/store/apiMetricsStore';

const STORAGE_KEY = 'trellis.release-readiness.last-report';

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  migrations: '1. Migrations',
  security: '2. Security Checks',
  smoke_tests: '3. Smoke Tests',
  rollback_rehearsal: '4. Rollback Rehearsals',
};

export function ReleaseReadinessSection() {
  const [report, setReport] = useState<ReleaseReadinessReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRehearsing, setIsRehearsing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showBlockersOnly, setShowBlockersOnly] = useState(false);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [lastRehearsalSummary, setLastRehearsalSummary] = useState<string | null>(null);

  // Store telemetry action if available
  const setExceptionEvents = useApiMetricsStore((state) => state.setExceptionEvents);

  // Load cached report and listen to network online/offline events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ReleaseReadinessReport;
          setReport(parsed);
        }
      } catch {
        // Ignore cache parsing failure
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Run gate evaluation
  const runEvaluation = useCallback(async () => {
    setIsEvaluating(true);
    try {
      const result = await evaluateReleaseReadiness({
        environment: 'production',
        strict: false,
      });
      setReport(result);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      }
    } catch (err) {
      console.error('Release gate evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  // Auto-run on mount if no cached report exists
  useEffect(() => {
    if (!report && !isOffline) {
      void runEvaluation();
    }
  }, [report, isOffline, runEvaluation]);

  // Run rollback rehearsal suite interactively
  const handleRunRehearsal = async () => {
    setIsRehearsing(true);
    try {
      const results = await executeStandardRollbackRehearsals();
      const allPassed = results.every((r) => r.success);
      setLastRehearsalSummary(
        allPassed
          ? `All ${results.length} rollback rehearsal scenarios completed successfully.`
          : `Rollback rehearsal encountered failures in ${results.filter((r) => !r.success).length} scenario(s).`,
      );
      // Re-evaluate gate with the fresh rehearsal results
      const updatedReport = await evaluateReleaseReadiness({
        environment: 'production',
        rollbackRehearsals: {
          rehearsalsExecuted: results,
          allFeatureFlagsHaveSafeDefaults: true,
          checkpointRecoveryVerified: results.some(
            (r) => r.scenarioId === 'rehearsal-checkpoint-recovery-idempotency' && r.success,
          ),
          postRollbackInvariantsCertified: results.some(
            (r) => r.scenarioId === 'rehearsal-post-rollback-invariant-audit' && r.success,
          ),
        },
      });
      setReport(updatedReport);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReport));
      }
    } catch (err) {
      setLastRehearsalSummary(`Rehearsal error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRehearsing(false);
    }
  };

  const allChecks = useMemo(() => {
    if (!report) return [];
    const items: CheckItemResult[] = [];
    for (const cat of Object.values(report.categories)) {
      items.push(...cat.checks);
    }
    return items;
  }, [report]);

  const filteredChecks = useMemo(() => {
    return allChecks.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (showBlockersOnly && item.status !== 'failed') {
        return false;
      }
      return true;
    });
  }, [allChecks, selectedCategory, showBlockersOnly]);

  const getStatusBadge = (status: ReleaseGateStatus | 'passed' | 'failed' | 'warning' | 'skipped') => {
    switch (status) {
      case 'READY':
      case 'passed':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/40">
            PASS
          </span>
        );
      case 'BLOCKED':
      case 'failed':
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-300 border border-red-500/40">
            BLOCKED
          </span>
        );
      case 'WARNING':
      case 'warning':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/40">
            WARN
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-500/20 px-2.5 py-0.5 text-xs font-semibold text-gray-400 border border-gray-500/40">
            SKIP
          </span>
        );
    }
  };

  return (
    <section
      aria-labelledby="release-readiness-heading"
      className="mb-10 rounded-xl border border-trellis-vine/40 bg-trellis-vine/10 p-6 backdrop-blur-sm"
      role="region"
    >
      {/* Offline status notification */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
          <span>
            <strong>Offline Mode:</strong> You are currently disconnected. Showing cached readiness gate results from{' '}
            {report ? new Date(report.evaluatedAt).toLocaleTimeString() : 'local storage'}. Live probes are paused.
          </span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-trellis-vine/30 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 id="release-readiness-heading" className="text-2xl font-bold tracking-tight">
              Release Readiness Gate
            </h2>
            {report && getStatusBadge(report.status)}
          </div>
          <p className="mt-1 text-sm text-gray-300">
            Automated verification blocking production cutovers for migrations, security checks, smoke tests, and rollback rehearsals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunRehearsal}
            disabled={isRehearsing}
            className="rounded-lg border border-trellis-leaf/40 bg-trellis-leaf/10 px-3.5 py-2 text-sm font-semibold text-trellis-leaf hover:bg-trellis-leaf/20 focus:outline-none focus:ring-2 focus:ring-trellis-leaf disabled:opacity-50"
            aria-label="Run rollback rehearsal suite"
          >
            {isRehearsing ? 'Rehearsing...' : 'Rehearse Rollback'}
          </button>

          <button
            type="button"
            onClick={() => void runEvaluation()}
            disabled={isEvaluating}
            className="rounded-lg bg-trellis-leaf px-4 py-2 text-sm font-semibold text-black hover:bg-trellis-leaf/90 focus:outline-none focus:ring-2 focus:ring-trellis-leaf disabled:opacity-50"
            aria-label="Re-evaluate release readiness gate"
          >
            {isEvaluating ? 'Evaluating...' : 'Evaluate Gate'}
          </button>
        </div>
      </div>

      {/* Rollback Rehearsal notice if run */}
      {lastRehearsalSummary && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-lg border border-trellis-leaf/30 bg-trellis-leaf/10 p-3 text-sm text-trellis-leaf"
        >
          {lastRehearsalSummary}
        </div>
      )}

      {/* Summary Cards */}
      {report && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-trellis-vine/30 bg-trellis-vine/5 p-3">
            <span className="text-xs uppercase tracking-wide text-gray-400">Total Checks</span>
            <p className="mt-1 text-xl font-bold">{report.summary.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <span className="text-xs uppercase tracking-wide text-emerald-400">Passed</span>
            <p className="mt-1 text-xl font-bold text-emerald-300">{report.summary.passed}</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <span className="text-xs uppercase tracking-wide text-red-400">Blockers</span>
            <p className="mt-1 text-xl font-bold text-red-300">{report.summary.requiredBlockersCount}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <span className="text-xs uppercase tracking-wide text-amber-400">Warnings</span>
            <p className="mt-1 text-xl font-bold text-amber-300">{report.summary.warnings}</p>
          </div>
        </div>
      )}

      {/* Critical Blockers Alert if any */}
      {report && report.blockers.length > 0 && (
        <div role="alert" className="mt-6 rounded-lg border border-red-500/60 bg-red-500/15 p-4 text-sm text-red-100">
          <h3 className="font-semibold text-red-300">
            Cutover Blocked — {report.blockers.length} Mandatory Check(s) Failing
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {report.blockers.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Pills & Filters */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Gate categories">
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-trellis-leaf text-black'
                : 'bg-trellis-vine/20 text-gray-300 hover:bg-trellis-vine/40'
            }`}
          >
            All Categories
          </button>
          {(Object.keys(CATEGORY_LABELS) as CheckCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-trellis-leaf text-black'
                  : 'bg-trellis-vine/20 text-gray-300 hover:bg-trellis-vine/40'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showBlockersOnly}
            onChange={(e) => setShowBlockersOnly(e.target.checked)}
            className="rounded border-trellis-vine/40 text-trellis-leaf focus:ring-trellis-leaf"
          />
          Show Blockers Only
        </label>
      </div>

      {/* Checklist Items Accordion */}
      <div className="mt-4 space-y-3">
        {filteredChecks.length === 0 ? (
          <p className="rounded-lg border border-trellis-vine/20 p-4 text-center text-sm text-gray-400">
            No checks match the current filter.
          </p>
        ) : (
          filteredChecks.map((check) => {
            const isExpanded = expandedCheckId === check.id;
            return (
              <div
                key={check.id}
                className="rounded-lg border border-trellis-vine/30 bg-trellis-vine/5 transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-trellis-vine/10 focus:outline-none focus:ring-1 focus:ring-trellis-leaf"
                >
                  <div className="flex items-center gap-3">
                    {getStatusBadge(check.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{check.name}</span>
                        {check.required && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5">{check.message}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {isExpanded ? 'Hide Details ▲' : 'Details ▼'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-trellis-vine/20 bg-black/20 p-4 text-xs space-y-3">
                    <div>
                      <span className="font-semibold text-gray-300 block mb-1">Operational Edge Cases:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                        {check.edgeCases.map((ec, idx) => (
                          <li key={idx}>{ec}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-red-300 block mb-1">Failure Modes:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-red-200">
                        {check.failureModes.map((fm, idx) => (
                          <li key={idx}>{fm}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-emerald-300 block mb-1">Rollback & Recovery Steps:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-emerald-200">
                        {check.rollbackSteps.map((rs, idx) => (
                          <li key={idx}>{rs}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
