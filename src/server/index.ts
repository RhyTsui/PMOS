/**
 * PMAIOS API Server
 *
 * 提供工作流执行、知识库读取、Notion 同步等 API 接口
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { FileStore } from '../core/fileStore.js';
import { MemoryService } from '../core/memoryService.js';
import { NotionService, checkNotionConfig } from '../core/notionService.js';
import { KnowledgeReader } from '../core/knowledgeReader.js';
import { callGemini } from '../core/geminiClient.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 初始化服务
const store = new FileStore(process.cwd());
const memoryService = new MemoryService(store);
const notionService = new NotionService(store);
const knowledgeReader = new KnowledgeReader(store);

// ========================
// 健康检查
// ========================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.3',
    timestamp: new Date().toISOString(),
  });
});

// ========================
// 工作流 API
// ========================

/**
 * 运行多 Agent 工作流
 * POST /api/workflow/run
 */
app.post('/api/workflow/run', async (req, res) => {
  const { idea, useHermes = true } = req.body;

  if (!idea) {
    return res.status(400).json({ error: '产品创意 (idea) 不能为空' });
  }

  try {
    // 调用 Python 工作流
    const result = await runPythonWorkflow(idea, useHermes);
    res.json(result);
  } catch (error) {
    console.error('工作流执行失败:', error);
    res.status(500).json({
      error: '工作流执行失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 获取工作流状态
 * GET /api/workflow/status/:runId
 */
app.get('/api/workflow/status/:runId', async (req, res) => {
  const { runId } = req.params;

  try {
    const statusPath = `workflow-status/${runId}.json`;
    const exists = await store.exists(statusPath);

    if (!exists) {
      return res.status(404).json({ error: '工作流状态不存在' });
    }

    const status = await store.readJson(statusPath);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: '获取状态失败' });
  }
});

/**
 * 获取工作流历史
 * GET /api/workflow/history
 */
app.get('/api/workflow/history', async (req, res) => {
  try {
    const historyPath = 'workflow-history.json';
    const exists = await store.exists(historyPath);

    if (!exists) {
      return res.json({ history: [] });
    }

    const history = await store.readJson(historyPath);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: '获取历史失败' });
  }
});

// ========================
// 知识库 API
// ========================

/**
 * 读取 OKR
 * GET /api/knowledge/okr
 */
app.get('/api/knowledge/okr', async (req, res) => {
  try {
    const docs = await knowledgeReader.readOKRs();
    res.json({ okrs: docs });
  } catch (error) {
    res.status(500).json({ error: '读取 OKR 失败' });
  }
});

/**
 * 读取周报
 * GET /api/knowledge/weekly
 */
app.get('/api/knowledge/weekly', async (req, res) => {
  try {
    const docs = await knowledgeReader.readWeeklyReports();
    res.json({ weeklyReports: docs });
  } catch (error) {
    res.status(500).json({ error: '读取周报失败' });
  }
});

/**
 * 读取会议纪要
 * GET /api/knowledge/meeting
 */
app.get('/api/knowledge/meeting', async (req, res) => {
  try {
    const docs = await knowledgeReader.readMeetingNotes();
    res.json({ meetingNotes: docs });
  } catch (error) {
    res.status(500).json({ error: '读取会议纪要失败' });
  }
});

/**
 * 知识库搜索
 * GET /api/knowledge/search?q=xxx
 */
app.get('/api/knowledge/search', async (req, res) => {
  const { q, type } = req.query;

  if (!q) {
    return res.status(400).json({ error: '搜索关键词不能为空' });
  }

  try {
    const results = await knowledgeSearch(q as string, type as string);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: '搜索失败' });
  }
});

// ========================
// Notion API
// ========================

/**
 * 检查 Notion 连接
 * GET /api/notion/status
 */
app.get('/api/notion/status', async (req, res) => {
  const config = checkNotionConfig();
  const isConnected = await notionService.isConnected();

  res.json({
    configured: config.configured,
    missing: config.missing,
    connected: isConnected,
  });
});

/**
 * 同步 PRD 到 Notion
 * POST /api/notion/sync/prd
 */
