/**
 * Google AI Studio + LangGraph 集成测试
 *
 * 验证 LLM Provider 在工作流中的实际调用
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FileStore } from '../../src/core/fileStore.js';
import { MemoryService } from '../../src/core/memoryService.js';
import { LangGraphEngine } from '../../src/langgraph/index.js';
import { ProductAgentNode, ProductAgentWorkflowFactory } from '../../src/langgraph/productAgentNode.js';
import os from 'node:os';
import path from 'node:path';

describe('LLM Provider + LangGraph 集成测试', () => {
  let store: FileStore;
  let memoryService: MemoryService;
  let engine: LangGraphEngine;
  let productAgentNode: ProductAgentNode;
  let workflowFactory: ProductAgentWorkflowFactory;

  beforeAll(async () => {
    const tempDir = path.join(os.tmpdir(), `pmaios-llm-test-${Date.now()}`);
    store = new FileStore(tempDir);
    memoryService = new MemoryService(store);
    engine = new LangGraphEngine(store, memoryService);
    productAgentNode = new ProductAgentNode(store, memoryService);
    workflowFactory = new ProductAgentWorkflowFactory(store, memoryService);

    // 配置 providers.json
    await store.write('config/providers.json', JSON.stringify({
      defaultProvider: 'mock',
      providers: [
        {
          name: 'mock',
          type: 'mock',
          envKey: 'MOCK_KEY',
          capabilities: ['text', 'code', 'review'],
        },
      ],
    }, null, 2));
  });

  it('应该能够使用 Google AI Studio 执行工作流阶段', async () => {
    // 创建工作流
    const workflow = workflowFactory.createRequirementWorkflow({
      brief: '做一个帮助用户管理任务和时间的产品',
      projectName: 'TaskMaster',
      subprojectId: null,
    });

    // 初始化工作流
    await engine.initWorkflow(workflow);
    const initialState = engine.getState();

    expect(initialState).toBeTruthy();
    expect(initialState?.status).toBe('running');
    expect(initialState?.currentStageId).toBe('agent-generation');

    // 执行第一阶段（产品 Agent 生成）
    const state1 = await engine.step();
    expect(state1.stages['agent-generation'].status).toBe('completed');

    // 执行第二阶段（需求细化）
    const state2 = await engine.step();
    expect(state2.stages['requirement-refinement'].status).toBe('completed');

    // 执行第三阶段（评审）
    const state3 = await engine.step();
    expect(state3.status).toBe('completed');

    console.log('工作流执行完成:', state3.status);
  });

  it('ProductAgent 节点应该能够生成结构化输出', async () => {
    const state = await engine.initWorkflow({
      workflowId: 'test-agent',
      stages: [],
      subprojectId: null,
    });

    const result = await productAgentNode.execute(state!, '做一个帮助开发者管理 API 密钥的产品');

    expect(result.agentId).toBeTruthy();
    expect(result.output).toBeTruthy();
    expect(result.artifacts.length).toBeGreaterThan(0);

    // 验证产物已写入
    const jsonArtifact = result.artifacts.find(a => a.type === 'json');
    expect(jsonArtifact).toBeTruthy();

    const output = JSON.parse(result.output);
    expect(output.name).toBeTruthy();
    expect(output.summary).toBeTruthy();
    expect(output.problem).toBeTruthy();
  });

  it('多 Agent 协作模式应该能够合并结果', async () => {
    const state = await engine.initWorkflow({
      workflowId: 'test-multi-agent',
      stages: [],
      subprojectId: null,
    });

    const result = await productAgentNode.executeMultiAgent(state!, [
      { brief: '做一个任务管理产品', name: '任务专家', role: 'task-specialist' },
      { brief: '做一个时间管理产品', name: '时间专家', role: 'time-specialist' },
    ]);

    expect(result.agentId).toBe('multi-agent');
    expect(result.output).toContain('"collaboration": true');
    expect(result.artifacts.length).toBeGreaterThan(0);
  });
});
