import { NextResponse } from 'next/server';
import { createSkill, listSkills } from '@/lib/skill-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || undefined;
  const category = searchParams.get('category') || undefined;
  let skills = await listSkills();
  if (source) skills = skills.filter(s => s.source === source);
  if (category) skills = skills.filter(s => s.category === category);
  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  const body = await request.json();
  const skill = await createSkill(body);
  return NextResponse.json(skill, { status: 201 });
}
