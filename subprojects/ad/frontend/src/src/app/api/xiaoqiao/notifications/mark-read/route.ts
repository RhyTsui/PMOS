import { NextRequest, NextResponse } from 'next/server';
import { markAutomationNotificationsRead } from '@/lib/notification-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.map((item: unknown) => String(item)) : undefined;
  const notifications = await markAutomationNotificationsRead(scope.key, ids);
  return NextResponse.json({ notifications });
}
