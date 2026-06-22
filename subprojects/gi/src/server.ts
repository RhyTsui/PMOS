/**
 * 游戏内参 Game Insider（GI）服务器
 * 游戏行业情报信号源平台
 */
// 必须在所有其他模块之前导入，确保环境变量可用
import './lib/load-env.js';

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, closeDatabase } from './lib/database.js';
import { createApiRouter } from './routes/index.js';
import { getScheduler } from './lib/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendPath, 'index.html');

// 初始化数据库
initializeDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || '8003', 10);

// 中间件
app.use(cors());
app.use(express.json());

function sendFrontendIndex(res: express.Response): void {
  if (!fs.existsSync(frontendIndexPath)) {
    res.status(503).json({
      error: {
        code: 'FRONTEND_NOT_BUILT',
        message: '前端构建产物不存在，请先构建 frontend/dist',
      },
    });
    return;
  }

  res.sendFile(frontendIndexPath);
}

// 根路由（前端入口）
app.get('/', (_req, res) => {
  sendFrontendIndex(res);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API v1 路由
app.use('/api/v1', createApiRouter());

// 404 处理（仅 API 路径）
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `接口不存在: ${req.method} ${req.path}`,
    },
  });
});

// 前端静态文件服务
app.use(express.static(frontendPath));

// SPA 路由：所有非 API 路由返回 index.html
app.get('*', (req, res, next) => {
  // 跳过 API 路径
  if (req.path.startsWith('/api/')) {
    return next();
  }
  sendFrontendIndex(res);
});

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
    },
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`GI (游戏内参) server running on port ${PORT}`);
  console.log(`前端界面: http://localhost:${PORT}/`);
  console.log(`API 文档: http://localhost:${PORT}/api/v1/`);

  // 根据持久化配置启动调度器
  const scheduler = getScheduler();
  if (scheduler.getConfig().enabled) {
    scheduler.start(false);
  } else {
    console.log('[Scheduler] 持久化配置为禁用，启动时不自动运行');
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  const scheduler = getScheduler();
  scheduler.stop(false);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭...');
  const scheduler = getScheduler();
  scheduler.stop(false);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});
