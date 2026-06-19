import { NextRequest, NextResponse } from 'next/server';
import { listRoleProfiles } from '@/lib/role-profile-store';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: NextRequest) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ roles: await listRoleProfiles() });
}

export async function POST(request: NextRequest) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ error: 'role_profile_create_disabled' }, { status: 400 });
}
