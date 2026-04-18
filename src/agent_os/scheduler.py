"""
PMAIOS v0.3.3 Scheduler 调度器

核心功能:
- 定时任务调度
- Cron 风格调度
- 任务自动分发
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Callable, Dict, Any, List
from .config import Config
from .redis_queue import RedisQueue, Task
from .worker_pool import WorkerPool, WorkerPoolManager


logger = logging.getLogger(__name__)


class Scheduler:
    """任务调度器"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.queue = RedisQueue(
            host=self.config.redis_host,
            port=self.config.redis_port,
            db=self.config.redis_db
        )
        self.running = False
        self.interval = self.config.scheduler_interval
        self.scheduled_tasks: List[Dict[str, Any]] = []
        self.stats = {
            "tasks_scheduled": 0,
            "last_run": None,
            "start_time": None,
        }

    def schedule_task(self, content: str, priority: int = 0, delay: int = 0) -> str:
        """调度单个任务"""
        task = Task(
            id=f"task-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
            content=content,
            priority=priority,
        )
        task_id = self.queue.push_task(task)
        self.stats["tasks_scheduled"] += 1
        logger.info(f"Scheduled task {task_id} with priority {priority}")
        return task_id

    def schedule_batch(self, tasks: List[Dict[str, Any]]) -> List[str]:
        """批量调度任务"""
        task_ids = []
        for task_def in tasks:
            task = Task(
                id=f"task-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                content=task_def.get("content", ""),
                priority=task_def.get("priority", 0),
                metadata=task_def.get("metadata", {}),
            )
            task_id = self.queue.push_task(task)
            task_ids.append(task_id)
        self.stats["tasks_scheduled"] += len(tasks)
        logger.info(f"Scheduled batch of {len(tasks)} tasks")
        return task_ids

    async def run_loop(self) -> None:
        """运行调度循环"""
        self.running = True
        self.stats["start_time"] = datetime.utcnow().isoformat()

        logger.info(f"Scheduler started with interval {self.interval}s")

        while self.running:
            try:
                # 检查并执行定时任务
                await self._check_scheduled_tasks()

                # 打印状态
                stats = self.get_stats()
                logger.debug(f"Scheduler stats: {stats}")

                await asyncio.sleep(self.interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(self.interval)

    async def _check_scheduled_tasks(self) -> None:
        """检查定时任务"""
        now = datetime.utcnow()
        for task in self.scheduled_tasks:
            scheduled_time = task.get("scheduled_time")
            if scheduled_time and now >= scheduled_time:
                if not task.get("dispatched", False):
                    self.schedule_task(
                        content=task.get("content", ""),
                        priority=task.get("priority", 0)
                    )
                    task["dispatched"] = True
                    self.stats["last_run"] = now.isoformat()

    def add_scheduled_task(self, content: str, scheduled_time: datetime, priority: int = 0) -> None:
        """添加定时任务"""
        self.scheduled_tasks.append({
            "content": content,
            "scheduled_time": scheduled_time,
            "priority": priority,
            "dispatched": False,
        })
        logger.info(f"Added scheduled task at {scheduled_time}")

    def stop(self) -> None:
        """停止调度器"""
        self.running = False
        logger.info("Scheduler stopped")

    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            **self.stats,
            "queue_size": self.queue.queue_size(),
            "running_tasks": self.queue.running_count(),
            "scheduled_tasks": len([t for t in self.scheduled_tasks if not t.get("dispatched")]),
        }


class AgentOS:
    """Agent OS 主入口"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.from_env()
        self.scheduler = Scheduler(config=self.config)
        self.pool_manager = WorkerPoolManager(config=self.config)
        self.running = False

    async def start(self, worker_count: int = 20) -> None:
        """启动 Agent OS"""
        self.config.validate()
        self.running = True

        logger.info("Starting Agent OS...")

        # 启动 Worker Pool
        self.pool_manager.start(size=worker_count)

        # 启动 Scheduler
        scheduler_task = asyncio.create_task(self.scheduler.run_loop())

        logger.info(f"Agent OS started with {worker_count} workers")

        try:
            # 保持运行
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()

    async def stop(self) -> None:
        """停止 Agent OS"""
        self.running = False
        self.scheduler.stop()
        self.pool_manager.stop()
        logger.info("Agent OS stopped")

    def submit_task(self, content: str, priority: int = 0) -> str:
        """提交任务"""
        return self.scheduler.schedule_task(content, priority)

    def submit_batch(self, tasks: List[Dict[str, Any]]) -> List[str]:
        """批量提交任务"""
        return self.scheduler.schedule_batch(tasks)

    def get_status(self) -> dict:
        """获取系统状态"""
        return {
            "status": "running" if self.running else "stopped",
            "scheduler": self.scheduler.get_stats(),
            "worker_pool": self.pool_manager.get_status(),
        }


# ============================================================
# 主入口 - 可运行 8 小时+
# ============================================================

async def main():
    """主入口函数"""
    config = Config.from_env()

    # 创建 Agent OS
    os = AgentOS(config=config)

    # 启动
    os_task = asyncio.create_task(os.start(worker_count=config.worker_pool_size))

    # 提交示例任务
    for i in range(10):
        os.submit_task(
            content=f"Execute analysis task #{i+1}",
            priority=i % 3
        )

    # 运行直到被取消
    try:
        await os_task
    except asyncio.CancelledError:
        await os.stop()


if __name__ == "__main__":
    asyncio.run(main())
