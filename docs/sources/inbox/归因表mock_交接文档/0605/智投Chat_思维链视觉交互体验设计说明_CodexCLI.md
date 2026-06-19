# 智投 Chat 思维链视觉交互体验设计说明文档（Codex CLI 实施版）

> 版本：v1.0  
> 适用对象：Codex CLI / 前端工程 / AI 应用设计 / 产品体验优化  
> 当前若干问题：只是优化视觉动态样式，只是解决用户无法感知等待进度与时间，用户折叠时不知道当前执行状态，展开时信息过载，一下子展示多条步骤不清楚实际顺序，历史步骤还在转圈圈等问题。
> 核心目标：在**不改动现有业务逻辑、Agent 流程、Skill 编排、MCP 调用链路**的前提下，优化当前“思维链/过程区”的视觉交互体验，让用户更清楚地感知 AI 正在做什么、做到哪一步、是否可信、是否卡住。

---

## 0. 最高优先级约束

本次只做**视觉交互体验层优化**，不得改动任何业务执行逻辑。

### 0.1 明确允许改动

允许改动：

- Chat 消息渲染方式
- 思维链 / 过程区 UI 呈现方式
- 打字机效果
- 步骤渐进展示
- 状态压缩与展开
- Tool / MCP 调用摘要展示
- 阻塞态 / 成功态 / 进行态视觉表达
- 会话卡片样式
- 前端事件到 UI 状态的映射 Adapter
- 样式文件、组件封装、动画与交互细节

### 0.2 明确禁止改动

禁止改动：

- Agent 决策逻辑
- Agent 流程顺序
- Skill 调度逻辑
- MCP 调用逻辑
- Tool 入参 / 出参
- 自动化执行策略
- 异常排查策略
- 业务状态机
- 结果判断逻辑
- 重试策略
- 权限策略
- 后端接口语义

### 0.3 关键实现原则

> 只能“重新包装与呈现已有过程”，不能“重新定义与改变已有过程”。

也就是说，Codex CLI 在实现时应优先查找当前已有的：

- message stream
- reasoning stream
- tool call events
- task status events
- MCP trace events
- agent progress events

然后通过 UI Adapter 转换为新的展示结构。

---

## 1. 设计目标

当前智投 Chat 的思维链不应被设计成“模型真实推理文本展示”，而应被设计成：

> AI Runtime 的执行过程可视化。

用户需要看的不是模型内心独白，而是：

- AI 正在处理什么
- 已经完成哪些步骤
- 当前卡在哪一步
- 调用了哪些工具
- 哪些结果可追溯
- 最终结论是否可信

### 1.1 10 分体验目标

达到 10 分体验，需要满足以下标准：

1. 用户不需要阅读长文本，也能判断 AI 是否在工作。
2. 用户能在 3 秒内知道当前任务处于哪个阶段。
3. 用户能在异常时第一眼看到阻塞点。
4. 用户能按需展开过程，但默认不被过程干扰。
5. 结果区和过程区严格分离。
6. Tool / MCP 调用可追溯，但不污染正文。
7. 运行态具备节奏感，不出现长时间无反馈。
8. 完成态具备稳定感，结果不闪烁、不漂移。
9. 信息密度可控，默认展示不超过一张过程卡。
10. 整体体验像“AI 正在可靠执行任务”，而不是“日志刷屏”。

---

## 2. 命名与产品语义

虽然业务上可以继续称为“思维链”，但前端展示建议采用更安全、更业务化的名称。

### 2.1 推荐展示命名

优先使用：

- 执行过程
- 分析过程
- 任务过程
- 推进过程
- AI 正在处理
- AI 工作流

不推荐在用户界面中直接长期暴露：

- 模型思维链
- 内心推理
- Chain of Thought 原文

### 2.2 推荐文案原则

展示“做了什么”，不展示“为什么在内心这样想”。

推荐：

```text
正在检查包状态
正在查询配置
正在校验联调结果
正在生成结果
```

不推荐：

```text
我先思考用户可能想要什么，然后判断应该调用哪个工具……
```

---

## 3. 信息架构

思维链视觉层采用三层信息结构。

```text
L1：用户可见摘要层
L2：业务过程层
L3：技术追踪层
```

### 3.1 L1：用户可见摘要层

默认展示给所有用户。

内容包括：

