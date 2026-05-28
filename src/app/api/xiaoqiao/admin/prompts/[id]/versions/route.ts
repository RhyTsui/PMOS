import { NextResponse } from 'next/server';
import { listPromptVersions } from '@/lib/prompt-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await listPromptVersions(id));
}
