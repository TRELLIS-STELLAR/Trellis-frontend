/**
 * The composed execution guard for high-risk Trellis operations.
 *
 * One function a route handler or transaction composer calls before anything
 * irreversible happens. It chains the four protocol safety features in the
 * right order, each with its own failure mode:
 *
 *   1. **Config compatibility (#178)** — the request must be built against
 *      supported configuration versions. Incompatible → blocked.
 *   2. **Emergency pause (#177)** — the operation/environment must not be
 *      paused. Paused → blocked with the user-safe pause message.
 *   3. **Preflight (#175)** — deterministic rule checks; `blocked` refuses.
 *   4. **Receipt (#176)** — the receipt is created only after the first three
 *      gates pass, so refused operations never mint receipts (they would
 *      otherwise block a corrected retry with the same fingerprint).
 *
 * The receipt's fingerprint is canonical (#176), so a retry of the same intent
 * — even with reordered object keys — resolves to the existing receipt instead
 * of minting a second one.
 */

import type { ProtocolConfigRegistry } from './config-versioning';
import type { PauseManager } from './emergency-pause';
import {
  runPreflight,
  type PreflightResult,
  type PreflightRule,
  type PreflightStateSnapshot,
} from './preflight';
import { ReceiptService, type OperationReceipt } from './operation-receipts';
import type { ProtocolActor, ProtocolEnvironment, ProtocolOperation } from './operations';

export interface GuardedOperationRequest {
  readonly operation: ProtocolOperation;
  readonly environment: ProtocolEnvironment;
  readonly actorId: string;
  readonly actor: ProtocolActor;
  readonly payload: Readonly<Record<string, unknown>>;
  /** Config versions the request was composed against. */
  readonly configVersions: Readonly<Record<string, string>>;
  /** Extra state snapshot for preflight rules. */
  readonly state?: Partial<PreflightStateSnapshot>;
}

export interface GuardedExecutionResult {
  readonly preflight: PreflightResult;
  readonly receipt: OperationReceipt | null;
  /** True when the guard refused the operation (never executed). */
  readonly blocked: boolean;
}

export interface GuardOptions {
  readonly configRegistry: ProtocolConfigRegistry;
  readonly pauseManager: PauseManager;
  readonly receipts: ReceiptService;
  now?: () => number;
  extraPreflightRules?: readonly PreflightRule[];
}

/** Thrown when a gate refuses the operation; carries the full preflight result. */
export class PreflightBlockedError extends Error {
  readonly code = 'PREFLIGHT_BLOCKED' as const;
  readonly result: PreflightResult;

  constructor(result: PreflightResult) {
    super(
      result.blockers[0]?.message ??
        result.warnings[0]?.message ??
        'This operation cannot be completed right now.',
    );
    this.name = 'PreflightBlockedError';
    this.result = result;
  }
}

/**
 * Run the full guard chain for one operation request.
 *
 * Returns the preflight result and, when every gate passed, the operation's
 * receipt (created or replayed). Throws `PreflightBlockedError` when any gate
 * refuses — before the receipt is minted and before the caller executes
 * anything.
 */
export function executeGuardedOperation(
  request: GuardedOperationRequest,
  options: GuardOptions,
): GuardedExecutionResult {
  const state: PreflightStateSnapshot = {
    configVersions: request.configVersions,
    ...request.state,
  };

  const preflight = runPreflight(
    {
      operation: request.operation,
      environment: request.environment,
      actorId: request.actorId,
      payload: request.payload,
      state,
    },
    {
      pauseManager: options.pauseManager,
      configRegistry: options.configRegistry,
      now: options.now,
      extraRules: options.extraPreflightRules,
    },
  );

  if (!isSubmittableStatus(preflight.status)) {
    throw new PreflightBlockedError(preflight);
  }

  const { receipt } = options.receipts.createOrGet({
    operation: request.operation,
    environment: request.environment,
    actorId: request.actorId,
    payload: request.payload,
  });

  return { preflight, receipt, blocked: false };
}

function isSubmittableStatus(status: PreflightResult['status']): boolean {
  return status === 'success' || status === 'warning';
}
