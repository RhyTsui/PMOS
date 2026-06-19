import { NextResponse } from 'next/server';
import { isPlaceholderConversationTitle, normalizeConversationTitle } from '@/lib/conversation-title';
import { getPrompt, getPromptContent } from '@/lib/prompt-store';
import { runModelUseCase } from '@/lib/model-use-case-runtime';
import { getModelServiceConfig } from '@/lib/runtime-config';

type TitleMode = 'generate' | 'update';

interface TitleMessageInput {
  role: string;
  content: string;
}

interface TitleRequestBody {
  message?: string;
  history?: TitleMessageInput[];
  latest_messages?: TitleMessageInput[];
  current_title?: string;
  topic_summary?: Record<string, string | undefined>;
  mode?: TitleMode;
}

const GENERATE_PROMPT_ID = 'conversation-title-generate';
const UPDATE_PROMPT_ID = 'conversation-title-update';

const FALLBACK_GENERATE_PROMPT = '请根据用户消息生成一个简短、专业的会话标题，只输出标题本身。';
const FALLBACK_UPDATE_PROMPT = '请判断当前会话标题是否需要更新，只输出新的短标题或保留原标题。';

type PromptSelection = {
  prompt: string;
  promptId: string;
  promptSource: 'managed' | 'hardcoded';
  mode: TitleMode;
};

function normalizeMessages(messages?: TitleMessageInput[]) {
  return (messages || [])
    .filter((item) => item?.content?.trim())
    .slice(-6)
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.trim().slice(0, 600),
    }));
}

function summarizeTopic(input: string, provided?: Record<string, string | undefined>) {
  const text = input.toLowerCase();
  const summary: Record<string, string> = {};

  for (const [key, value] of Object.entries(provided || {})) {
    if (value) summary[key] = value;
  }

  const platformMatches = [
    ['applovin', 'Applovin'],
    ['facebook', 'Facebook'],
    ['meta', 'Meta'],
    ['tiktok', 'TikTok'],
    ['抖音', '抖音'],
    ['巨量', '巨量引擎'],
    ['快手', '快手'],
    ['腾讯', '腾讯广告'],
  ] as const;
  summary.platform ||= platformMatches.find(([keyword]) => text.includes(keyword))?.[1] || '';

  const regionMatches = ['东南亚', '海外', '国内', '美国', '日本', '韩国', '港澳台', '欧洲'];
  summary.region ||= regionMatches.find((region) => input.includes(region)) || '';

  const issueMatches = ['ROI', '回本', 'CTR', 'CVR', '留存', '消耗', '素材', '回传', '归因', '异常', '放量', '联调', '数据波动'];
  summary.core_issue ||= issueMatches.find((issue) => input.includes(issue)) || '';

  if (!summary.analysis_type) {
    if (/联调|回传|归因/.test(input)) summary.analysis_type = '联调排查';
    else if (/异常|波动|下滑|延迟/.test(input)) summary.analysis_type = '异常排查';
    else if (/素材|CTR|CVR|ROI|回本|消耗/.test(input)) summary.analysis_type = '投放分析';
  }

  return summary;
}

function formatMessages(messages: TitleMessageInput[]) {
  return messages.map((item) => `${item.role}: ${item.content}`).join('\n');
}

function fallbackTitle(body: TitleRequestBody, inputText: string): string {
  if (body.mode === 'update' && !isPlaceholderConversationTitle(body.current_title)) {
    return normalizeConversationTitle(body.current_title);
  }
  return normalizeConversationTitle(inputText || '新对话');
}

function resolveTitleMode(body: TitleRequestBody): TitleMode {
  const currentTitle = normalizeConversationTitle(body.current_title || '');
  return body.mode === 'update' && !isPlaceholderConversationTitle(currentTitle)
    ? 'update'
    : 'generate';
}

function isPromptActive(promptConfig: Awaited<ReturnType<typeof getPrompt>>) {
  if (!promptConfig) return false;
  return (
    promptConfig.status === 'active'
    && promptConfig.enabled !== false
  );
}

async function buildPrompt(body: TitleRequestBody, inputText: string): Promise<PromptSelection> {
  const latestMessages = normalizeMessages(body.latest_messages?.length ? body.latest_messages : body.history);
  const currentTitle = normalizeConversationTitle(body.current_title || '');
  const mode = resolveTitleMode(body);
  const promptId = mode === 'update' ? UPDATE_PROMPT_ID : GENERATE_PROMPT_ID;
  const promptConfig = await getPrompt(promptId);
  const promptSource = isPromptActive(promptConfig) ? 'managed' : 'hardcoded';

  const basePrompt = await getPromptContent(
    promptId,
    mode === 'update' ? FALLBACK_UPDATE_PROMPT : FALLBACK_GENERATE_PROMPT,
  );

  if (mode === 'update') {
    const topicSummary = summarizeTopic(inputText, body.topic_summary);
    return {
      prompt: [
        basePrompt,
        '',
        '输入：',
        JSON.stringify({
          current_title: currentTitle,
          topic_summary: topicSummary,
          latest_messages: latestMessages,
        }, null, 2),
      ].join('\n'),
      promptId,
      promptSource,
      mode,
    };
  }

  return {
    prompt: [
      basePrompt,
      '',
      '用户输入：',
      body.message?.trim() || formatMessages(latestMessages) || inputText,
    ].join('\n'),
    promptId,
    promptSource,
    mode,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  await params;
  const body = await request.json().catch(() => ({})) as TitleRequestBody;
  const message = body.message?.trim() || '';
  const latestMessages = normalizeMessages(body.latest_messages?.length ? body.latest_messages : body.history);
  const inputText = [message, ...latestMessages.map((item) => item.content)].filter(Boolean).join('\n').trim();

  if (!inputText && isPlaceholderConversationTitle(body.current_title)) {
    return NextResponse.json({ title: '新对话', source: 'fallback' });
  }

  try {
    const { prompt, promptId, promptSource, mode } = await buildPrompt(body, inputText);
    const result = await runModelUseCase<{ titleText: string }>({
      useCase: 'conversation_title',
      modelServiceConfig: await getModelServiceConfig(),
      promptId,
      input: { promptId, prompt, mode, inputText },
      fallbackText: fallbackTitle(body, inputText),
      consume: {
        enabled: true,
        consumedBy: 'conversation_title_service',
        textField: 'titleText',
        consumedFields: ['titleText'],
      },
      traceMeta: { mode },
    });
    const normalizedTitle = result.consumed && result.text.trim()
      ? normalizeConversationTitle(result.text, { truncate: false })
      : '';
    const responseSource = result.consumed ? 'model' : 'fallback';

    return NextResponse.json({
      title: normalizedTitle || fallbackTitle(body, inputText),
      source: responseSource,
      prompt_id: promptId,
      prompt_source: promptSource,
    });
  } catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackMode = resolveTitleMode(body) === 'update' ? UPDATE_PROMPT_ID : GENERATE_PROMPT_ID;
    return NextResponse.json({
      title: fallbackTitle(body, inputText),
      source: 'model_unavailable',
      prompt_id: fallbackMode,
      prompt_source: 'hardcoded',
      error_message: errorMessage,
    });
  }
}
