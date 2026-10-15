/**
 * Release Readiness Gate Types — Trellis Frontend
 *
 * Defines the criteria, categories, status states, and result contracts
 * for blocking production releases across migrations, security checks,
 * smoke tests, and rollback rehearsals.
 */

export type ReleaseGateStatus = 'READY' | 'BLOCKED' | 'WARNING';

export type CheckCategory =
  | 'migrations'
  | 'security'
  | 'smoke_tests'
  | 'rollback_rehearsal';

export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface CheckItemResult {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  required: boolean;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
  edgeCases: string[];
  failureModes: string[];
  rollbackSteps: string[];
}

export interface CategorySummary {
  category: CheckCategory;
  title: string;
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  skippedCount: number;
  checks: CheckItemResult[];
}

export interface ReleaseReadinessReport {
  id: string;
  evaluatedAt: string;
  environment: string;
  status: ReleaseGateStatus;
  isReady: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    requiredBlockersCount: number;
  };
  blockers: string[];
  warnings: string[];
  categories: Record<CheckCategory, CategorySummary>;
  telemetryPayload?: {
    taskKind: string;
    state: ReleaseGateStatus;
    code: string;
    message: string;
    blockersCount: number;
  };
}

export interface RollbackRehearsalScenario {
  id: string;
  name: string;
  description: string;
  targetSubsystem: 'migrations' | 'feature_flags' | 'operations' | 'domain_state';
  execute: () => Promise<{
    success: boolean;
    details?: string;
    verifiedAt: string;
  }>;
}

export interface RollbackRehearsalResult {
  id: string;
  scenarioId: string;
  rehearsedAt: string;
  success: boolean;
  rehearsalMode: 'dry_run' | 'checkpoint_restore' | 'flag_reversion' | 'invariant_audit';
  outputSummary: string;
  error?: string;
}

export interface DryRunMigrationInfo {
  id: string;
  version: string;
  description: string;
  rollbackNote?: string;
  previewSafe?: boolean;
  validationErrors?: string[];
}

export interface SecurityEvaluationInput {
  complianceScore?: number;
  criticalVulnerabilitiesCount?: number;
  highVulnerabilitiesCount?: number;
  insecureProtocolsFound?: string[];
  secretTokensExposed?: string[];
  nonTokenCompliantRules?: string[];
}

export interface SmokeEvaluationInput {
  domainInvariantsValid?: boolean;
  invariantViolationsCount?: number;
  environmentValid?: boolean;
  criticalRoutesAvailable?: boolean;
}

export interface RollbackEvaluationInput {
  rehearsalsExecuted?: RollbackRehearsalResult[];
  requiredRehearsalIds?: string[];
  allFeatureFlagsHaveSafeDefaults?: boolean;
  checkpointRecoveryVerified?: boolean;
  postRollbackInvariantsCertified?: boolean;
}

export interface ReleaseGateContext {
  environment?: string;
  releaseVersion?: string;
  strict?: boolean;
  skipOptionalChecks?: boolean;
  dryRunMigrations?: DryRunMigrationInfo[];
  securityChecks?: SecurityEvaluationInput;
  smokeChecks?: SmokeEvaluationInput;
  rollbackRehearsals?: RollbackEvaluationInput;
}
