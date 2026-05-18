import { NextResponse } from 'next/server';
import { getDemoMcpSkill, updateDemoMcpSkill, deleteDemoMcpSkill } from '@/lib/demo-data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = getDemoMcpSkill(id);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  return NextResponse.json(skill);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const skill = updateDemoMcpSkill(id, body);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  return NextResponse.json(skill);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteDemoMcpSkill(id);
  return NextResponse.json({ success: ok });
}
