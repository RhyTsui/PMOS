# Query Contract & MCP Enhancement Specification

> 问数主链 QueryContract / MCP / FastMCP 增强规范  
> Canonical file: `docs/architecture/report-query-runtime/QUERY_CONTRACT_AND_MCP_ENHANCEMENT_SPEC.md`  
> Version: `0.1.0`  
> Status: Draft  
> Last Updated: 2026-06-25

---

## 0. 文档定位

本文件是小乔智投问数主链的专项设计规范，定义 QueryContract、Capability Discovery、mcp-agent、FastMCP、Entity/Enum 分流、LLM 调用点、UI 展示和验收策略的边界、红线和要求。

本规范与以下文档联动：
- `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` — 总纲（架构、协议、渲染体系）
- `docs/sources/inbox/小乔智投工程实施协作规范补充.docx` — 反局部收敛与未上线能力闭环原则

---

## 1. 问数主链核心链路

```
用户输入
  → Request Understanding（意图理解、实体解析、信息源仲裁）
  → QueryContract 生成（Canonical 结构化输入）
  → Capability Discovery（消费 QueryContract / ToolContract / Registry）
  → Tool Semantic Analyzer（Tool schema / enumValues / annotations → 语义信号）
  → Plan 生成（候选计划 + 仲裁）
  → Execution（MCP / Tool / API 调用）
  → Result Assembly（统一结果契约）
  → UI 展示（主回答 + 图表/表格 + trace）
  → 追问闭环
```

**关键原则**：Fat MCP / Fat Skill + Thin Chat Runtime。Chat Runtime 只做薄编排和协议转换，MCP/Skill 是业务能力事实源。

---

## 2. QueryContract 红线

### 2.1 Canonical QueryContract

QueryContract 是问数主链**唯一结构化输入**。

```ts
// QueryContract 核心结构（示意）
interface QueryContract {
  queryId: string;
  intent: QueryIntent;
  entities: ResolvedEntity[];        // 已解析的实体
  parsedFilters: ParsedFilter[];     // filter clause 唯一真源
  entityHints: EntityHint[];         // 只能包含实体值，不允许包含字段名或筛选说明
  metrics: MetricRef[];              // 指标引用
  dimensions: DimensionRef[];        // 维度引用
  timeRange: TimeRange;
  rawMessage?: string;               // 仅上游理解阶段可用
}
```

### 2.2 红线规则

| 规则 | 说明 |
|------|------|
| **raw message 隔离** | raw message 只能在上游理解阶段使用，下游不得重新从 raw message 抽实体、能力、工具或参数 |
| **entityHints 纯值约束** | entityHints 只能包含实体值（如 `"app_id": "12345"`），不允许包含字段名或筛选说明 |
| **parsedFilters 唯一真源** | parsedFilters 是 filter clause 的唯一真源，所有下游筛选必须从此派生 |
| **禁止绕过** | 任何下游模块不得绕过 QueryContract 直接从 raw message 提取信息 |

### 2.3 禁止行为

- 下游模块（Capability Discovery、Execution、Result Assembly）重新解析 raw message
- entityHints 中包含字段名（如 `"app_package_type"`）或筛选说明文本
- 并行维护多套 filter 表示（如同时存在 parsedFilters 和 rawFilters）

---

## 3. 能力发现红线

### 3.1 数据源约束

Capability Discovery **只能消费**以下数据源：

1. **QueryContract** — 结构化查询输入
2. **ToolContract / Internal ToolContract** — 工具能力描述
3. **Unified Registry** — 统一注册中心
4. **Capability Manifest** — 能力清单（由 Tool Semantic Analyzer 输出）

### 3.2 Tool Semantic Analyzer 数据流

```
FastMCP tools/list
  → Tool schema (input_schema / output_schema)
  → Tool description
  → Tool annotations
  → Tool enumValues (input_schema.enum)
      ↓
  Tool Semantic Analyzer
      ↓
  → CapabilityManifest
  → ToolContract
  → Prompt Context
  → Entity Prompt Context
```

