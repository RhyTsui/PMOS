import { NextResponse } from 'next/server';
import { getUnreadHighlights } from '@/lib/conversation-highlight-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const highlights = await getUnreadHighlights(scope.key, id);
  return NextResponse.json({ highlights });
}
