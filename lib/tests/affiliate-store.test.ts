import {
  __resetAffiliateStore,
  __setPayoutBackendMode,
  AFFILIATE_PROGRAM_CONFIG,
  convertReferral,
  creditEarnings,
  enrollAffiliate,
  flagViolation,
  getOrCreateReferralCode,
  getPendingEarnings,
  getProgram,
  getStats,
  isEnrolled,
  listPayouts,
  listReferrals,
  PayoutError,
  recordReferral,
  requestPayout,
  resolveReferralCode,
  validateAffiliateEligibility,
} from '../affiliate-store';

// 'G' + 55 base32 chars = valid Stellar address format.
const wallet = (ch: string) => `G${ch.repeat(55)}`;
const W1 = wallet('A');
const W2 = wallet('B');
const W3 = wallet('C');

const oldAccount = new Date(Date.now() - 86_400_000 * 60).toISOString();
const newAccount = new Date(Date.now() - 86_400_000 * 5).toISOString();

const fullEvidence = {
  accountCreatedAt: oldAccount,
  tradingVolumeXlm: 5000,
  verified: true,
};

beforeEach(() => {
  __resetAffiliateStore();
});

describe('issue #12 — affiliate eligibility validation', () => {
  it('approves a wallet that meets every criterion', () => {
    const result = validateAffiliateEligibility({ wallet: W1, ...fullEvidence });
    expect(result.eligible).toBe(true);
    expect(result.reasonCode).toBeUndefined();
    expect(result.requirements.minimumAccountAge).toBe('30 days');
  });

  it('rejects invalid addresses with a machine-readable reason', () => {
    const result = validateAffiliateEligibility({ wallet: 'not-an-address', ...fullEvidence });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ADDRESS');
    expect(result.reason).toBeTruthy();
  });

  it('rejects wallets that are already enrolled', () => {
    enrollAffiliate(W1);
    expect(isEnrolled(W1)).toBe(true);
    const result = validateAffiliateEligibility({ wallet: W1, ...fullEvidence });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe('ALREADY_ENROLLED');
  });

  it('makes self-referral impossible', () => {
    const { code } = getOrCreateReferralCode(W1);
    // Applicant signing up with their own code is rejected…
    const result = validateAffiliateEligibility({ wallet: W1, referrerCode: code });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe('SELF_REFERRAL');
    // …and so is an unknown code (fails closed, never ignored).
    const unknown = validateAffiliateEligibility({ wallet: W2, referrerCode: 'ASTRNOPE123' });
    expect(unknown.eligible).toBe(false);
    expect(unknown.reasonCode).toBe('SELF_REFERRAL');
    // Recording a self-referral directly is refused too.
    expect(() => recordReferral(W1, W1)).toThrow('Self-referral');
  });

  it('allows signup with another affiliate’s code', () => {
    const { code } = getOrCreateReferralCode(W1);
    const result = validateAffiliateEligibility({ wallet: W2, referrerCode: code, ...fullEvidence });
    expect(result.eligible).toBe(true);
  });

  it('rejects new accounts and unverifiable account age', () => {
    expect(
      validateAffiliateEligibility({ wallet: W1, ...fullEvidence, accountCreatedAt: newAccount })
        .reasonCode,
    ).toBe('ACCOUNT_TOO_NEW');
    expect(validateAffiliateEligibility({ wallet: W1 }).reasonCode).toBe('ACCOUNT_AGE_UNVERIFIED');
  });

  it('rejects insufficient or unverifiable trading volume', () => {
    expect(
      validateAffiliateEligibility({ wallet: W1, ...fullEvidence, tradingVolumeXlm: 10 }).reasonCode,
    ).toBe('INSUFFICIENT_VOLUME');
    expect(
      validateAffiliateEligibility({ wallet: W1, accountCreatedAt: oldAccount }).reasonCode,
    ).toBe('VOLUME_UNVERIFIED');
  });

  it('rejects unverified or unconfirmed KYC status', () => {
    expect(
      validateAffiliateEligibility({ wallet: W1, ...fullEvidence, verified: false }).reasonCode,
    ).toBe('NOT_VERIFIED');
    expect(
      validateAffiliateEligibility({
        wallet: W1,
        accountCreatedAt: oldAccount,
        tradingVolumeXlm: 5000,
      }).reasonCode,
    ).toBe('VERIFICATION_UNVERIFIED');
  });

  it('rejects flagged violators', () => {
    flagViolation(W1);
    const result = validateAffiliateEligibility({ wallet: W1, ...fullEvidence });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe('FLAGGED_VIOLATION');
  });
});

