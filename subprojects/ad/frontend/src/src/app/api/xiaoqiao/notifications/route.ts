import { NextRequest, NextResponse } from 'next/server';
import { listAutomationNotifications } from '@/lib/notification-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '50');
  const notifications = await listAutomationNotifications(scope.key);
  return NextResponse.json(notifications.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 50));
}
