# Codex 与 Codex CLI 同步口径

## 结论

Codex 和 Codex CLI **不会自动共享**下面这些内容：

- 隐藏会话上下文
- 临时聊天记忆
- 当次运行时推断出的工作假设
- 各自进程里注入的系统 / 开发者规则细节

它们**能稳定共享**的只有显式落盘或显式声明的内容：

- 仓库文件
- `AGENTS.md`
- `docs/memory/mcp-context/*`
- `docs/operations/*`
- `~/.codex/skills/*`
- 本地插件 / MCP 配置文件

## 推荐做法

把下面几类内容当成唯一事实来源，不要依赖某一端“记得”：

1. 规则
   `AGENTS.md`
   仓库级工作规则、读写约束、共享协作要求都写这里。

2. 当前身份与工作口径
   `docs/operations/startup-whoami.md`
   进入新会话前先读，避免 Codex 和 CLI 对当前任务理解不一致。

3. 任务状态与交接
   `docs/memory/mcp-context/*`
   用 `task-start`、`checkpoint`、`task-complete` 记录，而不是只留在聊天里。

4. 可复用能力
   `~/.codex/skills/*`
   skill 装在本机后，Codex 和 CLI 才可能共用；但“何时触发、如何解释”仍受各自提示词影响。

5. MCP / Plugin 能力
   插件或 MCP 在环境里装好后，两边都可能可见；但是否启用、何时调用，也不保证完全一致。

## 启动顺序

无论在 Codex 还是 Codex CLI，建议都按这套顺序恢复现场：

1. 读 `AGENTS.md`
2. 读 `docs/operations/startup-whoami.md`
3. 读最近 `mcp-context events`
4. 读当前 `in_progress` tasks
5. 开始新工作前先记 `task-start`

## 不同步的根因

问题通常不是“文件没同步”，而是下面三件事：

- 一端改了仓库规则，但另一端没有重新读取
- 一端只在聊天里说过，没有写进 `mcp-context`
- skill / plugin 已安装，但两端的运行时提示词和触发逻辑不同

## 解决原则

如果希望两边行为尽量一致，就把“上下文、记录、规则”都外显化：

- 规则写文件
- 状态写 `mcp-context`
- 入口写 `startup-whoami.md`
- 不依赖隐藏上下文

## 当前仓库建议

这个仓库应该把下面三样当成最低配：

- `AGENTS.md`
- `docs/operations/startup-whoami.md`
- `docs/memory/mcp-context/`

缺任何一个，Codex 和 Codex CLI 都容易漂移。
