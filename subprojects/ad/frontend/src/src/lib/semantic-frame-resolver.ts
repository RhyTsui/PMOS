/**
 * Semantic Frame Resolver
 *
 * 从用户输入构建 RequestSemanticFrame。
 *
 * 设计原则：
 * 1. 通用语法规则只产生 semantic frame，不授权执行
 * 2. 业务对象来自 Domain Ontology（通过 Object Resolver）
 * 3. LLM 可参与 frame 生成（未来扩展）
 * 4. frame 只表达理解结果，执行由 execution gate 决定
 */

import type {
  RequestSemanticFrame,
  SpeechAct,
  SemanticTask,
  ExecutionMode,
  EvidenceNeed,
} from '@/contracts/request-understanding/semantic-frame-contract';
import type {
  BusinessObjectReference,
} from '@/contracts/request-understanding/domain-ontology-contract';
import {
  speechActToSemanticTask,
  semanticTaskToExecutionMode,
  semanticTaskToEvidenceNeeds,
  semanticTaskToDefaultServiceIntent,
} from '@/contracts/request-understanding/semantic-frame-contract';
import { detectFieldDefinitionSignal } from './field-definition-resolver';
import { resolveBusinessObjects } from './object-resolver';

// ─── Input ───────────────────────────────────────────────

export interface SemanticFrameResolverInput {
  message: string;
  // 未来扩展：
  // domainOntology?: DomainOntology;
  // capabilityManifest?: CapabilityManifest[];
  // llmUnderstanding?: LlmIntentSignal;
}

// ─── Speech Act Detection ────────────────────────────────

function detectSpeechAct(message: string): SpeechAct {
  const text = message.replace(/\s+/g, '').trim();

  // 诊断类：为什么/排查/异常/不一致
  if (/(?:为什么|为啥|排查|异常|不一致|失败|报错|问题|原因)/.test(text)) {
    return 'ask_diagnosis';
  }

  // 定义类：是什么/什么意思/怎么理解/含义/口径（优先级高于操作类）
  if (/(?:是什么|什么意思|怎么理解|什么含义|的口径|的定义|含义|口径)/.test(text)) {
    return 'ask_definition';
  }

  // 方法类：如何/怎么/怎样（优先级高于操作类，因为"如何配置"是问方法，不是请求操作）
  if (/(?:如何|怎么|怎样)/.test(text)) {
    return 'ask_how_to';
  }

  // 操作类：执行/检查/投放/联调/配置/接入（直接请求操作，不含疑问词）
  if (/(?:执行|检查|投放|联调|配置|接入)/.test(text)) {
    return 'request_operation';
  }

  // 数据类：查/查询/数据/报表/日报/统计
  if (/(?:查|查询|看下|数据|报表|日报|周报|月报|统计|取数|明细|趋势)/.test(text)) {
    return 'ask_data';
  }

  // 默认：闲聊
  return 'chat';
}

// ─── Business Object Detection ───────────────────────────

// Fallback 触发条件：只在执行类 speechAct 下触发
const FALLBACK_TRIGGERING_SPEECH_ACTS: SpeechAct[] = ['ask_data', 'request_operation'];

function detectBusinessObjects(message: string, speechAct: SpeechAct): BusinessObjectReference[] {
  // 主路径：使用 Object Resolver 从 Domain Ontology 解析
  const resolverResult = resolveBusinessObjects({ message });
  const objects: BusinessObjectReference[] = [...resolverResult.objects];

  // 特化逻辑：字段定义信号（不属于通用 ontology）
  if (speechAct === 'ask_definition') {
    const fieldSignal = detectFieldDefinitionSignal(message);
    if (fieldSignal.matched) {
      if (fieldSignal.targetObject) {
        objects.push({
          type: 'field',
          reference: fieldSignal.targetObject,
          role: 'context',
          source: 'user_explicit',
          resolved: false,
          confidence: 0.9,
        });
      }
      if (fieldSignal.targetTerm) {
        objects.push({
          type: 'field_value',
          reference: fieldSignal.targetTerm,
          role: 'term',
          source: 'user_explicit',
          resolved: false,
          confidence: fieldSignal.confidence === 'high' ? 0.9 : 0.7,
        });
      }
    }
  }

  // Fallback：只在执行类 speechAct 下触发
  // ask_definition / ask_how_to / ask_diagnosis 不触发 fallback
  // 这确保 "数据口径是什么" 不会因为 surface cue 而生成 report object
  if (objects.length === 0 && FALLBACK_TRIGGERING_SPEECH_ACTS.includes(speechAct)) {
    objects.push(...detectBusinessObjectsFallback(message, speechAct));
  }

  return objects;
}

