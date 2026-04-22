# Codex 协作迁移基线

- date: 2026-04-22
- status: active baseline
- purpose: 让 Codex 与 PMAIOS 不只同步 skill / plugin，还同步协作规则、模式、共享上下文和启动约束

## 目标

迁移后的目标不是“Codex 也能用”，而是：

- 在 Codex 里工作时，不丢 PMAIOS 的协作规则
- `{do}`、默认中文、需求防漏、分母式进度这些规则尽量同口径生效
- Codex 和 Claude 继续共用 `mcp-context`，而不是各自依赖黑盒会话记忆

## 需要同步的五层

### 1. 启动层

Codex 进入仓库后，必须读取：

1. `docs/memory/mcp-context/session-state.json`
2. `mcp-context events`
3. `mcp-context tasks --status in_progress`
4. `docs/operations/startup-whoami.md`
5. `AGENTS.md`

这一层决定：

- 默认中文
- 仓库共享上下文的恢复方式
- `{do}` 的执行协议
- 需求防漏和分母式进度的基本规则

### 2. 模式层

当前模式协议：

- `default`
- `plan`
- `deep`
- `do`

当前迁移判断：

- 同仓库 Codex CLI：可以沿用 PMAIOS 的模式规则
- 外部 GUI / 网页 Codex：仍需要显式恢复这些规则

### 3. 共享上下文层

共享真源仍然是：

- `mcp-context`

Codex 侧需要遵守：

- 开始任务 -> `task-start`
- 关键阶段 -> `checkpoint`
- 完成任务 -> `task-complete`
- 模式切换 -> `mode / mode-history`
- 写命令顺序执行，不并行改共享状态

### 4. 能力层

当前需要同步三类能力：

- 本地 user skills
- runtime builtin capabilities
- plugin / tool

当前对应真源：

- `skills/registry.json`
- `docs/operations/codex-runtime-visible-skills.json`
- `docs/operations/codex-runtime-capability-classification.json`
- `docs/operations/codex-local-runtime-core-classification.json`
- `docs/operations/codex-plugin-tool-registry.json`
- `docs/operations/codex-local-state-sync-status.json`

### 5. 差异审计层

迁移不是一次性动作，而是持续回答：

- 哪些能力只在 Codex runtime 可见
- 哪些能力只在本地目录存在
- 哪些能力已经进入 PMAIOS 治理
- 哪些 plugin 已启用但未治理
- 哪些规则在 PMAIOS 有，但在 Codex 侧还只是 partial

## 当前已经迁移的内容

### 规则与行为

- 默认中文
- `{do}` 快执行协议
- 需求防漏
- 分母式进度
- 用户需求 / 产品需求双层规则
- 启动必读顺序
- 共享状态顺序写入规则

### 共享上下文

- `task-start`
- `checkpoint`
- `task-complete`
- `mode`
- `mode-history`

### 能力治理

已对齐的外部 user skills：

- `follow-builders`
- `fireworks-tech-graph`
- `frontend-skill`

已治理 plugin：

- `gmail@openai-curated`

已治理 runtime builtin capabilities：

- `Excel`
- `PowerPoint`
- `OpenAI Docs`
- `Image Gen`
- `Inbox Triage`
- `Plugin Creator`
- `Skill Creator`
- `Skill Installer`

已治理 local runtime core：

- `codex-primary-runtime`

## 当前状态判断

当前更准确的判断是：

- 同仓库 Codex CLI：已经可以和 PMAIOS 共用大部分协作规则和能力治理口径
- 外部 GUI / 网页 Codex：仍然是 partial，需要显式恢复规则
- skill / plugin / runtime capability 三层现在已经不再是黑盒

## 当前剩余问题

### 1. 外部 GUI / 网页 Codex 仍是 partial

如果不是从当前仓库进入，或没有读 `AGENTS.md` / `startup-whoami`，规则仍会部分失效。

### 2. 自动补登记还没做

现在已经能发现差异，但还没自动做：

- 新 skill 自动登记到 `skills/registry.json`
- 新 plugin 自动登记到 `docs/operations/codex-plugin-tool-registry.json`

### 3. 人读面还可继续加强

当前 Workspace 已能看到同步状态，但还可以继续做：

- 更明确的治理状态摘要
- 更适合 chief / PM 的人读面
- 和版本/项目 rollout 的进一步联动

## 最小使用建议

如果你希望 Codex 和 PMAIOS 尽量同口径：

1. 从同一仓库进入 Codex
2. 保持 `AGENTS.md` 和 `startup-whoami.md` 作为启动真源
3. 继续使用 `mcp-context` 做任务与 checkpoint 共享
4. 新增 skill / plugin 后至少运行一次：

```bash
npm run cli -- codex-state status
```

5. 必要时补登记到对应真源，再写快照：

```bash
npm run cli -- codex-state sync
```

## 相关真源

- `AGENTS.md`
- `docs/operations/startup-whoami.md`
- `docs/operations/do-mode-execution-protocol.md`
- `docs/operations/do-mode-task-start-contract.md`
- `docs/operations/codex-local-state-sync.md`
- `docs/operations/codex-local-state-sync-status.json`
- `docs/operations/codex-collaboration-migration-manifest.json`
