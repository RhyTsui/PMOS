import { NextResponse } from 'next/server';
import { setSkillInstalled } from '@/lib/skill-store';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await setSkillInstalled(id, true);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  return NextResponse.json(skill);
}
