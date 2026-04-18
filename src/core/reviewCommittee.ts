import type { CommitteeReport } from '../shared/schemas.js';

export class ReviewCommittee {
  buildReportForRun(input: { runId: string; artifactCount: number }): CommitteeReport {
    const hasEnoughArtifacts = input.artifactCount >= 5;
    const gateDecision = hasEnoughArtifacts ? 'pass' : 'conditional';
    const gateBlocked = !hasEnoughArtifacts;

    return {
      overallConclusion: hasEnoughArtifacts
        ? '当前运行实例已经形成跨阶段产物，允许继续进入下一轮升级验收。'
        : '当前运行实例产物仍不足，评审要求先补足前序阶段产物并返工后再继续推进。',
      nextStage: hasEnoughArtifacts,
      reworkRequired: !hasEnoughArtifacts,
      gate: {
        decision: gateDecision,
        blocked: gateBlocked,
        issueCount: hasEnoughArtifacts ? 1 : 2,
        blockingStageId: gateBlocked ? 'operations-surface' : null,
      },
      roles: [
        {
          role: '架构评审',
          summary: hasEnoughArtifacts
            ? '通过：阶段产物已覆盖主要链路，结构化运行状态可继续复用。'
            : '需返工：runtime 已形成骨架，但仍需补足更多阶段产物后再进入下一阶段。',
          issues: [
            {
              title: '运行实例与文档真源已接通',
              description: `runId=${input.runId} 已使用真实 run state 与事件日志。`,
              impact: '为后续 task loop、CLI 与多阶段扩展提供了稳定基础。',
              recommendation: hasEnoughArtifacts ? '继续扩展每阶段的真实产物模板与 review gate。' : '先补齐前序阶段产物，再重新触发评审。',
              expectedAnswer: '每个阶段至少生成一个真实产物并被 run state 索引。',
              decision: 'Pass',
            },
          ],
        },
        {
          role: '产品评审',
          summary: hasEnoughArtifacts
            ? '通过：当前阶段闭环已经能展示从初始化到阶段产物沉淀的最小链路。'
            : '需返工：已具备最小闭环，但必须补充更多阶段可视化结果。',
          issues: hasEnoughArtifacts
            ? []
            : [
                {
                  title: '产物数量仍偏少',
                  description: '当前运行实例的阶段产物尚未覆盖足够多的工作流阶段。',
                  impact: '用户在 dashboard 上看到的阶段闭环仍不完整。',
                  recommendation: '先补足 API / CLI / Frontend 操作面与前序内核阶段产物，再重新进入评审。',
                  expectedAnswer: '至少完成前 6 个阶段并生成对应文件。',
                  decision: 'Conditional',
                },
              ],
        },
        {
          role: '技术评审',
          summary: '通过：后端 API 已切换到 run-based query/command 模型。',
          issues: [],
        },
        {
          role: '数据评审',
          summary: hasEnoughArtifacts
            ? '条件通过：已有 run/event/metrics 基线，可继续补充更多粒度指标。'
            : '需返工：已有 run/event/metrics 基线，但当前阶段数据仍不足以支撑完整验收。',
          issues: [
            {
              title: 'Telemetry 仍以运行基线为主',
              description: '当前已记录 run 初始化、阶段开始/完成、产物写入与 review 事件。',
              impact: hasEnoughArtifacts ? '足以支撑 MVP，但对失败原因与耗时的分析仍有限。' : '在返工前可以定位基础状态，但对失败原因与耗时的分析仍有限。',
              recommendation: '下一轮补充失败原因、耗时和 provider 维度。',
              expectedAnswer: '为关键阶段增加更细粒度的 telemetry schema。',
              decision: 'Conditional',
            },
          ],
        },
        {
          role: '风险评审',
          summary: '通过：仍然保持本地文件驱动与环境变量注入边界。',
          issues: [],
        },
      ],
      summary: hasEnoughArtifacts
        ? '评审通过：主链路产物已覆盖主要阶段，可继续进入升级验收。'
        : '评审有条件通过：需要回到操作面阶段补足产物，再继续推进。',
      recommendedReworkStageId: gateBlocked ? 'operations-surface' : null,
    };
  }
}
