/**
 * Google NotebookLLM 风格集成
 *
 * NotebookLLM 本质是基于 RAG 的文档问答系统
 * 使用 Google AI Studio (Gemini) + ChromaDB 实现同等能力
 *
 * 核心功能:
 * - 上传文档 (PDF/Markdown/TXT)
 * - 自动向量化存储
 * - 基于文档的 QA 对话
 * - 生成摘要/笔记/大纲
 */

import type { Collection } from 'chromadb';
import { ChromaService, LocalEmbeddingService } from '../chroma/index.js';
import { FileStore } from '../core/fileStore.js';
import { MemoryService } from '../core/memoryService.js';
import type { ResolvedProvider } from '../core/providerRegistry.js';

export type NotebookDocument = {
  id: string;
  title: string;
  sourcePath: string;
  type: 'pdf' | 'markdown' | 'text' | 'url';
  chunkCount: number;
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
};

export type NotebookSession = {
  id: string;
  notebookId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sources?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
};

export type NotebookQueryResult = {
  answer: string;
  sources: Array<{
    documentId: string;
    chunkId: string;
    content: string;
    relevance: number;
  }>;
  citations: string[];
};

export type NotebookConfig = {
  notebookId: string;
  title: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
};

/**
 * NotebookLLM 服务
 *
 * 实现类似 Google NotebookLLM 的文档问答能力
 */
