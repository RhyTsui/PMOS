import { NextResponse } from 'next/server';
import { setSkillInstalled, getSkill } from '@/lib/skill-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = await getSkill(id);
  const skill = await setSkillInstalled(id, true);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });

  const context = await resolveAdminRequestContext(request);
  if (context) {
    await logAdminOperation({
      context,
      module: 'skill',
      action: 'install',
      targetType: 'skill',
      targetId: skill.id,
      targetName: skill.name,
      summary: 'install skill ' + skill.name,
      changes: before ? [
        describeFieldChange('installed', before.installed, skill.installed),
        describeFieldChange('installed_server_id', before.installed_server_id, skill.installed_server_id),
      ] : undefined,
    });
  }

  return NextResponse.json(skill);
}
