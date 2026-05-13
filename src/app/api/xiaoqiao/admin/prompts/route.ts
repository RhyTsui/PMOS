import { NextResponse } from 'next/server';
import { getDemoPrompts, createDemoPrompt } from '@/lib/demo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;
  const prompts = getDemoPrompts();
  const filtered = prompts.filter(p => (!category || p.category === category) && (!status || p.status === status));
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = createDemoPrompt(body);
  return NextResponse.json(prompt, { status: 201 });
}
