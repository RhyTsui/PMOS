"""
PMAIOS v0.3.3 Redis 任务队列

核心功能:
- 任务入队/出队
- 任务优先级支持
- 任务状态追踪
"""
import redis
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    """任务定义"""
    id: str
    content: str
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 0  # 越高越优先
    created_at: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None
    worker_id: Optional[int] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        return cls(**data)


class RedisQueue:
    """Redis 任务队列"""

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self.redis = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self.queue_key = "agent_os:tasks:queue"
        self.priority_queue_key = "agent_os:tasks:priority"
        self.task_hash_key = "agent_os:tasks:hash"
        self.running_key = "agent_os:tasks:running"

    def push_task(self, task: Task) -> str:
        """推送任务到队列"""
        task_data = json.dumps(task.to_dict())

        # 存储任务详情
        self.redis.hset(self.task_hash_key, task.id, task_data)

        # 根据优先级入队
        if task.priority > 0:
            # 高优先级任务使用 sorted set
            self.redis.zadd(self.priority_queue_key, {task.id: task.priority})
        else:
            # 普通任务使用 list
            self.redis.lpush(self.queue_key, task.id)

        return task.id

    def pop_task(self) -> Optional[Task]:
        """从队列弹出任务（优先级优先）"""
        # 先检查高优先级队列
        task_id = self.redis.zpopmin(self.priority_queue_key, count=1)
        if task_id:
            task_id = task_id[0][0]
        else:
            # 再检查普通队列
            task_id = self.redis.rpop(self.queue_key)

        if task_id:
            task_data = self.redis.hget(self.task_hash_key, task_id)
            if task_data:
                task = Task.from_dict(json.loads(task_data))
                # 标记为运行中
                task.status = TaskStatus.RUNNING
                task.started_at = datetime.utcnow().isoformat()
                self.redis.hset(self.task_hash_key, task.id, json.dumps(task.to_dict()))
                self.redis.sadd(self.running_key, task.id)
                return task
        return None

    def complete_task(self, task_id: str, result: str) -> bool:
        """完成任务"""
        task_data = self.redis.hget(self.task_hash_key, task_id)
        if not task_data:
            return False

        task = Task.from_dict(json.loads(task_data))
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow().isoformat()
        task.result = result

        self.redis.hset(self.task_hash_key, task.id, json.dumps(task.to_dict()))
        self.redis.srem(self.running_key, task_id)
        return True

    def fail_task(self, task_id: str, error: str) -> bool:
        """失败任务"""
        task_data = self.redis.hget(self.task_hash_key, task_id)
        if not task_data:
            return False

        task = Task.from_dict(json.loads(task_data))
        task.status = TaskStatus.FAILED
        task.completed_at = datetime.utcnow().isoformat()
        task.error = error

        self.redis.hset(self.task_hash_key, task.id, json.dumps(task.to_dict()))
        self.redis.srem(self.running_key, task_id)
        return True

    def get_task(self, task_id: str) -> Optional[Task]:
        """获取任务详情"""
        task_data = self.redis.hget(self.task_hash_key, task_id)
        if task_data:
            return Task.from_dict(json.loads(task_data))
        return None

    def queue_size(self) -> int:
        """队列大小"""
        list_size = self.redis.llen(self.queue_key)
        priority_size = self.redis.zcard(self.priority_queue_key)
        return list_size + priority_size

    def running_count(self) -> int:
        """运行中任务数"""
        return self.redis.scard(self.running_key)

    def list_pending_tasks(self) -> List[Task]:
        """列出所有待处理任务"""
        tasks = []
        for task_id in self.redis.hkeys(self.task_hash_key):
            task_data = self.redis.hget(self.task_hash_key, task_id)
            if task_data:
                task = Task.from_dict(json.loads(task_data))
                if task.status == TaskStatus.PENDING:
                    tasks.append(task)
        return tasks

    def list_running_tasks(self) -> List[Task]:
        """列出所有运行中任务"""
        tasks = []
        for task_id in self.redis.smembers(self.running_key):
            task = self.get_task(task_id)
            if task:
                tasks.append(task)
        return tasks
