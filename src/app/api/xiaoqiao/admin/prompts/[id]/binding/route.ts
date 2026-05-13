import { NextResponse } from 'next/server';
import { updateDemoPromptBinding } from '@/lib/demo-data';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const binding = updateDemoPromptBinding(id, body);
  return NextResponse.json(binding);
}