// ─── Fallback: Legacy Hardcoded Detection ────────────────

/**
 * 遗留硬编码检测，作为 fallback 保留。
 * 只在执行类 speechAct（ask_data / request_operation）下触发。
 *
 * TODO (P1-4): 验证 Object Resolver 覆盖率后移除此 fallback
 */
function detectBusinessObjectsFallback(message: string, _speechAct: SpeechAct): BusinessObjectReference[] {
  const text = message.replace(/\s+/g, '').trim();
  const objects: BusinessObjectReference[] = [];

  // 报表类对象
  if (/(?:报表|日报|周报|月报)/.test(text)) {
    objects.push({
      type: 'report',
      reference: text.match(/(.*?报表|日报|周报|月报)/)?.[1] || '报表',
      role: 'primary_target',
      source: 'fallback',
      resolved: false,
      confidence: 0.7,  // fallback 置信度较低
    });
  }

  // 时间范围
  if (/(?:今天|昨日|本周|上周|本月|上月|最近\d+天)/.test(text)) {
    objects.push({
      type: 'time_range',
      reference: text.match(/(今天|昨日|本周|上周|本月|上月|最近\d+天)/)?.[1] || '',
      role: 'constraint',
      source: 'fallback',
      resolved: false,
      confidence: 0.8,
    });
  }

  return objects;
}

// ─── Slot Detection ──────────────────────────────────────

function detectRequiredSlots(task: SemanticTask, objects: BusinessObjectReference[]): {
  required: string[];
  filled: string[];
  missing: string[];
} {
  const required: string[] = [];
  const filled: string[] = [];

  switch (task) {
    case 'retrieve_report_data':
      required.push('report', 'time_range');
      if (objects.some(o => o.type === 'report')) filled.push('report');
      if (objects.some(o => o.type === 'time_range')) filled.push('time_range');
      break;
    case 'explain_field_or_value':
      required.push('term');
      if (objects.some(o => o.role === 'term')) filled.push('term');
      break;
    case 'diagnose_data_issue':
      required.push('issue_description');
      filled.push('issue_description'); // 假设用户已描述
      break;
    default:
      break;
  }

  const missing = required.filter(slot => !filled.includes(slot));
  return { required, filled, missing };
}

// ─── Main Resolver ───────────────────────────────────────

export function deriveRequestSemanticFrame(input: SemanticFrameResolverInput): RequestSemanticFrame {
  const { message } = input;

  // Step 1: 检测言语行为
  const speechAct = detectSpeechAct(message);

  // Step 2: 推导语义任务
  const semanticTask = speechActToSemanticTask(speechAct);

  // Step 3: 推导执行模式
  const executionMode = semanticTaskToExecutionMode(semanticTask);

  // Step 4: 检测业务对象
  const businessObjects = detectBusinessObjects(message, speechAct);

  // Step 5: 推导证据需求
  const evidenceNeeds = semanticTaskToEvidenceNeeds(semanticTask);

  // Step 6: 检测槽位状态
  const slots = detectRequiredSlots(semanticTask, businessObjects);

  // Step 7: 推导默认 serviceIntent
  const serviceIntent = semanticTaskToDefaultServiceIntent(semanticTask);

  // Step 8: 判断是否需要澄清
  const needsClarification = slots.missing.length > 0;
  const clarificationReason = needsClarification
    ? `缺少必要信息：${slots.missing.join(', ')}`
    : undefined;

  // Step 9: 构建字段定义信号（如果是 explain_field_or_value）
  const fieldDefinition = semanticTask === 'explain_field_or_value'
    ? detectFieldDefinitionSignal(message)
    : undefined;

  return {
    speechAct,
    semanticTask,
    executionMode,
    businessObjects,
    serviceIntent,
    evidenceNeeds,
    requiredSlots: slots.required,
    filledSlots: slots.filled,
    missingSlots: slots.missing,
    needsClarification,
    clarificationReason,
    frameSource: 'syntax_rule',
    confidence: 0.8,
    fieldDefinition: fieldDefinition?.matched ? {
      targetObject: fieldDefinition.targetObject,
      targetTerm: fieldDefinition.targetTerm,
      termRole: fieldDefinition.termRole,
    } : undefined,
  };
}
