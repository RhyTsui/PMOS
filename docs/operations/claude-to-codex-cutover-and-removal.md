# Claude -> Codex 迁移与删除清单

- date: 2026-05-11
- status: active
- owner: product office

## 目标

这份真源定义的不是“把 Claude 文本替换掉”，而是：

1. 删除 `Claude-era executor contract`
2. 保留必要的 `Anthropic provider compatibility`
3. 把仍有价值的规则迁到 `Codex` 或 `executor-agnostic PMOS truth`

## 迁移完成判定

只有同时满足下面 4 条，才算完成 `Claude -> Codex` 切换：

1. 活跃 workflow / prompt / skill 默认入口不再依赖 `.claude/*`
2. 活跃 runtime 默认 provider 不再使用名为 `claude` 的执行器入口
3. 前端/设计默认基线不再依赖 `claude-design-system`
4. 历史 Claude 文档被降级为 archive/reference，而不是 active truth

## 分类

### A. 迁到 Codex 或 PMOS 真源

这些内容必须保留能力，但不能继续依赖 Claude 壳：

1. 前端设计默认基线
   - target: `skills/ant-design-family-frontend/`
   - truth: `docs/operations/pmaios-ant-design-family-frontend-design.md`
2. `{do}` 协议、共享上下文、checkpoint、交接规则
   - target: `AGENTS.md`
   - truth: `docs/operations/startup-whoami.md`
3. SDD / Superpowers / 自动验收主链
   - target: workflow + runtime gate
   - truth: `docs/operations/sdd-superpowers-testing-protocol.md`

### B. 保留为兼容层

这些不是 Claude 执行器规则，而是普通模型兼容能力：

1. `anthropic` provider
2. `ANTHROPIC_API_KEY`
3. `AnthropicProviderAdapter`

要求：

- 不再以 `claude` 命名活跃默认 provider
- 不再把 Anthropic provider 描述成 PMOS 默认执行器

### C. 降级为历史档案

这些文件可以保留历史价值，但不能继续误导当前执行：

1. `docs/archive/claude-design-tooling-status-2026-04-19.md`
2. `docs/archive/claude-handoff-*.md`
3. 旧实现文档里把 Claude 当默认执行器的段落

### D. 删除对象

这些是 `Claude-era executor contract`，迁移完成后应直接删除：

1. `.claude/commands/*`
2. `.claude/settings.local.json`
3. `src/llm_router/claudeSettingsSync.ts`
4. `skills/registry.json` 中的 `claude-design-system`
5. 活跃配置中的 `defaultProvider = claude`

## 本轮已落地

1. `config/providers.json`
   - 默认 provider 已切离 `claude`
   - `claude` provider 已重命名为 `anthropic`
2. `skills/registry.json`
   - 已移除 `claude-design-system`
3. `src/llm_router/claudeSettingsSync.ts`
   - 已删除
4. `src/cli/aios.ts`
   - 不再执行 `.claude` settings 同步
5. `src/backend/server.ts`
   - 设计工具状态改挂 `ant-design-family-frontend`
6. `.claude/`
   - 本地 Claude slash-command 与 settings 状态已物理删除
7. 历史 Claude 文档
   - 已降级到 `docs/archive/`

## 仍待继续治理

1. `src/agent_os/*`
   - 已切换到 `ANTHROPIC_*` env；仍有少量 Anthropic 模型字面量作为真实 API model id
2. `mcp-context` 历史 `toolIdentity = claude`
   - 当前保留兼容读取，不再作为默认入口宣传
3. 历史文档中的 Claude 叙事
   - 需要继续迁到 archive/reference
4. 历史生成物中的 Claude-era 文本
   - 按 `docs/operations/historical-artifact-immutability-policy.md` 处理，不做伪造式重写

## 删除门禁

执行物理删除 `.claude/` 前，必须确认：

1. 当前工作流无人再通过 Claude slash commands 执行核心任务
2. 设计、前端、验收、交接均已走 Codex + repo truth
3. 相关历史经验已迁入 PMOS 真源或 archive

## 用户需求回查

- original user requirement: 迁移到 Codex 后删掉 Claude
  - current state: `partial-strong`
  - why: `.claude/` 本体、活跃默认链和 `agent_os` 的 `CLAUDE_*` 命名已清掉，但历史 Claude 文档与 `mcp-context` 兼容字段还未完全归档
