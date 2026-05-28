import { NextResponse } from 'next/server';
import { getPrompt, updatePrompt } from '@/lib/prompt-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  return NextResponse.json(prompt);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const prompt = await updatePrompt(id, body);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  return NextResponse.json(prompt);
}
