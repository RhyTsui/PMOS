import { NextRequest, NextResponse } from 'next/server';
import { deleteRoleProfile, getRoleProfile, updateRoleProfile } from '@/lib/role-profile-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import type { AgentType, IntentType, RolePerspective } from '@/types';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRoleProfile(id);
  if (!role) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ role });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const role = await updateRoleProfile(id, {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    defaultPerspective: typeof body.defaultPerspective === 'string' ? body.defaultPerspective as RolePerspective : undefined,
    allowedPerspectives: Array.isArray(body.allowedPerspectives) ? body.allowedPerspectives.map((item) => String(item) as RolePerspective) : undefined,
    defaultAgent: typeof body.defaultAgent === 'string' ? body.defaultAgent as AgentType : undefined,
    allowedIntentTypes: Array.isArray(body.allowedIntentTypes) ? body.allowedIntentTypes.map((item) => String(item) as IntentType) : undefined,
    scopeTags: Array.isArray(body.scopeTags) ? body.scopeTags.map((item) => String(item)) : undefined,
    routePolicy: typeof body.routePolicy === 'object' && body.routePolicy ? body.routePolicy as never : undefined,
    rolePrompt: typeof body.rolePrompt === 'string' ? body.rolePrompt : undefined,
    resultTemplate: typeof body.resultTemplate === 'object' && body.resultTemplate ? body.resultTemplate as never : undefined,
    responseStyle: typeof body.responseStyle === 'object' && body.responseStyle ? body.responseStyle as never : undefined,
    shortcutEntries: Array.isArray(body.shortcutEntries) ? body.shortcutEntries as never : undefined,
  });

  if (!role) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await logAdminOperation({
    context,
    module: 'role_profile',
    action: 'update',
    targetType: 'role',
    targetId: role.id,
    targetName: role.name,
    summary: 'update role profile ' + role.name,
    changes: [
      describeFieldChange('name', undefined, role.name),
      describeFieldChange('defaultPerspective', undefined, role.defaultPerspective),
    ],
  });

  return NextResponse.json({ role });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const role = await getRoleProfile(id);
  const deleted = await deleteRoleProfile(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found_or_builtin' }, { status: 404 });
  }

  await logAdminOperation({
    context,
    module: 'role_profile',
    action: 'delete',
    targetType: 'role',
    targetId: id,
    targetName: role?.name || id,
    summary: 'delete role profile ' + (role?.name || id),
  });

  return NextResponse.json({ success: true });
}