- 当前状态
- 当前步骤
- 已完成数量
- 是否阻塞
- 是否完成

示例：

```text
AI 正在自动处理 · 已完成 3/5
```

### 3.2 L2：业务过程层

用户点击展开后展示。

内容包括：

- 识别项目
- 查询包列表
- 检查状态
- 校验结果
- 生成结论

示例：

```text
✓ 已识别当前项目
✓ 已查询包列表
⏳ 正在校验联调状态
○ 准备生成结果
```

### 3.3 L3：技术追踪层

只在高级详情或右侧日志区展示。

内容包括：

- MCP 名称
- Tool 名称
- 调用状态
- 耗时
- 错误码
- 请求来源
- 返回摘要

示例：

```text
智投配置 MCP · get_package_list · success · 820ms
媒体配置 MCP · get_media_app · success · 1040ms
联调 MCP · start_debug · skipped
```

---

## 4. 页面结构原则

当前不新增复杂页面，不改为三栏工作台。继续基于现有 Chat 结构。

推荐结构：

```text
Chat 会话流
├── 用户消息
├── AI 过程卡片
├── AI 结果卡片
├── 阻塞卡片（如有）
└── 补充说明卡片（如有）
```

右侧侧边栏如当前已有日志 / Trace / 调用记录，则继续保留，不在主会话里重复展示完整日志。

---

## 5. 核心组件设计

### 5.1 RuntimeProcessCard：AI 过程卡片

#### 用途

展示 AI 当前正在做什么，是本次优化的核心组件。

#### 默认折叠态

```text
AI 正在自动处理 · 已完成 3/5
[展开过程]
```

#### 运行展开态

```text
AI 正在自动处理

✓ 理解用户问题
✓ 获取当前项目
✓ 查询相关状态
⏳ 正在校验结果
○ 准备生成回复
```

#### 完成折叠态

```text
处理完成 · 已检查 5 项 · 调用 3 个工具 · 无阻塞
[查看过程]
```

#### 阻塞折叠态

```text
流程已阻塞 · 当前卡在「媒体应用授权」
[查看原因]
```

---

### 5.2 RuntimeStep：步骤项

每一个步骤都应该被结构化为 RuntimeStep。

#### Step 状态

| 状态 | UI 表达 | 说明 |
|---|---|---|
| pending | 空心圆点 | 等待执行 |
| running | loading / 呼吸点 | 正在执行 |
| success | 对勾 | 已成功 |
| warning | 黄色提示 | 有风险但可继续 |
| blocked | 警告图标 | 当前阻塞 |
| failed | 红色错误 | 执行失败 |
| skipped | 灰色横线 | 按规则跳过 |

#### Step 示例

```text
✓ 获取项目上下文
✓ 查询包列表
⏳ 检查联调状态
○ 生成最终结果
```

---

### 5.3 ToolTraceSummary：工具调用摘要

#### 用途

以轻量方式展示 Tool / MCP 调用结果，增强可信度。

#### 默认展示规则

默认只展示摘要，不展示原始 JSON。

示例：

```text
已调用 3 个工具
智投配置 MCP · 成功
媒体配置 MCP · 成功
联调 MCP · 未调用
```

#### 展开后展示

```text
工具调用详情

1. 智投配置 MCP / get_package_list
   状态：成功
   耗时：820ms

2. 媒体配置 MCP / get_media_app
   状态：成功
   耗时：1040ms

3. 联调 MCP / start_debug
   状态：未触发
   原因：当前包已联调通过
```

---

### 5.4 BlockerCard：阻塞卡片

#### 用途

当流程无法继续时，明确告诉用户卡在哪里。

#### 示例

```text
当前阻塞

未检测到默认账户授权过的媒体应用。

影响：
无法继续自动共享与联调。

下一步：
请补充默认账户授权后重新发起。
```

#### 展示规则

阻塞卡片必须：

- 出现在 AI 结果区域
- 文案短
- 只讲最后阻塞点
- 不堆叠全部过程
- 不展示原始报错

---

### 5.5 ResultCard：结果卡片

#### 用途

展示最终结果。结果卡片不属于思维链，但必须和过程卡分离。

#### 原则

- 结果卡片稳定渲染
- 不使用打字机
- 不因为过程更新而抖动
- 不混入 Tool 日志
- 不展示中间推理

示例：

