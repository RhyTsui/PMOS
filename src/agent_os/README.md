# PMAIOS v0.3.3 Agent OS

并行 Agent 池 + Redis 队列 + LangGraph 编排系统

## 架构

```
                 ┌──────────────────────┐
                 │   Scheduler (Cron)   │
                 └─────────┬────────────┘
                           ↓
                ┌──────────────────────┐
                │   Redis Task Queue   │
                └─────────┬────────────┘
                          ↓
     ┌────────────────────────────────────────┐
     │         Worker Agent Pool (10~50)      │
     └───────────┬───────────────┬───────────┘
                 ↓               ↓
        ┌──────────────┐  ┌──────────────┐
        │ LangGraph DAG │  │ Memory Layer │
        └──────┬───────┘  └──────┬───────┘
```

## 安装

```bash
pip install -r requirements.txt
```

## 配置

设置环境变量：

```bash
export CLAUDE_API_KEY=your_api_key
export REDIS_HOST=localhost
export REDIS_PORT=6379
export WORKER_POOL_SIZE=20
```

## 使用示例

### 1. 启动 Agent OS

```python
from src.agent_os.scheduler import AgentOS
from src.agent_os.config import Config
import asyncio

async def main():
    config = Config.from_env()
    os = AgentOS(config=config)
    
    # 启动 20 个 Worker
    await os.start(worker_count=20)

asyncio.run(main())
```

### 2. 提交任务

```python
from src.agent_os.redis_queue import RedisQueue, Task

queue = RedisQueue()

# 提交单个任务
task_id = queue.push_task(Task(
    id="task-001",
    content="分析用户需求并生成 PRD",
    priority=1
))

# 批量提交
queue.push_task(Task(
    id="task-002",
    content="生成前端组件代码",
    priority=0
))
```

### 3. 使用 LangGraph 工作流

```python
from src.agent_os.graph.workflow import create_simple_workflow

workflow = create_simple_workflow()

initial_state = {
    "business": {"roi": 0.8},
    "user": {"persona": "..."},
}

result = workflow.run_sync(initial_state)
print(f"Final state: {result}")
```

## 模块说明

| 模块 | 说明 |
|------|------|
| `config.py` | 配置管理 |
| `redis_queue.py` | Redis 任务队列 |
| `worker_pool.py` | Worker 池管理 |
| `scheduler.py` | 调度器 |
| `graph/workflow.py` | LangGraph 编排 |
| `agents/worker.py` | Worker/Planner/Reviewer/Synthesizer |
| `memory/state.py` | 状态记忆 |

## v0.3.4 Excel 需求池

```python
from src.agent_os.excel_requirement_pool import ExcelRequirementPool

pool = ExcelRequirementPool("./requirement_pool.xlsx")

# 从会议纪要提取需求
pool.extract_from_meeting(
    meeting_notes="...",
    product_line="广告平台"
)

# 从日报提取需求
pool.extract_from_daily_report(
    report_content="...",
    author="张三",
    product_line="数据服务"
)

# 从 OKR 提取需求
pool.extract_from_okr(
    okr_data={"objective": "...", "key_results": [...]},
    product_line="AI 平台"
)

# 需求收敛
pool.converge_requirements(project_docs=[...])

# 查询需求
reqs = pool.get_requirements(product_line="广告平台")

# 获取摘要
summary = pool.get_summary()
```

## 运行 8 小时+

系统支持长时间运行：
- Redis 队列持久化任务
- Worker 崩溃自动恢复
- 断点续传支持
- 日志记录所有执行
