import { NextRequest, NextResponse } from 'next/server';
import {
  isValidStellarAddress,
  validateAffiliateEligibility,
} from '@/lib/affiliate-store';

/**
 * GET /api/affiliates/validate?wallet=<address>
 *   [&accountCreatedAt=<iso>&tradingVolumeXlm=<n>&verified=<bool>&referrerCode=<code>]
 * Validate affiliate eligibility.
 *
 * Rejections carry a machine-readable `reasonCode` so the UI can explain
 * the decision instead of failing opaquely. Criteria that cannot be
 * verified from the supplied evidence fail closed (see lib/affiliate-store).
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const wallet = params.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!isValidStellarAddress(wallet)) {
      return NextResponse.json(
        { eligible: false, reasonCode: 'INVALID_ADDRESS', reason: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    const tradingVolumeRaw = params.get('tradingVolumeXlm');
    const verifiedRaw = params.get('verified');

    const result = validateAffiliateEligibility({
      wallet,
      accountCreatedAt: params.get('accountCreatedAt') ?? undefined,
      tradingVolumeXlm: tradingVolumeRaw === null ? undefined : parseFloat(tradingVolumeRaw),
      verified: verifiedRaw === null ? undefined : verifiedRaw === 'true',
      referrerCode: params.get('referrerCode') ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
