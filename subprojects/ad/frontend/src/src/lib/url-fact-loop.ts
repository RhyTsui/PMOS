/**
 * URL Fact Loop — URL 外部事实循环
 *
 * 当用户输入包含 URL 时，提取 URL 线索并生成搜索假设。
 * 对应 CLI 指令文档「思维链 → 识别层 URL 子流程」和「推进层 → 外部事实循环」。
 *
 * 4 跳循环（hypothesis → search → align → second-hop）：
 * 本模块负责第 1 跳（hypothesis generation）和状态记录。
 * 后续跳由 public-web-runtime 或能力网执行，结果回写到 UrlFactLoopResult。
 *
 * 设计原则：
 * 1. 纯函数，无副作用
 * 2. 不改变主链路控制权
 * 3. 不引入新的 Agent 或执行路径
 */

// ─── 类型定义 ──────────────────────────────────────────────

export interface UrlCue {
  /** 原始 URL（去前后空白） */
  raw: string;
  /** 归一化后 URL（去 query 参数、去锚点、归一化域名） */
  normalized: string;
  /** 域名 */
  domain: string;
  /** 路径段（不含域名） */
  pathSegments: string[];
  /** 域名意图推断 */
  domainIntent?: DomainIntent;
}

export type DomainIntent =
  | 'public_news'      // 公开新闻 / 资讯
  | 'tool_doc'         // 工具 / 平台文档
  | 'dashboard'        // 监控看板 / 数据面板
  | 'account_portal'   // 账号门户
  | 'unknown';

export interface UrlHypothesis {
  /** 搜索关键词 */
  keyword: string;
  /** 来源：域名、路径、锚文本、上下文 */
  source: 'domain' | 'path' | 'anchor' | 'context';
  /** 置信度 0-1 */
  confidence: number;
}

export type UrlLoopPhase =
  | 'none'
  | 'hypothesis_generated'
  | 'search_triggered'
  | 'aligned';

export interface UrlFactLoopResult {
  urlCues: UrlCue[];
  hypotheses: UrlHypothesis[];
  /** 是否判定为外部事实缺口（需触发二级搜索） */
  evidenceGap: boolean;
  /** 当前循环阶段 */
  loopPhase: UrlLoopPhase;
}

// ─── URL 提取 ──────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;

function normalizeUrl(raw: string): string {
  try {
    const trimmed = raw.trim();
    // 补全协议以便 URL 解析
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    // 去 query 参数、去锚点，只保留 origin + pathname
    url.search = '';
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return raw.trim();
  }
}

function extractDomain(raw: string): string {
  try {
    const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function extractPathSegments(raw: string): string[] {
  try {
    const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    return url.pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

const DOMAIN_INTENT_PATTERNS: Array<{ pattern: RegExp; intent: DomainIntent }> = [
  { pattern: /news|article|blog|press/i, intent: 'public_news' },
  { pattern: /docs?|doc|help|guide|manual|api|developer/i, intent: 'tool_doc' },
  { pattern: /dashboard|monitor|analytics|report|insight|panel/i, intent: 'dashboard' },
  { pattern: /account|login|console|portal|admin|settings/i, intent: 'account_portal' },
];

function inferDomainIntent(domain: string, pathSegments: string[]): DomainIntent {
  const signals = [domain, ...pathSegments].join(' ');
  for (const { pattern, intent } of DOMAIN_INTENT_PATTERNS) {
    if (pattern.test(signals)) return intent;
  }
  return 'unknown';
}

/**
 * 从用户消息中提取所有 URL 线索
 */
export function extractUrlCues(message: string): UrlCue[] {
  if (!message || typeof message !== 'string') return [];
  const matches = message.match(URL_REGEX);
  if (!matches) return [];

  const seen = new Set<string>();
  const cues: UrlCue[] = [];

  for (const raw of matches) {
    const normalized = normalizeUrl(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const domain = extractDomain(raw);
    const pathSegments = extractPathSegments(raw);
    const domainIntent = inferDomainIntent(domain, pathSegments);

    cues.push({ raw: raw.trim(), normalized, domain, pathSegments, domainIntent });
  }

  return cues;
}

// ─── 假设生成 ──────────────────────────────────────────────

/**
 * 根据 URL 线索和当前上下文生成搜索假设
 *
 * 对应思维链推进层第 1 跳：
 * - 基于 URL 派生的 hypothesis 生成首批搜索关键词（含域名缩写、页面标题信号）
 */
export function generateUrlHypotheses(
  cues: UrlCue[],
  context: { serviceType?: string; message?: string },
): UrlFactLoopResult {
  if (!cues.length) {
    return { urlCues: [], hypotheses: [], evidenceGap: false, loopPhase: 'none' };
  }

  const hypotheses: UrlHypothesis[] = [];

  for (const cue of cues) {
    // 域名信号作为关键词
    if (cue.domain) {
      const domainKeyword = cue.domain.replace(/\.(com|cn|net|org|io)$/i, '');
      hypotheses.push({
        keyword: domainKeyword,
        source: 'domain',
        confidence: 0.7,
      });
    }

    // 路径信号作为关键词
    if (cue.pathSegments.length > 0) {
      const pathKeyword = cue.pathSegments.slice(-2).join(' ');
      hypotheses.push({
        keyword: pathKeyword,
        source: 'path',
        confidence: 0.6,
      });
    }

    // 域名意图推断补充
    if (cue.domainIntent && cue.domainIntent !== 'unknown') {
      hypotheses.push({
        keyword: `${cue.domain} ${cue.domainIntent.replace('_', ' ')}`,
        source: 'context',
        confidence: 0.5,
      });
    }
  }

  // 判断是否为外部事实缺口：
  // 当 URL 域名意图为 unknown 或不在已有服务域内时，判定为缺口
  const knownServiceDomains = new Set([
    'oceanengine.com', 'bytedance.com', 'pangle.cn',  // 巨量
    'qq.com', 'gtimg.com', 'e.qq.com',                // 腾讯
    'baidu.com', 'bcebos.com',                         // 百度
    'kuaishou.com', 'gifshow.com',                     // 快手
    'xiaohongshu.com',                                 // 小红书
  ]);

  const evidenceGap = cues.some((cue) => {
    if (cue.domainIntent === 'unknown') return true;
    const baseDomain = cue.domain.split('.').slice(-2).join('.');
    return !knownServiceDomains.has(baseDomain);
  });

  return {
    urlCues: cues,
    hypotheses,
    evidenceGap,
    loopPhase: 'hypothesis_generated',
  };
}
