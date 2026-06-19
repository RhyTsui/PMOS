import { NextResponse } from 'next/server';
import { deleteSkill, getSkill, updateSkill } from '@/lib/skill-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await getSkill(id);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  return NextResponse.json(skill);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = await getSkill(id);
  const body = await request.json();
  const skill = await updateSkill(id, body);
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  const context = await resolveAdminRequestContext(request);
  if (context) {
    await logAdminOperation({
      context,
      module: 'skill',
      action: 'update',
      targetType: 'skill',
      targetId: skill.id,
      targetName: skill.name,
      summary: 'update skill ' + skill.name,
      changes: before ? [
        describeFieldChange('name', before.name, skill.name),
        describeFieldChange('description', before.description, skill.description),
        describeFieldChange('category', before.category, skill.category),
        describeFieldChange('endpoint_url', before.endpoint_url, skill.endpoint_url),
        describeFieldChange('transport', before.transport, skill.transport),
        describeFieldChange('auth_type', before.auth_type, skill.auth_type),
        describeFieldChange('prompt_template', before.prompt_template, skill.prompt_template),
        describeFieldChange('mcp_server_id', before.mcp_server_id, skill.mcp_server_id),
        describeFieldChange('expected_tools', before.expected_tools?.map(tool => tool.name), skill.expected_tools?.map(tool => tool.name)),
        describeFieldChange('use_cases', before.use_cases, skill.use_cases),
        describeFieldChange('installed', before.installed, skill.installed),
      ] : undefined,
    });
  }
  return NextResponse.json(skill);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = await getSkill(id);
  const ok = await deleteSkill(id);
  const context = await resolveAdminRequestContext(_request);
  if (ok && before && context) {
    await logAdminOperation({
      context,
      module: 'skill',
      action: 'delete',
      targetType: 'skill',
      targetId: before.id,
      targetName: before.name,
      summary: 'delete skill ' + before.name,
      changes: [
        describeFieldChange('installed', before.installed, false),
      ],
    });
  }
  return NextResponse.json({ success: ok });
}
