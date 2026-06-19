export interface ConversationTurn {
  role: string;
  content: string;
}

export interface ContextResolution {
  effectiveMessage: string;
  resumedFrom: string;
  reason: 'retry' | 'continue' | 'date_follow_up' | 'scope_follow_up' | 'blocker_follow_up' | '';
}

const RETRY_ONLY_PATTERN = /^(重试|重试一下|再试一次|再查一次|重新查|重新查询|重新调用|继续查询|继续查|再跑一次|重新跑)$/;
const CONTINUE_ONLY_PATTERN = /^(继续|继续一下|继续处理|继续观测|继续查|接着来|往下走)$/;
const DATE_FOLLOW_UP_PATTERN = /^(今天呢|昨天呢|前天呢|上周呢|本周呢|这个月呢|上个月呢|再看今天|再看昨天)$/;
const SCOPE_FOLLOW_UP_PATTERN = /^(安卓|Android|iOS|苹果|只看安卓|只看iOS|换安卓|换iOS|巨量呢|腾讯呢|快手呢|也看一下|这个呢)$/i;
const BLOCKER_FOLLOW_UP_PATTERN = /^(为什么|为什么不能投|为什么失败|失败原因|卡在哪|缺什么|下一步)$/;

function compactMessage(message: string): string {
  return message.replace(/\s+/g, '').replace(/[。！？!?.]+$/g, '');
}

export function isShortFollowUpMessage(message: string): boolean {
  const text = compactMessage(message);
  return RETRY_ONLY_PATTERN.test(text)
    || CONTINUE_ONLY_PATTERN.test(text)
    || DATE_FOLLOW_UP_PATTERN.test(text)
    || SCOPE_FOLLOW_UP_PATTERN.test(text)
    || BLOCKER_FOLLOW_UP_PATTERN.test(text);
}

function classifyFollowUp(message: string): ContextResolution['reason'] {
  const text = compactMessage(message);
  if (RETRY_ONLY_PATTERN.test(text)) return 'retry';
  if (CONTINUE_ONLY_PATTERN.test(text)) return 'continue';
  if (DATE_FOLLOW_UP_PATTERN.test(text)) return 'date_follow_up';
  if (SCOPE_FOLLOW_UP_PATTERN.test(text)) return 'scope_follow_up';
  if (BLOCKER_FOLLOW_UP_PATTERN.test(text)) return 'blocker_follow_up';
  return '';
}

export function resolveConversationContext(
  message: string,
  history: ConversationTurn[] = [],
): ContextResolution {
  const reason = classifyFollowUp(message);
  if (!reason) return { effectiveMessage: message, resumedFrom: '', reason: '' };

  const previousUserMessage = [...history]
    .reverse()
    .find(item =>
      item.role === 'user'
      && item.content.trim()
      && !isShortFollowUpMessage(item.content));

  const resumedFrom = previousUserMessage?.content.trim() || '';
  if (!resumedFrom) return { effectiveMessage: message, resumedFrom: '', reason: '' };

  const reasonText: Record<Exclude<ContextResolution['reason'], ''>, string> = {
    retry: '重试上一轮查询',
    continue: '继续上一轮任务',
    date_follow_up: '按上一轮问题切换时间范围',
    scope_follow_up: '按上一轮问题切换筛选范围',
    blocker_follow_up: '基于上一轮结果追问阻塞原因',
  };

  return {
    effectiveMessage: `${resumedFrom}\n\n[上下文续接] ${reasonText[reason]}：${message}`,
    resumedFrom,
    reason,
  };
}
