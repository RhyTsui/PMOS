import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { ProductAgentService } from '../../src/core/productAgentService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-product-agent-'));
  return new FileStore(root);
}

describe('ProductAgentService', () => {
  it('creates, lists, and loads platform-scoped product agents', async () => {
    const store = createStore();
    const service = new ProductAgentService(store);
    const memoryService = new MemoryService(store);

    const created = await service.createAgent({
      name: '发布助手',
      summary: '帮助项目整理发布需求与验收。',
      problem: '减少发布前需求整理和验收口径不一致的问题。',
      targetUsers: ['项目经理', '研发负责人'],
      goals: ['统一发布定义'],
      acceptanceCriteria: ['可输出明确的发布摘要'],
      relatedPaths: ['docs/tasks/release.md'],
      source: 'cli',
    });

    const loaded = await service.loadAgent(created.id);
    const listed = await service.listAgents();
    const loadedViaMemory = await memoryService.loadProductAgent(created.id);

    expect(created.subprojectId).toBeNull();
    expect(created.role).toBe('general');
    expect(created.level).toBe('manager');
    expect(created.scope).toBe('platform');
    expect(loaded.name).toBe('发布助手');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(loadedViaMemory.problem).toContain('发布前');
  });

  it('stores product agents under subproject scope', async () => {
    const store = createStore();
    const service = new ProductAgentService(store);
    await store.write(
      'subprojects/shop/subproject.json',
      JSON.stringify(
        {
          id: 'shop',
          name: 'Shop',
          description: 'shop 业务子项目',
          status: 'active',
          createdAt: '2026-04-11T00:00:00.000Z',
          defaultWorkflow: 'ai-os-v2-main',
          rootPath: 'subprojects/shop',
          memoryPath: 'subprojects/shop/docs/memory/project-memory.md',
          overrides: {},
        },
        null,
        2,
      ),
    );

    const created = await service.createAgent({
      name: 'Shop 增长助手',
      summary: '服务 shop 子项目的增长需求。',
      problem: '让增长需求有统一产品定义。',
      subprojectId: 'shop',
      source: 'api',
    });

    const loaded = await service.loadAgent(created.id, 'shop');
    const listed = await service.listAgents('shop');

    expect(created.subprojectId).toBe('shop');
    expect(created.scope).toBe('subproject');
    expect(loaded.subprojectId).toBe('shop');
    expect(listed.map((item) => item.id)).toContain(created.id);
  });

  it('falls back to minimal structure when generated output is not valid json', async () => {
    const store = createStore();
    await store.write(
      'config/providers.json',
      JSON.stringify(
        {
          defaultProvider: 'mock',
          providers: [{ name: 'mock', type: 'mock', envKey: 'MOCK_KEY', capabilities: ['text'] }],
        },
        null,
        2,
      ),
    );

    const service = new ProductAgentService(store);
    const agent = await service.generateAgent({
      brief: '做一个帮助梳理需求和目标的产品 agent',
      name: '需求助手',
      source: 'workspace',
    });

    expect(agent.name).toBe('需求助手');
    expect(agent.summary).toContain('PMAIOS v0.2 LLM Router');
    expect(agent.problem).toBe('待从 brief 中进一步提炼问题定义');
    expect(agent.source).toBe('workspace');
    expect(agent.generatedByRunId).toBeTruthy();
  });

  it('bootstraps the product management hierarchy from blueprints', async () => {
    const store = createStore();
    const service = new ProductAgentService(store);

    await store.writeJson('config/product-management/agent-blueprints.json', {
      version: '0.1.0',
      blueprints: [
        {
          id: 'pm-head',
          name: '产品管理 Agent',
          role: 'product-management',
          level: 'supervisor',
          scope: 'platform',
          summary: '管理规则与流程。',
          problem: '缺少稳定的产品治理层。',
          promptPath: 'prompts/product-management/product_management_agent_prompt.md',
          governanceRefs: ['docs/memory/global-rules.md'],
          manages: ['requirements-pm'],
        },
        {
          id: 'requirements-pm',
          name: '虚拟需求产品经理',
          role: 'requirements',
          level: 'manager',
          scope: 'platform',
          summary: '管理需求池。',
          problem: '需求无法稳定入池。',
          promptPath: 'prompts/product-management/virtual_requirements_pm_prompt.md',
          governanceRefs: ['docs/templates/requirement_card_template.md'],
        },
      ],
    });

    const agents = await service.bootstrapManagementHierarchy();
    const supervisor = agents.find((agent) => agent.templateId === 'pm-head');
    const requirementPm = agents.find((agent) => agent.templateId === 'requirements-pm');

    expect(agents).toHaveLength(2);
    expect(supervisor?.role).toBe('product-management');
    expect(supervisor?.level).toBe('supervisor');
    expect(supervisor?.managedAgentIds).toEqual([requirementPm?.id]);
    expect(requirementPm?.role).toBe('requirements');
    expect(requirementPm?.promptPath).toContain('virtual_requirements_pm_prompt');
  });
});
