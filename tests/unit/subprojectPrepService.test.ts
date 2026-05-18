import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';
import { SkillRegistry } from '../../src/core/skillRegistry';
import { SubprojectPrepService } from '../../src/core/subprojectPrepService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-prep-'));
  return new FileStore(root);
}

describe('SubprojectPrepService', () => {
  async function createFixture() {
    const store = createStore();
    const subprojectRegistry = new SubprojectRegistry(store);
    const skillRegistry = new SkillRegistry(store, subprojectRegistry);
    const service = new SubprojectPrepService(store, skillRegistry, subprojectRegistry);

    await store.write('skills/registry.json', JSON.stringify({ version: '0.1.0', skills: [] }, null, 2));
    await subprojectRegistry.createSubproject({
      id: 'shop',
      name: 'Shop',
      overrides: {
        skillConfigPath: 'subprojects/shop/config/skill-registry.json',
      },
    });

    await store.write(
      'subprojects/shop/config/skill-registry.json',
      JSON.stringify(
        {
          version: '0.1.0',
          skills: [
            {
              id: 'repo-bootstrap-skill',
              name: 'Repo Bootstrap Skill',
              category: 'planning',
              description: 'prep checklist',
              ownerRole: 'Delivery',
              promptPath: 'subprojects/shop/docs/Prep检查清单.md',
              stageIds: ['tasks'],
              outputs: ['checklist'],
              triggerKeywords: ['prep'],
              enabled: true,
              tool: 'manual-subproject-skill',
              deployment: {
                status: 'configured',
                command: 'node tools/prep-scan.mjs',
                statusPath: 'subprojects/shop/docs/Prep检查清单.md',
                integration: 'workflow',
                notes: 'prep',
              },
            },
            {
              id: 'code-graph-skill',
              name: 'Code Graph Skill',
              category: 'architecture',
              description: 'scan repo',
              ownerRole: 'Architecture',
              promptPath: 'subprojects/shop/tools/prep-scan.mjs',
              stageIds: ['architecture'],
              outputs: ['scan report'],
              triggerKeywords: ['scan'],
              enabled: true,
              tool: 'manual-subproject-skill',
              deployment: {
                status: 'configured',
                command: 'node tools/prep-scan.mjs',
                statusPath: 'subprojects/shop/docs/scan/report.json',
                integration: 'workflow',
                notes: 'scan',
              },
            },
          ],
        },
        null,
        2,
      ),
    );

    await store.write(
      'subprojects/shop/docs/Prep检查清单.md',
      [
        '# Prep 检查清单',
        '',
        '## 1. 工程底座',
        '- [x] 文档入口已建立',
        '- [x] 准备真源已建立',
        '',
        '## 2. 代码扫描',
        '- [x] 已有扫描脚本',
        '- [ ] 已生成扫描报告',
        '',
        '## 4. 环境条件',
        '- [x] node 可用',
        '- [ ] 容器健康检查已通过',
        '',
        '## 5. 架构边界',
        '- [ ] 已确认平台归属',
        '',
        '## 6. 测试与发布门禁',
        '- [ ] runbook 已纳入门禁',
        '',
        '## 8. 开工判定',
        '当前判定：`不允许直接进入业务模块二开`',
        '',
        '原因：',
        '1. 环境健康检查仍未通过',
        '2. 平台边界未完全拍板',
        '',
        '允许进入的下一步：',
        '1. 先补扫描报告',
        '2. 完成健康检查',
        '',
      ].join('\n'),
    );

    await store.write(
      'subprojects/shop/tools/prep-scan.mjs',
      [
        "import fs from 'node:fs/promises';",
        "import path from 'node:path';",
        'const output = path.resolve(process.cwd(), \'docs/scan/report.json\');',
        'await fs.mkdir(path.dirname(output), { recursive: true });',
        "await fs.writeFile(output, JSON.stringify({ ok: true }, null, 2), 'utf8');",
        "console.log(JSON.stringify({ output: 'docs/scan/report.json', ok: true }));",
      ].join('\n'),
    );

    return { service, store };
  }

  it('runs prep scan commands from subproject skill config', async () => {
    const { service, store } = await createFixture();
    const result = await service.scan('shop');

    expect(result.command).toBe('node tools/prep-scan.mjs');
    expect(result.relatedSkills).toHaveLength(1);
    expect(result.stdout).toContain('docs/scan/report.json');
    expect(await store.exists('subprojects/shop/docs/scan/report.json')).toBe(true);
  });

  it('summarizes checklist progress for prep check', async () => {
    const { service } = await createFixture();
    const result = await service.check('shop');

    expect(result.total).toBe(8);
    expect(result.checked).toBe(4);
    expect(result.unchecked).toBe(4);
    expect(result.currentConclusion).toContain('不允许直接进入业务模块二开');
    expect(result.blockedReasons).toContain('环境健康检查仍未通过');
    expect(result.nextSteps).toContain('先补扫描报告');
  });

  it('classifies prep status as blocked when critical sections remain unchecked', async () => {
    const { service } = await createFixture();
    const result = await service.status('shop');

    expect(result.readyForBusinessChange).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.criticalUnchecked.some((item) => item.section === '环境条件')).toBe(true);
    expect(result.criticalUnchecked.some((item) => item.section === '架构边界')).toBe(true);
  });
});
