/**
 * Domain Invariants Test Suite — Issue #55
 *
 * Verifies all twelve domain invariants (I-01 through I-12).
 *
 * For each invariant the suite contains:
 *  - A "happy path" test: valid data → zero violations
 *  - One or more "violation" tests: impossible state → expected violations
 *
 * All tests are deterministic, pure, and synchronous.
 *
 * Invariant documentation:
 *   See lib/domain-invariants.ts → ALL_INVARIANTS for the full registry.
 */

import {
  ALL_INVARIANTS,
  checkI01ActiveAgentHasAuthor,
  checkI02AgentTimestamps,
  checkI03ActiveAgentHasCapabilities,
  checkI04NonNegativeBalances,
  checkI05ConnectedWalletHasKey,
  checkI06DelegationSelfGrant,
  checkI07GrantedDelegationHasPermissions,
  checkI08StakeCoherence,
  checkI09ProvenanceOnChainHasTxHash,
  checkI10ImportBatchNoDuplicateActions,
  checkI11RevokedDelegationNotRegained,
  checkI12OperationStepsNoGaps,
} from '@/lib/domain-invariants';

import type {
  AgentSnapshot,
  WalletSnapshot,
  DelegationSnapshot,
  StakeSnapshot,
  ProvenanceSnapshot,
  ImportBatchSnapshot,
  OperationStepSnapshot,
} from '@/lib/domain-invariants';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_ADDRESS = 'GCZAJM3RJY7Y67HDFN7PIJBTYQC6KMRAXM57SC7Y2H546AAHFHWRH3YY';

const activeAgent: AgentSnapshot = {
  id: 'ag-1', status: 'active', author: 'alice',
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z',
  capabilities: ['predict', 'trade'],
};

const connectedWallet: WalletSnapshot = {
  publicKey: VALID_ADDRESS, isConnected: true,
  balances: [{ asset: 'XLM', balance: '100.0' }],
};

const validDelegation: DelegationSnapshot = {
  id: 'd-1', granter: 'alice', grantee: 'bob',
  permissions: ['trade'], status: 'granted',
  createdAt: '2025-01-01T00:00:00Z',
};

const validStake: StakeSnapshot = {
  userId: 'alice', assetId: 'xlm',
  stakedAmount: 100, effectiveStake: 200, pendingRewards: 10,
};

const validProvenance: ProvenanceSnapshot = {
  id: 'pv-1', agentId: 'ag-1',
  action: 'on_chain_submission', status: 'success',
  timestamp: '2025-01-01T00:00:00Z',
  txHash: 'GCB...abc',
};

const validBatch: ImportBatchSnapshot = {
  id: 'batch-1', entityType: 'agents',
  rows: [
    { externalId: 'ag-1', action: 'create' },
    { externalId: 'ag-2', action: 'update' },
  ],
};

const validSteps: OperationStepSnapshot[] = [
  { id: 'build',  status: 'completed', sideEffect: false, index: 0 },
  { id: 'sign',   status: 'completed', sideEffect: true,  index: 1 },
  { id: 'submit', status: 'completed', sideEffect: true,  index: 2 },
];

// ─── Registry smoke test ──────────────────────────────────────────────────────

describe('ALL_INVARIANTS registry', () => {
  it('contains at least 10 invariants', () => {
    expect(ALL_INVARIANTS.length).toBeGreaterThanOrEqual(10);
  });

  it('every invariant has a unique id, name, description, and concern', () => {
    const ids = ALL_INVARIANTS.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const inv of ALL_INVARIANTS) {
      expect(inv.name).toBeTruthy();
      expect(inv.description).toBeTruthy();
      expect(inv.concern).toBeTruthy();
    }
  });
});

// ─── I-01 ─────────────────────────────────────────────────────────────────────

