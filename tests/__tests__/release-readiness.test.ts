/**
 * Release Readiness Gate & Rollback Rehearsal Tests
 *
 * Verifies that the release readiness gate blocks production releases when:
 *  - Migrations fail dry-runs, lack rollback procedures, or fail schema validation
 *  - Security checks detect disallowed protocols, vulnerabilities, or compliance failures
 *  - Smoke tests detect domain invariant corruption or missing runtime configurations
 *  - Rollback rehearsals are missing or fail recovery verification
 */

import {
  evaluateReleaseReadiness,
  executeStandardRollbackRehearsals,
  rehearseMigrationRollback,
  rehearseFeatureFlagFallback,
  rehearseCheckpointRecovery,
  rehearsePostRollbackInvariants,
  DEFAULT_ROLLBACK_SCENARIO_IDS,
} from '@/lib/release-readiness';

describe('Release Readiness Gate — Migrations Pillar', () => {
  it('blocks release when a migration fails dry-run simulation', async () => {
    const report = await evaluateReleaseReadiness({
      dryRunMigrations: [
        {
          id: 'mig-failing',
          version: '2.0.0',
          description: 'Failing dry run migration',
          rollbackNote: 'Restore snapshot from cold backup',
          previewSafe: false,
          validationErrors: ['Foreign key constraint failure'],
        },
      ],
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.summary.requiredBlockersCount).toBeGreaterThanOrEqual(1);
    expect(report.blockers.some((b) => b.includes('Migration Dry-Run'))).toBe(true);
    expect(report.categories.migrations.passed).toBe(false);
  });

  it('blocks release when a migration is missing rollback notes', async () => {
    const report = await evaluateReleaseReadiness({
      dryRunMigrations: [
        {
          id: 'mig-no-rollback',
          version: '1.2.0',
          description: 'Migration without rollback instructions',
          rollbackNote: '',
          previewSafe: true,
          validationErrors: [],
        },
      ],
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Migration Rollback Procedures'))).toBe(true);
  });

  it('blocks release when migration schema validation reports errors', async () => {
    const report = await evaluateReleaseReadiness({
      dryRunMigrations: [
        {
          id: 'mig-schema-err',
          version: '1.3.0',
          description: 'Migration with post-check violation',
          rollbackNote: 'Revert changes and restore backup',
          previewSafe: true,
          validationErrors: ['Field "affiliateRate" cannot be negative'],
        },
      ],
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Post-Migration Schema'))).toBe(true);
  });
});

describe('Release Readiness Gate — Security Pillar', () => {
  it('blocks release when disallowed external protocols are detected', async () => {
    const report = await evaluateReleaseReadiness({
      securityChecks: {
        insecureProtocolsFound: ['javascript:alert(1)', 'data:text/html;base64,...'],
      },
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Protocol Allowlist'))).toBe(true);
  });

  it('blocks release when critical or high vulnerabilities are present', async () => {
    const report = await evaluateReleaseReadiness({
      securityChecks: {
        criticalVulnerabilitiesCount: 1,
        highVulnerabilitiesCount: 2,
      },
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Zero Critical & High Vulnerabilities'))).toBe(true);
  });

  it('blocks release when Soroban compliance rules are breached', async () => {
    const report = await evaluateReleaseReadiness({
      securityChecks: {
        complianceScore: 60,
        nonTokenCompliantRules: ['SC-002: State mutating functions missing authorization'],
      },
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Soroban & Stellar Smart Contract Compliance'))).toBe(true);
  });
});

describe('Release Readiness Gate — Smoke Tests Pillar', () => {
  it('blocks release when domain invariants smoke check fails', async () => {
    const report = await evaluateReleaseReadiness({
      smokeChecks: {
        domainInvariantsValid: false,
        invariantViolationsCount: 3,
      },
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Domain Invariants Certification'))).toBe(true);
  });

  it('blocks release when environment preflight fails', async () => {
    const report = await evaluateReleaseReadiness({
      smokeChecks: {
        environmentValid: false,
      },
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'ok',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Runtime Environment & Network Smoke Check'))).toBe(true);
  });
});

describe('Release Readiness Gate — Rollback Rehearsals Pillar', () => {
  it('blocks release when rollback verification is completely missing (zero rehearsals)', async () => {
    const report = await evaluateReleaseReadiness({
      rollbackRehearsals: {
        rehearsalsExecuted: [],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.some((b) => b.includes('Rollback Rehearsals Execution'))).toBe(true);
  });

  it('blocks release when a required rollback scenario fails', async () => {
    const report = await evaluateReleaseReadiness({
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
          {
            id: 'r2',
            scenarioId: 'rehearsal-feature-flag-fail-closed',
            rehearsedAt: new Date().toISOString(),
            success: false,
            rehearsalMode: 'flag_reversion',
            outputSummary: 'Feature flags failed fail-closed check',
            error: 'Unsafe default value detected',
          },
          {
            id: 'r3',
            scenarioId: 'rehearsal-checkpoint-recovery-idempotency',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'checkpoint_restore',
            outputSummary: 'ok',
          },
          {
            id: 'r4',
            scenarioId: 'rehearsal-post-rollback-invariant-audit',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'invariant_audit',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Rollback Rehearsals Execution'))).toBe(true);
  });

  it('blocks release when required rehearsal scenarios are omitted', async () => {
    const report = await evaluateReleaseReadiness({
      rollbackRehearsals: {
        rehearsalsExecuted: [
          {
            id: 'r1',
            scenarioId: 'rehearsal-migration-rollback-dry-run',
            rehearsedAt: new Date().toISOString(),
            success: true,
            rehearsalMode: 'dry_run',
            outputSummary: 'ok',
          },
        ],
      },
    });

    expect(report.isReady).toBe(false);
    expect(report.blockers.some((b) => b.includes('Missing required rollback rehearsals'))).toBe(true);
  });
});

describe('Rollback Rehearsal Engine Execution', () => {
  it('executes the standard rollback rehearsal suite cleanly', async () => {
    const results = await executeStandardRollbackRehearsals();

    expect(results).toHaveLength(DEFAULT_ROLLBACK_SCENARIO_IDS.length);
    expect(results.every((r) => r.success)).toBe(true);

    const scenarioIds = results.map((r) => r.scenarioId);
    expect(scenarioIds).toContain('rehearsal-migration-rollback-dry-run');
    expect(scenarioIds).toContain('rehearsal-feature-flag-fail-closed');
    expect(scenarioIds).toContain('rehearsal-checkpoint-recovery-idempotency');
    expect(scenarioIds).toContain('rehearsal-post-rollback-invariant-audit');
  });

  it('rehearseFeatureFlagFallback validates that all flags have boolean defaults', async () => {
    const res = await rehearseFeatureFlagFallback();
    expect(res.success).toBe(true);
    expect(res.rehearsalMode).toBe('flag_reversion');
  });

  it('rehearseCheckpointRecovery enforces idempotency and fences duplicate side effects', async () => {
    const res = await rehearseCheckpointRecovery();
    expect(res.success).toBe(true);
    expect(res.outputSummary).toContain('side-effect fencing and idempotency preserved');
  });

  it('rehearseMigrationRollback captures execution exceptions gracefully', async () => {
    const res = await rehearseMigrationRollback('bad-migration', async () => {
      throw new Error('Simulated rollback failure in schema drop');
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Simulated rollback failure in schema drop');
  });
});

describe('Release Readiness Gate — Full Verification & Strict Mode', () => {
  it('passes full gate evaluation and reports READY when all 4 pillars are satisfied', async () => {
    const report = await evaluateReleaseReadiness({
      dryRunMigrations: [
        {
          id: 'mig-1',
          version: '1.0.0',
          description: 'Safe migration',
          rollbackNote: 'Revert database snapshot from cold backup',
          previewSafe: true,
          validationErrors: [],
        },
      ],
      securityChecks: {
        complianceScore: 95,
        criticalVulnerabilitiesCount: 0,
        highVulnerabilitiesCount: 0,
        insecureProtocolsFound: [],
        secretTokensExposed: [],
      },
      smokeChecks: {
        domainInvariantsValid: true,
        invariantViolationsCount: 0,
        environmentValid: true,
        criticalRoutesAvailable: true,
      },
    });

    expect(report.isReady).toBe(true);
    expect(report.status).toBe('READY');
    expect(report.summary.requiredBlockersCount).toBe(0);
    expect(report.summary.failed).toBe(0);
    expect(report.telemetryPayload?.code).toBe('RELEASE_GATE_CERTIFIED');
    expect(report.telemetryPayload?.blockersCount).toBe(0);
  });

  it('strict mode blocks release on advisory warnings', async () => {
    const report = await evaluateReleaseReadiness({
      strict: true,
      smokeChecks: {
        domainInvariantsValid: true,
        criticalRoutesAvailable: false, // will produce warning
      },
    });

    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
    expect(report.isReady).toBe(false);
    expect(report.status).toBe('BLOCKED');
  });

  it('non-strict mode allows release with warnings (status: WARNING, isReady: true)', async () => {
    const report = await evaluateReleaseReadiness({
      strict: false,
      smokeChecks: {
        domainInvariantsValid: true,
        criticalRoutesAvailable: false, // produces warning
      },
    });

    expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
    expect(report.isReady).toBe(true);
    expect(report.status).toBe('WARNING');
  });
});