export class NotebookLLMService {
  private chromaService: ChromaService;
  private embeddingService: LocalEmbeddingService;
  private collections: Map<string, Collection> = new Map();

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
    private readonly provider?: ResolvedProvider,
  ) {
    this.chromaService = new ChromaService(store, memoryService);
    this.embeddingService = new LocalEmbeddingService();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    await this.chromaService.initialize();
    await this.embeddingService.initialize();
  }

  /**
   * 创建笔记本
   */
  async createNotebook(config: NotebookConfig): Promise<NotebookDocument> {
    const now = new Date().toISOString();
    const notebook: NotebookDocument = {
      id: config.notebookId,
      title: config.title,
      sourcePath: `notebooks/${config.notebookId}`,
      type: 'markdown',
      chunkCount: 0,
      createdAt: now,
      metadata: {
        embeddingModel: config.embeddingModel || 'default',
        chunkSize: config.chunkSize || 500,
        chunkOverlap: config.chunkOverlap || 50,
      },
    };

    // 创建 Chroma 集合
    await this.chromaService.getOrCreateCollection(`notebook-${config.notebookId}`);

    // 保存笔记本元数据
    await this.store.writeJson(`notebooks/${config.notebookId}.json`, notebook);

    return notebook;
  }

  /**
   * 添加文档到笔记本
   */
  async addDocument(
    notebookId: string,
    document: {
      title: string;
      content: string;
      type?: NotebookDocument['type'];
      metadata?: Record<string, string | number | boolean>;
    },
  ): Promise<number> {
    const collection = await this.chromaService.getOrCreateCollection(`notebook-${notebookId}`);
    const now = new Date().toISOString();

    // 分块
    const chunkSize = 500;
    const overlap = 50;
    const chunks = this.chunkText(document.content, chunkSize, overlap);

    // 创建文档记录
    const docId = `doc-${Date.now()}`;
    const docRecord: NotebookDocument = {
      id: docId,
      title: document.title,
      sourcePath: `notebooks/${notebookId}/docs/${docId}`,
      type: document.type || 'text',
      chunkCount: chunks.length,
      createdAt: now,
      metadata: document.metadata || {},
    };

    // 保存到存储
    await this.store.writeJson(docRecord.sourcePath + '.json', docRecord);
    await this.store.write(docRecord.sourcePath + '.txt', document.content);

    // 添加到向量库
    const documents = chunks.map((chunk, index) => ({
      id: `${docId}-chunk-${index}`,
      content: chunk,
      metadata: {
        documentId: docId,
        documentTitle: document.title,
        chunkIndex: index,
        notebookId,
        ...document.metadata,
      },
    }));

    await this.chromaService.addDocuments(`notebook-${notebookId}`, documents);

    // 更新笔记本统计
    await this.updateNotebookStats(notebookId);

    return chunks.length;
  }

  /**
   * 查询笔记本 (RAG)
   */
  async query(
    notebookId: string,
    question: string,
    options?: {
      topK?: number;
      includeSources?: boolean;
      generateAnswer?: boolean;
    },
  ): Promise<NotebookQueryResult> {
    const topK = options?.topK ?? 5;

    // 从向量库检索相关片段
    const results = await this.chromaService.search(`notebook-${notebookId}`, {
      query: question,
      topK,
    });

    const sources = results.map((result, index) => ({
      documentId: result.metadata.documentId as string || `doc-${index}`,
      chunkId: result.id,
      content: result.content,
      relevance: result.score,
    }));

    // 构建上下文
    const context = sources.map(s => s.content).join('\n\n---\n\n');

    // 生成答案 (使用 Google AI Studio)
    let answer = '';
    if (options?.generateAnswer ?? true) {
      answer = await this.generateAnswer(question, context);
    }

    // 构建引用
    const citations = sources
      .filter(s => s.relevance > 0.5)
      .map((s, i) => `[${i + 1}] ${s.content.slice(0, 100)}...`);

    return {
      answer,
      sources,
      citations,
    };
  }

  /**
   * 生成答案 (调用 LLM)
   */
  private async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = `你是一个专业的研究助手。请基于以下上下文回答用户的问题。

<context>
${context}
</context>

<question>
${question}
</question>

请:
1. 基于上下文提供准确答案
2. 如果上下文中没有相关信息，请说明
3. 答案要清晰、简洁、有条理
4. 必要时使用列表或结构化格式

答案:`;

    // 使用 provider 调用 LLM
    if (this.provider?.apiKey && this.provider.type === 'ai-studio') {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(this.provider.apiKey)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: prompt }],
                },
              ],
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成答案';
        }
      } catch (error) {
        console.error('[NotebookLLM] LLM 调用失败:', error);
      }
    }

    // Fallback: 直接返回上下文摘要
    return `基于提供的上下文，以下是相关信息:\n\n${context.slice(0, 1000)}${context.length > 1000 ? '...' : ''}`;
  }

  /**
   * 生成笔记摘要
   */
  async generateSummary(notebookId: string): Promise<string> {
    const collection = await this.chromaService.getOrCreateCollection(`notebook-${notebookId}`);
    const count = await collection.count();

    // 获取所有文档的摘要
    const sampleQuery = '总结这个笔记本的主要内容';
    const results = await this.chromaService.search(`notebook-${notebookId}`, {
      query: sampleQuery,
      topK: 3,
    });

    const context = results.map(r => r.content).join('\n\n');

    const prompt = `请为以下研究笔记生成一个简洁的摘要 (200 字以内):

${context}

摘要:`;

    return this.generateAnswer(prompt, context);
  }

  /**
   * 生成大纲
   */
  async generateOutline(notebookId: string): Promise<string> {
    // 获取所有文档标题
    const results = await this.chromaService.search(`notebook-${notebookId}`, {
      query: '文档标题 主题',
      topK: 20,
    });

    const titles = [...new Set(results.map(r => r.metadata.documentTitle as string).filter(Boolean))];

    // 使用 LLM 生成大纲
    const prompt = `请为以下主题生成一个结构化的大纲:

主题列表: ${titles.join(', ')}

请使用以下格式:
# 主标题
## 子标题 1
## 子标题 2

大纲:`;

    return this.generateAnswer(prompt, titles.join('\n'));
  }

  /**
   * 删除文档
   */
  async removeDocument(notebookId: string, documentId: string): Promise<void> {
    const collection = await this.chromaService.getOrCreateCollection(`notebook-${notebookId}`);
    await collection.delete({ where: { documentId } });
    await this.updateNotebookStats(notebookId);
  }

  /**
   * 列出笔记本中的所有文档
   */
  async listDocuments(notebookId: string): Promise<NotebookDocument[]> {
    const notebookPath = `notebooks/${notebookId}.json`;
    if (!(await this.store.exists(notebookPath))) {
      return [];
    }

    // 读取笔记本元数据
    const notebook = await this.store.readJson<NotebookDocument>(notebookPath);

    // 读取文档列表
    const docsDir = `notebooks/${notebookId}/docs`;
    // 简化实现：返回笔记本信息
    return [notebook];
  }

  /**
   * 更新笔记本统计
   */
  private async updateNotebookStats(notebookId: string): Promise<void> {
    const collection = await this.chromaService.getOrCreateCollection(`notebook-${notebookId}`);
    const count = await collection.count();

    const notebookPath = `notebooks/${notebookId}.json`;
    const notebook = await this.store.readJson<NotebookDocument>(notebookPath);

    notebook.chunkCount = count;

    await this.store.writeJson(notebookPath, notebook);
  }

  /**
   * 文本分块
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end).trim());
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * 删除笔记本
   */
  async deleteNotebook(notebookId: string): Promise<void> {
    await this.chromaService.clearCollection(`notebook-${notebookId}`);
    await this.store.delete(`notebooks/${notebookId}.json`);
  }
}

/**
 * NotebookLLM CLI 工具
 */
export class NotebookLLMCli {
  private service: NotebookLLMService;

  constructor(store: FileStore, memoryService: MemoryService) {
    this.service = new NotebookLLMService(store, memoryService);
  }

  async run(command: string, args: string[]): Promise<void> {
    await this.service.initialize();

    switch (command) {
      case 'create':
        await this.service.createNotebook({
          notebookId: args[0] || `notebook-${Date.now()}`,
          title: args[1] || '我的笔记本',
        });
        console.log(`✓ 笔记本已创建`);
        break;

      case 'add':
        // 添加文档
        console.log('添加文档功能需要文件路径参数');
        break;

      case 'query':
        const result = await this.service.query(args[0], args[1]);
        console.log('\n答案:', result.answer);
        console.log('\n引用:');
        result.citations.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));
        break;

      case 'summary':
        const summary = await this.service.generateSummary(args[0]);
        console.log('\n摘要:', summary);
        break;

      default:
        console.log('用法: notebookllm <create|add|query|summary> [args]');
    }
  }
}
