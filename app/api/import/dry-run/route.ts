import { NextRequest, NextResponse } from 'next/server';
import { runImportPipeline } from '@/lib/import/pipeline';
import { ImportOptions } from '@/lib/import/types';

/**
 * POST /api/import/dry-run
 * Explicit dry-run validation endpoint. Guarantees 0 persistent writes.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const { searchParams } = new URL(request.url);

    let bodyData: any;
    let options: ImportOptions = {
      dryRun: true, // Always true for dry-run route
      entityType: (searchParams.get('entityType') as any) || 'general',
      idempotent: searchParams.get('idempotent') !== 'false',
      allowUpdate: searchParams.get('allowUpdate') !== 'false',
    };

    if (contentType.includes('application/json')) {
      const json = await request.json();
      if (json.data) {
        bodyData = json.data;
        options = { ...options, ...json.options, dryRun: true };
      } else {
        bodyData = json;
      }
    } else {
      bodyData = await request.text();
    }

    const result = runImportPipeline(bodyData, options);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Dry-run validation error',
      },
      { status: 500 }
    );
  }
}
