# PMAIOS 全量需求分析文档（含架构决策来源）

## 1. 文档来源（非常关键）

本需求由三类输入合并生成：

### A. 系统演进对话（核心来源）
- PMAIOS v0.1 → v0.4 架构讨论
- Hermes / Control Plane 冲突分析
- Meta Layer（系统评审器）设计
- 11项真实使用问题反馈

---

### B. 工具链选型讨论（Dify / n8n / LangGraph）
- AI能力层如何标准化
- 工作流编排 vs OS内核划分
- 外部系统如何接入 AI OS

---

### C. 现实系统问题反馈（11条）
- workflow不执行
- UI不可用
- 并行慢
- 结构混乱
- observability缺失
- 版本管理缺失

---

## 2. 核心系统本质升级

当前系统从：

> Agent System

升级为：

> AI Operating System + Requirement Driven Evolution System

---

## 3. 架构决策来源分析（关键）

---

## 3.1 为什么需要 Control Plane（LangGraph）

### 来源：
- workflow 不执行
- agent 自由运行导致系统失控
- 多任务并行无序

### 决策：
👉 引入 LangGraph 作为唯一 DAG runtime

### 作用：
- 强制执行 workflow
- 保证 deterministic execution
- 管理 state graph

---

## 3.2 为什么需要 Hermes（Policy Layer）

### 来源：
- 需要权限控制
- 需要安全边界
- 需要成本控制

### 决策：
👉 Hermes 降级为 policy layer

### 作用：
- 不参与 routing
- 不参与 planning
- 只做 gate / allow / deny

---

## 3.3 为什么引入 Dify（能力层）

### 来源：
- AI能力编排复杂
- prompt workflow 需要标准化
- 多模型调用管理

### 决策：
👉 Dify = Capability Layer（外部能力系统）

### 作用：
- prompt workflow
- knowledge base
- LLM app builder

---

## 3.4 为什么引入 n8n（系统编排层）

### 来源：
- 外部系统自动化需求
- webhook / API 流程编排
- 数据流自动化

### 决策：
👉 n8n = External Automation Layer

### 作用：
- 系统级自动化
- 非AI任务编排
- 外部事件驱动

---

## 3.5 为什么需要 Meta Layer（新增）

### 来源：
- 系统没有自我评估能力
- 没有版本自动演进
- 没有架构冲突检测

### 决策：
👉 增加 Meta Layer（System Critic）

### 作用：
- architecture review
- version evolution
- system optimization

---

## 4. 关键问题归类（统一）

### L1 Execution问题
- workflow不执行
- 并行慢
- DAG不稳定

---

### L2 Schema问题
- 输出不统一
- 目录混乱
- UTF-8问题

---

### L3 Observability问题
- 无日志流
- 无进度推送
- 无状态追踪

---

### L4 Agent问题
- agent不服从系统
- Hermes职责混乱

---

### L5 Product问题
- UI不可用
- 无可视化控制台

---

### L6 Evolution问题
- 无版本系统
- 无需求闭环
- 无自进化机制

---

## 5. 最终系统目标

> Requirement → System Design → Execution → Observation → Version → Evolution

形成 AI OS 闭环系统