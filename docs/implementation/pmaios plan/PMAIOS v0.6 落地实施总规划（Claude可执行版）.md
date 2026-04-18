PMAIOS v0.6 落地实施总规划（Claude可执行版）

版本定位：
❗从 AI Agent System → AI Operating System（可执行内核版）

1. 系统目标（v0.6）

构建一个完整 AI OS，具备：

✔ 强制执行（Control Plane）
✔ 可观测（Observability）
✔ 可追踪版本（Version System）
✔ 需求驱动（Requirement System）
✔ 外部能力扩展（Dify + n8n）
✔ 可演进结构（Meta Layer预留）
2. 总体架构（必须严格遵守）
                ┌────────────────────────────┐
                │   L0 Meta Layer (v0.5)     │
                │ architecture reviewer only │
                └────────────┬───────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │   L1 Control Plane (LangGraph Core)     │
        │ DAG + State Machine + Scheduler Kernel  │
        └────────────┬──────────────┬────────────┘
                     │              │
      ┌──────────────▼───┐   ┌─────▼────────────┐
      │ L2 Policy (Hermes)│   │ L3 Agents Layer  │
      │ gating only       │   │ planner/worker   │
      └──────────────┬───┘   └─────┬────────────┘
                     │              │
        ┌────────────▼──────────────▼───────────┐
        │ L4 Capability Layer (Dify integration) │
        └────────────┬──────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │ L5 Automation Layer     │
        │ n8n / external systems  │
        └────────────┬────────────┘
                     │
        ┌────────────▼──────────────────────────┐
        │ L6 Observability + Version System     │
        │ logs + trace + diff + registry        │
        └───────────────────────────────────────┘
3. Repo结构设计（v0.6核心交付）

❗这是可以直接开工的结构

PMAIOS/
│
├── control_plane/                  # L1 核心执行引擎
│   ├── graph/                      # LangGraph定义
│   ├── scheduler/                  # 调度器
│   ├── state_machine/             # 状态系统
│   └── executor/                  # 执行器
│
├── policy/                        # L2 Hermes
│   ├── rules/
│   ├── gate_engine.py
│   └── policy_engine.py
│
├── agents/                        # L3 执行层
│   ├── planner.py
│   ├── worker.py
│   ├── analyzer.py
│   └── synthesizer.py
│
├── capabilities/                  # L4 Dify integration
│   ├── dify_client.py
│   ├── prompt_workflows/
│   └── tools_registry.py
│
├── automation/                    # L5 n8n integration
│   ├── n8n_client.py
│   ├── webhooks/
│   └── event_triggers.py
│
├── observability/                # L6 可观测性系统
│   ├── logger.py
│   ├── trace_engine.py
│   ├── event_stream.py
│   └── dashboard_data.py
│
├── versioning/                   # L6 Version System
│   ├── version_registry.py
│   ├── diff_engine.py
│   ├── change_tracker.py
│   └── rollback.py
│
├── requirements/                 # L7 Requirement System
│   ├── ingestion.py              # chat → requirement
│   ├── classifier.py
│   ├── requirement_store.py
│   └── requirement_graph.py
│
├── meta/                         # L0 Meta Layer（预留）
│   ├── reviewer.py
│   ├── architecture_scanner.py
│   └── evolution_engine.py
│
├── schema/                       # 全局结构定义
│   ├── task_schema.py
│   ├── event_schema.py
│   └── output_schema.py
│
└── ui/                           # 可视化层（后续扩展）
4. Control Plane（LangGraph实现设计）
4.1 核心原则

❗Control Plane 是唯一执行入口

4.2 执行流程
User Input
   ↓
Requirement Parser
   ↓
Control Plane (LangGraph)
   ↓
Policy Check (Hermes)
   ↓
Task Decomposition (Planner)
   ↓
Agent Execution (Worker Pool)
   ↓
Aggregation (Synthesizer)
   ↓
Observability Logging
   ↓
Version Registry Update
4.3 DAG节点定义

必须包含：

ingest_node
plan_node
policy_gate_node
dispatch_node
worker_node
aggregate_node
finalize_node
4.4 强制规则
- Agent cannot bypass graph
- Hermes cannot modify routing
- All transitions are state-driven
- All nodes emit event log
5. Version + Requirement Event System（核心闭环）
5.1 Requirement Flow
Chat Input
   ↓
Requirement Ingestion
   ↓
Classification:
    - feature
    - bug
    - architecture
   ↓
Store Requirement
   ↓
Link to Execution Task
5.2 Version Flow
Execution Event
   ↓
Diff Detection
   ↓
Version Entry Creation
   ↓
Registry Update
   ↓
Link to Requirement
5.3 Version Registry结构
{
  "version": "v0.6.0",
  "timestamp": "",
  "changes": [
    {
      "type": "feature",
      "module": "control_plane"
    }
  ],
  "requirements": [
    "req_001"
  ],
  "diff": "auto-generated",
  "status": "active"
}
6. Dify / n8n 接入规范
6.1 Dify（能力层）
仅提供：
prompt workflow
LLM toolchain
❌ 不参与 Control Plane
6.2 n8n（自动化层）
仅提供：
webhook trigger
external API orchestration
❌ 不参与 AI reasoning
7. 执行约束（必须写进代码）
1. Control Plane is the ONLY execution authority
2. Hermes is policy-only (no routing)
3. Agents cannot modify graph
4. All execution emits logs
5. All changes generate version entry
6. All requirements must be tracked
8. v0.6交付目标（非常重要）
✔ 必须完成：
1. 可运行 Control Plane
LangGraph DAG跑通
2. Agent系统
planner/worker可执行
3. Version System
自动记录变更
4. Requirement System
chat → requirement闭环
5. Observability
全链路日志
9. v0.6一句话定义

❗PMAIOS v0.6 = 可执行 AI 操作系统内核（Execution + Trace + Version + Requirement 闭环）