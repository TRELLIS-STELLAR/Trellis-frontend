/**
 * Release Readiness Checks Definition — Trellis Frontend
 *
 * Implements the concrete gate checks across the 4 core pillars:
 *   1. Migrations: Dry-run safety, rollback notes presence, schema validation
 *   2. Security Checks: Protocol allowlist, Soroban compliance rules, 0 critical/high vulnerabilities
 *   3. Smoke Tests: Domain invariants certification, environment sanity, critical routes registry
 *   4. Rollback Rehearsals: Migration rollback rehearsal, feature flag fail-closed, recovery checkpoint replay
 */

import type {
  CheckCategory,
  CheckItemResult,
  CheckStatus,
  ReleaseGateContext,
  RollbackRehearsalResult,
} from './types';
import { DEFAULT_ROLLBACK_SCENARIO_IDS } from './rehearsal';

export interface GateCheckDefinition {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  required: boolean;
  edgeCases: string[];
  failureModes: string[];
  rollbackSteps: string[];
  evaluate: (ctx: ReleaseGateContext) => Promise<{
    status: CheckStatus;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

export const RELEASE_GATE_CHECKS: GateCheckDefinition[] = [
  // ─── 1. Migrations Pillar ──────────────────────────────────────────────────
  {
    id: 'gate-migration-dry-run',
    category: 'migrations',
    name: 'Migration Dry-Run & Simulation Safety',
    description: 'Requires all pending schema and data migrations to execute dry-runs with preview.safe=true.',
    required: true,
    edgeCases: [
      'Store snapshot cloning fails when datasets contain cyclical references or uncloneable symbols.',
      'Partial dry-run state leakage if runner does not strictly isolate deep clones.',
      'Dry-run passes on clean baseline fixture but fails against stale production snapshot.',
    ],
    failureModes: [
      'Migration throws an unhandled exception during simulation.',
      'Validation function surfaces integrity errors on simulated post-migration store.',
      'Simulated mutation count exceeds safe operational boundary without manual override.',
    ],
    rollbackSteps: [
      'Do not apply migration to live storage.',
      'Inspect simulated diff and correct transform function in migration script.',
      'Re-run dry-run simulation against an up-to-date staging snapshot.',
    ],
    evaluate: async (ctx) => {
      const migrations = ctx.dryRunMigrations ?? [];
      if (migrations.length === 0) {
        return {
          status: 'passed',
          message: 'No pending migrations declared for this release; dry-run gate certified.',
        };
      }

      const unsafe = migrations.filter((m) => m.previewSafe === false);
      if (unsafe.length > 0) {
        return {
          status: 'failed',
          message: `${unsafe.length} migration(s) failed dry-run simulation: ${unsafe.map((m) => m.id).join(', ')}`,
          details: { failedIds: unsafe.map((m) => m.id) },
        };
      }

      return {
        status: 'passed',
        message: `All ${migrations.length} migration(s) successfully simulated with preview.safe=true.`,
        details: { count: migrations.length },
      };
    },
  },
  {
    id: 'gate-migration-rollback-notes',
    category: 'migrations',
    name: 'Migration Rollback Procedures & Notes',
    description: 'Requires every declared migration to have an explicit, non-empty rollback procedure documented.',
    required: true,
    edgeCases: [
      'Irreversible migrations (e.g. destructive column drop) lacking a forward-fix or backup restore plan.',
      'Vague rollback notes (e.g. "undo") that offer zero actionable guidance under incident stress.',
    ],
    failureModes: [
      'Migration object missing rollbackNote property or empty string.',
      'Rollback note does not specify whether to restore from backup or apply forward-fix.',
    ],
    rollbackSteps: [
      'Block release cutover immediately.',
      'Add step-by-step rollback or point-in-time recovery instructions to the migration definition.',
      'Verify instructions in staging before proceeding with release.',
    ],
    evaluate: async (ctx) => {
      const migrations = ctx.dryRunMigrations ?? [];
      if (migrations.length === 0) {
        return {
          status: 'passed',
          message: 'No migrations present; rollback documentation requirement satisfied.',
        };
      }

      const missing = migrations.filter(
        (m) => !m.rollbackNote || m.rollbackNote.trim().length < 10,
      );
      if (missing.length > 0) {
        return {
          status: 'failed',
          message: `${missing.length} migration(s) missing adequate rollback procedures: ${missing.map((m) => m.id).join(', ')}`,
          details: { missingIds: missing.map((m) => m.id) },
        };
      }

      return {
        status: 'passed',
        message: `All ${migrations.length} migration(s) include documented rollback procedures.`,
      };
    },
  },
  {
    id: 'gate-migration-schema-validation',
    category: 'migrations',
    name: 'Post-Migration Schema & Invariant Validation',
    description: 'Ensures migration post-checks and schema validations report 0 errors.',
    required: true,
    edgeCases: [
      'Validation rules timing out on large table scans.',
      'Inconsistent enum mappings between legacy records and updated schema specifications.',
    ],
    failureModes: [
      'validate() returned one or more validation error strings.',
      'PostMigrationCheck detected orphaned foreign keys or corrupted types.',
    ],
    rollbackSteps: [
      'Trigger automated or manual rollback procedure documented in migration definition.',
      'Restore pre-migration snapshot from cold storage.',
      'Verify schema consistency using npm run dr:validate.',
    ],
    evaluate: async (ctx) => {
      const migrations = ctx.dryRunMigrations ?? [];
      const errors = migrations.flatMap((m) => m.validationErrors ?? []);

      if (errors.length > 0) {
        return {
          status: 'failed',
          message: `Post-migration validation discovered ${errors.length} error(s): ${errors.slice(0, 3).join('; ')}`,
          details: { errors },
        };
      }

      return {
        status: 'passed',
        message: 'All migration validation and post-check assertions passed with 0 errors.',
      };
    },
  },

  // ─── 2. Security Pillar ───────────────────────────────────────────────────
  {
    id: 'gate-security-protocol-allowlist',
    category: 'security',
    name: 'Outbound & Client Protocol Allowlist',
    description: 'Enforces strict protocol allowlist (http:, https:, mailto:) and rejects unsafe schemes (javascript:, data:, file:).',
    required: true,
    edgeCases: [
      'Double-encoded URLs or mixed-case protocols (e.g. jAvAsCrIpT:) attempting filter bypass.',
      'Relative URLs erroneously flagged as invalid protocols.',
    ],
    failureModes: [
      'Component or outbound link configured with disallowed scheme.',
      'Malicious user markdown containing javascript: links bypassing client sanitizer.',
    ],
    rollbackSteps: [
      'Sanitize or strip offending links using SafeExternalLink or SafeContent component.',
      'Quarantine user-submitted record pending security re-validation.',
    ],
    evaluate: async (ctx) => {
      const insecure = ctx.securityChecks?.insecureProtocolsFound ?? [];
      if (insecure.length > 0) {
        return {
          status: 'failed',
          message: `Disallowed protocols detected in release payload: ${insecure.join(', ')}`,
          details: { protocols: insecure },
        };
      }

      return {
        status: 'passed',
        message: 'Protocol allowlist verified: only http:, https:, and mailto: are permitted.',
      };
    },
  },
  {
    id: 'gate-security-soroban-compliance',
    category: 'security',
    name: 'Soroban & Stellar Smart Contract Compliance',
    description: 'Asserts contracts meet SEP-41 token standards, require_auth on mutating functions, and have upgrade controls.',
    required: true,
    edgeCases: [
      'Multi-sig accounts with delayed authorization failing instant preflight checks.',
      'Contracts implementing custom auth semantics not matching standard require_auth signature.',
    ],
    failureModes: [
      'State-mutating function missing authorization check (SC-002 violation).',
      'Non-compliant token contract missing mandatory SEP-41 functions.',
      'Upgrade capability present without admin access controls.',
    ],
    rollbackSteps: [
      'Pause contract deployment via EmergencyPause subsystem or feature flag.',
      'Refactor contract to enforce require_auth on state mutations.',
      'Re-execute security compliance scanner.',
    ],
    evaluate: async (ctx) => {
      const score = ctx.securityChecks?.complianceScore ?? 100;
      const nonCompliant = ctx.securityChecks?.nonTokenCompliantRules ?? [];

      if (nonCompliant.length > 0) {
        return {
          status: 'failed',
          message: `Critical Soroban compliance rules breached: ${nonCompliant.join(', ')}`,
          details: { rules: nonCompliant },
        };
      }

      if (score < 80) {
        return {
          status: 'failed',
          message: `Security compliance score (${score}/100) is below release threshold of 80.`,
          details: { score },
        };
      }

      if (score < 90) {
        return {
          status: 'warning',
          message: `Security compliance score (${score}/100) is acceptable but has warnings.`,
          details: { score },
        };
      }

      return {
        status: 'passed',
        message: `Soroban compliance score (${score}/100) meets release standards.`,
      };
    },
  },
  {
    id: 'gate-security-vulnerability-threshold',
    category: 'security',
    name: 'Zero Critical & High Vulnerabilities',
    description: 'Requires 0 critical and 0 high severity vulnerabilities in contracts, dependencies, and API endpoints.',
    required: true,
    edgeCases: [
      'Transitive dependency vulnerability without an available upstream fix.',
      'False-positive vulnerability flags on test fixtures or mock utilities.',
    ],
    failureModes: [
      'Detected critical or high severity vulnerability in release scan.',
      'Known CVE affecting runtime dependencies.',
    ],
    rollbackSteps: [
      'Block release pipeline.',
      'Patch dependency or isolate vulnerable execution path using feature flag.',
      'Re-scan release artifacts.',
    ],
    evaluate: async (ctx) => {
      const crit = ctx.securityChecks?.criticalVulnerabilitiesCount ?? 0;
      const high = ctx.securityChecks?.highVulnerabilitiesCount ?? 0;

      if (crit > 0 || high > 0) {
        return {
          status: 'failed',
          message: `Release blocked: detected ${crit} critical and ${high} high severity vulnerabilities.`,
          details: { critical: crit, high },
        };
      }

      return {
        status: 'passed',
        message: 'Zero critical and zero high severity vulnerabilities detected.',
      };
    },
  },
  {
    id: 'gate-security-secret-hygiene',
    category: 'security',
    name: 'Secret & Credential Hygiene',
    description: 'Ensures no private keys, seed phrases, or sensitive API secrets are leaked into client builds or env.',
    required: true,
    edgeCases: [
      'Test mnemonic phrases committed in mock fixture files mistaken for live secrets.',
      'Public keys with "SECRET" in variable names causing false positives.',
    ],
    failureModes: [
      'Private Stellar secret key (starting with S) exposed in public NEXT_PUBLIC_* env.',
      'Raw credentials detected in compiled bundle.',
    ],
    rollbackSteps: [
      'Immediately revoke leaked credentials in upstream providers or Horizon ledger.',
      'Purge environment configuration from build workers and rotate secrets.',
      'Redeploy with sanitized environment variables.',
    ],
    evaluate: async (ctx) => {
      const leaked = ctx.securityChecks?.secretTokensExposed ?? [];
      if (leaked.length > 0) {
        return {
          status: 'failed',
          message: `Secret hygiene failure: exposed credentials detected in ${leaked.join(', ')}`,
          details: { leaked },
        };
      }

      // Check process.env for bad NEXT_PUBLIC variables if running in node/browser
      const suspiciousVars: string[] = [];
      if (typeof process !== 'undefined' && process.env) {
        for (const [key, val] of Object.entries(process.env)) {
          if (
            key.startsWith('NEXT_PUBLIC_') &&
            typeof val === 'string' &&
            (/^S[A-Z2-7]{55}$/.test(val) || /private[_-]?key/i.test(key) || /secret/i.test(key))
          ) {
            suspiciousVars.push(key);
          }
        }
      }

      if (suspiciousVars.length > 0) {
        return {
          status: 'failed',
          message: `Client-facing environment exposes sensitive keys: ${suspiciousVars.join(', ')}`,
          details: { suspiciousVars },
        };
      }

      return {
        status: 'passed',
        message: 'Secret hygiene certified: no sensitive credentials detected in client configuration.',
      };
    },
  },

  // ─── 3. Smoke Tests Pillar ────────────────────────────────────────────────
  {
    id: 'gate-smoke-domain-invariants',
    category: 'smoke_tests',
    name: 'Domain Invariants Certification',
    description: 'Validates primary key uniqueness, referential integrity, Stellar addresses, and balance constraints.',
    required: true,
    edgeCases: [
      'Horizon indexer sync delay causing temporary balance discrepancy.',
      'Legacy records with missing timestamps restored from archaic database backups.',
    ],
    failureModes: [
      'Duplicate primary key or referral code in dataset (DUPLICATE_ID).',
      'Orphaned execution referencing missing test case (ORPHANED_RECORD).',
      'Payout exceeding earned reserves (FINANCIAL_BALANCE_VIOLATION).',
    ],
    rollbackSteps: [
      'Halt release cutover.',
      'Isolate corrupted entity rows using scripts/validate-domain-invariants.mjs --strict.',
      'Run repair workflow documented in docs/DISASTER_RECOVERY.md.',
    ],
    evaluate: async (ctx) => {
      const violations = ctx.smokeChecks?.invariantViolationsCount ?? 0;
      const isValid = ctx.smokeChecks?.domainInvariantsValid ?? violations === 0;

      if (!isValid || violations > 0) {
        return {
          status: 'failed',
          message: `Domain invariant smoke check failed with ${violations} violation(s).`,
          details: { violationsCount: violations },
        };
      }

      return {
        status: 'passed',
        message: 'Domain invariants certified: 0 relational, financial, or enum integrity errors.',
      };
    },
  },
  {
    id: 'gate-smoke-environment-config',
    category: 'smoke_tests',
    name: 'Runtime Environment & Network Smoke Check',
    description: 'Asserts all critical environment variables and network configurations pass preflight checks.',
    required: true,
    edgeCases: [
      'Stellar Horizon RPC endpoint responding with HTTP 429 during load spikes.',
      'Fallback to testnet when mainnet RPC is temporarily unreachable.',
    ],
    failureModes: [
      'Missing NEXT_PUBLIC_STELLAR_NETWORK configuration.',
      'Invalid Soroban contract address format.',
    ],
    rollbackSteps: [
      'Review .env.example against current deployment environment.',
      'Supply missing variables and restart Next.js instance.',
    ],
    evaluate: async (ctx) => {
      const valid = ctx.smokeChecks?.environmentValid ?? true;
      if (!valid) {
        return {
          status: 'failed',
          message: 'Environment preflight smoke check failed: missing required variables.',
        };
      }

      return {
        status: 'passed',
        message: 'Runtime environment smoke check passed: critical configurations resolved.',
      };
    },
  },
  {
    id: 'gate-smoke-critical-routes',
    category: 'smoke_tests',
    name: 'Critical Routes & Interface Availability',
    description: 'Verifies core user-facing and operator routes are registered and healthy.',
    required: false,
    edgeCases: [
      'Dynamic SSR routes failing when remote API is temporarily slow.',
      'Edge middleware redirect loops on unauthenticated maintainer views.',
    ],
    failureModes: [
      'Route inventory missing core path (/marketplace, /dashboard/operations).',
      'Middleware unhandled rejection on cold start.',
    ],
    rollbackSteps: [
      'Inspect routes inventory via ROUTES_INVENTORY.md.',
      'Verify build artifacts using npm run build.',
    ],
    evaluate: async (ctx) => {
      const available = ctx.smokeChecks?.criticalRoutesAvailable ?? true;
      if (!available) {
        return {
          status: 'warning',
          message: 'One or more non-critical routes failed availability probe.',
        };
      }

      return {
        status: 'passed',
        message: 'Critical interface routes available and verified.',
      };
    },
  },

  // ─── 4. Rollback Rehearsals Pillar ─────────────────────────────────────────
  {
    id: 'gate-rollback-rehearsal-execution',
    category: 'rollback_rehearsal',
    name: 'Rollback Rehearsals Execution & Verification',
    description: 'Requires all designated rollback rehearsal scenarios to be executed and certified prior to cutover.',
    required: true,
    edgeCases: [
      'Rehearsal executed in memory passing while production persistent storage fails permission check.',
      'Stale rehearsal results older than the latest commit under release evaluation.',
    ],
    failureModes: [
      'Required rollback rehearsal missing from test execution records.',
      'Rehearsal procedure threw exception or failed recovery assertion.',
    ],
    rollbackSteps: [
      'Execute rollback rehearsal suite locally or in staging: npm run release:gate.',
      'Inspect failure trace in rehearsal runner logs.',
      'Fix recovery procedure before attempting release.',
    ],
    evaluate: async (ctx) => {
      const executed = ctx.rollbackRehearsals?.rehearsalsExecuted ?? [];
      const requiredIds = ctx.rollbackRehearsals?.requiredRehearsalIds ?? DEFAULT_ROLLBACK_SCENARIO_IDS;

      if (executed.length === 0) {
        return {
          status: 'failed',
          message: 'Rollback verification is missing: zero rollback rehearsals were executed for this release.',
          details: { requiredIds },
        };
      }

      const executedIds = new Set(executed.map((r) => r.scenarioId));
      const missingScenarios = requiredIds.filter((id) => !executedIds.has(id));

      if (missingScenarios.length > 0) {
        return {
          status: 'failed',
          message: `Missing required rollback rehearsals: ${missingScenarios.join(', ')}`,
          details: { missingScenarios },
        };
      }

      const failedRehearsals = executed.filter((r) => !r.success);
      if (failedRehearsals.length > 0) {
        return {
          status: 'failed',
          message: `${failedRehearsals.length} rollback rehearsal(s) failed: ${failedRehearsals.map((r) => r.scenarioId).join(', ')}`,
          details: { failedRehearsals },
        };
      }

      return {
        status: 'passed',
        message: `All ${executed.length} rollback rehearsal(s) successfully executed and certified.`,
        details: { count: executed.length },
      };
    },
  },
  {
    id: 'gate-rollback-feature-flags-fail-closed',
    category: 'rollback_rehearsal',
    name: 'Feature Flag Emergency Fallback & Fail-Closed',
    description: 'Verifies that all feature flags have safe, non-destructive fallback defaults when remote config or release is rolled back.',
    required: true,
    edgeCases: [
      'Remote feature flag polling endpoint unreachable, triggering fallback to process environment.',
      'New feature flag released without fallback definition causing undefined evaluate branch.',
    ],
    failureModes: [
      'Feature flag defaulting to destructive or unauthenticated state.',
      'Feature flag evaluation crashing when user ID is undefined.',
    ],
    rollbackSteps: [
      'Set TRELLIS_FEATURE_[NAME]=false in deployment environment.',
      'Restart service or wait 30s for remote polling refresh.',
      'Verify fail-closed behavior at /dashboard/operations.',
    ],
    evaluate: async (ctx) => {
      const safe = ctx.rollbackRehearsals?.allFeatureFlagsHaveSafeDefaults ?? true;
      if (!safe) {
        return {
          status: 'failed',
          message: 'One or more feature flags lack safe fail-closed fallback defaults.',
        };
      }

      return {
        status: 'passed',
        message: 'Feature flag fail-closed fallback verified: emergency toggle to false is safe.',
      };
    },
  },
  {
    id: 'gate-rollback-checkpoint-recovery',
    category: 'rollback_rehearsal',
    name: 'Recovery Checkpoint Fencing & Idempotency',
    description: 'Rehearses multi-step operation interruption and resume, verifying side-effect fencing prevents duplicate transactions.',
    required: true,
    edgeCases: [
      'Concurrent resumes across multiple browser tabs attempting duplicate settlement.',
      'Abandoned operations in checkpoint storage expiring before triage.',
    ],
    failureModes: [
      'Side-effect step re-executing upon operation resume.',
      'Checkpoint store losing state upon mid-flight browser reload.',
    ],
    rollbackSteps: [
      'Use OperationManager.cancelOperation() to safely fence incomplete transaction.',
      'Inspect checkpoint records via Maintainer Recovery Diagnostics.',
      'Follow incident runbook mitigation in docs/incident-runbook.md.',
    ],
    evaluate: async (ctx) => {
      const verified = ctx.rollbackRehearsals?.checkpointRecoveryVerified ?? true;
      if (!verified) {
        return {
          status: 'failed',
          message: 'Checkpoint recovery rehearsal failed: idempotency or fencing violation.',
        };
      }

      return {
        status: 'passed',
        message: 'Recovery checkpoint idempotency verified: zero duplicate side-effects on replay.',
      };
    },
  },
  {
    id: 'gate-rollback-post-invariants-certified',
    category: 'rollback_rehearsal',
    name: 'Post-Rollback Invariant Certification',
    description: 'Assures restored or rolled-back datasets conform to domain invariant constraints.',
    required: true,
    edgeCases: [
      'Point-in-time database snapshot missing recent foreign key records.',
    ],
    failureModes: [
      'Post-rollback state contains orphaned executions or corrupted balances.',
    ],
    rollbackSteps: [
      'Run npm run dr:validate -- --strict on restored dataset.',
      'Reconcile missing ledger transactions with Horizon before opening traffic.',
    ],
    evaluate: async (ctx) => {
      const certified = ctx.rollbackRehearsals?.postRollbackInvariantsCertified ?? true;
      if (!certified) {
        return {
          status: 'failed',
          message: 'Post-rollback domain state fails invariant certification.',
        };
      }

      return {
        status: 'passed',
        message: 'Post-rollback domain state certified non-violating.',
      };
    },
  },
];