describe('I-01 — Active agent has author', () => {
  it('passes for agents with authors', () => {
    expect(checkI01ActiveAgentHasAuthor([activeAgent])).toHaveLength(0);
  });

  it('detects active agent with empty author', () => {
    const violations = checkI01ActiveAgentHasAuthor([{ ...activeAgent, author: '' }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-01');
    expect(violations[0].entity).toContain('ag-1');
  });

  it('does not flag inactive or draft agents', () => {
    const inactive: AgentSnapshot = { ...activeAgent, status: 'inactive', author: '' };
    const draft:    AgentSnapshot = { ...activeAgent, status: 'draft',    author: '' };
    expect(checkI01ActiveAgentHasAuthor([inactive, draft])).toHaveLength(0);
  });
});

// ─── I-02 ─────────────────────────────────────────────────────────────────────

describe('I-02 — Agent timestamp consistency', () => {
  it('passes for valid timestamps', () => {
    expect(checkI02AgentTimestamps([activeAgent])).toHaveLength(0);
  });

  it('detects updatedAt before createdAt', () => {
    const bad: AgentSnapshot = {
      ...activeAgent,
      createdAt: '2025-06-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const violations = checkI02AgentTimestamps([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-02');
  });

  it('passes when updatedAt equals createdAt', () => {
    const same: AgentSnapshot = { ...activeAgent, updatedAt: activeAgent.createdAt };
    expect(checkI02AgentTimestamps([same])).toHaveLength(0);
  });
});

// ─── I-03 ─────────────────────────────────────────────────────────────────────

describe('I-03 — Active agent has capabilities', () => {
  it('passes for agent with capabilities', () => {
    expect(checkI03ActiveAgentHasCapabilities([activeAgent])).toHaveLength(0);
  });

  it('detects active agent with empty capabilities', () => {
    const violations = checkI03ActiveAgentHasCapabilities([{ ...activeAgent, capabilities: [] }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-03');
  });

  it('does not flag inactive agents with empty capabilities', () => {
    const inactive: AgentSnapshot = { ...activeAgent, status: 'inactive', capabilities: [] };
    expect(checkI03ActiveAgentHasCapabilities([inactive])).toHaveLength(0);
  });
});

// ─── I-04 ─────────────────────────────────────────────────────────────────────

describe('I-04 — Non-negative balances', () => {
  it('passes for valid balances', () => {
    expect(checkI04NonNegativeBalances([connectedWallet])).toHaveLength(0);
  });

  it('detects negative balance', () => {
    const bad: WalletSnapshot = {
      ...connectedWallet,
      balances: [{ asset: 'XLM', balance: '-10.5' }],
    };
    const violations = checkI04NonNegativeBalances([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-04');
  });

  it('detects non-numeric balance', () => {
    const bad: WalletSnapshot = {
      ...connectedWallet,
      balances: [{ asset: 'XLM', balance: 'NaN' }],
    };
    const violations = checkI04NonNegativeBalances([bad]);
    expect(violations).toHaveLength(1);
  });

  it('passes for zero balance', () => {
    const zero: WalletSnapshot = { ...connectedWallet, balances: [{ asset: 'XLM', balance: '0' }] };
    expect(checkI04NonNegativeBalances([zero])).toHaveLength(0);
  });
});

// ─── I-05 ─────────────────────────────────────────────────────────────────────

describe('I-05 — Connected wallet has public key', () => {
  it('passes for connected wallet with key', () => {
    expect(checkI05ConnectedWalletHasKey([connectedWallet])).toHaveLength(0);
  });

  it('detects connected wallet with empty public key', () => {
    const bad: WalletSnapshot = { ...connectedWallet, publicKey: '' };
    const violations = checkI05ConnectedWalletHasKey([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-05');
  });

  it('does not flag disconnected wallets without a key', () => {
    const disconnected: WalletSnapshot = { ...connectedWallet, isConnected: false, publicKey: '' };
    expect(checkI05ConnectedWalletHasKey([disconnected])).toHaveLength(0);
  });
});

// ─── I-06 ─────────────────────────────────────────────────────────────────────

describe('I-06 — Delegation non-self-grant', () => {
  it('passes for different granter and grantee', () => {
    expect(checkI06DelegationSelfGrant([validDelegation])).toHaveLength(0);
  });

  it('detects self-delegation', () => {
    const bad: DelegationSnapshot = { ...validDelegation, granter: 'alice', grantee: 'alice' };
    const violations = checkI06DelegationSelfGrant([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-06');
    expect(violations[0].detail).toContain('alice');
  });
});

// ─── I-07 ─────────────────────────────────────────────────────────────────────

describe('I-07 — Granted delegation has permissions', () => {
  it('passes for granted delegation with permissions', () => {
    expect(checkI07GrantedDelegationHasPermissions([validDelegation])).toHaveLength(0);
  });

  it('detects granted delegation with no permissions', () => {
    const bad: DelegationSnapshot = { ...validDelegation, permissions: [] };
    const violations = checkI07GrantedDelegationHasPermissions([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-07');
  });

  it('does not flag revoked delegations with no permissions', () => {
    const revoked: DelegationSnapshot = { ...validDelegation, status: 'revoked', permissions: [] };
    expect(checkI07GrantedDelegationHasPermissions([revoked])).toHaveLength(0);
  });
});

// ─── I-08 ─────────────────────────────────────────────────────────────────────

describe('I-08 — Stake amounts are non-negative', () => {
  it('passes for valid stake', () => {
    expect(checkI08StakeCoherence([validStake])).toHaveLength(0);
  });

  it('detects negative stakedAmount', () => {
    const bad: StakeSnapshot = { ...validStake, stakedAmount: -1 };
    const violations = checkI08StakeCoherence([bad]);
    expect(violations.some(v => v.detail.includes('stakedAmount'))).toBe(true);
  });

  it('detects negative effectiveStake', () => {
    const bad: StakeSnapshot = { ...validStake, effectiveStake: -5 };
    const violations = checkI08StakeCoherence([bad]);
    expect(violations.some(v => v.detail.includes('effectiveStake'))).toBe(true);
  });

  it('detects negative pendingRewards', () => {
    const bad: StakeSnapshot = { ...validStake, pendingRewards: -0.1 };
    const violations = checkI08StakeCoherence([bad]);
    expect(violations.some(v => v.detail.includes('pendingRewards'))).toBe(true);
  });

  it('passes for zero values', () => {
    const zero: StakeSnapshot = { ...validStake, stakedAmount: 0, effectiveStake: 0, pendingRewards: 0 };
    expect(checkI08StakeCoherence([zero])).toHaveLength(0);
  });
});

// ─── I-09 ─────────────────────────────────────────────────────────────────────

describe('I-09 — On-chain submission has txHash', () => {
  it('passes for on-chain submission with txHash', () => {
    expect(checkI09ProvenanceOnChainHasTxHash([validProvenance])).toHaveLength(0);
  });

  it('detects on-chain submission without txHash', () => {
    const bad: ProvenanceSnapshot = { ...validProvenance, txHash: undefined };
    const violations = checkI09ProvenanceOnChainHasTxHash([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-09');
  });

  it('does not flag non-on-chain actions without txHash', () => {
    const other: ProvenanceSnapshot = { ...validProvenance, action: 'input_received', txHash: undefined };
    expect(checkI09ProvenanceOnChainHasTxHash([other])).toHaveLength(0);
  });

  it('does not flag failed on-chain submissions without txHash', () => {
    const failed: ProvenanceSnapshot = { ...validProvenance, status: 'failure', txHash: undefined };
    expect(checkI09ProvenanceOnChainHasTxHash([failed])).toHaveLength(0);
  });
});

// ─── I-10 ─────────────────────────────────────────────────────────────────────

describe('I-10 — Import batch no duplicate actions', () => {
  it('passes for batch with unique external IDs', () => {
    expect(checkI10ImportBatchNoDuplicateActions([validBatch])).toHaveLength(0);
  });

  it('detects duplicate create actions for the same externalId', () => {
    const bad: ImportBatchSnapshot = {
      ...validBatch,
      rows: [
        { externalId: 'ag-1', action: 'create' },
        { externalId: 'ag-1', action: 'create' },
      ],
    };
    const violations = checkI10ImportBatchNoDuplicateActions([bad]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-10');
    expect(violations[0].detail).toContain('ag-1');
  });

  it('does not flag duplicate error rows (errors do not create side effects)', () => {
    const errBatch: ImportBatchSnapshot = {
      ...validBatch,
      rows: [
        { externalId: 'ag-1', action: 'error' },
        { externalId: 'ag-1', action: 'error' },
      ],
    };
    expect(checkI10ImportBatchNoDuplicateActions([errBatch])).toHaveLength(0);
  });
});

// ─── I-11 ─────────────────────────────────────────────────────────────────────

describe('I-11 — Revoked delegation not regained', () => {
  it('passes when all delegations are distinct', () => {
    const granted: DelegationSnapshot  = { ...validDelegation, id: 'd-1', status: 'granted' };
    const revoked: DelegationSnapshot  = { ...validDelegation, id: 'd-2', status: 'revoked' };
    expect(checkI11RevokedDelegationNotRegained([granted, revoked])).toHaveLength(0);
  });

  it('detects the same delegation ID appearing as both granted and revoked', () => {
    const granted: DelegationSnapshot = { ...validDelegation, id: 'd-1', status: 'granted' };
    const revoked: DelegationSnapshot = { ...validDelegation, id: 'd-1', status: 'revoked' };

    const violations = checkI11RevokedDelegationNotRegained([granted, revoked]);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-11');
  });
});

// ─── I-12 ─────────────────────────────────────────────────────────────────────

describe('I-12 — No gaps in completed operation steps', () => {
  it('passes for sequential completed steps', () => {
    expect(checkI12OperationStepsNoGaps(validSteps)).toHaveLength(0);
  });

  it('detects a skipped side-effect step between two completed steps', () => {
    const gapped: OperationStepSnapshot[] = [
      { id: 'build',  status: 'completed',   sideEffect: false, index: 0 },
      { id: 'sign',   status: 'pending',     sideEffect: true,  index: 1 }, // skipped without checkpoint
      { id: 'submit', status: 'completed',   sideEffect: true,  index: 2 }, // but this completed
    ];
    const violations = checkI12OperationStepsNoGaps(gapped);
    expect(violations).toHaveLength(1);
    expect(violations[0].invariantId).toBe('I-12');
    expect(violations[0].entity).toContain('sign');
  });

  it('does not flag skipped non-side-effect steps', () => {
    const steps: OperationStepSnapshot[] = [
      { id: 'build',  status: 'skipped',   sideEffect: false, index: 0 },
      { id: 'sign',   status: 'completed', sideEffect: true,  index: 1 },
      { id: 'submit', status: 'completed', sideEffect: true,  index: 2 },
    ];
    expect(checkI12OperationStepsNoGaps(steps)).toHaveLength(0);
  });

  it('passes for single-step operations', () => {
    const single: OperationStepSnapshot[] = [
      { id: 'sign', status: 'completed', sideEffect: true, index: 0 },
    ];
    expect(checkI12OperationStepsNoGaps(single)).toHaveLength(0);
  });
});
