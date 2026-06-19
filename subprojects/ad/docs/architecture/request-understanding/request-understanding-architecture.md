# Request Understanding Architecture

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Request Understanding 是 `/api/chat` 主链路的第一层，先于 Capability Discovery、Tool/MCP 选择与 Model 生成。它只回答“用户目标是什么、属于哪些业务域信号、有哪些约束、是否存在歧义或缺失信息”。它不得提前生成最终 Query Contract、不得决定 required slots、不得补齐 tool arguments。

## 输出契约

- `userGoal` / `topIntent`：ask、analyze、execute、report、troubleshoot、create-task、approve、draft；只描述用户最终目标方向。
- `domainSignals`：只作为 evidence/scope signal，不得覆盖 `userGoal/topIntent`。
- `constraints`：时间、对象、权限、格式、交付物、风险要求。
- `contextRefs`：conversation、file、artifact、task、source。
- `ambiguity` / `missingInfo`：理解阶段发现的歧义或缺失信息；不等于 Tool Contract 的最终 required slots。
- `risk`：low、medium、high、blocked。
- `handoff`：进入 Capability Discovery 的候选方向。

## 强制顺序

```txt
Request Understanding -> Capability Discovery -> Resolver Chain -> Execution Policy
```

禁止通过业务关键词、MCP 工具名、报表名或页面入口直接跳过理解层。若意图不清，优先追问；若只有解释类请求，可进入 model-only，但必须标记为模型生成。
禁止在 Request Understanding 阶段构造最终 Query Contract 或阻断执行。Capability Discovery 必须先发现候选能力；Capability Contract / Tool Contract 再决定 required slots；Resolver Chain 再做参数补齐、候选排序和低置信确认。

## 与下游关系

- Capability Discovery 只能消费理解结果，不得反向重写 `userGoal/topIntent`。
- Report Domain 协议真源是 `docs/architecture/report-domain/report-domain-protocol.md`；本目录只负责识别报表目标与业务域信号，不重复定义报表业务域协议。
- Resolver Chain 必须记录理解结果与最终执行选择之间的差异。
- ResponseContract 必须保留“为何追问/为何无法执行/为何降级”的用户可读解释。
