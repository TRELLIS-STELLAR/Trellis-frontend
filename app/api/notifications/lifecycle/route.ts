import { NextRequest, NextResponse } from 'next/server';
import { lifecycleNotifications } from '@/lib/notifications/lifecycle-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || undefined;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const list = lifecycleNotifications.getForUser(wallet, { unreadOnly });
  return NextResponse.json({ notifications: list, total: list.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = lifecycleNotifications.dispatch(body);
    return NextResponse.json(result, { status: result.isDuplicate ? 200 : 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
