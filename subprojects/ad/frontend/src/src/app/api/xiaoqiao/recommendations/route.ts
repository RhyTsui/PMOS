import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-service';
import {
  loadCachedRecommendations,
  refreshRecommendationBundle,
  scheduleRecommendationRefresh,
} from '@/lib/recommendation-service';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

function readToken(request: NextRequest): string {
  return request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
}

function readContext(request: NextRequest) {
  const url = new URL(request.url);
  return {
    conversationId: url.searchParams.get('conversationId') || undefined,
    activeAgent: url.searchParams.get('activeAgent') || undefined,
    projectContext: url.searchParams.get('projectContext') || undefined,
  };
}

async function readPostContext(request: NextRequest) {
  const urlContext = readContext(request);
  try {
    const body = await request.json() as {
      conversationId?: string;
      activeAgent?: string;
      projectContext?: string;
    };
    return {
      conversationId: body.conversationId || urlContext.conversationId,
      activeAgent: body.activeAgent || urlContext.activeAgent,
      projectContext: body.projectContext || urlContext.projectContext,
    };
  } catch {
    return {
      conversationId: urlContext.conversationId,
      activeAgent: urlContext.activeAgent,
      projectContext: urlContext.projectContext,
    };
  }
}

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: '未登录', recommendations: [] }, { status: 401 });
  }

  const token = readToken(request);
  const context = readContext(request);
  const cached = await loadCachedRecommendations(scope.key);

  if (!cached) {
    if (token) {
      void scheduleRecommendationRefresh({
        token,
        ...context,
      });
    }
    return NextResponse.json({
      recommendations: [],
      source: 'cache',
      updated_at: new Date().toISOString(),
      context: {
        role: scope.user_name,
        recent_conversations: 0,
        recent_tasks: 0,
        active_features: 0,
      },
      refreshing: true,
    });
  }

  if (cached.refreshing && token) {
    void scheduleRecommendationRefresh({
      token,
      ...context,
    });
  }

  return NextResponse.json(cached, { status: 200 });
}

export async function POST(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: '未登录', recommendations: [] }, { status: 401 });
  }

  const token = readToken(request);
  if (!token) {
    return NextResponse.json({ error: '未登录', recommendations: [] }, { status: 401 });
  }

  const context = await readPostContext(request);
  const bundle = await refreshRecommendationBundle({
    token,
    conversationId: context.conversationId,
    activeAgent: context.activeAgent,
    projectContext: context.projectContext,
  });

  return NextResponse.json(bundle, { status: 200 });
}
