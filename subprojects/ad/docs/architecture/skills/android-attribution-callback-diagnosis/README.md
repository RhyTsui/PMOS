# Android Attribution Callback Diagnosis Skill Package

Skill ID: `android-attribution-callback-diagnosis`

这是一个诊断型 Skill 包，不是单独的 prompt，也不是某个 MCP 的别名。

## 作用范围

- Android 归因异常
- 媒体回推失败
- SDK / API 回传排查
- PAY 未回推
- 804 / feedback-res / 回传规则异常
- 联调失败和数据准确性复核

## 总体约束

1. MCP 先归一为 capability，再由 Skill / Workflow 使用。
2. Skill 依赖 capability，不直接绑定单个 toolName。
3. 缺少必填 slot 时先澄清，不直接执行。
4. 结果必须进入 `SemanticResultContract`。
5. 执行态必须进入 `RuntimeDisplayProtocol`。
6. 证据必须挂 `evidenceRefs` 和 `sourceRefs`。

