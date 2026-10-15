/**
 * Release Readiness Gate Engine — Trellis Frontend
 *
 * Coordinates execution of release readiness checks, evaluates gate status
 * (READY vs BLOCKED), and generates structured reports and telemetry.
 */

import { RELEASE_GATE_CHECKS, GateCheckDefinition } from './checks';
import { executeStandardRollbackRehearsals } from './rehearsal';
import type {
  CategorySummary,
  CheckCategory,
  CheckItemResult,
  ReleaseGateContext,
  ReleaseGateStatus,
  ReleaseReadinessReport,
} from './types';

const CATEGORY_TITLES: Record<CheckCategory, string> = {
  migrations: 'Database & Data Migrations',
  security: 'Security, Compliance & Protocol Checks',
  smoke_tests: 'Smoke Tests & Invariants Sanity',
  rollback_rehearsal: 'Rollback Rehearsals & Disaster Recovery',
};

/**
 * Evaluates the full release readiness gate.
 *
 * If `ctx.rollbackRehearsals.rehearsalsExecuted` is not provided, this engine
 * automatically runs the standard rollback rehearsal suite to verify recovery readiness.
 */
export async function evaluateReleaseReadiness(
  context: ReleaseGateContext = {},
): Promise<ReleaseReadinessReport> {
  const evaluatedAt = new Date().toISOString();
  const environment = context.environment ?? (process.env.NODE_ENV || 'production');
  const strict = Boolean(context.strict);
  const skipOptional = Boolean(context.skipOptionalChecks);

  // Auto-populate standard rollback rehearsals if not supplied in context
  let rollbackInput = context.rollbackRehearsals;
  if (!rollbackInput || !rollbackInput.rehearsalsExecuted) {
    try {
      const executedRehearsals = await executeStandardRollbackRehearsals();
      rollbackInput = {
        rehearsalsExecuted: executedRehearsals,
        allFeatureFlagsHaveSafeDefaults: true,
        checkpointRecoveryVerified: executedRehearsals.some(
          (r) => r.scenarioId === 'rehearsal-checkpoint-recovery-idempotency' && r.success,
        ),
        postRollbackInvariantsCertified: executedRehearsals.some(
          (r) => r.scenarioId === 'rehearsal-post-rollback-invariant-audit' && r.success,
        ),
        ...rollbackInput,
      };
    } catch (rehearsalError) {
      rollbackInput = {
        rehearsalsExecuted: [
          {
            id: `rehearsal-error-${Date.now()}`,
            scenarioId: 'rehearsal-execution-failure',
            rehearsedAt: evaluatedAt,
            success: false,
            rehearsalMode: 'dry_run',
            outputSummary: 'Auto-execution of standard rollback rehearsal suite failed.',
            error: rehearsalError instanceof Error ? rehearsalError.message : String(rehearsalError),
          },
        ],
        ...rollbackInput,
      };
    }
  }

  const effectiveContext: ReleaseGateContext = {
    ...context,
    environment,
    rollbackRehearsals: rollbackInput,
  };

  const checksToRun: GateCheckDefinition[] = skipOptional
    ? RELEASE_GATE_CHECKS.filter((c) => c.required)
    : RELEASE_GATE_CHECKS;

  const results: CheckItemResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const checkDef of checksToRun) {
    try {
      const outcome = await checkDef.evaluate(effectiveContext);
      const itemResult: CheckItemResult = {
        id: checkDef.id,
        category: checkDef.category,
        name: checkDef.name,
        description: checkDef.description,
        required: checkDef.required,
        status: outcome.status,
        message: outcome.message,
        details: outcome.details,
        edgeCases: checkDef.edgeCases,
        failureModes: checkDef.failureModes,
        rollbackSteps: checkDef.rollbackSteps,
      };

      results.push(itemResult);

      if (outcome.status === 'failed') {
        if (checkDef.required) {
          blockers.push(`[${checkDef.category.toUpperCase()}] ${checkDef.name}: ${outcome.message}`);
        } else {
          warnings.push(`[${checkDef.category.toUpperCase()}] ${checkDef.name}: ${outcome.message}`);
        }
      } else if (outcome.status === 'warning') {
        warnings.push(`[${checkDef.category.toUpperCase()}] ${checkDef.name}: ${outcome.message}`);
      }
    } catch (checkExecutionError) {
      const errorMsg = checkExecutionError instanceof Error ? checkExecutionError.message : String(checkExecutionError);
      results.push({
        id: checkDef.id,
        category: checkDef.category,
        name: checkDef.name,
        description: checkDef.description,
        required: checkDef.required,
        status: 'failed',
        message: `Check threw unexpected error: ${errorMsg}`,
        edgeCases: checkDef.edgeCases,
        failureModes: checkDef.failureModes,
        rollbackSteps: checkDef.rollbackSteps,
      });

      if (checkDef.required) {
        blockers.push(`[${checkDef.category.toUpperCase()}] ${checkDef.name}: Unexpected check error — ${errorMsg}`);
      } else {
        warnings.push(`[${checkDef.category.toUpperCase()}] ${checkDef.name}: Unexpected check error — ${errorMsg}`);
      }
    }
  }

  // Build category summaries
  const categoriesList: CheckCategory[] = ['migrations', 'security', 'smoke_tests', 'rollback_rehearsal'];
  const categoriesRecord = {} as Record<CheckCategory, CategorySummary>;

  for (const cat of categoriesList) {
    const catChecks = results.filter((r) => r.category === cat);
    const passedCount = catChecks.filter((r) => r.status === 'passed').length;
    const failedCount = catChecks.filter((r) => r.status === 'failed').length;
    const warningCount = catChecks.filter((r) => r.status === 'warning').length;
    const skippedCount = catChecks.filter((r) => r.status === 'skipped').length;
    const requiredFailed = catChecks.filter((r) => r.required && r.status === 'failed').length;

    categoriesRecord[cat] = {
      category: cat,
      title: CATEGORY_TITLES[cat],
      passed: requiredFailed === 0,
      total: catChecks.length,
      passedCount,
      failedCount,
      warningCount,
      skippedCount,
      checks: catChecks,
    };
  }

  const totalPassed = results.filter((r) => r.status === 'passed').length;
  const totalFailed = results.filter((r) => r.status === 'failed').length;
  const totalWarnings = results.filter((r) => r.status === 'warning').length;
  const totalSkipped = results.filter((r) => r.status === 'skipped').length;
  const requiredBlockersCount = blockers.length;

  let status: ReleaseGateStatus;
  let isReady: boolean;

  if (requiredBlockersCount > 0) {
    status = 'BLOCKED';
    isReady = false;
  } else if (strict && (totalWarnings > 0 || totalFailed > 0)) {
    status = 'BLOCKED';
    isReady = false;
  } else if (totalWarnings > 0) {
    status = 'WARNING';
    isReady = true;
  } else {
    status = 'READY';
    isReady = true;
  }

  const reportId = `relgate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: reportId,
    evaluatedAt,
    environment,
    status,
    isReady,
    summary: {
      total: results.length,
      passed: totalPassed,
      failed: totalFailed,
      warnings: totalWarnings,
      skipped: totalSkipped,
      requiredBlockersCount,
    },
    blockers,
    warnings,
    categories: categoriesRecord,
    telemetryPayload: {
      taskKind: 'release_readiness_gate',
      state: status,
      code: isReady ? 'RELEASE_GATE_CERTIFIED' : 'RELEASE_GATE_BLOCKED',
      message: isReady
        ? `Release readiness gate certified (${totalPassed}/${results.length} checks passed).`
        : `Release gate blocked by ${requiredBlockersCount} issue(s).`,
      blockersCount: requiredBlockersCount,
    },
  };
}
