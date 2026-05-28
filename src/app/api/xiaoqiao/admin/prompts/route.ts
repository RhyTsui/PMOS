import { NextResponse } from 'next/server';
import { createPrompt, listPrompts } from '@/lib/prompt-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;
  const prompts = await listPrompts({ category, status });
  return NextResponse.json(prompts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = await createPrompt(body);
  return NextResponse.json(prompt, { status: 201 });
}
