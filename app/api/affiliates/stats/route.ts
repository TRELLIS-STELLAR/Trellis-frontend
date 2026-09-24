import { NextRequest, NextResponse } from 'next/server';
import { getStats, isValidStellarAddress } from '@/lib/affiliate-store';

/**
 * GET /api/affiliates/stats?wallet=<address>
 * Fetch affiliate statistics aggregated from the affiliate store.
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Validate Stellar address format (56 characters, starts with G)
    if (!isValidStellarAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    return NextResponse.json(getStats(wallet));
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
