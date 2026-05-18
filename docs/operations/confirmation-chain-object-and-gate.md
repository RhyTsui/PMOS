# 确认链对象与 Gate 定义

- version: v0.1
- date: 2026-05-06
- status: active
- scope: PMAIOS platform and active subprojects
- purpose: 把“已生成 / 已落盘 / 已确认”从口头规则收口为平台正式对象、状态机与 gate 约束

## 1. 为什么要单独建这个对象

这次 `tracking-acceptance` 落地反复暴露出同一个问题：

1. 文件生成了，不等于已经进入正式真源。
2. 文件落盘了，不等于已经被责任人确认。
3. 上层未确认时，下层草稿很容易被误报为“已完成”。
4. 后续如果状态被纠正，往往没有统一对象可以回溯和修正。

因此 PMAIOS 不能只写“等待确认”这类自然语言描述，必须有正式对象来记录：

1. 在确认什么
2. 是哪一层确认
3. 由谁确认
4. 当前卡在什么状态
5. 通过后解锁什么

## 2. 核心判断

确认不是文件属性，而是治理事件。

PMAIOS 应统一使用：

1. 通用对象：`confirmation-record`
2. 设计链特化：`design-confirmation-record`
3. 运行时 gate：`design-confirmed gate`
4. 后续可扩展：`writeback-confirmed gate`、`implementation-handoff-confirmed gate`

也就是说：

`artifact generated -> artifact landed -> confirmation recorded -> next stage unlocked`

这里的“确认”必须通过对象和 gate 落地，而不能停留在聊天描述里。

## 3. 通用对象：`confirmation-record`

### 3.1 定位

`confirmation-record` 是 PMAIOS 的通用确认事件对象。

它不是设计稿本体，也不是任务本体，而是“某个对象在某一层确认状态”的正式记录。

### 3.2 最小字段

建议最小字段集如下：

```json
{
  "id": "confirm-xxx",
  "objectType": "design-artifact",
  "objectId": "overview-visual-ui-v3",
  "projectId": "tracking-acceptance",
  "layer": "visual-ui",
  "status": "pending",
  "confirmerRole": "user",
  "responsibleRole": "product-chief",
  "unblockTarget": "static-html-confirmation",
  "evidencePaths": [],
  "dependsOn": [
    "confirm-overview-interaction-v2"
  ],
  "supersedes": null,
  "notes": "",
  "recordedAt": "2026-05-06T00:00:00+08:00",
  "confirmedAt": null
}
```

### 3.3 字段解释

- `objectType`
  - 被确认对象的类型，例如 `design-artifact`、`writeback-package`、`implementation-handoff`
- `objectId`
  - 被确认对象的唯一标识
- `projectId`
  - 所属项目或子项目
- `layer`
  - 当前确认层级
- `status`
  - 当前确认状态
- `confirmerRole`
  - 负责拍板的角色
- `responsibleRole`
  - 负责组织本轮确认的人或系统角色
- `unblockTarget`
  - 通过后解锁的下一步对象或流程
- `evidencePaths`
  - 相关文档、稿件、评审记录、链接
- `dependsOn`
  - 当前确认依赖的前序确认记录
- `supersedes`
  - 当前记录替代的旧确认记录
- `recordedAt`
  - 记录写入时间
- `confirmedAt`
  - 实际确认时间，未确认时为空

## 4. 特化对象：`design-confirmation-record`

### 4.1 定位

`design-confirmation-record` 是 `confirmation-record` 在设计链上的收窄版本。

它服务于当前 PMAIOS 已经明确的多层设计链：

1. 原型确认稿
2. 交互确认稿
3. 高保真视觉稿
4. 视觉 UI 确认稿
5. 静态 HTML 确认稿
6. 实现承接稿

### 4.2 推荐层级枚举

推荐统一层级值：

1. `prototype`
2. `interaction`
3. `high-fidelity-visual`
4. `visual-ui`
5. `static-html`
6. `implementation-handoff`
7. `ai-writeback-human-review`

说明：

- `high-fidelity-visual` 对应 Pixso/Figma 等高保真视觉设计层
- `visual-ui` 对应设计规则确认层，不等同于高保真源稿本体
- `ai-writeback-human-review` 用来承接 AI 结果回写前的人审确认

