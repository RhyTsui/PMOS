/**
 * Demand Intake Feature Flags
 *
 * 控制需求 intake 链路的各项功能开关。
 * 所有新增逻辑受 feature flag 控制，默认 shadow / no-op。
 */

export interface DemandIntakeFeatureFlags {
  /** 业务文档 URL 不被 public web 抢走 */
  enableBusinessDocumentUrlBypass: boolean;
  /** 启用 demand intake gate */
  enableDemandIntakeGate: boolean;
  /** shadow 模式：记录 metadata 但不改变回答 */
  enableDemandIntakeShadow: boolean;
  /** 用户确认后自动建单（默认关闭） */
  enableDemandPoolCreateOnConfirm: boolean;
  /** 文档 fetch / parse（默认关闭） */
  enableDemandDocumentParse: boolean;
  /** 能力状态检查（默认关闭） */
  enableDemandCapabilityStatusCheck: boolean;
}

export function getDemandIntakeFlags(): DemandIntakeFeatureFlags {
  return {
    enableBusinessDocumentUrlBypass: process.env.XIAOQIAO_ENABLE_BIZ_DOC_URL_BYPASS !== 'false',
    enableDemandIntakeGate: process.env.XIAOQIAO_ENABLE_DEMAND_INTAKE_GATE !== 'false',
    enableDemandIntakeShadow: process.env.XIAOQIAO_ENABLE_DEMAND_INTAKE_SHADOW !== 'false',
    enableDemandPoolCreateOnConfirm: process.env.XIAOQIAO_ENABLE_DEMAND_POOL_CREATE === 'true',
    enableDemandDocumentParse: process.env.XIAOQIAO_ENABLE_DEMAND_DOC_PARSE === 'true',
    enableDemandCapabilityStatusCheck: process.env.XIAOQIAO_ENABLE_DEMAND_CAPABILITY_CHECK === 'true',
  };
}
