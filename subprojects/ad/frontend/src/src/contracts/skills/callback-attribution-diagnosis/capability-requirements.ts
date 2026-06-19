export const CALLBACK_ATTR_DIAGNOSIS_CAPABILITY_REQUIREMENTS = {
  requiredIdentifiers: ['app_id'],
  optionalIdentifiers: ['media_id'],
  requiredCapabilities: [
    'app_context.resolve',
    'media_context.resolve',
    'check_base_event_ingestion',
    'check_attr_preprocess_result',
    'check_callback_rule_match',
  ],
  branchCapabilities: {
    ANDROID_SDK: ['check_callback_delivery_trace', 'query_sdk_init_delivery'],
    ANDROID_API: ['check_api_callback_result', 'check_api_callback_retry_detail', 'query_api_callback_log_detail'],
    IOS_HARMONY_ACTIVATION: ['resolve_callback_diagnosis_branch', 'check_ios_activation_callback_closure', 'query_ios_virtual_activation_summary'],
    IOS_HARMONY_API: ['check_ios_api_callback_closure'],
    CONFIG_ANOMALY: ['query_callback_rule_config', 'query_fusion_attr_config'],
  },
  evidencePolicy: {
    requiredSources: ['mcp', 'tool'],
    requiredEvidenceKinds: ['tool-output', 'runtime-trace', 'query-result'],
  },
} as const;
