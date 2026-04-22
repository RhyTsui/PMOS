# Codex 本地状态同步

- date: 2026-04-22
- status: active baseline
- purpose: 把本机 `~/.codex` 的 skills / plugins / runtime 可见能力，稳定映射到 PMAIOS 的治理真源

## 目标

解决这类问题：

- Codex 里已经能看到或能用
- 本地目录里已经存在
- 但 PMAIOS CLI / Workspace / registry 里看不到

同步后的目标不是“完全自动安装一切”，而是：

- 能读到本地状态
- 能看出差异
- 能把已治理项稳定收入口径
- 能明确哪些只是 Codex 内置能力

## 当前同步范围

PMAIOS 当前会扫描并对照：

- `C:\Users\xuyun\.codex\config.toml`
- `C:\Users\xuyun\.codex\skills\`
- `C:\Users\xuyun\.codex\plugins\`
- `docs/operations/codex-runtime-visible-skills.json`
- `docs/operations/codex-plugin-tool-registry.json`
- `docs/operations/codex-runtime-capability-classification.json`
- `docs/operations/codex-local-runtime-core-classification.json`
- `skills/registry.json`

## CLI

查看当前状态：

```bash
npm run cli -- codex-state status
```

写出当前快照：

```bash
npm run cli -- codex-state write
```

标准同步动作：

```bash
npm run cli -- codex-state sync
```

`sync` 会同时：

- 重写同步快照
- 输出当前是否 `aligned`
- 列出剩余漂移项
- 给出已治理的 skill / runtime capability / plugin 概况

默认写入：

- `docs/operations/codex-local-state-sync-status.json`

## API

读取当前状态：

- `GET /api/codex/local-state`

## 当前分层

### 1. 本地 user skills

当前已和 PMAIOS 对齐：

- `follow-builders`
- `fireworks-tech-graph`
- `frontend-skill`

### 2. 本地 runtime core

当前已治理：

- `codex-primary-runtime`

它属于本地 runtime core，不再视为“本地孤立 skill 漂移”。

### 3. 已启用 plugin / tool

当前已治理：

- `gmail@openai-curated`

### 4. Codex runtime 内置能力

当前已治理：

- `Excel`
- `PowerPoint`
- `OpenAI Docs`
- `Image Gen`
- `Inbox Triage`
- `Plugin Creator`
- `Skill Creator`
- `Skill Installer`

这些能力属于 runtime builtin capability，不要求在 `~/.codex/skills` 目录里出现。

## 差异口径

当前快照会输出这些差异字段：

- `localOnlySkills`
  - 本地存在，但 PMAIOS 还没治理的 skill / runtime core
- `pmaiosOnlyExternalSkills`
  - PMAIOS 已登记，但本地当前不存在的外部 skill
- `localVisibleAndRegisteredSkills`
  - 本地存在且 PMAIOS 已登记的外部 skill
- `runtimeVisibleOnlySkills`
  - Codex 运行时可见，但 PMAIOS 还没治理的 runtime 能力
- `enabledPluginsNotTrackedByPmaios`
  - 本地已启用，但 PMAIOS 尚未治理的 plugin

## 当前基线结果

在本轮收口后，当前快照已经达到：

- `localOnlySkills = 0`
- `runtimeVisibleOnlySkills = 0`
- `enabledPluginsNotTrackedByPmaios = 0`

也就是：

- 本地 user skills 已同步
- 本地 runtime core 已分类
- runtime builtin capabilities 已分类
- 已启用 plugin 已纳入最小治理面

## Workspace 可见面

Workspace 现在可以直接看到：

- 已同步的本地 skill
- 已治理的本地 runtime core
- 已治理的 plugin/tool
- 已治理的 runtime builtin capability
- 仍未治理的差异项

## 当前边界

这版只做：

- 读取
- 归一化
- 差异对照
- 最小治理登记

这版还不做：

- 自动安装 skill
- 自动安装 plugin
- 自动改写 `config.toml`
- 自动把新 plugin/skill 直接写进 registry

## 新增能力时的标准动作

如果你希望“Codex 里能看到”和“PMAIOS CLI / UI 也能识别”同时成立，新增 skill / plugin 后至少要做：

1. 让能力进入正确层：
   - user skill -> `~/.codex/skills/<id>/SKILL.md`
   - plugin -> `config.toml` 启用并有本地 cache
   - runtime builtin -> 归入 runtime capability 分类
2. 补 PMAIOS 真源：
   - `skills/registry.json`
   - 或 `docs/operations/codex-plugin-tool-registry.json`
   - 或 `docs/operations/codex-runtime-capability-classification.json`
3. 运行：

```bash
npm run cli -- codex-state status
```

4. 必要时写出快照：

```bash
npm run cli -- codex-state write
```

更推荐直接用：

```bash
npm run cli -- codex-state sync
```

## 相关真源

- `docs/operations/codex-local-state-sync-status.json`
- `docs/operations/codex-runtime-visible-skills.json`
- `docs/operations/codex-plugin-tool-registry.json`
- `docs/operations/codex-runtime-capability-classification.json`
- `docs/operations/codex-local-runtime-core-classification.json`
- `skills/registry.json`