```text
已找到 3 个可用包

包 A
✓ 验收通过
✓ 审核通过
✓ 联调通过

包 B
✓ 验收通过
✓ 审核通过
✓ 联调通过
```

---

## 6. 渐进式披露设计

### 6.1 默认展示策略

运行中默认只展示一行：

```text
AI 正在自动处理 · 已完成 2/5
```

用户可以点击展开：

```text
查看过程
```

展开后才显示完整步骤。

### 6.2 自动折叠策略

任务完成后，过程卡自动压缩成完成摘要：

```text
处理完成 · 已检查 5 项 · 调用 3 个工具
```

用户仍可点击：

```text
查看过程
```

### 6.3 异常时不自动折叠

如果出现 blocked / failed 状态，过程卡保持展开或半展开，让用户看到阻塞点。

示例：

```text
流程已阻塞

✓ 获取项目
✓ 查询包列表
⚠ 检查媒体应用授权
○ 发起联调
```

---

## 7. 打字机效果设计

打字机效果只用于短状态文案，不用于结构化结果。

### 7.1 允许使用打字机的内容

允许：

```text
正在理解你的问题...
正在查询配置...
正在校验结果...
已找到可用结果...
```

### 7.2 禁止使用打字机的内容

禁止：

- 包列表
- 表格
- JSON
- SQL
- Tool 返回
- 长段解释
- 最终结论
- 状态字段

### 7.3 推荐速度

| 类型 | 速度 |
|---|---|
| 短状态句 | 24-36 ms / 字 |
| 关键结论短句 | 16-24 ms / 字 |
| 长文本 | 不使用打字机 |
| 结构化卡片 | 一次性渲染 |

### 7.4 防抖规则

如果后端状态更新很快，不要每条都打字机。

应合并为：

```text
正在处理...
```

直到关键阶段变化再更新。

---

## 8. 信息压缩规则

### 8.1 主会话区压缩

主会话区默认最多展示：

- 1 个 RuntimeProcessCard
- 1 个 ResultCard
- 1 个 BlockerCard

不要连续刷出多张过程卡。

### 8.2 Step 数量压缩

默认最多展示 5 个步骤。

超过 5 个时合并：

```text
已完成 8 个检查项
[展开查看全部]
```

### 8.3 Tool 信息压缩

默认展示：

```text
已调用 3 个工具
```

展开后展示工具列表。

原始请求 / 响应只进入右侧日志或高级详情，不进入正文。

---

## 9. 运行态设计

### 9.1 状态流转

```text
idle
→ understanding
→ planning
→ running
→ tool_calling
→ validating
→ generating
→ completed
```

异常流转：

```text
running
→ blocked
```

错误流转：

```text
running
→ failed
```

### 9.2 每个状态的用户文案

| 状态 | 文案 |
|---|---|
| understanding | 正在理解你的问题 |
| planning | 正在确定处理路径 |
| running | 正在自动处理 |
| tool_calling | 正在调用相关工具 |
| validating | 正在校验结果 |
| generating | 正在生成回复 |
| completed | 处理完成 |
| blocked | 流程已阻塞 |
| failed | 处理失败 |

---

## 10. 视觉规范

### 10.1 卡片层级

推荐：

```text
ProcessCard：浅背景 + 细边框
ResultCard：白底 / 主内容卡
BlockerCard：警示底色 + 明确标题
ToolTrace：灰底小块 / badge
```

### 10.2 间距

| 元素 | 建议 |
|---|---|
| 卡片内边距 | 12-16px |
| Step 间距 | 8px |
| 卡片圆角 | 10-12px |
| 标题与内容间距 | 8px |
| 主卡片间距 | 12px |

### 10.3 图标语义

| 语义 | 图标 |
|---|---|
| 成功 | check |
| 运行中 | spinner / loading dot |
| 等待 | circle |
| 阻塞 | alert |
| 失败 | error |
| 工具 | tool |
| 日志 | file / terminal |
| 展开 | chevron |

### 10.4 深浅色模式

必须支持系统主题。

建议使用语义变量：

```css
--runtime-bg;
--runtime-border;
--runtime-text-primary;
--runtime-text-secondary;
--runtime-success;
--runtime-warning;
--runtime-danger;
--runtime-muted;
```

不要写死大面积颜色。

---

## 11. 动效规范

### 11.1 Step Reveal

步骤出现时：

