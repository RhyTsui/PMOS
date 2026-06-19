import type { SkillContract } from '@/types';

export const CALLBACK_ATTR_DIAGNOSIS_SKILL_ID = 'callback-attribution-diagnosis';

export const CALLBACK_ATTR_DIAGNOSIS_TRIGGER_TERMS = [
  // Android
  '安卓归因',
  'Android归因',
  '安卓回推',
  'Android回推',
  'SDK回推',
  'API回推',
  '804',
  'feedback-res',
  'sdk-income',
  'attr-res',
  'attr-require',
  // iOS
  'iOS归因',
  'IOS归因',
  '苹果归因',
  'iOS回推',
  '苹果回推',
  'SKAdNetwork',
  '虚拟激活',
  // 鸿蒙
  '鸿蒙归因',
  '鸿蒙回推',
  'Harmony归因',
  'Harmony回推',
  // 微信/抖音/快手等小游戏
  '微信归因',
  '微信回推',
  '微信小游戏',
  '抖音归因',
  '抖音回推',
  '抖音小游戏',
  '快手归因',
  '快手回推',
  '快手小游戏',
  // 通用
  '媒体回推',
  '归因失败',
  '联调失败',
  '回传失败',
  '归因问题',
  'callback',
  'attribution',
  '回推问题',
  '回调问题',
];

