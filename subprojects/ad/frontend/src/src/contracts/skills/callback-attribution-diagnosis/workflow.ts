export type PlatformBranch = 'ANDROID_SDK' | 'ANDROID_API' | 'IOS_HARMONY_ACTIVATION' | 'IOS_HARMONY_API' | 'CONFIG_ANOMALY' | 'NOTHING' | 'common';

export interface CallbackAttributionDiagnosisWorkflowStep {
  key: string;
  label: string;
  toolBindings?: string[];
  branch?: PlatformBranch;
  required?: boolean;
}

export const CALLBACK_ATTR_DIAGNOSIS_WORKFLOW: CallbackAttributionDiagnosisWorkflowStep[] = [
  // Step 0: 解析应用
  {
    key: 'resolve_app_context',
    label: '解析应用信息',
    toolBindings: ['diag.fetch_app_context'],
    branch: 'common',
    required: true,
  },
  // Step 0.5: 解析媒体
  {
    key: 'resolve_media_context',
    label: '解析媒体信息',
    toolBindings: ['diag.fetch_media_context'],
    branch: 'common',
    required: true,
  },
  // Step 1: 平台分支判断（由LLM根据app_package_type决定）
  {
    key: 'platform_branch_decision',
    label: '平台分支判断',
    branch: 'common',
    required: true,
  },
  // Android SDK 分支
  {
    key: 'check_callback_rule_match',
    label: '检查回传规则匹配',
    toolBindings: ['diag.check_callback_rule_match'],
    branch: 'ANDROID_SDK',
    required: true,
  },
  {
    key: 'check_callback_delivery_trace',
    label: '检查SDK回传链路',
    toolBindings: ['diag.check_callback_delivery_trace'],
    branch: 'ANDROID_SDK',
    required: true,
  },
  // Android API 分支
  {
    key: 'check_api_callback_result',
    label: '检查API回传结果',
    toolBindings: ['diag.check_api_callback_result'],
    branch: 'ANDROID_API',
    required: true,
  },
  {
    key: 'check_api_callback_retry_detail',
    label: '检查API回传重试详情',
    toolBindings: ['diag.check_api_callback_retry_detail'],
    branch: 'ANDROID_API',
    required: false,
  },
  // iOS/鸿蒙 激活分支
  {
    key: 'resolve_callback_diagnosis_branch',
    label: '解析iOS/鸿蒙诊断分支',
    toolBindings: ['diag.resolve_callback_diagnosis_branch'],
    branch: 'IOS_HARMONY_ACTIVATION',
    required: true,
  },
  {
    key: 'check_ios_activation_callback_closure',
    label: '检查iOS激活闭环',
    toolBindings: ['diag.check_ios_activation_callback_closure'],
    branch: 'IOS_HARMONY_ACTIVATION',
    required: true,
  },
  {
    key: 'query_ios_virtual_activation_summary',
    label: '查询iOS虚拟激活汇总',
    toolBindings: ['diag.query_ios_virtual_activation_summary'],
    branch: 'IOS_HARMONY_ACTIVATION',
    required: false,
  },
  // iOS/鸿蒙 API分支
  {
    key: 'check_ios_api_callback_closure',
    label: '检查iOS API回传闭环',
    toolBindings: ['diag.check_ios_api_callback_closure'],
    branch: 'IOS_HARMONY_API',
    required: true,
  },
  // 通用闭环检查
  {
    key: 'query_callback_media_event_summary',
    label: '查询媒体事件汇总',
    toolBindings: ['diag.query_callback_media_event_summary'],
    branch: 'common',
    required: true,
  },
  {
    key: 'check_base_event_ingestion',
    label: '检查基础事件入库',
    toolBindings: ['diag.check_base_event_ingestion'],
    branch: 'common',
    required: true,
  },
  {
    key: 'check_attr_preprocess_result',
    label: '检查归因预处理结果',
    toolBindings: ['diag.check_attr_preprocess_result'],
    branch: 'common',
    required: true,
  },
  // 可选深入工具
  {
    key: 'query_callback_rule_config',
    label: '核对回传规则配置',
    toolBindings: ['diag.query_callback_rule_config'],
    branch: 'CONFIG_ANOMALY',
    required: false,
  },
  {
    key: 'query_callback_event_detail',
    label: '查询回传事件明细',
    toolBindings: ['diag.query_callback_event_detail'],
    branch: 'common',
    required: false,
  },
];
