# Claude Handoff 2026-04-22

> Archived on `2026-05-11`.
> This handoff belongs to the Claude-era executor context and is preserved only for historical traceability.
> Active runtime identity and collaboration truth now lives in:
> `AGENTS.md`
> `docs/operations/startup-whoami.md`
> `docs/operations/claude-to-codex-cutover-and-removal.md`

## 目的

把本轮已确认的仓库协作规则、执行策略、上下文状态和当前阻塞整理给 Claude，避免仅依赖隐藏对话上下文。

## 仓库级协作规则

### 1. Shared Workspace

- 本仓库是 Codex 与 Claude 的共享工作区。
- `docs/memory/mcp-context/session-state.json` 是单一共享状态文件。
- 所有会变更共享状态的 `mcp-context` 写操作必须串行执行，不能并行：
  - `task-start`
  - `task-complete`
  - `task-note`
  - `checkpoint`
  - `mode-set`
  - `repair`

### 2. 默认语言

- 除非用户显式要求其他语言，默认工作语言是中文。
- 适用范围：
  - 与用户对话
  - 正常说明与总结
  - SVG 文案
  - 面向人的文档
- 英文仅用于：
  - proper nouns
  - 路径与文件名
  - 代码标识符
  - 无法避免的技术术语

### 3. Idea Refinement

- 不要把用户的原始想法直接翻译成实现。
- 默认先做：
  - 领域化问题提炼
  - 行业最佳实践扫描
  - 相关性与影响评估
  - 边界与依赖澄清
- 再同步给用户：
  - refined problem statement
  - candidate implementation direction
  - priority / tradeoff judgment
- 如果用户没有纠正方向，则按该方向继续。

### 4. Dual Requirement

- 重要工作至少同时包含两层：
  - user requirement
  - product requirement
- 不能停留在 product requirement 层。
- 当新增 product 机制、文档或能力时，也必须：
  - 映射回原始用户需求
  - 检查真实使用场景是否被解决
  - 结果分类为：`solved` / `partial` / `unsolved`

### 5. Denominator Progress

- 进度默认不只汇报“做完了什么”，还要带分母视角。
- 长任务优先汇报：
  - total tracked items
  - solved items
  - promoted-to-plan items
  - parked/rejected items with reason
  - still-missing-placement items
- 如果发生抽象收敛，要显式回查是否真的解决了原始需求。

### 6. Progress Report

- 进度同步默认不是暂停点。
- 除非存在真实 blocker、风险分叉、权限门槛，否则：
  - 继续往下做
  - 不要把阶段性汇报写成停工
  - 不要每汇报一次就等待用户

### 7. No False Finish

- 里程碑式语气不等于任务结束。
- 除非用户明确停止、暂停、改向，否则：
  - 不要进入 wrap-up 心态
  - 不要把阶段总结写成最终完成
  - 总结后应继续推进下一个安全步骤

### 8. `{do}` Fast Route

- 当用户显式进入 `{do}` 模式时，采用快速执行路径：
  - 默认持续执行
  - 同步简短
  - 非关键支线先停放
  - 只在真实 blocker / 高风险分叉 / 权限门槛 / 明显漂移时停
- `{do}` 下需要尽早明确：
  - accepted target
  - current highest-priority line
  - parked side lines
  - known blockers
  - next safe step

## 启动 / 恢复要求

在开始或恢复 substantive work 前，按仓库要求应读取：

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. `docs/operations/startup-whoami.md`

工作中应记录：

- `task-start`
- 重要 `checkpoint`
- `task-complete`

注意：以上共享写操作必须串行。

## 当前会话事实

### 用户最近明确请求

1. 用户先请求：`提供pmaios的首页地址`
2. 在发现工具异常后，用户追问：`你还是不能吊起shell吗`
3. 随后用户请求：`把之前的策略规则都整理好 让claude知道 还有上下文`

### 当前优先级判断

- 当前最高优先级：把协作规则和上下文显式写给 Claude。
- 次高优先级：恢复或绕过 shell 能力，再继续定位 `pmaios` 首页地址。

### 已发生的阻塞

- 当前会话里的 `functions.shell_command` 无法正常启动 PowerShell。
- 多次尝试后均以返回码 `-65536` 失败。
- 失败发生在 shell 宿主启动阶段，不是具体命令语法问题。
- 输出表现为 PowerShell 宿主报错/乱码，连 `Get-Content` 这类最基础命令都没有真正执行。

### 由此带来的影响

- 目前不能可靠读取：
  - `session-state.json`
  - `startup-whoami.md`
  - `mcp-context events`
  - `mcp-context tasks`
- 目前也不应假装已经完成共享状态回写。
- 所以本次交接先采用“显式 handoff 文档”作为临时真相来源。

## 对 Claude 的执行建议

### A. 恢复上下文

- 优先尝试恢复 shell 能力。
- 如果 shell 恢复：
  1. 读取 `docs/memory/mcp-context/session-state.json`
  2. 执行 `npm run cli -- mcp-context events 20`
  3. 执行 `npm run cli -- mcp-context tasks --status in_progress`
  4. 读取 `docs/operations/startup-whoami.md`
  5. 再把本文件内容与共享状态对齐

### B. 共享状态写入策略

- 若 shell 恢复后准备写 `mcp-context`，务必串行。
- 不要并行写共享状态。
- 如果要登记这项交接，建议顺序是：
  1. `task-start`
  2. 需要时写 `checkpoint`
  3. 结束时 `task-complete`

### C. 关于 `pmaios` 首页地址任务

- 该问题当前状态是：`unsolved`
- 原因不是缺少结论，而是本地读取链路损坏，无法从仓库内直接核实。
- 推荐后续路径：
  1. 优先从代码与配置内定位首页路由、部署地址、base URL
  2. 再从启动配置、README、env、router、site config 交叉核验
  3. 最后给用户一个“已核实”的地址，而不是猜测

## 当前结果状态

- 用户需求“让 Claude 知道之前的策略规则和上下文”：
  - 状态：`solved`
- 用户需求“提供 pmaios 首页地址”：
  - 状态：`unsolved`
- 产品侧补充物：
  - 新增了这份显式 handoff 文档，供 Claude / Codex 直接读取
