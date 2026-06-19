# Business Semantics Protocol

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Business Semantics 是业务结果、报表、审批与风险动作的语义层。Artifact/Task 当前暂挂在本目录下用于交付产物与任务状态收口，后续可独立演进为 `artifact-task` 子系统。该层位于 Capability Execution 之后、SemanticResultContract 之前，负责把工具结果转换为用户可理解的业务对象。

## 必须收口的对象

- `businessOutcome`：业务成功、业务失败、部分成功、不可用。
- `artifactRefs`：可保存或继续处理的产物。
- `taskRefs`：异步任务、审批、队列、长流程。
- `reportRefs`：报表域产物与口径。
- `evidenceRefs`：结论和建议的证据。
- `actions`：下一步业务动作。

## 禁止项

不得把业务语义散落到 renderer、Prompt 或 MCP 原始 payload 中。不得以 UI schema 代替业务域协议。
