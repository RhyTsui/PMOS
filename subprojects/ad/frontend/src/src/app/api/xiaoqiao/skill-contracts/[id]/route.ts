import { NextResponse } from 'next/server';
import { getSkillContract, updateSkillContract } from '@/lib/skill-contract-store';
import type { SkillContract } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contract = await getSkillContract(id);
  if (!contract) return NextResponse.json({ error: 'Skill contract not found' }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Partial<SkillContract>;
  const contract = await updateSkillContract(id, body);
  if (!contract) return NextResponse.json({ error: 'Skill contract not found' }, { status: 404 });
  return NextResponse.json(contract);
}

