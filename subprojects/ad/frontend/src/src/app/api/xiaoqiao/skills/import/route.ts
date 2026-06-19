import { NextResponse } from 'next/server';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { buildDefaultSkillContract, mapSkillCategoryToContractCategory, parseSkillImportPackage } from '@/lib/skill-import';
import { createSkill, getSkill, updateSkill } from '@/lib/skill-store';
import { getSkillContract, upsertSkillContract } from '@/lib/skill-contract-store';
import type { SkillImportResult } from '@/types';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = parseSkillImportPackage(body);
  if (!parsed.package || parsed.issues.some(item => item.severity === 'error')) {
    return NextResponse.json({
      error: 'Skill import validation failed',
      issues: parsed.issues,
      preview: parsed.preview,
    }, { status: 400 });
  }

  const incomingSkill = parsed.package.skill || {};
  const existingSkill = incomingSkill.id ? await getSkill(incomingSkill.id) : undefined;
  const skill = existingSkill
    ? await updateSkill(existingSkill.id, incomingSkill)
    : await createSkill(incomingSkill);
  if (!skill) {
    return NextResponse.json({ error: 'Skill import failed to persist skill' }, { status: 500 });
  }

  const existingContract = await getSkillContract(skill.id);
  const contractSource = parsed.package.contract || buildDefaultSkillContract(skill);
  const contract = await upsertSkillContract({
    ...contractSource,
    skill_id: skill.id,
    name: contractSource.name || skill.name,
    description: contractSource.description ?? skill.description,
    category: contractSource.category || mapSkillCategoryToContractCategory(skill.category),
    enabled: contractSource.enabled ?? Boolean(skill.installed),
    version: contractSource.version || `imported-${Date.now()}`,
  });

  const context = await resolveAdminRequestContext(request);
  if (context) {
    await logAdminOperation({
      context,
      module: 'skill',
      action: 'import',
      targetType: 'skill',
      targetId: skill.id,
      targetName: skill.name,
      summary: `import skill ${skill.name}`,
      changes: [
        describeFieldChange('skill.name', existingSkill?.name, skill.name),
        describeFieldChange('skill.endpoint_url', existingSkill?.endpoint_url, skill.endpoint_url),
        describeFieldChange('skill.installed', existingSkill?.installed, skill.installed),
        describeFieldChange('contract.enabled', existingContract?.enabled, contract.enabled),
        describeFieldChange('contract.version', existingContract?.version, contract.version),
      ],
      metadata: {
        has_contract: Boolean(parsed.package.contract),
        source_label: parsed.package.source_label,
      },
    });
  }

  const result: SkillImportResult = {
    skill,
    contract,
    created: {
      skill: !existingSkill,
      contract: !existingContract,
    },
    warnings: parsed.preview.issues.filter(item => item.severity === 'warning').map(item => item.message),
  };

  return NextResponse.json(result, { status: 201 });
}
