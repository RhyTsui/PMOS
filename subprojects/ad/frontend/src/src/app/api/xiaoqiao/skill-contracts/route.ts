import { NextResponse } from 'next/server';
import { listSkillContracts, upsertSkillContract } from '@/lib/skill-contract-store';
import type { SkillContract } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const enabled = searchParams.get('enabled');

  let contracts = await listSkillContracts();
  if (category) contracts = contracts.filter(contract => contract.category === category);
  if (priority) contracts = contracts.filter(contract => contract.priority === priority);
  if (enabled === 'true' || enabled === 'false') {
    const expected = enabled === 'true';
    contracts = contracts.filter(contract => Boolean(contract.enabled) === expected);
  }

  return NextResponse.json(contracts);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Partial<SkillContract>;
  const contract = await upsertSkillContract(body);
  return NextResponse.json(contract, { status: 201 });
}

