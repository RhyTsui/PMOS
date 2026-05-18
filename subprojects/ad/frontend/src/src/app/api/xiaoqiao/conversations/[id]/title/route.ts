import { NextResponse } from 'next/server';
import { LLMClient } from 'coze-coding-dev-sdk';
import { buildModelSdkConfig, getModelServiceConfig, hasConfiguredModelCredentials } from '@/lib/runtime-config';

interface TitleRequestBody {
  message?: string;
  history?: Array<{ role: string; content: string }>;
}

function normalizeTitle(input: string): string {
  return input
    .replace(/^["'「『《【\s]+|["'」』》】\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

function fallbackTitle(message: string): string {
  const clean = message
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeTitle(clean || '新对话') || '新对话';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  await params;
  const body = (await request.json()) as TitleRequestBody;
  const message = body.message?.trim() || '';

  if (!message) {
    return NextResponse.json({ title: '新对话', source: 'fallback' });
  }

  const modelServiceConfig = await getModelServiceConfig();
  if (!hasConfiguredModelCredentials(modelServiceConfig)) {
    return NextResponse.json({ title: fallbackTitle(message), source: 'fallback' });
  }

  try {
    const llmClient = new LLMClient(buildModelSdkConfig(modelServiceConfig));
    const prompt = [
      '你是智投chat的会话标题生成器。',
      '请根据用户第一轮输入生成一个中文短标题。',
      '要求：不超过18个字；不要标点；不要解释；不要出现“标题”二字。',
      '',
      `用户输入：${message}`,
    ].join('\n');

    let title = '';
    for await (const chunk of llmClient.stream([
      { role: 'user' as const, content: prompt },
    ], { model: modelServiceConfig.modelName, thinking: 'disabled' })) {
      title += typeof chunk.content === 'string' ? chunk.content : '';
      if (title.length > 40) break;
    }

    return NextResponse.json({
      title: normalizeTitle(title) || fallbackTitle(message),
      source: normalizeTitle(title) ? 'model' : 'fallback',
    });
  } catch {
    return NextResponse.json({ title: fallbackTitle(message), source: 'fallback' });
  }
}
