import { NextRequest, NextResponse } from 'next/server';
import { runImportPipeline } from '@/lib/import/pipeline';
import { ImportOptions } from '@/lib/import/types';

/**
 * POST /api/import
 * Execute bulk import pipeline with validation, idempotency, duplicate detection, and rollback guidance.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const { searchParams } = new URL(request.url);
    const dryRunParam = searchParams.get('dryRun');

    let bodyData: any;
    let options: ImportOptions = {
      dryRun: dryRunParam !== null ? dryRunParam === 'true' : false,
      entityType: (searchParams.get('entityType') as any) || 'general',
      idempotent: searchParams.get('idempotent') !== 'false',
      allowUpdate: searchParams.get('allowUpdate') !== 'false',
    };

    if (contentType.includes('application/json')) {
      const json = await request.json();
      if (json.data) {
        bodyData = json.data;
        options = { ...options, ...json.options };
      } else {
        bodyData = json;
      }
    } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      bodyData = await request.text();
    } else {
      const text = await request.text();
      try {
        bodyData = JSON.parse(text);
      } catch {
        bodyData = text;
      }
    }

    const result = runImportPipeline(bodyData, options);
    const statusCode = result.success ? 200 : 422;

    return NextResponse.json(result, { status: statusCode });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal import processing error',
      },
      { status: 500 }
    );
  }
}
