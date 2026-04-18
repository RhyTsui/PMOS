/**
 * NotebookLLM 集成测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FileStore } from '../../src/core/fileStore.js';
import { MemoryService } from '../../src/core/memoryService.js';
import { NotebookLLMService } from '../../src/notebookLLM/index.js';
import os from 'node:os';
import path from 'node:path';

describe('NotebookLLM 服务测试', () => {
  let store: FileStore;
  let memoryService: MemoryService;
  let service: NotebookLLMService;
  let testNotebookId: string;

  beforeAll(async () => {
    const tempDir = path.join(os.tmpdir(), `pmaios-notebookllm-test-${Date.now()}`);
    store = new FileStore(tempDir);
    memoryService = new MemoryService(store);
    service = new NotebookLLMService(store, memoryService);

    // 初始化服务
    await service.initialize();

    // 创建测试笔记本
    testNotebookId = `test-notebook-${Date.now()}`;
    await service.createNotebook({
      notebookId: testNotebookId,
      title: '测试笔记本',
      chunkSize: 200,
      chunkOverlap: 20,
    });
  });

  it('应该能够创建笔记本', async () => {
    const notebook = await service.createNotebook({
      notebookId: `notebook-${Date.now()}`,
      title: '新笔记本',
    });

    expect(notebook.id).toBeTruthy();
    expect(notebook.title).toBe('新笔记本');
    expect(notebook.chunkCount).toBe(0);
  });

  it('应该能够添加文档到笔记本', async () => {
    const testContent = `
# PMAIOS v0.3 技术选型

## 核心架构

PMAIOS 采用"核心内核 + 开源积木"的架构设计。

## LangGraph 集成

LangGraph 用于工作流编排和状态管理，支持:
- 循环图执行
- 状态持久化
- 条件边路由

## ChromaDB 向量库

ChromaDB 是本地向量数据库，用于:
- 文档嵌入
- 相似性搜索
- RAG 检索
`.trim();

    const chunkCount = await service.addDocument(testNotebookId, {
      title: 'PMAIOS 技术文档',
      content: testContent,
      type: 'markdown',
      metadata: {
        category: 'technical',
        version: '0.3',
      },
    });

    expect(chunkCount).toBeGreaterThan(0);
    console.log(`   ✓ 添加了 ${chunkCount} 个文本块`);
  });

  it('应该能够查询笔记本内容 (RAG)', async () => {
    const result = await service.query(testNotebookId, 'LangGraph 支持哪些功能？', {
      topK: 3,
      generateAnswer: true,
    });

    expect(result.answer).toBeTruthy();
    expect(result.sources.length).toBeGreaterThan(0);
    console.log(`   ✓ 找到 ${result.sources.length} 个相关片段`);
    console.log(`   答案摘要：${result.answer.slice(0, 100)}...`);
  });

  it('应该能够生成笔记摘要', async () => {
    const summary = await service.generateSummary(testNotebookId);
    expect(summary).toBeTruthy();
    console.log(`   ✓ 生成摘要：${summary.slice(0, 100)}...`);
  });

  it('应该能够生成大纲', async () => {
    const outline = await service.generateOutline(testNotebookId);
    expect(outline).toBeTruthy();
    console.log(`   ✓ 生成大纲:\n${outline}`);
  });

  it('应该能够列出文档', async () => {
    const documents = await service.listDocuments(testNotebookId);
    expect(documents.length).toBeGreaterThan(0);
  });
});
