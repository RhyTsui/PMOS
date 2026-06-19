import { NextRequest, NextResponse } from 'next/server';
import { listCommittedAttachments } from '@/lib/attachment-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await listCommittedAttachments(scope.key));
}