export const CALLBACK_ATTR_DIAGNOSIS_SKILL_CONTRACT: SkillContract = {
  skill_id: CALLBACK_ATTR_DIAGNOSIS_SKILL_ID,
  name: 'APP归因回推问题排查',
  description: '用于诊断 Android/iOS/鸿蒙/微信/抖音等平台媒体归因回推问题。支持 SDK/API 回传、PAY/ACTIVATION/REGISTER 等事件类型，统一工作流按平台分支处理。',
  domain: 'ad-attribution-diagnosis',
  category: 'diagnosis',
  priority: 'P0',
  enabled: true,
  version: '2026-06-10.v1',
  intent_triggers: CALLBACK_ATTR_DIAGNOSIS_TRIGGER_TERMS,
  input_schema: {
    type: 'object',
    properties: {
      app_query: { type: 'string', title: '应用名称或编号' },
      media_query: { type: 'string', title: '媒体名称或编号' },
      media_id: { type: 'string', title: '媒体ID' },
      app_package_type: {
        type: 'string',
        title: '应用包类型',
        enum: ['ANDROID', 'IOS', 'HARMONY', 'WEIXIN', 'DOUYIN', 'KUAISHOU', 'BILIBILI', 'ALIPAY', 'PC', 'WEB', 'OTHER']
      },
      event_type: {
        type: 'string',
        title: '事件类型',
        enum: ['ACTIVATION', 'REGISTER', 'PAY', 'KEY_ACTION', 'DEVICE_RETENTION']
      },
      date_start: { type: 'string', title: '开始日期' },
      date_end: { type: 'string', title: '结束日期' },
      callback_mode: { type: 'string', title: '回传模式' },
      callback_mode_detail: { type: 'string', title: '回传模式详情' },
      problem_desc: { type: 'string', title: '问题描述' },
    },
    required: ['app_query', 'date_start', 'date_end', 'event_type', 'app_package_type'],
  },
  clarification_schema: {
    type: 'object',
    properties: {
      app_query: { type: 'string', title: '应用名称或编号' },
      media_query: { type: 'string', title: '媒体名称或编号' },
      app_package_type: { type: 'string', title: '应用包类型（ANDROID/IOS/HARMONY/WEIXIN等）' },
      event_type: { type: 'string', title: '事件类型（ACTIVATION/REGISTER/PAY等）' },
      date_start: { type: 'string', title: '开始日期' },
      date_end: { type: 'string', title: '结束日期' },
      problem_desc: { type: 'string', title: '问题描述' },
    },
  },
  slot_schema_ref: 'callback-attribution-diagnosis.slot-schema',
  capability_requirements_ref: 'callback-attribution-diagnosis.capability-requirements',
  workflow_ref: 'callback-attribution-diagnosis.workflow',
  prompt_fragment_refs: [
    'diagnosis-role',
    'slot-clarification-policy',
    'evidence-first-policy',
    'platform-branch-policy',
    'result-assembly-policy',
    'forbidden-patterns',
  ],
  result_screen_type: 'workflow-result',
  runtime_display_ref: 'callback-attribution-diagnosis.runtime-display',
  observability_ref: 'callback-attribution-diagnosis.observability',
  selection_policy: {
    requires_trigger_match_for_route_bonus: true,
  },
  default_inputs: {
    date_start: '最近7天',
    date_end: '今天',
  },
  workflow_steps: ([
    // Step 0: 解析应用
    { key: 'resolve_app_context', label: '解析应用信息', tool_bindings: ['diag.fetch_app_context'] },
    // Step 0.5: 解析媒体
    { key: 'resolve_media_context', label: '解析媒体信息', tool_bindings: ['diag.fetch_media_context'] },
    // Step 1: 平台分支判断
    { key: 'platform_branch_decision', label: '平台分支判断' },
    // Android 分支
    { key: 'check_callback_rule_match', label: '检查回传规则匹配', tool_bindings: ['diag.check_callback_rule_match'], branch: 'ANDROID' },
    { key: 'check_callback_delivery_trace', label: '检查SDK回传链路', tool_bindings: ['diag.check_callback_delivery_trace'], branch: 'ANDROID_SDK' },
    { key: 'check_api_callback_result', label: '检查API回传结果', tool_bindings: ['diag.check_api_callback_result'], branch: 'ANDROID_API' },
    // iOS/鸿蒙 分支
    { key: 'resolve_ios_diagnosis_branch', label: '解析iOS/鸿蒙诊断分支', tool_bindings: ['diag.resolve_callback_diagnosis_branch'], branch: 'IOS_HARMONY' },
    { key: 'check_ios_activation_closure', label: '检查iOS激活闭环', tool_bindings: ['diag.check_ios_activation_callback_closure'], branch: 'IOS_ACTIVATION' },
    { key: 'query_ios_virtual_activation', label: '查询iOS虚拟激活', tool_bindings: ['diag.query_ios_virtual_activation_summary'], branch: 'IOS_ACTIVATION' },
    // 通用闭环检查
    { key: 'query_callback_media_event_summary', label: '查询媒体事件汇总', tool_bindings: ['diag.query_callback_media_event_summary'] },
    { key: 'check_base_event_ingestion', label: '检查基础事件入库', tool_bindings: ['diag.check_base_event_ingestion'] },
    { key: 'check_attr_preprocess_result', label: '检查归因预处理结果', tool_bindings: ['diag.check_attr_preprocess_result'] },
    // 可选深入工具
    { key: 'query_callback_rule_config', label: '核对回传规则配置', tool_bindings: ['diag.query_callback_rule_config'] },
    { key: 'query_callback_event_detail', label: '查询回传事件明细', tool_bindings: ['diag.query_callback_event_detail'] },
  ] as unknown as SkillContract['workflow_steps']),
  output_schema: {
    type: 'object',
    properties: {
      platform: { type: 'string', description: '平台类型' },
      branch: { type: 'string', description: '分支类型' },
      summary: { type: 'string', description: '排查结论' },
      evidence: { type: 'array', description: '证据列表' },
      next_actions: { type: 'array', description: '下一步建议' },
    },
  },
  evaluation_cases: [
    'callback-attribution-diagnosis-missing-date-range',
    'callback-attribution-diagnosis-app-selection',
    'callback-attribution-diagnosis-media-selection',
    'callback-attribution-diagnosis-no-event-ingestion',
    'callback-attribution-diagnosis-attr-require-missing',
    'callback-attribution-diagnosis-callback-mode-nothing',
    'callback-attribution-diagnosis-sdk-income-804-mismatch',
    'callback-attribution-diagnosis-api-feedback-res-missing',
    'callback-attribution-diagnosis-ios-activation-virtual',
    'callback-attribution-diagnosis-capability-unavailable',
  ],
  risk_guardrails: [
    '只基于 MCP 返回和可验证证据下结论，不猜根因。',
    '用户只给媒体名或应用名时，必须先做实体归一，不得直接传中文名给下游报表工具。',
    '没有接入能力时明确说明不可用，不伪装成排查结果。',
    'NOTHING 分支必须停止，不得继续推断回传失败。',
    'Android SDK 分支必须完成关键总量对账：base_event_total、attr_require_total、attr_res_total、sdk_income_total、804_total。',
    'iOS/鸿蒙分支必须先确认 branch_key，不得跨分支套用经验。',
  ],
};
