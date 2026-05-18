import { NextResponse } from 'next/server';
import { updateSkillContract } from '@/lib/skill-contract-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { enabled?: boolean };
  const contract = await updateSkillContract(id, { enabled: body.enabled ?? true });
  if (!contract) return NextResponse.json({ error: 'Skill contract not found' }, { status: 404 });
  return NextResponse.json(contract);
}