app.post('/api/notion/sync/prd', async (req, res) => {
  const { prd } = req.body;

  if (!prd) {
    return res.status(400).json({ error: 'PRD 数据不能为空' });
  }

  try {
    const page = await notionService.syncPRD(prd);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({
      error: '同步 PRD 失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 同步会议纪要到 Notion
 * POST /api/notion/sync/meeting
 */
app.post('/api/notion/sync/meeting', async (req, res) => {
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: '会议纪要数据不能为空' });
  }

  try {
    const page = await notionService.syncMeetingNote(note);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({
      error: '同步会议纪要失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 记录决策日志
 * POST /api/notion/log/decision
 */
app.post('/api/notion/log/decision', async (req, res) => {
  const { decision } = req.body;

  if (!decision) {
    return res.status(400).json({ error: '决策数据不能为空' });
  }

  try {
    const page = await notionService.logDecision(decision);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({
      error: '记录决策失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ========================
// Gemini API 测试
// ========================

/**
 * 测试 Gemini API
 * POST /api/gemini/test
 */
app.post('/api/gemini/test', async (req, res) => {
  try {
    const result = await callGemini('你好，请用一句话介绍你自己');
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({
      error: 'Gemini API 测试失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ========================
// 辅助函数
// ========================

/**
 * 运行 Python 工作流
 */
async function runPythonWorkflow(idea: string, useHermes: boolean): Promise<Record<string, unknown>> {
  const runId = `run-${Date.now()}`;
  const workflowPath = useHermes
    ? path.join(process.cwd(), 'src/langgraph/python/hermes_workflow.py')
    : path.join(process.cwd(), 'src/langgraph/python/multi_agent_workflow.py');

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('py', ['-3.11', workflowPath, idea], {
      cwd: process.cwd(),
      env: { ...process.env, GOOGLE_API_KEY: process.env.GEMINI_API_KEY || '' },
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('[Python stdout]', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('[Python stderr]', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        // 读取输出文件
        const outputPath = useHermes ? 'prd_hermes_output.json' : 'prd_output.json';
        try {
          const result = await store.readJson(outputPath);

          // 保存历史记录
          await saveWorkflowHistory(runId, result);

          resolve({
            runId,
            success: true,
            data: result,
          });
        } catch {
          resolve({
            runId,
            success: true,
            data: { rawOutput: output },
          });
        }
      } else {
        reject(new Error(`Python 进程退出码：${code}\n${errorOutput}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 保存工作流历史
 */
async function saveWorkflowHistory(runId: string, result: Record<string, unknown>): Promise<void> {
  const historyPath = 'workflow-history.json';
  let history: Array<{ runId: string; timestamp: string; idea: string; score?: number }> = [];

  if (await store.exists(historyPath)) {
    history = await store.readJson(historyPath);
  }

  history.push({
    runId,
    timestamp: new Date().toISOString(),
    idea: (result as any)?.prd?.idea || (result as any)?.idea || 'Unknown',
    score: (result as any)?.review?.score,
  });

  await store.writeJson(historyPath, history);
}

/**
 * 知识库搜索
 */
async function knowledgeSearch(query: string, type?: string): Promise<Array<{ path: string; content: string; score: number }>> {
  // 简单实现：读取所有文档，基于关键词匹配
  const results: Array<{ path: string; content: string; score: number }> = [];

  let folders: string[] = [];
  if (type === 'okr') {
    folders = ['knowledge/quarterly-okrs'];
  } else if (type === 'weekly') {
    folders = ['knowledge/weekly-reports'];
  } else if (type === 'meeting') {
    folders = ['knowledge/meeting-notes'];
  } else {
    folders = ['knowledge/quarterly-okrs', 'knowledge/weekly-reports', 'knowledge/meeting-notes'];
  }

  for (const folder of folders) {
    try {
      const docs = await knowledgeReader.readFolder(folder);
      for (const doc of docs) {
        const contentLower = doc.content.toLowerCase();
        const queryLower = query.toLowerCase();

        if (contentLower.includes(queryLower)) {
          results.push({
            path: doc.path,
            content: doc.content.slice(0, 500) + '...',
            score: 1, // 简化：不计算相关性
          });
        }
      }
    } catch {
      // 忽略错误
    }
  }

  return results;
}

// ========================
// 启动服务器
// ========================

app.listen(PORT, () => {
  console.log(`\n🚀 PMAIOS API Server 已启动`);
  console.log(`   端口：${PORT}`);
  console.log(`   地址：http://localhost:${PORT}`);
  console.log(`\n可用接口:`);
  console.log(`   GET  /api/health           - 健康检查`);
  console.log(`   POST /api/workflow/run     - 运行工作流`);
  console.log(`   GET  /api/knowledge/okr    - 读取 OKR`);
  console.log(`   GET  /api/knowledge/weekly - 读取周报`);
  console.log(`   GET  /api/knowledge/meeting- 读取会议纪要`);
  console.log(`   GET  /api/notion/status    - Notion 状态`);
  console.log(`   POST /api/gemini/test      - 测试 Gemini API`);
});

export default app;
