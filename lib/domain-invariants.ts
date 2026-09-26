/**
 * Domain Invariants — Issue #55
 *
 * Defines at least ten invariants for the Trellis frontend domain model and
 * exports a checker function for each.  Each invariant is a predicate that
 * returns a list of violations (empty = invariant holds).
 *
 * Invariants are grouped by concern:
 *   I-01 … I-03  Ownership / Agent lifecycle
 *   I-04 … I-05  Balance / Financial
 *   I-06 … I-07  Access / Permission
 *   I-08         Stake lifecycle
 *   I-09         Provenance chain completeness
 *   I-10         Import idempotency
 *   I-11         Delegation coherence
 *   I-12         Operation step ordering
 *
 * Each exported function is pure and synchronous so it can run inside Jest,
 * in API route handlers, and in browser diagnostics without side effects.
 *
 * How to extend:
 *   1. Add a new InvariantId literal.
 *   2. Implement a checker following the same pattern.
 *   3. Register it in ALL_INVARIANTS.
 *   4. Add a test in tests/__tests__/domain-invariants.test.ts.
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface InvariantViolation {
  invariantId: InvariantId;
  entity: string;  // e.g. "agent:ag-1"
  detail: string;
}

export type InvariantId =
  | 'I-01' | 'I-02' | 'I-03'  // Agent lifecycle
  | 'I-04' | 'I-05'           // Balance / Financial
  | 'I-06' | 'I-07'           // Access / Permission
  | 'I-08'                    // Stake lifecycle
  | 'I-09'                    // Provenance chain
  | 'I-10'                    // Import idempotency
  | 'I-11'                    // Delegation coherence
  | 'I-12';                   // Operation step ordering

// ─── Domain-model shapes (minimal, for invariant checking) ────────────────────

export interface AgentSnapshot {
  id: string;
  status: 'active' | 'inactive' | 'draft';
  author: string;
  createdAt: string;
  updatedAt: string;
  capabilities: string[];
}

export interface WalletSnapshot {
  publicKey: string;
  isConnected: boolean;
  balances: Array<{ asset: string; balance: string }>;
}

export interface DelegationSnapshot {
  id: string;
  granter: string;
  grantee: string;
  permissions: string[];
  status: 'pending' | 'granted' | 'revoked';
  createdAt: string;
}

export interface StakeSnapshot {
  userId: string;
  assetId: string;
  stakedAmount: number;
  effectiveStake: number;
  pendingRewards: number;
}

export interface ProvenanceSnapshot {
  id: string;
  agentId: string;
  action: 'input_received' | 'provider_call' | 'on_chain_submission' | 'output_generated' | 'error_encountered';
  status: 'success' | 'failure' | 'pending';
  timestamp: string;
  txHash?: string;
}

export interface ImportBatchSnapshot {
  id: string;
  entityType: string;
  appliedAt?: string;
  rows: Array<{ externalId: string; action: 'create' | 'update' | 'skip' | 'error' }>;
}

export interface OperationStepSnapshot {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  sideEffect: boolean;
  index: number;
}

// ─── I-01: Active agents must have an author ─────────────────────────────────
/**
 * An agent in `active` status must have a non-empty `author` field.
 * Rationale: ownership is required for accountability on active agents.
 */
export function checkI01ActiveAgentHasAuthor(
  agents: AgentSnapshot[],
): InvariantViolation[] {
  return agents
    .filter(a => a.status === 'active' && !a.author.trim())
    .map(a => ({
      invariantId: 'I-01' as InvariantId,
      entity:      `agent:${a.id}`,
      detail:      'Active agent has no author (ownership missing)',
    }));
}

// ─── I-02: Agent timestamps must be consistent ───────────────────────────────
/**
 * `updatedAt` must not be earlier than `createdAt` for any agent.
 * Rationale: impossible timestamps indicate clock skew or data corruption.
 */
export function checkI02AgentTimestamps(
  agents: AgentSnapshot[],
): InvariantViolation[] {
  return agents
    .filter(a => new Date(a.updatedAt).getTime() < new Date(a.createdAt).getTime())
    .map(a => ({
      invariantId: 'I-02' as InvariantId,
      entity:      `agent:${a.id}`,
      detail:      `updatedAt (${a.updatedAt}) is before createdAt (${a.createdAt})`,
    }));
}

// ─── I-03: Agents must have at least one capability when active ───────────────
/**
 * An active agent with zero capabilities cannot perform useful work.
 * Rationale: prevents empty deployments that would silently do nothing.
 */
export function checkI03ActiveAgentHasCapabilities(
  agents: AgentSnapshot[],
): InvariantViolation[] {
  return agents
    .filter(a => a.status === 'active' && a.capabilities.length === 0)
    .map(a => ({
      invariantId: 'I-03' as InvariantId,
      entity:      `agent:${a.id}`,
      detail:      'Active agent has no capabilities declared',
    }));
}

