import { NextResponse } from 'next/server';
import { resolveConversationContext } from '@/lib/context-engine';
import { buildCompiledContextPackage } from '@/lib/context-compiler';
import type { IntentType, Message } from '@/types';

function projectItemFromProjectContext(projectContext?: string) {
  const text = projectContext?.trim();
  if (!text) return null;
  const appId = /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(text)?.[1];
  const appName = /(?:项目范围|当前项目|项目)[:：]\s*([^\n(（]+)/.exec(text)?.[1]?.trim();
  if (!appId && !appName) return null;
  return { appId, appName };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    message?: string;
    history?: Array<{ role: Message['role']; content: string; createdAt?: string; id?: string; message_id?: string; intent_type?: IntentType; metadata?: Record<string, unknown>; evidence_ids?: string[] }>;
    conversationId?: string;
    projectContext?: string;
  };
  const legacy = resolveConversationContext(body.message || '', body.history || []);
  const currentProject = projectItemFromProjectContext(body.projectContext);
  const compiledContext = await buildCompiledContextPackage({
    scopeKey: body.conversationId || 'context-resolve',
    user: {
      account: 'current-user',
      user_name: 'current-user',
      current: currentProject,
      projects: currentProject ? [currentProject] : [],
    },
    message: body.message || '',
    conversation: {
      conversation_id: body.conversationId,
      recent_messages: (body.history || []).map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
        id: item.id,
        message_id: item.message_id,
        intent_type: item.intent_type,
        metadata: item.metadata,
        evidence_ids: item.evidence_ids,
      })),
    },
  });
  return NextResponse.json({
    ...legacy,
    compiledContext,
    businessContext: compiledContext.businessContext,
    slotState: compiledContext.slotState,
    followUpPolicy: compiledContext.followUpPolicy,
  });
}
