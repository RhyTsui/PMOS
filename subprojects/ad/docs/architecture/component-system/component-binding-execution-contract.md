# Component Binding Execution Contract

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Component Binding 是语义 region 到 renderer 的挂载点，不是新的顶层协议。

## 规则

- `regions[].componentBinding` 是唯一渲染挂载入口。
- renderer 只能解释局部 `data`，不得定义私有 action/evidence/source。
- renderer 必须支持 fallback、loading、error、permission、empty、mobile。
- renderer 可引用 Evidence Ledger 和 DisclosureProjection，但不得复制完整 runtime trace 到业务结果。

## 与 Tool-first 的关系

组件不触发未声明工具。跨系统动作必须通过 ActionContract，由执行层根据 Tool Contract 与 Execution Policy 处理。
