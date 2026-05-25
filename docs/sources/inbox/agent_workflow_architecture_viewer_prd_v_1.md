# Agent 编排 Viewer（Workflow & Skill Architecture Viewer）产品设计方案

版本：v1.0  
定位：企业级 AI 业务系统编排审查与协同分析平台  
适用系统：智投 Chat / AI Workflow Runtime / Skill Router / MCP Runtime  
目标用户：产品经理、AI 产品、开发、测试、数据、算法、Agent 配置人员、平台管理员

---

# 1. 产品定位

Agent 编排 Viewer 不是：

- Workflow Builder
- 拖拽编排器
- Trace 平台
- 低代码平台
- Dify / n8n 替代品

而是：

```text
Agent / Skill / Workflow / MCP 架构审查与运行分析平台
```

核心价值：

```text
1. 看清当前 AI 系统到底怎么运行
2. 检查 Agent / Skill / Workflow 是否合理
3. 检查路由、Prompt、MCP 是否冲突
4. 检查复杂广告归因与数据链路是否断裂
5. 让产品、开发、测试、数据团队有统一协同视角
6. 降低“AI 系统越来越像黑盒”的风险
```

不是为了：

```text
让运营拖拽流程
```

而是为了：

```text
让团队看懂系统结构、运行链路和问题位置
```

---

# 2. 为什么必须做

当前 AI 系统存在的问题：

```text
1. Agent 越来越多
2. Prompt 越来越多
3. MCP 越来越多
4. Workflow 越来越复杂
5. query.includes 越来越失控
6. 很多人已经不知道系统实际怎么跑
7. 路由冲突无法可视化
8. Skill overlap 无法发现
9. QualityCheck 缺失无法察觉
10. Workflow 断裂很难排查
```

导致：

```text
AI 系统越来越像“堆功能”
```

而不是：

```text
稳定的 AI Operating System
```

所以必须有：

```text
系统级编排结构可视化
```

但：

```text
不做 Builder
只做 Viewer
```

---

# 3. 产品边界

# 做什么

```text
1. 查看 Task -> Skill -> Workflow -> Tool 的结构
2. 查看当前命中的路由
3. 查看 Skill Contract
4. 查看 Workflow 步骤
5. 查看 Tool Plan
6. 查看 QualityCheck
7. 查看 Prompt / MCP / Workflow 依赖关系
8. 查看运行态执行路径
9. 查看版本差异
10. 查看错误节点
11. 查看配置问题
12. 查看缺失项
```

# 不做什么

```text
1. 不做完整 Workflow Builder
2. 不做复杂拖拽编排
3. 不做完整 Trace 平台
4. 不做 Span Timeline
5. 不做 Flame Graph
6. 不做 Token 统计平台
7. 不做低代码工具
8. 不做配置真源
```

配置真源仍然是：

```text
Config Service
```

Viewer 只是：

```text
可视化读取和分析
```

---

# 4. 产品目标

# P0 目标

让团队第一次真正“看懂 AI 系统”。

达到：

```text
输入一句用户问题
可以看到：

Task Intent
  -> Slot
    -> Skill
      -> Workflow
        -> Tool/MCP
          -> QualityCheck
            -> Result
```

并知道：

```text
为什么命中
为什么没命中
哪里缺配置
哪里缺 fallback
哪里容易误路由
```

---

# 5. 核心设计原则

# 5.1 Viewer First

不是：

```text
先做拖拽
```

而是：

```text
先让团队看懂
```

---

# 5.2 架构态优先于运行态

重点不是 Span。

重点是：

```text
系统结构
```

所以：

```text
Task
Skill
Workflow
Tool
QualityCheck
```

比：

```text
traceId
spanId
```

更重要。

---

# 5.3 业务视角优先于技术视角

不要：

```text
tool.search
model.call
```

而要：

```text
异常分析
ROI 分析
媒体回传检查
游戏行为数据检查
```

因为使用者主要是：

```text
产品 + 开发 + 测试 + 数据
```

不是纯 infra 团队。

---

# 5.4 展开收起必须极强

AI 编排结构会非常复杂。

必须支持：

```text
1. 按层级展开
2. 按 Domain 展开
3. 按 Workflow 展开
4. 按 Skill 展开
5. 聚合节点
6. 子图收起
7. 局部 Focus
```

