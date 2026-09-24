import { NextRequest, NextResponse } from 'next/server';
import { getProgram } from '@/lib/affiliate-store';

/**
 * GET /api/affiliates/program
 * Fetch affiliate program details. The tier structure and commission rates
 * come from the single source of truth in lib/affiliate-store (which
 * mirrors referral-contract), not a per-route literal. Program
 * configuration changes rarely, so the response is cacheable.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(getProgram(), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching program details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
