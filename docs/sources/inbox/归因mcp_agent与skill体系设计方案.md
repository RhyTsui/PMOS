# 归因系统 AI Agent & Skill 体系设计方案

## 一、项目背景

当前归因系统已经完成：

- MCP 接入
- 归因知识库建设
- SQL 排查链路沉淀
- 业务逻辑文档化
- 回推策略配置化
- 常见问题标准化

但在 Chat 场景下，仍然存在几个核心问题：

1. 用户不会准确提问
2. AI 无法稳定命中正确排查路径
3. SQL/业务逻辑/配置逻辑分散
4. Agent 缺乏业务角色意识
5. 缺少可复用的归因 Skill
6. 多轮对话无法形成稳定诊断闭环

因此，需要将当前归因系统升级为：

> 「AI Native Attribution Copilot」

核心目标：

- 让 Chat 成为归因系统主入口
- 将复杂排查流程 Agent 化
- 将稳定能力 Skill 化
- 将 SQL + 配置 + 业务逻辑统一结构化
- 提高问题命中率与诊断稳定性
- 降低业务、运营、研发、优化师的使用门槛

---

# 二、当前归因知识库现状分析

当前知识库已经具备较好的基础资产。

## 2.1 当前知识库结构

### 1）归因相关表

包含：

- 点击表
- 排重点击表
- 设备表
- 用户表
- 回推数据表
- 待归因数据
- 归因结果数据

典型能力：

- 设备排重
- 点击归因
- H5归因
- IOS融合归因
- 回推状态诊断
- SDK状态分析

例如：

- attr_click_yyyymmdd
- attr_device_{app_id}
- attr_user_{app_id}

已具备完整归因链路数据基础。fileciteturn0file0L1-L5

---

### 2）日常问题知识库

当前已经沉淀：

- 用户话术
- 排查凭证
- SQL路径
- 诊断逻辑
- 解决方案

例如：

- 付费未回推
- 鸿蒙融合归因异常
- 用户细查与日报不一致
- H5激活成本异常

这一部分实际上已经具备：

> 「结构化 Agent Case Base」

价值极高。

---

### 3）业务逻辑知识库

当前已经沉淀：

- H5点击归因
- H5自归因
- IOS融合归因
- 虚拟付费逻辑
- 回推逻辑

这部分非常适合：

- 做 Agent 长期记忆
- 做归因解释器
- 做知识推理链
- 做意图识别增强

---

### 4）融合归因与回推策略

当前已经具备：

- Android回推策略
- 鸿蒙融合归因
- SDK回推模式
- 规则回推模式
- 版本兼容策略

这一部分适合：

- 动态配置 Skill
- 回推策略 Agent
- 联调自动化 Agent

---

# 三、核心问题

当前系统虽然已经有知识库，但 Chat 仍然容易出现以下问题：

| 问题 | 本质原因 |
|---|---|
| AI 不知道该走哪个排查路径 | 缺少意图路由 |
| AI 无法主动补充排查信息 | 缺少诊断状态机 |
| SQL 命中不稳定 | 缺少结构化 Skill |
| 多轮对话容易丢失上下文 | 缺少归因 Session Memory |
| 不同问题回复风格不一致 | 缺少标准化 Agent Persona |
| 用户话术过于口语化 | 缺少 Query Rewrite |
| 不会自动串联多个模块 | 缺少 Workflow Agent |

因此：

> 下一阶段重点不是继续堆知识。
>
> 而是：
>
> 「把知识变成可执行 Agent Workflow」

---

# 四、总体架构设计

建议整体升级为：

```text
用户
 ↓
Chat入口
 ↓
Intent Router Agent
 ↓
归因领域 Agent 编排层
 ├── 回推Agent
 ├── 归因诊断Agent
 ├── H5归因Agent
 ├── IOS融合归因Agent
 ├── 报表一致性Agent
 ├── 联调Agent
 ├── SQL生成Agent
 └── 根因分析Agent
 ↓
Skill Runtime
 ├── SQL Skill
 ├── 配置读取Skill
 ├── 设备归因Skill
 ├── 回推状态Skill
 ├── 数据对账Skill
 ├── 链路追踪Skill
 └── MCP Tool
 ↓
MCP
 ↓
数据系统/配置系统/日志系统
```

---

# 五、Agent 体系设计

# 5.1 Intent Router Agent（最核心）