### 3.3 禁止行为

- 能力发现重新解析 raw message
- `buildCapabilityManifest`、`ReportCapabilityManifest`、`tool-capability-normalization` 各自维护并行映射
- Tool schema / description / enumValues / annotations 未进入 Tool Semantic Analyzer

---

## 4. Entity / Enum 分流红线

### 4.1 字段分类

| 字段类型 | 示例 | 处理方式 |
|----------|------|----------|
| **identifierFields** | `package`、`app_package_id`、`team`、`app`、`media`、`account` | 走受控实体解析或字典解析（ID resolver） |
| **enumFilterFields** | `app_package_type` | 从 selected tool `input_schema.enum` 校验，**不走 ID resolver** |

### 4.2 核心规则

1. `identifierFields` 与 `enumFilterFields` 必须**严格分离**。
2. `app_package_type` 是 enumFilterField，**不走 ID resolver**。
3. `package` / `app_package_id` 与 `app_package_type` 必须**严格分离**（不允许互相替代或混淆）。
4. `team` / `app` / `media` / `account` 等 ID 型字段走受控实体或字典解析。
5. enumFilterFields 必须从 selected tool `input_schema.enum` 校验，不允许自由文本匹配。

### 4.3 `inferIdentifierTypes` fallback 收口

`inferIdentifierTypes` 的 fallback 必须收口为 `identifierKeyForEntityType`，不允许独立维护类型推断分支。

---

## 5. mcp-agent 红线

### 5.1 定位

mcp-agent 是**主链增强**，不是执行权威。

### 5.2 允许的职责

| 职责 | 说明 |
|------|------|
| QueryContract Review | 审查 QueryContract 完整性 |
| Capability Candidate Provider | 提供候选能力建议 |
| Multi-tool Plan Candidate | 生成多工具编排候选计划 |
| Parameter Assist | 辅助参数填充 |
| Failure Replan | 失败后重新规划 |
| Open Answer Evidence Assist | 开放回答的证据辅助 |

### 5.3 禁止的职责

| 禁止行为 | 原因 |
|----------|------|
| 直接 `selectedTool` | 必须经过 Decision Merge |
| 直接 `final_tool_arguments` | 必须经过参数校验和 Resolver |
| 直接执行工具 | 执行必须走 Execution Policy |
| 绕过 Decision Merge | 多候选必须仲裁 |
| 绕过 Resolver / Permission / Preflight | 安全和权限不可跳过 |
| 宣告工具成功 | 工具成功状态由 Execution 层判定 |

---

## 6. FastMCP 红线

### 6.1 定位

FastMCP 是 **Tool Contract Source** 和 **Tool Execution Boundary**。

### 6.2 允许的职责

| 职责 | 说明 |
|------|------|
| `tools/list` → Internal ToolContract | 工具列表转换为内部工具契约 |
| `input_schema.enum` → enumFilterFields | 枚举值进入字段分类 |
| `annotations / description` → semantic signals | 注解和描述进入语义信号 |
| `tool call result` → Internal ToolResult | 工具调用结果进入内部结果 |
| `error` → errorTaxonomy | 错误进入错误分类 |

### 6.3 禁止的职责

| 禁止行为 | 原因 |
|----------|------|
| 自建独立注册中心 | 注册必须走 Unified Registry |
| 自己决定工具 | 工具选择必须走 Capability Discovery + Plan |
| 做意图识别 | 意图识别属于 Request Understanding |
| 做能力排序 | 能力排序属于 Capability Discovery |
| 绕过内部 Unified Registry | 统一注册是治理基础 |
| 绕过 Preflight | 预检不可跳过 |

---

## 7. LLM 调用点有效性要求

### 7.1 调用点清单

每个 LLM 调用点必须记录和验证以下信息：

