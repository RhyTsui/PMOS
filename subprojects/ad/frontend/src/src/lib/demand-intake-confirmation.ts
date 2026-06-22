/**
 * Demand Intake Confirmation（P1）
 *
 * 生成需求确认卡，展示所有已识别槽位和风险提示。
 * 当所有必填槽位齐全时，生成确认卡供用户确认。
 *
 * 确认卡使用 Markdown 格式，通过 SemanticResultContract 承载。
 */

import type { DemandIntakeDraft } from '@/lib/demand-intake-structurer';
import {
  DEMAND_INTAKE_SLOT_DEFS,
  getServiceIntakeDisplayName,
  type DemandIntakeSlotValue,
  type ServiceIntakeType,
} from '@/contracts/demand/demand-intake-types';

// ─── 确认卡内容 ──────────────────────────────────────────

export interface DemandConfirmationCard {
  /** Markdown 格式的确认卡内容 */
  markdown: string;
  /** 结构化数据（供前端渲染使用） */
  structured: {
    serviceType: ServiceIntakeType;
    serviceDisplayName: string;
    slots: Array<{
      slotId: string;
      label: string;
      value: string;
      source?: string;
      confirmed?: boolean;
    }>;
    missingInputs: string[];
    riskWarnings: string[];
    artifacts: Array<{
      type: string;
      url?: string;
      title?: string;
    }>;
    intakeDraftStatus: string;
  };
}

// ─── 槽位值格式化 ────────────────────────────────────────

function formatSlotValue(slotId: string, value: string): string {
  // 敏感项不展示明文
  const sensitiveSlots = ['test_account', 'auth_method'];
  if (sensitiveSlots.includes(slotId)) {
    return '***（已加密，不在确认卡展示）';
  }

  // URL 格式化
  if (slotId === 'document_url' && value.startsWith('http')) {
    return `[对接文档](${value})`;
  }

  return value;
}

// ─── 确认卡生成 ──────────────────────────────────────────

/**
 * 生成需求确认卡。
 *
 * @param draft 结构化 intake draft
 * @returns 确认卡内容（Markdown + 结构化数据）
 */
export function generateDemandConfirmationCard(draft: DemandIntakeDraft): DemandConfirmationCard | null {
  // 只有当所有必填槽位齐全时才生成确认卡
  if (!draft.serviceType || draft.intakeDraftStatus !== 'ready_for_confirmation') {
    return null;
  }

  const serviceType = draft.serviceType;
  const serviceDisplayName = getServiceIntakeDisplayName(serviceType);
  const slotDefs = DEMAND_INTAKE_SLOT_DEFS[serviceType];

  // 构建槽位列表
  const slots: DemandConfirmationCard['structured']['slots'] = [];
  for (const def of slotDefs) {
    const slotValue = draft.collectedSlots[def.slotId];
    if (slotValue?.value) {
      slots.push({
        slotId: def.slotId,
        label: def.label,
        value: formatSlotValue(def.slotId, slotValue.value),
        source: slotValue.source,
        confirmed: slotValue.confirmed,
      });
    }
  }

  // 构建产物列表
  const artifacts = draft.artifacts.map(a => ({
    type: a.type,
    url: a.url,
    title: a.title || a.url,
  }));

  // 构建 Markdown
  const mdParts: string[] = [];

  mdParts.push(`## 📋 ${serviceDisplayName}需求确认\n`);

  mdParts.push('**已识别信息：**\n');
  for (const slot of slots) {
    mdParts.push(`- **${slot.label}**：${slot.value}`);
  }

  if (draft.riskWarnings.length > 0) {
    mdParts.push('\n**⚠️ 风险提示：**\n');
    for (const warning of draft.riskWarnings) {
      mdParts.push(`- ${warning}`);
    }
  }

  mdParts.push('\n---\n');
  mdParts.push('**请确认以上信息是否准确。**');
  mdParts.push('');
  mdParts.push('回复"确认"将生成需求单，进入需求池。');
  mdParts.push('如需修改，请直接补充或更正信息。');

  const markdown = mdParts.join('\n');

  return {
    markdown,
    structured: {
      serviceType,
      serviceDisplayName,
      slots,
      missingInputs: draft.missingInputs,
      riskWarnings: draft.riskWarnings,
      artifacts,
      intakeDraftStatus: draft.intakeDraftStatus,
    },
  };
}

// ─── 缺失项追问卡 ────────────────────────────────────────

/**
 * 生成缺失项追问卡。
 *
 * @param draft 结构化 intake draft
 * @returns 追问卡 Markdown
 */
export function generateMissingInputsPrompt(draft: DemandIntakeDraft): string {
  if (!draft.serviceType || draft.missingInputs.length === 0) {
    return '';
  }

  const serviceDisplayName = getServiceIntakeDisplayName(draft.serviceType);
  const parts: string[] = [];

  parts.push(`识别到${serviceDisplayName}需求。\n`);

  // 已识别信息
  const collectedEntries = Object.entries(draft.collectedSlots).filter(([, v]) => v.value);
  if (collectedEntries.length > 0) {
    parts.push('**已识别信息：**\n');
    const slotDefs = DEMAND_INTAKE_SLOT_DEFS[draft.serviceType];
    for (const [slotId, slotValue] of collectedEntries) {
      const def = slotDefs.find(d => d.slotId === slotId);
      const label = def?.label || slotId;
      parts.push(`- ${label}：${formatSlotValue(slotId, slotValue.value!)}`);
    }
    parts.push('');
  }

  // 缺失项
  parts.push(`**还需要补充以下信息：**\n`);
  for (const missing of draft.missingInputs) {
    parts.push(`- ${missing}`);
  }

  // 风险提示
  if (draft.riskWarnings.length > 0) {
    parts.push('\n**⚠️ 风险提示：**\n');
    for (const warning of draft.riskWarnings) {
      parts.push(`- ${warning}`);
    }
  }

  parts.push('\n请补充以上信息，我将继续为您处理需求。');

  return parts.join('\n');
}

// ─── 确认意图检测 ────────────────────────────────────────

/**
 * 检测用户消息是否为确认意图。
 *
 * @param message 用户消息
 * @returns 是否为确认意图
 */
export function isConfirmationIntent(message: string): boolean {
  const normalized = String(message || '').trim().toLowerCase();

  // 明确的确认词
  const confirmPatterns = [
    /^确认$/,
    /^是的$/,
    /^对$/,
    /^没错$/,
    /^好的，确认$/,
    /^确认以上信息$/,
    /^信息正确$/,
    /^没有问题$/,
    /^可以$/,
    /^ok$/,
    /^yes$/,
    /^confirm$/,
  ];

  return confirmPatterns.some(pattern => pattern.test(normalized));
}
