/**
 * Feedback Loop — 服务沉淀
 *
 * 当 CaseFrame 进入 resolved 状态时，自动沉淀：
 * 1. 知识草稿 — 本次排查/服务的结论摘要
 * 2. 别名候选 — 新发现的字段/实体别名
 * 3. 评测用例 — 本次对话作为评测样本
 * 4. 能力缺口 — 发现但无法处理的需求
 *
 * 沉淀的数据进入各自的 store，供后续服务复用。
 *
 * 设计原则：
 * 1. 沉淀是异步的，不阻塞主流程
 * 2. 沉淀内容需要人工审核后才能进入正式知识库
 * 3. 每个沉淀项都有来源追溯（caseId、conversationId）
 */

import type { CaseFrame } from '@/contracts/case-frame';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';

// ─── Deposit Types ─────────────────────────────────────

export type DepositType = 'knowledge' | 'alias' | 'eval_case' | 'capability_gap';

export interface KnowledgeDraft {
  id: string;
  caseId: string;
  conversationId: string;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
}

export interface AliasCandidate {
  id: string;
  caseId: string;
  entityType: string;
  canonical: string;
  alias: string;
  source: string;
  confidence: number;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
}

export interface EvalCaseCandidate {
  id: string;
  caseId: string;
  conversationId: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  tags: string[];
  serviceType: string;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CapabilityGapRecord {
  id: string;
  caseId: string;
  conversationId: string;
  description: string;
  userAsk: string;
  missingCapability: string;
  suggestedAction: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

// ─── Store Paths ───────────────────────────────────────

const KNOWLEDGE_DRAFTS_PATH = runtimeDataPath('feedback-knowledge-drafts.json');
const ALIAS_CANDIDATES_PATH = runtimeDataPath('feedback-alias-candidates.json');
const EVAL_CASES_PATH = runtimeDataPath('feedback-eval-cases.json');
const CAPABILITY_GAPS_PATH = runtimeDataPath('feedback-capability-gaps.json');

// ─── Store Operations ──────────────────────────────────

async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// ─── Knowledge Drafts ──────────────────────────────────

export async function saveKnowledgeDraft(draft: KnowledgeDraft): Promise<void> {
  const drafts = await readJsonFile<KnowledgeDraft[]>(KNOWLEDGE_DRAFTS_PATH, []);
  drafts.unshift(draft);
  await writeJsonFile(KNOWLEDGE_DRAFTS_PATH, drafts.slice(0, 500)); // 保留最近 500 条
}

export async function listKnowledgeDrafts(status?: string): Promise<KnowledgeDraft[]> {
  const drafts = await readJsonFile<KnowledgeDraft[]>(KNOWLEDGE_DRAFTS_PATH, []);
  return status ? drafts.filter(d => d.status === status) : drafts;
}

// ─── Alias Candidates ──────────────────────────────────

export async function saveAliasCandidate(candidate: AliasCandidate): Promise<void> {
  const candidates = await readJsonFile<AliasCandidate[]>(ALIAS_CANDIDATES_PATH, []);
  candidates.unshift(candidate);
  await writeJsonFile(ALIAS_CANDIDATES_PATH, candidates.slice(0, 1000));
}

export async function listAliasCandidates(status?: string): Promise<AliasCandidate[]> {
  const candidates = await readJsonFile<AliasCandidate[]>(ALIAS_CANDIDATES_PATH, []);
  if (status) return candidates.filter(c => c.status === status);
  return candidates;
}

// ─── Eval Cases ────────────────────────────────────────

export async function saveEvalCaseCandidate(candidate: EvalCaseCandidate): Promise<void> {
  const candidates = await readJsonFile<EvalCaseCandidate[]>(EVAL_CASES_PATH, []);
  candidates.unshift(candidate);
  await writeJsonFile(EVAL_CASES_PATH, candidates.slice(0, 500));
}

export async function listEvalCaseCandidates(status?: string): Promise<EvalCaseCandidate[]> {
  const candidates = await readJsonFile<EvalCaseCandidate[]>(EVAL_CASES_PATH, []);
  if (status) return candidates.filter(c => c.status === status);
  return candidates;
}

// ─── Capability Gaps ───────────────────────────────────

export async function saveCapabilityGap(gap: CapabilityGapRecord): Promise<void> {
  const gaps = await readJsonFile<CapabilityGapRecord[]>(CAPABILITY_GAPS_PATH, []);
  gaps.unshift(gap);
  await writeJsonFile(CAPABILITY_GAPS_PATH, gaps.slice(0, 200));
}

export async function listCapabilityGaps(status?: string): Promise<CapabilityGapRecord[]> {
  const gaps = await readJsonFile<CapabilityGapRecord[]>(CAPABILITY_GAPS_PATH, []);
  if (status) return gaps.filter(g => g.status === status);
  return gaps;
}

// ─── Main Deposit Function ─────────────────────────────

/**
 * 从 CaseFrame 中提取并沉淀各类数据。
 * 异步执行，不阻塞主流程。
 */
export async function depositCaseFrame(caseFrame: CaseFrame): Promise<{
  knowledgeDrafts: number;
  aliasCandidates: number;
  evalCases: number;
  capabilityGaps: number;
}> {
  const result = {
    knowledgeDrafts: 0,
    aliasCandidates: 0,
    evalCases: 0,
    capabilityGaps: 0,
  };

  // 1. 沉淀知识草稿（如果有诊断结论或排查结论）
  const diagnosisFacts = caseFrame.knownFacts.filter(
    f => f.source === 'diagnostic_evidence' || f.source === 'tool_result',
  );
  if (diagnosisFacts.length > 0 && caseFrame.realGoal) {
    const draft: KnowledgeDraft = {
      id: `kd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      caseId: caseFrame.caseId,
      conversationId: caseFrame.conversationId,
      title: caseFrame.realGoal.slice(0, 100),
      content: diagnosisFacts.map(f => f.content).join('\n\n'),
      tags: [caseFrame.serviceType || 'unknown', ...caseFrame.tags],
      confidence: 0.7,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      createdBy: 'feedback-loop',
    };
    await saveKnowledgeDraft(draft);
    result.knowledgeDrafts++;
  }

  // 2. 沉淀别名候选（从 assumptions 中提取可能的别名）
  for (const assumption of caseFrame.assumptions) {
    if (assumption.confidence > 0.6 && assumption.statement.includes('=')) {
      // 尝试提取 "X = Y" 形式的别名
      const match = assumption.statement.match(/(.+?)\s*[=叫是]\s*(.+)/);
      if (match) {
        const candidate: AliasCandidate = {
          id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          caseId: caseFrame.caseId,
          entityType: 'unknown', // 需要后续 NLP 识别
          canonical: match[1].trim(),
          alias: match[2].trim(),
          source: `case-${caseFrame.caseId}`,
          confidence: assumption.confidence,
          status: 'pending_review',
          createdAt: new Date().toISOString(),
        };
        await saveAliasCandidate(candidate);
        result.aliasCandidates++;
      }
    }
  }

  // 3. 沉淀评测用例（如果有明确的输入输出）
  if (caseFrame.surfaceAsks.length > 0 && caseFrame.generatedReply) {
    const evalCase: EvalCaseCandidate = {
      id: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      caseId: caseFrame.caseId,
      conversationId: caseFrame.conversationId,
      input: caseFrame.surfaceAsks[0],
      expectedOutput: caseFrame.generatedReply,
      tags: [caseFrame.serviceType || 'unknown', ...caseFrame.tags],
      serviceType: caseFrame.serviceType || 'unknown',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };
    await saveEvalCaseCandidate(evalCase);
    result.evalCases++;
  }

  // 4. 沉淀能力缺口（从 missingInputs 和 openQuestions 中提取）
  if (caseFrame.missingInputs.length > 0 || caseFrame.openQuestions.length > 0) {
    const gap: CapabilityGapRecord = {
      id: `cg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      caseId: caseFrame.caseId,
      conversationId: caseFrame.conversationId,
      description: `缺失输入: ${caseFrame.missingInputs.join(', ') || '无'}; 待解答: ${caseFrame.openQuestions.join(', ') || '无'}`,
      userAsk: caseFrame.surfaceAsks[0] || '',
      missingCapability: caseFrame.serviceType ? `need_${caseFrame.serviceType}` : 'unknown',
      suggestedAction: 'review and implement missing capability',
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await saveCapabilityGap(gap);
    result.capabilityGaps++;
  }

  // 5. 更新 CaseFrame 的沉淀标记
  caseFrame.deposited = true;
  caseFrame.depositedAt = new Date().toISOString();
  caseFrame.depositTypes = [];
  if (result.knowledgeDrafts > 0) caseFrame.depositTypes.push('knowledge');
  if (result.aliasCandidates > 0) caseFrame.depositTypes.push('alias');
  if (result.evalCases > 0) caseFrame.depositTypes.push('eval_case');
  if (result.capabilityGaps > 0) caseFrame.depositTypes.push('capability_gap');

  return result;
}

// ─── Summary ───────────────────────────────────────────

export interface FeedbackLoopSummary {
  knowledgeDrafts: number;
  aliasCandidates: number;
  evalCases: number;
  capabilityGaps: number;
  pendingReview: number;
}

export async function getFeedbackLoopSummary(): Promise<FeedbackLoopSummary> {
  const [knowledgeDrafts, aliasCandidates, evalCases, capabilityGaps] = await Promise.all([
    listKnowledgeDrafts(),
    listAliasCandidates(),
    listEvalCaseCandidates(),
    listCapabilityGaps(),
  ]);

  const pendingReview =
    knowledgeDrafts.filter(d => d.status === 'pending_review').length +
    aliasCandidates.filter(c => c.status === 'pending_review').length +
    evalCases.filter(c => c.status === 'pending_review').length;

  return {
    knowledgeDrafts: knowledgeDrafts.length,
    aliasCandidates: aliasCandidates.length,
    evalCases: evalCases.length,
    capabilityGaps: capabilityGaps.length,
    pendingReview,
  };
}
