import { NextResponse } from 'next/server';
import { updatePromptBinding } from '@/lib/prompt-store';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const binding = await updatePromptBinding(id, body);
  return NextResponse.json(binding);
}
