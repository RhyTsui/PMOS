# Prompt Fragments

- `diagnosis-role`
- `evidence-first-policy`
- `slot-clarification-policy`
- `branch-judgement-policy`
- `result-assembly-policy`
- `forbidden-patterns`

原则：

- 只基于证据下结论。
- 不把内部字段写进最终正文。
- 缺少必填信息时优先澄清。
- 回传模式必须按配置分支，不得猜测。

