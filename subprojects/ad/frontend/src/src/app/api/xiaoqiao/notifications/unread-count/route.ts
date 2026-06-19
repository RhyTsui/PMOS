import { NextRequest, NextResponse } from 'next/server';
import { getUnreadAutomationNotificationCount } from '@/lib/notification-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const unreadCount = await getUnreadAutomationNotificationCount(scope.key);
  return NextResponse.json({ unread_count: unreadCount });
}
