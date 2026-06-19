# 4. 架构偏差、风险优先级与路线建议

## 4.1 总纲设计 vs 当前实现

| 架构域 | 总纲设计 | 当前代码实现 | 运行时是否生效 | 偏差类型 | 风险等级 | 证据文件 |
|---|---|---|---|---|---|---|
| P0 ResponseContract | 边界清晰，兼容旧字段但不吞并 runtime | 已有 `ResponseContract`，仍携带大量 metadata / message parts / semantic_result | 是 | `partial` | 高 | `frontend/src/src/lib/response-contract.ts` |
| P0/P0.5 Route Boundary | `body.intent` 只是 hint，domainSignals 不能覆盖 Top Intent | 已实现“hint only”，但仍有多链路并存 | 是 | `partial` | 高 | `request-understanding.ts`、`route-decision-observation.ts` |
| P1-A RouteDecision Contract | 属于 request understanding / route governance | 已实现且主链引用 | 是 | `implemented` | 中 | `route-decision-observation.ts` |
| P1-B RouteDecision Observation | 只读观测，不接管主链 | 已明确 `observe_only`，且打印 mismatch | 是 | `implemented` | 中 | `route-decision-observation.ts` |
| P0.6 Tool-First Query Runtime | Capability orchestration 应晚于前置硬塞参数表单 | 已把 `appId` 强制前置等逻辑收缩，改为 capability-based preflight | 是 | `implemented` 但仍未封版 | 高 | `report-query-orchestrator.ts`、`capability-orchestration.ts` |
| Admin Console Governance | 控制面统一治理全部配置真源 | admin 页签多中心，权限/配置/工作流/日志并列 | 是 | `drifted` | 高 | `app/admin/page.tsx` |

## 4.2 已实现且符合设计

1. `SemanticResultContract` 作为最终业务结果协议是成立的。
2. `RuntimeDisplayProtocol` 作为过程协议是成立的。
3. `route-decision-observation` 作为只读观测层是成立的。
4. `component-registry` 和 fallback 机制是成立的。
5. prompt store 已有版本、fallback、cache、seed 机制。
6. route runtime golden 已能覆盖帮助、问数、排查、需求、系统操作等关键路径。

## 4.3 已实现但偏离设计

1. `ResponseContract` 仍然是兼容性 envelope，而不是严格收口的纯协议。
2. `/api/chat` 仍然把路由、上下文、能力、结果、trace、展示全塞在一个 handler。
3. admin control plane 仍是多入口并列，而不是单一治理台账。
4. `prompt-store` 与 `managed-prompt-seeds` 的关系仍是“运行时 + 种子 + cache + admin”四层并存。
5. `intent-router`、`intent-route-engine` 等旧路由影子链路仍在仓库里。

## 4.4 设计存在但代码未完全实现

1. 严格单一的 route governance ledger。
2. 严格单一的 prompt runtime ledger。
3. 严格单一的 control plane source-of-truth。
4. 统一的 workflow / skill / capability 边界契约。
5. 完整的 disclosure / runtime / result 三平面强制分离。

## 4.5 代码存在但文档未完全覆盖

1. `route-runtime-golden.ts` 及其 P0.6 产物。
2. `business_outcome`、`step_status`、`tool_execution_status`、`blocking_requirements` 这类执行状态字段。
3. `prompt-store` 的 seed / cache / conflict / active record 细节。
4. `report-query-orchestrator` 的 preflight / tool chain / knowledge fallback / business outcome 组合。

## 4.6 伪实现 / 半实现 / 只打日志未接主链

1. `intent-route-engine.ts` 仍更像影子链路，不是主链权威入口。
2. 部分 admin 页面是“有入口但治理边界还没合并”的半成品。
3. 某些 metadata / trace 字段只在日志里可见，没有统一反哺主协议。

## 4.7 运行时生效但后台不可治理

1. 某些 prompt runtime fallback 仍更多依赖代码和缓存，不完全依赖后台治理。
2. 一些 route observation / runtime metadata 是运行时生效，但后台没有统一仪表板去治理。