describe('issue #10 — referral codes are persisted and resolvable', () => {
  it('returns the same code on repeated calls for the same wallet', () => {
    const first = getOrCreateReferralCode(W1);
    const second = getOrCreateReferralCode(W1);
    expect(second.code).toBe(first.code);
  });

  it('persists codes so they resolve to the owner for attribution', () => {
    const { code } = getOrCreateReferralCode(W1);
    expect(resolveReferralCode(code)).toBe(W1);
    expect(resolveReferralCode('ASTRUNKNOWN1')).toBeNull();
  });

  it('generates collision-free codes across many wallets', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const w = `G${'ABCD234567'.slice(0, 4)}${String(i).padStart(51, 'E')}`.slice(0, 56);
      const { code } = getOrCreateReferralCode(w);
      expect(code).toMatch(/^ASTR[A-Z2-7]{8}$/);
      codes.add(code);
    }
    expect(codes.size).toBe(50);
  });

  it('lists real referral records instead of mock data', () => {
    expect(listReferrals(W1)).toEqual([]);
    recordReferral(W1, W2, { referredUserName: 'User Beta', commissionAmount: '150.00' });
    const referrals = listReferrals(W1);
    expect(referrals).toHaveLength(1);
    expect(referrals[0].referredUserAddress).toBe(W2);
    expect(listReferrals(W3)).toEqual([]);
  });
});

describe('issue #9 — payouts are validated and idempotent', () => {
  beforeEach(() => {
    creditEarnings(W1, 500);
  });

  it('rejects payouts without sufficient pending earnings', () => {
    expect(() => requestPayout({ walletAddress: W2, amount: '100.00', destinationAddress: W2 }))
      .toThrow(expect.objectContaining({ code: 'INSUFFICIENT_EARNINGS' }));
    try {
      requestPayout({ walletAddress: W1, amount: '9999.00', destinationAddress: W1 });
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PayoutError);
      expect((error as PayoutError).code).toBe('INSUFFICIENT_EARNINGS');
      expect((error as PayoutError).httpStatus).toBe(422);
    }
    // Nothing was queued as a side effect of the rejections.
    expect(listPayouts(W1)).toEqual([]);
  });

  it('rejects amounts below the minimum threshold', () => {
    expect(() =>
      requestPayout({ walletAddress: W1, amount: '10.00', destinationAddress: W1 }),
    ).toThrow(expect.objectContaining({ code: 'BELOW_MINIMUM' }));
  });

  it('rejects a duplicate in-flight request so a retry cannot pay twice', () => {
    requestPayout({ walletAddress: W1, amount: '100.00', destinationAddress: W1 });
    expect(() =>
      requestPayout({ walletAddress: W1, amount: '100.00', destinationAddress: W1 }),
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_PAYOUT_IN_FLIGHT' }));
    expect(listPayouts(W1)).toHaveLength(1);
  });

  it('replays an idempotent retry without creating a second payout', () => {
    const first = requestPayout({
      walletAddress: W1,
      amount: '100.00',
      destinationAddress: W1,
      idempotencyKey: 'key-123',
    });
    expect(first.replayed).toBe(false);
    const second = requestPayout({
      walletAddress: W1,
      amount: '100.00',
      destinationAddress: W1,
      idempotencyKey: 'key-123',
    });
    expect(second.replayed).toBe(true);
    expect(second.payout.id).toBe(first.payout.id);
    expect(listPayouts(W1)).toHaveLength(1);
  });

  it('queues (never completes) payouts and reserves pending earnings', () => {
    const { payout } = requestPayout({
      walletAddress: W1,
      amount: '100.00',
      destinationAddress: W1,
    });
    // No transaction hash: funds have not moved; settlement is queued.
    expect(payout.status).toBe('pending');
    expect(payout.transactionHash).toBeUndefined();
    expect(getPendingEarnings(W1)).toBeCloseTo(400);
  });

  it('surfaces backend failure instead of reporting success', () => {
    __setPayoutBackendMode('fail');
    try {
      requestPayout({ walletAddress: W1, amount: '100.00', destinationAddress: W1 });
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PayoutError);
      expect((error as PayoutError).code).toBe('PAYOUT_BACKEND_UNAVAILABLE');
      expect((error as PayoutError).httpStatus).toBe(502);
    }
    const [payout] = listPayouts(W1);
    expect(payout.status).toBe('failed');
  });
});

describe('issue #11 — stats and program come from the store', () => {
  it('aggregates real referral and earnings data', () => {
    expect(getStats(W1)).toEqual({
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: '0.00',
      pendingEarnings: '0.00',
      totalPayouts: '0.00',
      conversionRate: 0,
    });

    const referral = recordReferral(W1, W2, { commissionAmount: '150.00' });
    convertReferral(referral.id);
    recordReferral(W1, W3, { commissionAmount: '0.00' });

    const stats = getStats(W1);
    expect(stats.totalReferrals).toBe(2);
    expect(stats.activeReferrals).toBe(2);
    expect(stats.totalEarnings).toBe('150.00');
    expect(stats.pendingEarnings).toBe('150.00');
    expect(stats.conversionRate).toBe(50);
  });

  it('serves the program config with the contract commission rates', () => {
    const program = getProgram(W1);
    expect(program.commissionStructure).toEqual(
      AFFILIATE_PROGRAM_CONFIG.commissionStructure,
    );
    expect(program.commissionStructure.direct).toBe(10);
    expect(program.minimumPayout).toBe('100.00');
    expect(program.status).toBe('active');
  });
});
