import { NextResponse } from 'next/server';
import { listPrompts } from '@/lib/prompt-store';
import {
  getAllRequiredPromptIds,
  getRuntimeConsumer,
  buildPromptInventory,
} from '@/lib/prompt-runtime-consumer-registry';

interface HealthCheckRow {
  check: string;
  status: 'pass' | 'warn' | 'error';
  promptId: string;
  reason: string;
  severity: 'info' | 'warning' | 'error';
}

export async function GET() {
  const prompts = await listPrompts();
  const checks: HealthCheckRow[] = [];

  const requiredIds = getAllRequiredPromptIds();
  const requiredSet = new Set(requiredIds);
  const activeIds = new Set(
    prompts
      .filter(p => p.status === 'active' && p.enabled !== false)
      .map(p => p.id),
  );

  // 1. 所有 required prompt 必须在 store 中存在且 active + enabled
  for (const requiredId of requiredIds) {
    const prompt = prompts.find(p => p.id === requiredId);
    const consumer = getRuntimeConsumer(requiredId);
    if (!consumer) {
      checks.push({
        check: 'required_missing_consumer',
        status: 'error',
        promptId: requiredId,
        reason: 'required but no runtime consumer registered',
        severity: 'error',
      });
    } else if (!prompt) {
      checks.push({
        check: 'required_not_in_store',
        status: 'error',
        promptId: requiredId,
        reason: `required prompt "${requiredId}" not found in store`,
        severity: 'error',
      });
    } else if (prompt.enabled === false || prompt.status !== 'active') {
      checks.push({
        check: 'required_inactive',
        status: 'error',
        promptId: requiredId,
        reason: `required prompt is ${prompt.status}, enabled=${prompt.enabled}`,
        severity: 'error',
      });
    } else {
      checks.push({
        check: 'required_ok',
        status: 'pass',
        promptId: requiredId,
        reason: `active with consumer: ${consumer.consumer}`,
        severity: 'info',
      });
    }
  }

  // 2. enabled=true + active 但无 runtime consumer → warning（不阻断）
  for (const prompt of prompts) {
    if (prompt.enabled !== true || prompt.status !== 'active') continue;
    if (requiredSet.has(prompt.id)) continue; // 已在上面检查
    const consumer = getRuntimeConsumer(prompt.id);
    if (!consumer) {
      checks.push({
        check: 'enabled_no_consumer',
        status: 'warn',
        promptId: prompt.id,
        reason: 'enabled + active but no runtime consumer (warning only)',
        severity: 'warning',
      });
    }
  }

  // 3. 重复/冲突检测（保留兼容逻辑）
  const active = prompts.filter(p => p.status === 'active' && p.enabled !== false);
  const activeByWorkflowRole = new Map<string, string[]>();
  for (const prompt of active) {
    const workflow = prompt.binding?.workflow || prompt.applicable_workflows?.[0] || prompt.scope || 'global';
    const role = prompt.role || prompt.binding?.agent || prompt.scope || 'default';
    const key = `${workflow}:${role}`;
    activeByWorkflowRole.set(key, [...(activeByWorkflowRole.get(key) || []), prompt.id]);
  }
  const duplicateActive = [...activeByWorkflowRole.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([workflow_role, ids]) => ({ workflow_role, ids }));
  for (const dup of duplicateActive) {
    checks.push({
      check: 'duplicate_active',
      status: 'warn',
      promptId: dup.ids.join(', '),
      reason: `duplicate active prompts for ${dup.workflow_role}`,
      severity: 'warning',
    });
  }

  // 4. 汇总
  const errors = checks.filter(c => c.severity === 'error');
  const warnings = checks.filter(c => c.severity === 'warning');
  const archived = prompts.filter(p => p.status === 'archived');
  const disabled = prompts.filter(p => p.enabled === false);

  // 5. 构建 inventory
  const inventory = buildPromptInventory(prompts);

  return NextResponse.json({
    ok: errors.length === 0,
    error_count: errors.length,
    warning_count: warnings.length,
    checks,
    duplicate_active: duplicateActive,
    required_prompt_ids: requiredIds,
    missing_required: requiredIds.filter(id => !activeIds.has(id)),
    counts: {
      total: prompts.length,
      active: active.length,
      archived: archived.length,
      disabled: disabled.length,
    },
    inventory_summary: {
      active_runtime: inventory.filter(r => r.effectiveStatus === 'active_runtime').length,
      hardcoded_to_managed: inventory.filter(r => r.effectiveStatus === 'hardcoded_to_managed').length,
      archived_ghost: inventory.filter(r => r.effectiveStatus === 'archived_ghost').length,
      planned_draft: inventory.filter(r => r.effectiveStatus === 'planned_draft').length,
    },
  });
}