否则：

```text
图会直接炸掉
```

---

# 5.5 “检查”比“展示”更重要

Viewer 不只是画图。

更重要的是：

```text
自动发现问题
```

例如：

```text
1. Workflow 无 fallback
2. Skill 无 Prompt
3. MCP 无权限配置
4. QualityCheck 缺失
5. 多 Skill overlap
6. Agent 职责过大
7. Workflow 存在死链
8. Tool 不可达
9. Prompt 版本冲突
10. Task Intent 冲突
```

---

# 6. 用户角色

# 6.1 产品经理

关注：

```text
1. 系统怎么理解用户问题
2. 为什么会误路由
3. Workflow 是否合理
4. Skill 是否缺失
5. 业务链路是否完整
```

---

# 6.2 开发

关注：

```text
1. Tool/MCP 调用链
2. Workflow 执行顺序
3. fallback 是否存在
4. 配置是否正确
5. schema 是否冲突
```

---

# 6.3 测试

关注：

```text
1. 哪些路径没覆盖
2. 哪些 Skill 没测
3. 哪些 Workflow 易失败
4. 哪些 Tool 缺 token
5. 哪些链路容易异常
```

---

# 6.4 数据 / 业务

关注：

```text
1. 数据链路是否完整
2. 指标解释是否正确
3. 归因链路是否合理
4. 哪些地方可能数据异常
```

---

# 7. 页面结构

# 7.1 页面结构总览

```text
┌───────────────────────────────────────────────┐
│ 顶部导航                                      │
├───────────────────────────────────────────────┤
│ 左侧：目录树 / Filter                         │
│                                               │
│ 中间：Architecture Viewer 主图                │
│                                               │
│ 右侧：Node Detail / Review / Config Snapshot  │
├───────────────────────────────────────────────┤
│ 底部：Validation / Issue / Review Timeline    │
└───────────────────────────────────────────────┘
```

---

# 8. 四大核心视图

# 8.1 Architecture View（核心）

定位：

```text
设计态结构图
```

展示：

```text
Task Intent
  -> Slot
    -> Skill
      -> Workflow
        -> Tool/MCP
          -> Result Component
```

用途：

```text
看系统如何编排
```

---

# 8.2 Runtime Path View

定位：

```text
运行态路径回放
```

展示：

```text
一次真实请求命中了哪些节点
```

例如：

```text
用户问题
  -> analyze_anomaly
    -> roi_analysis_skill
      -> anomaly_analysis_workflow
        -> report_mcp
        -> attribution_mcp
```

高亮：

```text
真实执行路径
```

不展示：

```text
复杂 span tree
```

完整 Trace 跳转连弩。

---

# 8.3 Review View

定位：

```text
架构审查
```

核心能力：

```text
自动发现问题
```

例如：

```text
⚠ Workflow 缺 fallback
⚠ Skill 无 Prompt
⚠ MCP 缺权限配置
⚠ Tool schema 未注册
⚠ QualityCheck 缺失
⚠ Task Intent overlap
⚠ Agent 依赖过多 Skill
```

---

# 8.4 Diff View

定位：

```text
版本差异对比
```

支持：

```text
v1 vs v2
```

查看：

```text
1. Prompt 修改
2. Workflow 修改
3. Skill 修改
4. Tool Plan 修改
5. 路由变化
```

适合：

```text
AI 配置评审
```

---

# 9. 主图设计

# 9.1 节点层级

推荐层级：

```text
L1：Task Intent
L2：Skill
L3：Workflow
L4：Tool/MCP
L5：QualityCheck
L6：Result Component
```

---

# 9.2 节点颜色规范

```text
蓝色：Task Intent
紫色：Skill
橙色：Workflow
绿色：Tool/MCP
黄色：QualityCheck
灰色：Result
红色：异常/缺失
```

---

# 9.3 节点形态

# Task

```text
大圆角矩形
```

# Skill

```text
中等卡片
```

# Workflow

```text
可展开泳道
```

# Tool

```text
小节点
```

# QualityCheck

```text
标签型节点
```

---

# 9.4 节点交互

# Hover

展示：

```text
名称
版本
负责人
状态
最近修改时间
```

# Click

右侧展开 Detail Drawer。

