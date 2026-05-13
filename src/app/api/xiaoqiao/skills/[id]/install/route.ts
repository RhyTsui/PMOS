import { NextResponse } from 'next/server';
import { installDemoMcpSkill } from '@/lib/demo-data';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = installDemoMcpSkill(id);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  return NextResponse.json(skill);
}