| 调用点 | 输入 Schema | 输出 Schema | Prompt 版本 | 模型 | 频率 | 失败策略 | Trace |
|--------|-------------|-------------|-------------|------|------|----------|-------|
| route understanding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| filter correction | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| LLM structured understanding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| four-layer thinking chain | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QueryContract review | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| capability discovery assist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| tool selection review | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| resolver disambiguation review | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| operation risk review | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| mcp-agent review / replan | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| answer composition | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 7.2 门禁规则

- 新增 LLM 调用点必须先登记到上表，才能上线。
- 每个调用点的 Prompt 必须版本化管理。
- 每个调用点的输出必须经过 schema 校验。
- 失败必须有明确的 fallback 策略（不调用 LLM / 降级回答 / 用户追问）。

---

## 8. 追问机制要求

### 8.1 必须追问的场景

- 实体未识别成功
- 必要字段缺失（如时间范围、指标、维度）
- 多个候选结果需要用户选择
- 权限不足需要确认

### 8.2 追问形式

1. **文本追问优先**：先用自然语言说明缺失信息
2. **说明具体缺失字段**：不允许只说"我还未拿到报表查询"
3. **提供可选范围**：如指标枚举、时间范围限制

---

## 9. UI 展示收敛要求

### 9.1 当前展示范围

用户侧只展示：

- 主回答（Markdown 文本）
- 必要图表 / 表格
- 文本追问
- trace 链接（可折叠）

### 9.2 禁止展示

| 禁止展示项 | 原因 |
|------------|------|
| 任务候选检查 | 内部决策过程 |
| 多工具编排未覆盖提示 | 内部能力状态 |
| knowledge skipped | 内部知识库状态 |
| 内部 role review | 内部角色审查 |
| 调用过程组件 | 内部执行细节 |
| 领域信号 evidence_only | 内部信号标记 |
| report_query / data_query 内部不一致提示 | 内部数据状态 |

---

## 10. 验收策略

### 10.1 验收项目

每轮完成后必须提供：

1. **单元测试**：关键函数和模块
2. **关键链路 dump**：QueryContract、ToolContract、Execution 结果
3. **浏览器真实 E2E**：用户可见的完整流程
4. **traceId**：可追溯的执行链路
5. **对比修复前后**：用户可见结果的变化
6. **未修问题清单**：已知但本轮未处理的问题
7. **下一步阻塞清单**：当前阻塞继续推进的问题

### 10.2 验收门禁

- **E2E 不通过，不允许宣称完成。**
- 缺少任一验收项目，不允许标记任务完成。
- 修复必须证明进入真实主链（被 import、被运行时调用、未被 feature flag 挡住、有 trace 证明）。

---

## 11. 反局部收敛约束

> 详细规范参见：`docs/sources/inbox/小乔智投工程实施协作规范补充.docx`

### 11.1 核心约束

1. **禁止自主忽略用户诉求**：用户显式列出的每一项问题都必须进入任务清单
2. **禁止只完成局部**：系统性治理覆盖 设计文档 → 运行链路 → 数据契约 → 代码实现 → trace → UI → 单测 → E2E → 回滚策略
3. **禁止修了但没生效**：每个改动必须证明进入真实链路
4. **禁止靠隐藏警告伪装修复**：不允许隐藏 warning、删除 UI 展示、跳过 preflight、强行 fallback

### 11.2 对"收敛"的定义

| 允许收敛 | 不允许收敛 |
|----------|------------|
| 实现路径 | 用户已提出的问题 |
| diff 范围 | 业务目标 |
| 代码风格 | 链路闭环 |
| 风险边界 | E2E 验收 |
| feature flag | 文档更新 |
| 回滚方式 | trace 可观测性 |
| | 已暴露的系统性漏洞 |

---

## 12. 相关文档

- `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` — 企业级 AI Chat OS 架构与设计总规范
- `MASTER_SPEC.md` — 当前实现阶段主规格
- `NEXT_IMPLEMENTATION_PLAN.md` — 下一阶段实施计划
- `frontend/src/src/contracts/` — 前端契约类型真源
- `docs/sources/inbox/小乔智投工程实施协作规范补充.docx` — 工程实施协作规范补充原文
