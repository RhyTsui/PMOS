import { NextResponse } from 'next/server';
import {
  DebugAutomationServiceError,
  getRuntimeFeatures,
  updateRuntimeFeatures,
} from '@/lib/real-debug-automation-service';

export async function GET() {
  try {
    return NextResponse.json(await getRuntimeFeatures());
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'get debug automation runtime features failed' }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    return NextResponse.json(await updateRuntimeFeatures(body));
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'update debug automation runtime features failed' }, { status: 502 });
  }
}