- opacity: 0 → 1
- translateY: 4px → 0
- duration: 120-180ms

### 11.2 Running Indicator

运行中不建议强烈转圈。

推荐：

- 三点呼吸
- 小型 spinner
- 轻微 shimmer

### 11.3 完成态 Transition

完成时：

- running icon → check icon
- 颜色切换到 success
- duration: 120ms

### 11.4 禁止动效

禁止：

- 大面积闪烁
- 长时间骨架屏
- 多个 spinner 同时出现
- 结果卡片反复重排
- 每个字都强制打字机

---

## 12. 组件数据结构建议

仅用于前端 UI 映射，不改变后端逻辑。

```ts
export type RuntimeStatus =
  | 'idle'
  | 'understanding'
  | 'planning'
  | 'running'
  | 'tool_calling'
  | 'validating'
  | 'generating'
  | 'completed'
  | 'blocked'
  | 'failed';

export type RuntimeStepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'blocked'
  | 'failed'
  | 'skipped';

export interface RuntimeStep {
  id: string;
  title: string;
  description?: string;
  status: RuntimeStepStatus;
  startedAt?: number;
  endedAt?: number;
  source?: 'agent' | 'skill' | 'mcp' | 'tool' | 'system';
}

export interface ToolTraceItem {
  id: string;
  mcpName?: string;
  toolName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  latencyMs?: number;
  summary?: string;
  errorMessage?: string;
}

export interface RuntimeProcessViewModel {
  id: string;
  title: string;
  status: RuntimeStatus;
  summary: string;
  steps: RuntimeStep[];
  toolTraces?: ToolTraceItem[];
  blocker?: {
    title: string;
    reason: string;
    impact?: string;
    nextStep?: string;
  };
  createdAt: number;
  updatedAt: number;
}
```

---

## 13. 事件映射 Adapter

### 13.1 设计原则

不要修改原有事件，只做转换。

```text
existing runtime event
→ adapter
→ RuntimeProcessViewModel
→ UI component
```

### 13.2 示例映射

| 原事件 | UI 映射 |
|---|---|
| agent_start | understanding |
| intent_detected | planning |
| tool_call_start | tool_calling |
| tool_call_success | running / validating |
| mcp_call_failed | blocked / failed |
| result_ready | completed |
| blocker_detected | blocked |

### 13.3 Adapter 伪代码

```ts
export function mapRuntimeEventsToProcessViewModel(events: RuntimeEvent[]): RuntimeProcessViewModel {
  // 只转换展示数据，不改变执行逻辑
  // 不触发新的 tool call
  // 不修改原始 event
  // 不影响 agent workflow
}
```

---

## 14. 主会话渲染规则

### 14.1 运行中

主会话展示：

```text
AI 正在自动处理 · 已完成 2/5
```

正文不输出最终结论。

### 14.2 完成时

主会话展示：

```text
处理完成 · 已检查 5 项 · 调用 3 个工具
```

然后展示 ResultCard。

### 14.3 阻塞时

主会话展示：

```text
流程已阻塞 · 当前卡在「XXX」
```

然后展示 BlockerCard。

### 14.4 失败时

主会话展示：

```text
处理失败 · 查看原因
```

然后展示 Error / BlockerCard。

---

## 15. 可访问性要求

必须支持：

- 键盘展开 / 收起
- aria-expanded
- aria-live="polite" 用于状态更新
- 不依赖颜色表达状态
- 图标 + 文案同时表达状态
- 动画可通过 prefers-reduced-motion 降级

示例：

```html
<div aria-live="polite">
  AI 正在自动处理，已完成 3 项
</div>
```

---

## 16. Codex CLI 实施任务清单

### Task 1：定位现有思维链渲染入口

查找当前用于渲染以下内容的组件：

- 思维链文本
- reasoning message
- tool call message
- MCP trace
- agent progress
- chat assistant message

目标：

找到当前过程信息的渲染入口，不修改数据来源。

---

### Task 2：新增 RuntimeProcessCard 组件

新增组件：

```text
RuntimeProcessCard
RuntimeStepList
RuntimeStepItem
ToolTraceSummary
BlockerCard
```

要求：

- 不接业务接口
- 只接 ViewModel
- 可独立 story / mock 测试

---

### Task 3：新增 Runtime Adapter

新增：

```text
runtimeProcessAdapter.ts
```

职责：