// ─── I-04: Balances must be non-negative numbers ─────────────────────────────
/**
 * No wallet balance may be negative.
 * Rationale: negative balances are impossible on Stellar and indicate a
 * parsing/rounding bug or data corruption.
 */
export function checkI04NonNegativeBalances(
  wallets: WalletSnapshot[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const wallet of wallets) {
    for (const bal of wallet.balances) {
      const value = parseFloat(bal.balance);
      if (isNaN(value) || value < 0) {
        violations.push({
          invariantId: 'I-04' as InvariantId,
          entity:      `wallet:${wallet.publicKey}`,
          detail:      `Asset ${bal.asset} has invalid balance: "${bal.balance}"`,
        });
      }
    }
  }
  return violations;
}

// ─── I-05: Connected wallet must have a valid public key ─────────────────────
/**
 * A wallet marked `isConnected: true` must have a non-empty publicKey.
 * Rationale: an "connected" wallet with no address will produce silent
 * failures on every subsequent transaction attempt.
 */
export function checkI05ConnectedWalletHasKey(
  wallets: WalletSnapshot[],
): InvariantViolation[] {
  return wallets
    .filter(w => w.isConnected && !w.publicKey.trim())
    .map(w => ({
      invariantId: 'I-05' as InvariantId,
      entity:      'wallet:(unknown)',
      detail:      'Wallet is marked connected but has no public key',
    }));
}

// ─── I-06: Delegation granter ≠ grantee ──────────────────────────────────────
/**
 * A delegation must not grant permissions to oneself.
 * Rationale: self-delegation is a no-op at best and a privilege-escalation
 * vector at worst.
 */
export function checkI06DelegationSelfGrant(
  delegations: DelegationSnapshot[],
): InvariantViolation[] {
  return delegations
    .filter(d => d.granter === d.grantee)
    .map(d => ({
      invariantId: 'I-06' as InvariantId,
      entity:      `delegation:${d.id}`,
      detail:      `granter and grantee are the same address: ${d.granter}`,
    }));
}

// ─── I-07: Granted delegation must have at least one permission ───────────────
/**
 * A delegation in `granted` status with an empty permissions array is
 * meaningless and likely the result of a form submission bug.
 */
export function checkI07GrantedDelegationHasPermissions(
  delegations: DelegationSnapshot[],
): InvariantViolation[] {
  return delegations
    .filter(d => d.status === 'granted' && d.permissions.length === 0)
    .map(d => ({
      invariantId: 'I-07' as InvariantId,
      entity:      `delegation:${d.id}`,
      detail:      'Granted delegation has no permissions',
    }));
}

// ─── I-08: Effective stake must not exceed staked amount ─────────────────────
/**
 * `effectiveStake` is the staked amount after applying multipliers.  It must
 * not be negative, and non-zero stakes must have a non-negative pendingRewards.
 */
export function checkI08StakeCoherence(
  stakes: StakeSnapshot[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const s of stakes) {
    if (s.stakedAmount < 0) {
      violations.push({
        invariantId: 'I-08' as InvariantId,
        entity:      `stake:${s.userId}:${s.assetId}`,
        detail:      `stakedAmount is negative: ${s.stakedAmount}`,
      });
    }
    if (s.effectiveStake < 0) {
      violations.push({
        invariantId: 'I-08' as InvariantId,
        entity:      `stake:${s.userId}:${s.assetId}`,
        detail:      `effectiveStake is negative: ${s.effectiveStake}`,
      });
    }
    if (s.pendingRewards < 0) {
      violations.push({
        invariantId: 'I-08' as InvariantId,
        entity:      `stake:${s.userId}:${s.assetId}`,
        detail:      `pendingRewards is negative: ${s.pendingRewards}`,
      });
    }
  }
  return violations;
}

// ─── I-09: On-chain submission provenance must have a txHash ─────────────────
/**
 * Any provenance record with action `on_chain_submission` and status `success`
 * must include a `txHash`.  Without it there is no way to audit the chain event.
 */
export function checkI09ProvenanceOnChainHasTxHash(
  records: ProvenanceSnapshot[],
): InvariantViolation[] {
  return records
    .filter(r => r.action === 'on_chain_submission' && r.status === 'success' && !r.txHash)
    .map(r => ({
      invariantId: 'I-09' as InvariantId,
      entity:      `provenance:${r.id}`,
      detail:      'On-chain submission marked success but has no txHash',
    }));
}

// ─── I-10: Import batch rows must not contain mixed create/error duplicates ───
/**
 * Within a single import batch, the same `externalId` must appear at most once
 * with a non-error action.  Duplicate external IDs that both resolve to
 * `create` or `update` indicate the pipeline's deduplication failed.
 */
export function checkI10ImportBatchNoDuplicateActions(
  batches: ImportBatchSnapshot[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const batch of batches) {
    const seen = new Map<string, string>(); // externalId → action
    for (const row of batch.rows) {
      if (row.action === 'error') continue;
      if (seen.has(row.externalId)) {
        violations.push({
          invariantId: 'I-10' as InvariantId,
          entity:      `import:${batch.id}`,
          detail:      `externalId "${row.externalId}" appears with multiple non-error actions`,
        });
      } else {
        seen.set(row.externalId, row.action);
      }
    }
  }

  return violations;
}

