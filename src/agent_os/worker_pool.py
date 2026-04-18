"""
PMAIOS v0.3.3 Worker Pool

核心功能:
- 管理 10-50 个并行 Worker
- asyncio 并发执行
- 自动从 Redis 队列拉取任务
"""
import asyncio
import logging
from typing import List, Optional
from datetime import datetime
from .config import Config
from .redis_queue import RedisQueue, Task, TaskStatus
from .agents.worker import WorkerAgent, WorkerResult


logger = logging.getLogger(__name__)


class WorkerPool:
    """Worker 池 - 管理并行执行的 Worker"""

    def __init__(self, size: int = 20, config: Optional[Config] = None):
        self.size = size
        self.config = config or Config.from_env()
        self.queue = RedisQueue(
            host=self.config.redis_host,
            port=self.config.redis_port,
            db=self.config.redis_db
        )
        self.workers = [WorkerAgent(worker_id=i, config=self.config) for i in range(size)]
        self.running = False
        self.stats = {
            "tasks_completed": 0,
            "tasks_failed": 0,
            "start_time": None,
        }

    async def run_worker(self, worker: WorkerAgent) -> None:
        """运行单个 Worker"""
        logger.info(f"[Worker {worker.worker_id}] started")

        while self.running:
            # 从队列获取任务
            task = self.queue.pop_task()

            if not task:
                # 无任务，短暂等待
                await asyncio.sleep(0.5)
                continue

            logger.info(f"[Worker {worker.worker_id}] executing task {task.id}")

            try:
                # 执行任务
                result = worker.run(task.content)

                # 设置 task_id
                result.task_id = task.id

                if result.success:
                    # 完成任务
                    self.queue.complete_task(task.id, result.output)
                    self.stats["tasks_completed"] += 1
                    logger.info(f"[Worker {worker.worker_id}] completed task {task.id}")
                else:
                    # 任务失败
                    self.queue.fail_task(task.id, result.error or "Unknown error")
                    self.stats["tasks_failed"] += 1
                    logger.error(f"[Worker {worker.worker_id}] failed task {task.id}: {result.error}")

            except Exception as e:
                # 异常处理
                self.queue.fail_task(task.id, str(e))
                self.stats["tasks_failed"] += 1
                logger.error(f"[Worker {worker.worker_id}] exception on task {task.id}: {e}")

            # 短暂等待，避免过度占用
            await asyncio.sleep(0.1)

    async def start(self) -> None:
        """启动 Worker 池"""
        self.running = True
        self.stats["start_time"] = datetime.utcnow().isoformat()

        logger.info(f"Starting Worker Pool with {self.size} workers")

        # 并发启动所有 Worker
        await asyncio.gather(
            *[self.run_worker(worker) for worker in self.workers]
        )

    def stop(self) -> None:
        """停止 Worker 池"""
        self.running = False
        logger.info("Worker Pool stopped")

    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            **self.stats,
            "pool_size": self.size,
            "queue_size": self.queue.queue_size(),
            "running_tasks": self.queue.running_count(),
        }


class WorkerPoolManager:
    """Worker Pool 管理器"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.pool: Optional[WorkerPool] = None
        self.task: Optional[asyncio.Task] = None

    def start(self, size: int = 20) -> None:
        """启动 Worker Pool"""
        if self.pool and self.pool.running:
            logger.warning("Worker Pool already running")
            return

        self.pool = WorkerPool(size=size, config=self.config)
        self.task = asyncio.create_task(self.pool.start())
        logger.info(f"Worker Pool Manager started with {size} workers")

    def stop(self) -> None:
        """停止 Worker Pool"""
        if self.pool:
            self.pool.stop()
            if self.task:
                self.task.cancel()
        logger.info("Worker Pool Manager stopped")

    def get_status(self) -> dict:
        """获取状态"""
        if not self.pool:
            return {"status": "not_started"}
        return {
            "status": "running" if self.pool.running else "stopped",
            "stats": self.pool.get_stats()
        }
