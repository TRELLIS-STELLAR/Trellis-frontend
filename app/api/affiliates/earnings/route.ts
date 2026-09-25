import { NextRequest, NextResponse } from 'next/server';
import { getEarningsHistory, isValidStellarAddress } from '@/lib/affiliate-store';

/**
 * GET /api/affiliates/earnings?wallet=<address>&days=<number>
 * Fetch earnings history for charts, aggregated from the affiliate store's
 * referral ledger (the same source the stats endpoint reads). Returns an
 * empty array when the wallet has no converted referrals — not an error.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!isValidStellarAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }

    return NextResponse.json(getEarningsHistory(wallet, days));
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
