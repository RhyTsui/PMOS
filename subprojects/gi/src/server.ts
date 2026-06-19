/**
 * 游戏内参 Game Insider（GI）服务器
 * 游戏行业情报信号源平台
 */
// 必须在所有其他模块之前导入，确保环境变量可用
import './lib/load-env.js';

import express from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase } from './lib/database.js';
import { createApiRouter } from './routes/index.js';
import { getScheduler } from './lib/scheduler.js';

// 初始化数据库
initializeDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || '8003', 10);

// 中间件
app.use(cors());
app.use(express.json());

// 根路由
app.get('/', (req, res) => {
  const scheduler = getScheduler();
  const schedulerStatus = scheduler.getStatus();

  res.json({
    name: '游戏内参 Game Insider',
    shortName: 'GI',
    version: '0.4.0',
    description: '游戏行业情报信号源平台',
    scheduler: schedulerStatus,
    endpoints: {
      sources: '/api/v1/sources',
      seeds: '/api/v1/seeds',
      evidence: '/api/v1/evidence',
      collection: '/api/v1/collection',
      extraction: '/api/v1/extraction',
      system: '/api/v1/system',
    },
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API v1 路由
app.use('/api/v1', createApiRouter());

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `接口不存在: ${req.method} ${req.path}`,
    },
  });
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
  console.log(`API 文档: http://localhost:${PORT}/`);

  // 启动调度器
  const scheduler = getScheduler();
  scheduler.start();
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  const scheduler = getScheduler();
  scheduler.stop();
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭...');
  const scheduler = getScheduler();
  scheduler.stop();
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});