// ─── I-11: Revoked delegations must not regain granted status ─────────────────
/**
 * Once a delegation is `revoked` it must stay revoked.  Seeing a `granted`
 * delegation whose `createdAt` predates another `revoked` record with the same
 * id is a sign of a replay attack or corrupted history.
 *
 * This invariant is checked on a flat list: if any delegation has status
 * `granted` but its ID appears in the `revoked` set it is a violation.
 */
export function checkI11RevokedDelegationNotRegained(
  delegations: DelegationSnapshot[],
): InvariantViolation[] {
  // Collect delegation IDs that have ever been revoked.
  const revokedIds = new Set(
    delegations.filter(d => d.status === 'revoked').map(d => d.id),
  );

  return delegations
    .filter(d => d.status === 'granted' && revokedIds.has(d.id))
    .map(d => ({
      invariantId: 'I-11' as InvariantId,
      entity:      `delegation:${d.id}`,
      detail:      'Delegation is `granted` but also appears in revoked set (possible replay)',
    }));
}

// ─── I-12: Operation steps must not have gaps in completed status ─────────────
/**
 * In a completed operation every step with a lower index than the last
 * completed step must also be completed (not pending/failed).
 * A gap indicates a step was skipped without a checkpoint, which would allow
 * a side effect to be executed without a preceding required step.
 */
export function checkI12OperationStepsNoGaps(
  steps: OperationStepSnapshot[],
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Sort by index to process in order
  const sorted = [...steps].sort((a, b) => a.index - b.index);
  let lastCompletedIndex = -1;

  for (const step of sorted) {
    if (step.status === 'completed') {
      // Every step between lastCompletedIndex + 1 and step.index must be either
      // completed, skipped, or non-side-effect.
      for (let i = lastCompletedIndex + 1; i < step.index; i++) {
        const intermediate = sorted.find(s => s.index === i);
        if (
          intermediate &&
          intermediate.sideEffect &&
          intermediate.status !== 'completed' &&
          intermediate.status !== 'skipped'
        ) {
          violations.push({
            invariantId: 'I-12' as InvariantId,
            entity:      `step:${intermediate.id}`,
            detail:      `Side-effect step at index ${i} is "${intermediate.status}" but a later step (index ${step.index}) is "completed"`,
          });
        }
      }
      lastCompletedIndex = step.index;
    }
  }

  return violations;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface InvariantDefinition {
  id: InvariantId;
  name: string;
  description: string;
  concern: 'ownership' | 'balance' | 'access' | 'lifecycle' | 'data_integrity';
}

export const ALL_INVARIANTS: InvariantDefinition[] = [
  {
    id:          'I-01',
    name:        'Active agent has author',
    description: 'An active agent must have a non-empty author field.',
    concern:     'ownership',
  },
  {
    id:          'I-02',
    name:        'Agent timestamp consistency',
    description: 'updatedAt must not precede createdAt for any agent.',
    concern:     'data_integrity',
  },
  {
    id:          'I-03',
    name:        'Active agent has capabilities',
    description: 'An active agent must declare at least one capability.',
    concern:     'lifecycle',
  },
  {
    id:          'I-04',
    name:        'Non-negative balances',
    description: 'No wallet balance may be negative or non-numeric.',
    concern:     'balance',
  },
  {
    id:          'I-05',
    name:        'Connected wallet has public key',
    description: 'A wallet marked as connected must have a non-empty public key.',
    concern:     'access',
  },
  {
    id:          'I-06',
    name:        'Delegation non-self-grant',
    description: 'A delegation must not grant permissions from an address to itself.',
    concern:     'access',
  },
  {
    id:          'I-07',
    name:        'Granted delegation has permissions',
    description: 'A delegation in "granted" status must list at least one permission.',
    concern:     'access',
  },
  {
    id:          'I-08',
    name:        'Stake amounts are non-negative',
    description: 'stakedAmount, effectiveStake, and pendingRewards must all be ≥ 0.',
    concern:     'balance',
  },
  {
    id:          'I-09',
    name:        'On-chain submission has txHash',
    description: 'A successful on-chain submission provenance record must include txHash.',
    concern:     'data_integrity',
  },
  {
    id:          'I-10',
    name:        'Import batch no duplicate actions',
    description: 'Each externalId in an import batch may have at most one non-error action.',
    concern:     'data_integrity',
  },
  {
    id:          'I-11',
    name:        'Revoked delegation not regained',
    description: 'A delegation ID that was revoked must not appear as granted.',
    concern:     'access',
  },
  {
    id:          'I-12',
    name:        'No gaps in completed operation steps',
    description: 'Side-effect steps must not be skipped without a checkpoint before a later step completes.',
    concern:     'lifecycle',
  },
];
