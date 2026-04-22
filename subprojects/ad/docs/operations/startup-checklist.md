# Startup Checklist

## 适用范围

适用于：

- Codex
- Codex CLI
- 新会话
- 中断后恢复
- 在另一个终端接手同一仓库

## 进入仓库后先做

1. 读 `AGENTS.md`
2. 读 `docs/operations/startup-whoami.md`
3. 读 `docs/operations/codex-cli-sync.md`
4. 查看最近 `mcp-context events`
5. 查看当前 `in_progress` tasks`

## 开始新工作前

1. 判断这次工作是否已经有进行中的 task
2. 如果没有，先记 `task-start`
3. 如果有，确认是否要沿用原 task 继续推进

## 做事过程中

1. 重要决策记 `checkpoint`
2. 关键文件修改后，确保口径写进仓库文件，不只留在聊天里
3. 如果形成新的默认入口、演示地址、运行方式，更新 `startup-whoami.md`

## 收尾时

1. 记 `checkpoint`
2. 如果任务结束，记 `task-complete`
3. 如果只是阶段性暂停，至少把当前状态写进 `mcp-context`

## 最低要求

如果来不及完整恢复现场，至少先做这 4 件事：

1. 读 `AGENTS.md`
2. 读 `startup-whoami.md`
3. 看最近 `events`
4. 开工前记 `task-start`

## 目标

这份清单的目的只有一个：

让 Codex 和 Codex CLI 即使不共享隐藏上下文，也能基于同一套外显事实恢复到尽量一致的状态。
