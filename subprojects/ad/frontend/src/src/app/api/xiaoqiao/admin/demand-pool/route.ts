import { NextResponse } from 'next/server';
import { listDemandPoolItems, createDemandPoolItem } from '@/lib/demand-pool-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET() {
  return NextResponse.json(await listDemandPoolItems());
}

export async function POST(request: Request) {
  try {
    const userScope = await resolveUserScopeFromRequest(request).catch(() => null);
    const userScopeKey = userScope?.key || 'anonymous';

    const body = await request.json();
    const { intakeDraft, caseId, conversationId, evidenceRefs, sourceRefs } = body;

    if (!intakeDraft) {
      return NextResponse.json(
        { error: 'intakeDraft is required' },
        { status: 400 }
      );
    }

    // ─── 幂等保护：检查是否已存在相同 caseId 的 DemandPoolItem ───
    if (caseId) {
      const existingItems = await listDemandPoolItems();
      const existingItem = existingItems.find(item => item.caseId === caseId);

      if (existingItem) {
        // 已存在，直接返回已有条目，不创建新条目
        return NextResponse.json({
          success: true,
          item: existingItem,
          idempotent: true, // 标记为幂等返回
          message: 'Demand pool item already exists for this case',
        });
      }
    }

    const now = Date.now();
    const demandPoolInput: import('@/types').DemandPoolItem = {
      id: `demand-${now}`,
      title: `${intakeDraft.serviceType || 'demand'} - ${intakeDraft.collectedSlots?.project?.value || '未命名'}`,
      problem_statement: `用户提交${intakeDraft.serviceType || 'demand'}需求。`,
      target_users: ['ad_ops'],
      core_scenarios: [intakeDraft.serviceType || 'demand_intake'],
      acceptance_criteria: intakeDraft.missingInputs?.length === 0
        ? ['所有必填槽位已齐全']
        : ['需要补充缺失信息'],
      scope_in: intakeDraft.collectedSlots
        ? Object.entries(intakeDraft.collectedSlots)
            .filter(([, v]) => (v as any).value)
            .map(([k, v]) => `${k}: ${(v as any).value}`)
        : [],
      scope_out: [],
      dependencies: [],
      deliverables: intakeDraft.artifacts?.map((a: any) => a.url || a.type) || [],
      phase: 'phase1',
      priority: 'P1',
      business_flow: 'demand',
      automation_boundary: 'manual',
      status: 'draft',
      proposer: userScopeKey,
      owner: userScopeKey,
      created_at: now,
      updated_at: now,
      // P1: Demand Intake 关联字段
      caseId,
      conversationId,
      serviceType: intakeDraft.serviceType,
      intakeDraftStatus: 'submitted',
      intakeSlots: intakeDraft.collectedSlots,
      intakeMissingInputs: intakeDraft.missingInputs,
      intakeArtifacts: intakeDraft.artifacts,
      intakeRiskWarnings: intakeDraft.riskWarnings,
      originalMessageSummary: intakeDraft.originalMessageSummary || '',
      confirmedAt: now,
      submittedAt: now,
      evidenceRefs: evidenceRefs || [],
      sourceRefs: sourceRefs || [],
    };

    const createdItem = await createDemandPoolItem(demandPoolInput);

    return NextResponse.json({
      success: true,
      item: createdItem,
      idempotent: false, // 标记为新创建
    });
  } catch (error) {
    console.error('[demand-pool] create failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create demand pool item' },
      { status: 500 }
    );
  }
}