这是整个系统最重要的 Agent。

负责：

- 判断用户意图
- 判断所属模块
- 判断问题严重等级
- 判断是否需要追问
- 判断调用哪些 Skill

例如：

用户：

> 安卓付费没回推巨量

Router 自动识别：

```yaml
intent:
  domain: attribution
  module: callback
  sub_module: sdk_callback
  platform: android
  media: oceanengine
  issue_type: callback_missing
  severity: high
required_params:
  - app_id
  - device_id
  - event_time
next_agent:
  - callback_agent
```

---

# 5.2 回推诊断 Agent

负责：

- 回推配置分析
- SDK状态分析
- 回推事件分析
- callback rule分析
- 804状态分析
- feedback结果分析

典型链路：

```text
确认配置
→ 确认事件
→ 确认归因
→ 确认回推
→ 确认SDK返回
→ 输出根因
```

典型问题：

- 付费未回推
- 激活未回推
- 804异常
- sdk init失败
- callbackMode错误

---

# 5.3 H5归因 Agent

负责：

- H5点击归因
- H5自归因
- target_open_id分析
- req_id分析
- h5_param解析
- SAN归因分析

典型问题：

- H5激活成本异常
- H5自然量异常
- 微信/抖音H5归因异常
- target_open_id缺失

---

# 5.4 IOS融合归因 Agent

负责：

- idfa归因
- caid归因
- idfv融合归因
- ipv4模糊归因
- ipv6模糊归因
- 百度融合归因
- 巨量融合归因

重点：

需要具备：

- IOS归因知识图谱
- 归因优先级逻辑
- 融合归因推理能力

---

# 5.5 报表一致性 Agent

负责：

- 用户细查 vs 日报
- 包体归因 vs 点击归因
- 日周月报差异
- 归因口径差异
- 回流过滤逻辑
- 工作室名单过滤

这个 Agent 非常重要。

因为：

> 归因系统 40% 的问题其实是“口径理解问题”。

---

# 5.6 联调 Agent

这是后续价值最大的 Agent。

负责：

- 联调流程自动化
- 自动检查配置
- 自动检查事件
- 自动生成联调报告
- 自动生成排查SQL
- 自动识别失败节点

未来可以结合：

- Playwright
- Appium
- MCP Automation

实现：

> AI 自动联调

---

# 六、Skill 体系设计

Agent 负责思考。

Skill 负责执行。

---

# 6.1 Skill 分类

建议拆分为：

| 类型 | 作用 |
|---|---|
| Query Skill | SQL查询 |
| Config Skill | 配置读取 |
| Diagnose Skill | 根因诊断 |
| Compare Skill | 数据对比 |
| Explain Skill | 业务解释 |
| Workflow Skill | 多步骤执行 |
| Tool Skill | MCP工具调用 |

---

# 6.2 SQL Skill（最核心）

不要让 Agent 自由生成 SQL。

建议：

> SQL 模板化

例如：

```yaml
skill: query_callback_status
inputs:
  - app_id
  - device_id
  - media_id
  - date
sql_template: |
  select *
  from ad_ods.ods_uba_base_event_rt
  where app_id='${app_id}'
    and device_id='${device_id}'
    and dt='${date}'
```

这样可以：

- 提高稳定性
- 降低幻觉
- 提高安全性
- 统一查询口径

---

# 6.3 配置读取 Skill

负责：

- callbackRule读取
- 回推模式读取
- 融合归因配置读取
- 事件配置读取
- app配置读取

例如：

```yaml
skill: get_callback_rule
```

---

# 6.4 链路追踪 Skill

负责：

```text
点击
→ 启动
→ 待归因
→ 归因结果
→ 回推
→ feedback
```

这是未来归因 Copilot 的核心能力。

建议做成：

> Attribution Timeline

类似：

```text
05:10 点击
05:13 启动
05:13 进入待归因
05:14 归因巨量
05:14 发起回推
05:14 SDK返回804
05:15 feedback成功
```

这个能力用户会极度喜欢。

---

# 6.5 根因分析 Skill

这是未来 AI 差异化核心。

不是返回 SQL。

而是：

> 输出真正的根因。

例如：

```text
根因：
当前鸿蒙应用采用：
【仅激活SDK回推】+【全部是归因+规则】。

设备已归因成功，
但SDK未返回804 init_status。

因此未生成虚拟激活，
导致第二轮融合归因未执行。
```