# Double Click

Focus 模式。

# Expand/Collapse

支持：

```text
展开 Workflow 子图
```

---

# 10. 左侧 Filter 区

支持：

```text
1. Domain Filter
2. Task Intent Filter
3. Workflow Filter
4. Skill Filter
5. MCP Filter
6. Prompt Filter
7. 状态 Filter
8. 风险 Filter
9. 版本 Filter
10. 负责人 Filter
```

---

# 11. 右侧 Detail Drawer

点击节点后展示：

# 基础信息

```text
名称
ID
类型
版本
负责人
状态
最近修改时间
```

# 配置快照

```json
workflow_id
prompt_id
tool_ids
required_slots
quality_checks
```

# Prompt 引用

```text
当前 Prompt
Prompt Version
Prompt Diff
```

# Workflow 信息

```text
步骤数
fallback
重试策略
分支条件
```

# Tool 信息

```text
Tool Name
MCP Server
权限需求
```

# Runtime Summary

```text
最近成功率
最近错误率
平均耗时
```

# 问题检查

```text
⚠ 无 fallback
⚠ Prompt 未发布
⚠ MCP token 缺失
⚠ schema 冲突
```

---

# 12. Runtime Path 高亮

运行态时：

```text
真实执行节点高亮
```

例如：

```text
绿色：成功
黄色：warning
红色：失败
灰色：未执行
```

支持：

```text
查看最近一次运行路径
```

不需要复杂 Span Timeline。

---

# 13. 自动问题检查系统

# 13.1 路由问题

```text
1. Task overlap
2. Skill overlap
3. 多 Intent 竞争
4. 缺 Clarification
```

---

# 13.2 Workflow 问题

```text
1. 无 fallback
2. 死链
3. Tool 不可达
4. 缺 Retry
5. 分支无出口
```

---

# 13.3 Prompt 问题

```text
1. Prompt 缺失
2. Prompt 未发布
3. Prompt Version 冲突
4. Prompt 引用失效
```

---

# 13.4 Tool/MCP 问题

```text
1. token 缺失
2. endpoint 缺失
3. schema 未注册
4. 权限缺失
```

---

# 13.5 QualityCheck 问题

```text
1. ask_data 无 QualityCheck
2. 无数据延迟检查
3. 无口径检查
4. 无异常检查
```

---

# 14. 运行指标（轻量）

Viewer 里只保留轻量 Runtime 指标。

不重复做 Trace 平台。

展示：

```text
1. 最近成功率
2. 最近错误率
3. 最近平均耗时
4. 最近执行次数
5. 最近问题数
```

完整：

```text
Trace / Span / Token
```

跳转：

```text
连弩观测平台
```

---

# 15. 技术方案

# 15.1 推荐技术栈

# 主图

```text
React Flow (xyflow)
```

原因：

```text
1. 节点图成熟
2. Expand/Collapse 强
3. DAG 支持好
4. React 生态好
5. 动效成熟
6. 企业 AI Workflow 场景非常适合
```

---

# 15.2 自动布局

```text
ELK.js
```

备用：

```text
Dagre
```

---

# 15.3 复杂关系图（P2）

```text
AntV G6
```

适合：

```text
数据链路
归因血缘
异常传播
```

---

# 15.4 管理台框架

```text
Ant Design Pro
```

---

# 15.5 配置代码查看

```text
Monaco Editor
```

---

# 16. 数据结构设计

# 16.1 Graph Manifest

后端输出：

```ts
interface ArchitectureGraphManifest {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  metadata?: {
    version: string;
    generatedAt: string;
  };
}
```

---

# 16.2 Node

```ts
interface ArchitectureNode {
  id: string;

  type:
    | "task"
    | "skill"
    | "workflow"
    | "tool"
    | "quality_check"
    | "result";

  label: string;

  status?:
    | "healthy"
    | "warning"
    | "error";

  runtime?: {
    successRate?: number;
    avgLatency?: number;
    runCount?: number;
  };

  config?: Record<string, unknown>;
}
```

---

# 16.3 Edge

```ts
interface ArchitectureEdge {
  id: string;

  source: string;
  target: string;

  type?:
    | "route"
    | "workflow"
    | "tool_call"
    | "quality_check";

  label?: string;
}

