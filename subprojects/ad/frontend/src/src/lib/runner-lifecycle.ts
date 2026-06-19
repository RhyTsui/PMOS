/**
 * Runner Lifecycle Stages
 *
 * 定义 Chat Runtime 的 Runner 执行生命周期阶段。
 * 与现有 UI 侧 RuntimeStage（understanding | context_loading | data_fetching | ...）不同，
 * RunnerStage 是系统内部执行阶段，用于 hook 挂载和 trace span 分段。
 *
 * 设计原则：
 * 1. 每个 stage 对应 route.ts 的一段逻辑边界
 * 2. stage 之间是严格顺序的，不会跳级
 * 3. stage 可嵌套子 span（通过 trace span 模型），但 stage 本身是平铺的
 */

export const RUNNER_STAGES = [
  'setup',
  'understanding',
  'planning',
  'preflight',
  'execution',
  'assembly',
  'disclosure',
] as const;

export type RunnerStage = (typeof RUNNER_STAGES)[number];

/**
 * Stage 语义说明：
 *
 * setup         — 解析请求体、scope 鉴权、context 编译、prompt 加载、glossary 归一化
 * understanding — semantic frame 推导、user requirement 提取、intent routing、信息源仲裁
 * planning      — capability discovery、skill selection、planner shadow observation
 * preflight     — execution gate 检查（report gate / auth / public web need / missing input）
 * execution     — 实际执行：report query / diagnosis skill / open answer / demand pool
 * assembly      — response contract 派生、message contract 构建、workflow result 组装
 * disclosure    — trace emission、runtime projection、SSE final push
 */

export const RUNNER_STAGE_LABELS: Record<RunnerStage, string> = {
  setup: '请求准备',
  understanding: '意图理解',
  planning: '候选规划',
  preflight: '执行预检',
  execution: '工具执行',
  assembly: '结果组装',
  disclosure: '过程披露',
};

/**
 * Stage 之间的合法迁移关系。
 * 用于校验 hook 发出的 stage 事件顺序是否合理。
 */
export const RUNNER_STAGE_TRANSITIONS: Record<RunnerStage, RunnerStage | 'completed'> = {
  setup: 'understanding',
  understanding: 'planning',
  planning: 'preflight',
  preflight: 'execution',
  execution: 'assembly',
  assembly: 'disclosure',
  disclosure: 'completed',
};

/**
 * 判断 stageA 是否在 stageB 之前（严格顺序）。
 */
export function isRunnerStageBefore(stageA: RunnerStage, stageB: RunnerStage): boolean {
  const indexA = RUNNER_STAGES.indexOf(stageA);
  const indexB = RUNNER_STAGES.indexOf(stageB);
  return indexA >= 0 && indexB >= 0 && indexA < indexB;
}
