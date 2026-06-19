import { NextRequest, NextResponse } from 'next/server';
import { getPlannerShadowMetrics, serializePlannerShadowMetrics } from '@/lib/planner-shadow-metrics';

/**
 * GET /api/xiaoqiao/admin/runtime-observability
 *
 * 返回运行时可观测数据：
 * - planner_metrics: Planner Shadow 指标聚合
 * - guardrail_status: 3 层 Guardrail 启用状态和规则数量
 * - evidence_ledger_schema: Evidence Ledger 类型和来源说明
 *
 * 注：实际的 guardrail findings 和 evidence ledger 条目是 per-request 的，
 * 附加在每个 SSE 响应的 metadata 中。本接口返回的是系统级状态和 schema。
 */
export async function GET(_request: NextRequest) {
  try {
    const plannerMetrics = serializePlannerShadowMetrics();

    const guardrailStatus = {
      input: {
        enabled: true,
        checks: [
          { code: 'input_pii_china_id_card', name: '身份证号检测', severity: 'error' },
          { code: 'input_pii_china_phone', name: '手机号检测', severity: 'error' },
          { code: 'input_pii_email', name: '邮箱检测', severity: 'error' },
          { code: 'input_injection_ignore_previous', name: 'Prompt 注入（忽略指令）', severity: 'error' },
          { code: 'input_injection_system_prompt_leak', name: '系统提示词泄露尝试', severity: 'error' },
          { code: 'input_injection_role_override', name: '角色覆盖尝试', severity: 'error' },
          { code: 'input_too_long', name: '消息超长', severity: 'error' },
        ],
      },
      tool: {
        enabled: true,
        checks: [
          { code: 'tool_input_empty_required_param', name: '必填参数为空', severity: 'warning' },
          { code: 'tool_input_sql_injection_pattern', name: 'SQL 注入模式', severity: 'error' },
          { code: 'tool_output_secret_token', name: '密钥/令牌泄露', severity: 'error' },
          { code: 'tool_output_bearer_token', name: 'Bearer token 泄露', severity: 'error' },
        ],
        integration: 'callConfiguredMcpTool 统一包装（方案 C）',
      },
      output: {
        enabled: true,
        checks: [
          { code: 'mojibake_detected', name: '乱码检测', severity: 'error' },
          { code: 'source_grounded_without_source', name: '公开来源无 source_ref', severity: 'error' },
          { code: 'tool_grounded_without_evidence', name: '工具证据无 evidence_ref', severity: 'warning' },
          { code: 'model_only_claims_external_evidence', name: 'model-only 声称外部证据', severity: 'error' },
          { code: 'success_without_evidence', name: '成功但无证据', severity: 'warning' },
          { code: 'unsourced_business_assertion', name: '无证据业务断言', severity: 'error' },
          { code: 'raw_params_leaked_to_answer', name: 'raw params 泄露到答案', severity: 'error' },
          { code: 'shadow_plan_disguised_as_execution', name: 'shadow plan 伪装真实执行', severity: 'error' },
          { code: 'failure_disguised_as_success', name: '失败说成成功', severity: 'error' },
          { code: 'success_without_any_evidence', name: '成功但完全无证据', severity: 'error' },
        ],
      },
    };

    const evidenceLedgerSchema = {
      sources: [
        {
          type: 'tool_result',
          description: '工具执行结果（MCP 工具、诊断 skill、报表查询）',
          integration_points: [
            'executeReportQueryStepWithTrace 后 → 报表查询',
            'executeCallbackAttributionDiagnosisSkill 后 → 诊断',
          ],
        },
        {
          type: 'planner_inference',
          description: 'Planner 推理（与 tool_result 物理隔离）',
          integration_points: [
            'emitPlannerShadowObservationIfEnabled 回调 → Planner shadow 观测',
          ],
        },
        {
          type: 'public_web',
          description: '公开网络检索结果',
          integration_points: [
            'executePublicWebQuery 后 → 公开联网',
          ],
        },
        {
          type: 'knowledge',
          description: '知识库检索结果（预留）',
          integration_points: [],
        },
        {
          type: 'user_input',
          description: '用户输入（预留）',
          integration_points: [],
        },
        {
          type: 'context_history',
          description: '对话历史（预留）',
          integration_points: [],
        },
      ],
      confidence_levels: [
        { level: 'confirmed_fact', description: '已确认事实（工具成功执行）' },
        { level: 'high_probability', description: '高概率推断（Planner 成功、诊断部分成功）' },
        { level: 'unverified', description: '未验证（失败、超时、降级）' },
      ],
    };

    return NextResponse.json({
      planner_metrics: plannerMetrics,
      guardrail_status: guardrailStatus,
      evidence_ledger_schema: evidenceLedgerSchema,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load runtime observability data' },
      { status: 500 },
    );
  }
}