- 将现有事件映射成 RuntimeProcessViewModel
- 不调用接口
- 不触发业务动作
- 不改变原始事件

---

### Task 4：替换长文本思维链展示

将原始大段思维链文本替换为：

```text
RuntimeProcessCard
```

原始内容如果需要保留，则放入：

```text
高级详情 / 右侧日志 / debug 区
```

---

### Task 5：实现渐进式披露

要求：

- 默认折叠
- 运行中可展开
- 完成后自动折叠
- 阻塞时保持半展开
- 展开状态不影响业务执行

---

### Task 6：实现打字机效果

新增：

```text
TypewriterStatusText
```

只用于短状态句。

不得用于：

- 结果卡
- 包列表
- 表格
- JSON
- SQL
- 长正文

---

### Task 7：实现状态动画

包括：

- running spinner / dots
- step reveal
- success check transition
- blocked warning state
- reduced motion 降级

---

### Task 8：补充样式变量

新增或复用主题 token：

```css
--runtime-bg
--runtime-border
--runtime-text-primary
--runtime-text-secondary
--runtime-success
--runtime-warning
--runtime-danger
--runtime-muted
```

---

### Task 9：补充测试

至少覆盖：

- running 展示
- completed 展示
- blocked 展示
- failed 展示
- tool trace 折叠
- step 超过 5 个压缩
- reduced motion
- 深色模式
- 无 tool trace
- 无 steps

---

## 17. 验收标准

### 17.1 功能验收

必须满足：

1. 不改变现有 Agent 执行顺序。
2. 不改变任何 MCP 调用。
3. 不改变任何 Tool 入参。
4. 不改变任何 Tool 出参。
5. 不改变自动化执行策略。
6. 不新增用户确认步骤。
7. 不新增业务流程分支。
8. 当前思维链从长文本升级为过程卡片。
9. 运行中可看到当前步骤。
10. 完成后过程自动压缩。
11. 阻塞时明确展示阻塞点。
12. Tool / MCP 调用可追溯。
13. 原始日志不污染正文。
14. 结果卡片和过程卡片分离。
15. 支持展开 / 收起。
16. 支持深色模式。
17. 支持弱动画模式。
18. 支持空状态。
19. 支持失败状态。
20. 支持长流程压缩。

### 17.2 体验验收

体验上应达到：

- 用户一眼知道 AI 是否在处理。
- 用户一眼知道当前是否完成。
- 用户一眼知道异常卡在哪里。
- 用户不需要看日志也能理解过程。
- 高级用户可以追溯工具调用。
- 普通用户不会被技术细节干扰。
- 主会话不再被过程文本刷屏。

---

## 18. 示例最终效果

### 18.1 运行中

```text
AI 正在自动处理 · 已完成 3/5

✓ 理解用户问题
✓ 获取当前项目
✓ 查询相关状态
⏳ 正在校验结果
○ 准备生成回复

[收起过程]
```

### 18.2 完成后

```text
处理完成 · 已检查 5 项 · 调用 3 个工具 · 无阻塞
[查看过程]
```

### 18.3 阻塞态

```text
流程已阻塞 · 当前卡在「默认账户授权」

当前阻塞：
未检测到默认账户授权过的媒体应用。

影响：
无法继续自动共享与联调。

下一步：
请补充授权后重新发起。
```

### 18.4 Tool 摘要

```text
工具调用摘要

智投配置 MCP · 成功
媒体配置 MCP · 成功
联调 MCP · 跳过
```

---

## 19. 不应实现的内容

本次不要实现：

- 新工作台页面
- 三栏复杂 Dashboard
- 新 Agent
- 新 Skill
- 新 MCP
- 新业务 DSL
- 新业务状态机
- 新异常判断逻辑
- 自动修复逻辑变更
- 用户确认弹窗
- 业务结果重算
- Tool 返回二次推理

---

## 20. 最终结论

本次优化的本质是：

> 将“思维链文本”升级为“AI Runtime 过程体验”。

保持现有 Agent / Skill / MCP / Workflow 不变，只通过前端组件、事件映射、信息压缩、渐进披露和动效系统，让用户感知到一个专业、可靠、可追溯、不过度打扰的 AI 执行过程。

最终体验目标：

```text
正文交付结果；
过程建立信任；
日志负责审计；
交互保持克制；
状态始终清晰。
```
