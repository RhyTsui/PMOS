import { NextRequest, NextResponse } from 'next/server';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

const DATAKI_URL = 'https://dataki.dobest.com';

function builtInPersonalKnowledgeConfig() {
  return {
    enabled: true,
    builtIn: true,
    accessUrl: DATAKI_URL,
    apiBase: `${DATAKI_URL}/api/v1`,
    lastTestStatus: 'success',
    lastTestMessage: '已内置个人知识库',
  };
}

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(builtInPersonalKnowledgeConfig());
}

export async function PUT(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(builtInPersonalKnowledgeConfig());
}