### 4.3 推荐状态枚举

推荐统一状态值：

1. `draft`
2. `pending`
3. `confirmed`
4. `rework-required`
5. `superseded`
6. `rejected`

解释：

- `draft`
  - 已生成但未进入正式确认流
- `pending`
  - 已落盘，等待确认
- `confirmed`
  - 已被指定角色确认，可解锁下一层
- `rework-required`
  - 被打回，需要修订后重新确认
- `superseded`
  - 已被新版本确认记录替代
- `rejected`
  - 本轮确认被明确否决，不应继续沿当前版本推进

## 5. Gate：`design-confirmed gate`

### 5.1 要解决什么

这个 gate 用来阻止以下错误推进：

1. 把“已经有图”误当“已经确认”
2. 把“文件已写进仓库”误当“上游依赖已通过”
3. 在上层未确认时越级推进到静态 HTML 或实现承接
4. 在状态被纠正后，下游却仍沿旧口径继续推进

### 5.2 Gate 问题

`当前要继续推进的对象，是否已经具备所需的确认记录，并且前置确认链未失效？`

### 5.3 Block 条件

以下任一满足即 `block`：

1. 缺少当前层所需的 `confirmation-record`
2. 当前记录状态不是 `confirmed`
3. 前置层存在 `pending`、`rework-required` 或 `rejected`
4. 当前记录引用的被确认对象与真实交付对象不一致
5. 旧确认记录已被 `superseded`，但下游仍沿旧记录推进

### 5.4 Pass 条件

必须同时满足：

1. 当前对象已有正式确认记录
2. 状态为 `confirmed`
3. 所有必需前置层也为 `confirmed`
4. `unblockTarget` 与下一阶段推进目标一致
5. 有最小证据路径可追溯

### 5.5 Warn 条件

以下情况可以 `warn` 但不直接阻塞：

1. 确认已完成，但证据链接仍待补齐
2. 确认角色符合要求，但责任人字段尚未标准化
3. 已确认对象可继续推进，但旧历史记录仍未补 `superseded`

## 6. 与现有 PMAIOS 文档链的挂接方式

### 6.1 与 `prd-and-design-two-step-governance`

这里已经定义了 `Confirmation Chain Rule`。

本文件补的是：

1. 正式对象
2. 正式状态枚举
3. gate 的 `pass / warn / block` 条件

### 6.2 与 `pmaios-gate-system`

`design-confirmed gate` 应作为现有 gate system 的新增 gate，优先挂在：

1. 设计链推进
2. AI 结果回写
3. 实现承接前置检查

### 6.3 与 `ui-schema-spec`

后续 `ui-schema-spec` 不应只承接结构，还应可引用：

1. 当前页面对应的设计确认记录
2. 上游视觉/交互确认状态
3. 当前 handoff 是否可被视为可实现真源

### 6.4 与 `proof-of-work`

后续 proof-of-work acceptance package 应补入：

1. 当前交付物确认状态摘要
2. 最近一次确认记录
3. 是否存在待确认层或被打回层

## 7. 先落哪一层最划算

当前最适合先落的不是全平台泛化，而是两层：

1. `design-confirmation-record`
2. `design-confirmed gate`

原因：

1. 已经在 `tracking-acceptance` 里出现了高频实战样本
2. 它同时服务埋点项目收口和 `v0.7 Gate Runtime traceability`
3. 它比直接做全局大而全的确认中心更容易验证

## 8. 推荐下一步

建议按这个顺序继续：

1. 把本文件视为平台定义入口
2. 在设计相关文档中统一引用 `design-confirmation-record`
3. 在 gate runtime 文档中正式加入 `design-confirmed gate`
4. 后续再把 `confirmation-record` 扩到 AI 回写确认和实现承接确认

## 9. 用户诉求回查

- 用户诉求：结合埋点项目实施情况做提炼
  - 当前状态：`partial`
  - 说明：确认链已从经验问题提升为正式平台对象定义，但还未进入运行时实现

- 用户诉求：处理 PMAIOS v0.7 及遗留项
  - 当前状态：`partial`
  - 说明：本文件已直接服务 `Gate Runtime traceability` 深化，但旧 in-progress 任务清洗还未开始