## 4.8 后台有入口但运行时不生效

1. 旧式 route engine 和某些 shadow config 入口可能仍保留，但主链未明确依赖。
2. 某些 admin tab 是展示级入口，不一定是真正执行态真源。

## 4.9 旧设计仍在运行

1. `intent-router.ts`
2. `intent-route-engine.ts`
3. `response-contract.ts` 的 legacy 容器形态
4. `ChatContainer.tsx` 对 runtime / message / contract 的兼容投影

## 4.10 新设计已实现但未写入总纲

1. P0.6 的 `tool-first runtime` 语义。
2. `business_outcome / step_status / tool_execution_status / blocking_requirements`。
3. `route-runtime-golden.ts` 及其针对 route runtime 的封门机制。

## 4.11 P0 / P1 / P2 风险清单

### P0

- 风险：通用 Chat 仍可能退化为 report query，或问数被误导成能力缺失
- 风险：`/api/chat` 仍是超大 handler，单点修改容易破坏主链
- 风险：clarification 与 capability blocking 语义边界不完全统一

### P1

- 风险：prompt governance 多源并存，生效不透明
- 风险：admin control plane 入口过多，配置归属不清
- 风险：response contract 与 runtime / legacy payload 仍耦合
- 风险：旧路由链路仍保留在仓库中，容易误复用

### P2

- 风险：总纲文档未完整吸收 P0.6 产物
- 风险：后台 IA 仍未完全按 control plane 逻辑重排
- 风险：workflow / skill / capability 的边界表达还不够统一

## 4.12 重点核对结果

1. 通用 Chat 是否仍会退化为 Report Query：**仍有风险**
2. Query Contract 是否仍前置阻断能力发现：**已减弱，但未彻底收口**
3. metric/time/dimension 是否仍作为所有问数默认必填：**已修正一部分，但仍需继续验证**
4. Capability Discovery 是否晚于参数表单：**已向前推进，但并未完全统一**
5. SemanticResultContract 是否参与路由：**不应参与，当前主链上已尽量隔离**
6. UI 是否泄露 Runtime 内部状态：**仍有兼容性泄露风险**
7. Prompt 是否覆盖 RouteDecision：**以 evidence/support 形式参与，不应覆盖权威路由**
8. Domain Pack 是否覆盖 Top Intent：**部分覆盖，仍有偏差**
9. `body.intent` 是否仍可能强制进入 `report_query`：**已降低，但不能视为零风险**
10. `currentProject` 是否结构化进入上下文：**是**
11. `capabilityDecision` 是否真正进入 selector：**是，但与 report orchestrator 仍需统一**
12. 右侧展示与主消息展示职责是否打穿：**仍有耦合**
13. Admin Control Plane 是否有多套配置真源：**是**
14. 后台菜单是否重复、配置归属是否混乱：**是**
15. 连弩 SDK 上报逻辑是否被改动：**未见本次提交改变主逻辑**

## 4.13 后续路线图建议

1. `P0.6` 继续，但只做封版和收口，不再扩面。
2. `P1-C` 路由治理建议暂停，先把 clarification / capability / route boundary 收紧。
3. `Admin Console IA` 建议暂停，先重画控制面真源。
4. `Chat Domain Protocol` 先只做文档和 type-only，不要直接改主链。
5. 可以并行：总纲文档、配置真源地图、drift list、golden 说明。
6. 不能并行：`/api/chat`、`request-understanding`、`capability-orchestration`、`report-query-orchestrator`、`response-contract`、`prompt-store` 的主链改动。
7. 建议提交顺序：先封 P0.6，再补总纲，再收口 control plane，再开 P1-C。
8. 建议分支策略：`p0.6-seal`、`architecture-doc-refresh`、`control-plane-source-of-truth`、`p1c-route-governance`。
9. 建议先更新总纲，再继续后台治理。
10. 建议先封 P0.6，再做 P1-C。

## 4.14 最终判定

- 当前 `HEAD` 已包含 P0.6
- 但 P0.6 仍属于 `未封版实现`
- 不建议把当前仓库状态写成“稳定最终架构结论”