这是：

> 从“查询系统”升级为“诊断系统”。

---

# 七、推荐对话工作流

# 7.1 推荐诊断状态机

不要直接回答。

建议采用：

```text
Step1 获取必要参数
Step2 自动补全上下文
Step3 调用Skill
Step4 根因分析
Step5 输出解决方案
Step6 推荐下一步动作
```

---

# 7.2 推荐标准输出结构

建议统一：

```markdown
# 问题概述

# 当前诊断结果

# 已确认链路

# 异常节点

# 根因分析

# 解决方案

# 建议补充排查
```

这样非常适合：

- Chat UI
- Agent Card
- Timeline UI
- Ant Design X

---

# 八、知识库结构升级建议

当前知识库已经很好。

但建议进一步结构化。

---

# 8.1 Case Schema

建议统一：

```yaml
id:
module:
intent:
platform:
media:
problem:
required_params:
workflow:
skills:
sql_templates:
root_cause:
solution:
related_cases:
```

这样后续：

- Agent命中率会大幅提升
- Skill复用率会提升
- RAG效果会稳定很多

---

# 8.2 SQL资产化

建议：

不要把 SQL 放 Excel。

应该：

```text
/sql_skills
  /callback
  /attr
  /report
  /h5
```

每个 SQL：

- 有描述
- 有输入参数
- 有返回结构
- 有案例

这会非常关键。

---

# 九、前端交互建议

推荐：

> Chat + Agent Card + Timeline + Structured Panel

不要只做纯聊天。

---

# 9.1 推荐 UI 结构

```text
左侧：会话
中间：Agent推理
右侧：结构化面板
```

右侧包括：

- 归因链路
- 配置状态
- 回推状态
- SQL结果
- Timeline
- Root Cause

---

# 9.2 Agent Card

例如：

```text
[回推Agent]
正在确认 callbackRule...

[SQL Skill]
已查询 feedback-res

[Root Cause Agent]
发现 SDK 未返回804
```

这会让系统：

> 非常像真正的 AI 运维专家。

---

# 十、推荐优先级（非常重要）

# P0（必须先做）

## 1）Intent Router

这是核心中的核心。

## 2）SQL Skill 模板化

决定稳定性。

## 3）标准 Case Schema

决定知识库质量。

## 4）归因 Session Memory

决定多轮对话体验。

---

# P1（第二阶段）

## 5）Root Cause Agent

真正形成 AI 价值。

## 6）Attribution Timeline

形成产品差异化。

## 7）联调 Agent

形成效率革命。

---

# P2（第三阶段）

## 8）自治 Workflow Agent

实现自动化排查。

## 9）自动修复 Agent

例如：

- 自动发现配置错误
- 自动发现事件缺失
- 自动修复callback rule

---

# 十一、最终产品定位

最终建议产品定位：

> Attribution AI Copilot

不是：

- BI Chat
- SQL Chat
- 知识库问答

而是：

> 「归因领域 AI 专家系统」

核心能力：

- 会理解业务
- 会理解归因
- 会理解媒体
- 会理解SDK
- 会理解回推
- 会理解报表
- 会理解联调
- 会自主推理
- 会主动追问
- 会输出根因
- 会给解决方案

---

# 十二、总结

当前你们已经具备非常强的基础：

- MCP
- 归因知识库
- SQL资产
- 回推规则
- 业务逻辑
- 案例沉淀

下一阶段最关键的：

不是继续堆文档。

而是：

> 「把归因知识转化为可执行 Agent Workflow」

真正的方向应该是：

```text
知识库
→ Skill化
→ Agent化
→ Workflow化
→ Autonomous化
```

最终形成：

> 游戏广告归因 AI 专家系统

并逐步演进为：

> AI Native 广告数据操作系统

---

# 附录：当前知识库中的高价值能力

当前知识库已经沉淀的能力包括：

- H5点击归因
- IOS融合归因
- SDK回推
- 804状态分析
- callback rule
- 包体归因
- 点击归因
- 虚拟付费
- 融合归因
- target_open_id
- req_id
- attr_event_type
- attr-require
- attr-res
- feedback-res
- SAN归因
- 回流逻辑
- 工作室过滤
- 归因配置读取
- 回推链路分析

这些已经具备：

> 构建行业级归因 AI Agent 的核心基础。

相关归因业务逻辑与案例均来源于当前 MCP 与归因知识

