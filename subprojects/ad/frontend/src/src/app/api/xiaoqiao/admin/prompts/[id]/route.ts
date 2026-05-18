import { NextResponse } from 'next/server';
import { getDemoPrompt, updateDemoPrompt } from '@/lib/demo-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = getDemoPrompt(id);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  return NextResponse.json(prompt);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const prompt = updateDemoPrompt(id, body);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  return NextResponse.json(prompt);
}
