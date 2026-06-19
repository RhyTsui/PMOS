import { truncate } from './chat-runtime/payload-compact';

type OpenAnswerContext = {
  capabilities?: unknown;
  assistantProfile?: unknown;
  capabilityOverview?: unknown;
  knowledge?: unknown;
  publicWeb?: unknown;
  project?: unknown;
  preference?: unknown;
  memory?: unknown;
  history?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hasMeaningfulRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (isRecord(item)) return hasMeaningfulRecord(item);
    return item !== undefined && item !== null && item !== '';
  });
}

function readCapabilityNames(capabilities: unknown): string[] {
  if (!isRecord(capabilities)) return [];
  return readArray(capabilities.manifest)
    .map((item) => isRecord(item) ? String(item.name || item.id || '').trim() : '')
    .filter(Boolean)
    .slice(0, 3);
}

function readCapabilityOverviewLabels(overview: unknown): string[] {
  if (!isRecord(overview)) return [];
  return readArray(overview[`dynamic_${'signals'}`])
    .filter((item) => isRecord(item) && item.available !== false)
    .map((item) => isRecord(item) ? String(item.label || '').trim() : '')
    .filter(Boolean)
    .slice(0, 4);
}

function readGroundedPublicWebAnswer(context?: OpenAnswerContext | null): string | undefined {
  const publicWeb = isRecord(context?.publicWeb) ? context.publicWeb : undefined;
  if (!publicWeb) return undefined;
  const candidate = isRecord(publicWeb.candidate) ? publicWeb.candidate : {};
  const status = String(candidate.status || publicWeb.status || '').trim();
  const sourceCount = readNumber(candidate.source_count) ?? readNumber(publicWeb.source_count) ?? 0;
  const answerCandidate = typeof publicWeb.answer_candidate === 'string'
    ? publicWeb.answer_candidate.trim()
    : '';
  if (status !== 'success' || sourceCount <= 0 || !answerCandidate) return undefined;
  return answerCandidate;
}

function readGroundedKnowledgeAnswer(context?: OpenAnswerContext | null): string | undefined {
  const knowledge = isRecord(context?.knowledge) ? context.knowledge : undefined;
  if (!knowledge) return undefined;
  const status = String(knowledge.status || '').trim();
  if (status === 'failed' || status === 'not_configured' || status === 'no_hit') return undefined;
  const hits = readArray(knowledge.hits)
    .map((item) => {
      if (!isRecord(item)) return undefined;
      const title = String(item.title || '').trim();
      const content = String(item.content || item.summary || '').trim();
      const source = String(item.source || '').trim();
      if (!title && !content && !source) return undefined;
      return {
        title: truncate(title || source || '相关资料', 48),
        content: truncate(content, 140),
      };
    })
    .filter(Boolean) as Array<{ title: string; content: string }>;
  if (!hits.length) return undefined;

  const lines = [
    '基于内部知识库命中的资料，当前可以先参考以下信息：',
    '',
    ...hits.slice(0, 3).map((hit) => hit.content
      ? `- ${hit.title}：${hit.content}`
      : `- ${hit.title}`),
  ];
  lines.push('', '当前模型总结链路未能稳定生成完整表述，以上为已命中资料的直接摘要；如需更精确结论，可以继续补充范围或让我按这些资料展开。');
  return lines.join('\n');
}

function readContextCues(context?: OpenAnswerContext | null): string[] {
  if (!context) return [];
  const cues: string[] = [];
  const overviewLabels = readCapabilityOverviewLabels(context.capabilityOverview);
  if (overviewLabels.length) {
    cues.push(...overviewLabels.map((item) => truncate(item, 32)));
  }

  const capabilityNames = readCapabilityNames(context.capabilities);
  const capabilities = isRecord(context.capabilities) ? context.capabilities : {};
  const mcpServers = readArray(capabilities.mcpServers).length;
  const enabledSkills = readArray(capabilities.enabledSkills).length;
  if (!overviewLabels.length && capabilityNames.length) {
    cues.push(`已接入能力（如 ${capabilityNames.map((item) => truncate(item, 24)).join('、')}）`);
  } else if (!overviewLabels.length && mcpServers + enabledSkills > 0) {
    cues.push(`已接入能力（${mcpServers + enabledSkills} 项）`);
  }

  const knowledge = isRecord(context.knowledge) ? context.knowledge : {};
  const hitCount = readNumber(knowledge.hitCount);
  if (hitCount && hitCount > 0) cues.push(`知识库命中资料（${hitCount} 条）`);

  if (hasMeaningfulRecord(context.project)) cues.push('当前项目上下文');

  const preference = isRecord(context.preference) ? context.preference : {};
  if (preference.roleName || preference.currentRole || readArray(preference.activePreferences).length) {
    cues.push('你的角色与偏好');
  }

  const memory = isRecord(context.memory) ? context.memory : {};
  const memoryCount = readNumber(memory.count);
  if (memoryCount && memoryCount > 0) cues.push('历史记忆');

  const history = isRecord(context.history) ? context.history : {};
  if (readArray(history.recentQuestions).length || readArray(history.currentConversation).length) {
    cues.push('当前会话上下文');
  }

  return Array.from(new Set(cues)).slice(0, 4);
}

export function buildOpenAnswerUnavailableFallback(params: {
  context?: OpenAnswerContext | null;
  serviceIntent?: string;
}): string {
  const publicWebAnswer = readGroundedPublicWebAnswer(params.context);
  if (publicWebAnswer) return publicWebAnswer;
  const knowledgeAnswer = readGroundedKnowledgeAnswer(params.context);
  if (knowledgeAnswer) return knowledgeAnswer;

  if (params.serviceIntent === 'light_requirement') {
    return '我可以先基于你已给出的目标、范围和期望结果整理需求边界，并标出需要继续确认的信息。';
  }

  const cues = readContextCues(params.context);
  const basis = cues.length ? `基于${cues.join('、')}` : '基于你已提供的问题';
  return `我可以先${basis}帮你拆解问题、整理结论和下一步；需要实时或内部事实时，会按可用证据说明边界。`;
}
