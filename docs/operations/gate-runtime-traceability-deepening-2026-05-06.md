# v0.7 Gate Runtime Traceability 深化定义

- version: v0.1
- date: 2026-05-06
- status: active
- scope: PMAIOS platform runtime
- purpose: 把 `Gate Runtime actionability` 从“能点动作”推进到“每个 gate 动作都有 Task SSOT / history / proof-of-work 可追溯写回”

## 1. 当前问题

`v0.7 minimum loop` 已经具备：

1. gate 汇总可见
2. review / truth-backwrite 相关 gate 可操作
3. proof-of-work 能显示 gate summary

但现在还差一层深化：

1. gate 动作还不够像正式治理事件
2. `blocked / ready / rework / confirmed` 的写回对象还不够统一
3. 设计确认、AI 回写确认这类事件还没被纳入同一 traceability 口径

因此下一步不是再加按钮，而是把 gate action 变成历史可审计对象。

## 2. 深化目标

每一次 gate action 都应至少回答：

1. 谁触发了动作
2. 针对哪个 gate
3. 作用于哪个 Task SSOT 对象
4. 导致了什么状态变化
5. 证据路径是什么
6. 是否写入 proof-of-work

也就是：

`gate action -> task ssot mutation -> history record -> evidence link -> proof-of-work visibility`

## 3. 最小 trace event 模型

建议把 gate 历史收口为统一事件：

```json
{
  "id": "gate-event-xxx",
  "taskId": "task-xxx",
  "gateId": "design-confirmed-gate",
  "action": "confirm",
  "fromStatus": "blocked",
  "toStatus": "ready",
  "actorRole": "product-chief",
  "artifactRefs": [
    "docs/operations/confirmation-chain-object-and-gate.md"
  ],
  "evidenceRefs": [],
  "recordedAt": "2026-05-06T00:00:00+08:00",
  "summary": "visual-ui layer confirmed and static-html stage unlocked"
}
```

## 4. 四类关键状态的统一写回对象

### 4.1 `blocked`

必须写回：

1. Task SSOT 当前 gate 状态
2. 阻塞原因
3. 需要哪个对象被补齐或确认
4. 最近一次相关 gate event

### 4.2 `ready`

必须写回：

1. 已满足的前置条件
2. 可继续推进的下一个目标
3. 对应解锁事件

### 4.3 `rework`

必须写回：

1. 被谁打回
2. 打回对象是谁
3. 需要重做哪一层
4. 是否使下游状态失效

### 4.4 `confirmed`

必须写回：

1. 确认对象
2. 确认层级
3. 确认角色
4. 解锁目标
5. 最新证据路径

## 5. 哪些 gate 事件应优先纳入

优先顺序建议：

1. `design-confirmed gate`
2. `asset-backwrite gate`
3. `review-convergence gate`
4. `project-truth gate`

原因：

1. 这四类已经是当前主链里的高频真实动作
2. 其中前两类和 `tracking-acceptance` 的问题模式直接相关
3. 它们能最快改善 proof-of-work 和 continuation 的真实可读性

## 6. 与本轮新增对象的挂接

### 6.1 与确认链对象

`design-confirmed gate` 的 `confirmed / rework-required / pending` 应直接引用：

1. `confirmation-record`
2. `design-confirmation-record`

### 6.2 与 `DESIGN.md`

`design-language-ready` 的 `pass / block` 应直接引用：

1. `DESIGN.md`
2. 当前适用范围
3. 是否覆盖目标页面家族

### 6.3 与 AI 回写对象

后续 `ai-writeback-confirmation` 应作为 gate event 的一类，而不是聊天结果附带状态。

## 7. 对 proof-of-work 的直接影响

`proof-of-work bundle` 后续应补三块：

1. 最近 gate events
2. 当前仍阻塞的 gate 列表
3. 最近一次 `confirmed / rework` 事件摘要

否则 proof-of-work 仍更像汇总面板，而不是验收链证据包。

## 8. 推荐实现顺序

如果后续进入 runtime 实现，建议顺序是：

1. 先补 gate event schema
2. 再让 Task SSOT 吸收 gate history
3. 再把 `design-confirmed gate` 和 `design-language-ready` 接入
4. 最后把 proof-of-work bundle 扩成可见摘要

## 9. 用户诉求回查

- 用户诉求：处理 PMAIOS v0.7
  - 当前状态：`partial`
  - 说明：Gate Runtime traceability 已从待办提升为明确定义，但还未进入代码实现

- 用户诉求：结合埋点项目实施情况做提炼
  - 当前状态：`partial`
  - 说明：埋点项目里暴露的确认/回写问题已经反向进入 Gate Runtime 深化定义
## 10. 第一段实现回写

当前仓库代码已完成第一段最小落地：

1. `Task SSOT` 新增 `gateHistory`
2. workflow-run task 会从 workflow event log 吸收第一批 gate 事件
3. shared-context task 会从 checkpoint 吸收第一批 gate 事件
4. `proof-of-work bundle` 新增：
   - `gateHistory.total`
   - `gateHistory.recentEvents`
   - `gateHistory.blockedGates`

这意味着当前平台已经从“只有 gate summary”推进到“至少能看到最近 gate 动作痕迹与当前阻塞 gate 列表”。

但这仍只是第一段，不应高估为 fully solved。还没落地的剩余项包括：

1. `design-confirmed gate`
2. `design-language-ready`
3. `ai-writeback-confirmation`
4. 更完整的 actor / evidence / proof 链路 UI 可视化

## 11. 本轮回查

- 用户诉求：回到 PMOS 平台主线
  - 当前状态：`partial`
  - 说明：
    - 已回到 `v0.7` 主线优先顺序
    - 已优先落地 `Gate Runtime traceability` 第一段代码
    - `Hermes compare/promote` 仍保留为后续主线下一段，而不是被放弃
## 12. Hermes compare/promote 宸叉帴鍏?gate traceability 涓?design governance

鍦ㄨ繖涓€杞?`PMOS` 涓荤嚎缁х画鎺ㄨ繘鏃讹紝`Hermes compare/promote` 宸蹭笉鍐嶅彧鍋滅暀鍦?UI/UX 鍩虹嚎銆佽璁¤緭鍑洪摼銆乻tructured runtime 杩欎笁绫诲姣斻€?

褰撳墠宸叉柊澧炰袱涓寮?comparison锛?

1. `gate-traceability-mainline`
   - current: `gate summary only`
   - candidate: `Task SSOT gate history + proof-of-work gate events`
   - decision: `promote`
   - promote target: `docs/operations/gate-runtime-traceability-deepening-2026-05-06.md`

2. `design-governance-baseline`
   - current: `design outputs without unified confirmation and design-language gates`
   - candidate: `DESIGN.md + design-confirmed gate + ai-writeback-confirmation`
   - decision: `promote`
   - promote target: `docs/operations/confirmation-chain-object-and-gate.md`

杩欎釜鍙樺寲鐨勬剰涔夋槸锛?

1. `Hermes` 寮€濮嬪皢 `v0.7` 鍚庣画娣卞寲鏈€閲嶈鐨勪袱鏉′富绾匡細`gate traceability` 涓?`design governance` 鏀惰繘鍚屼竴濂?compare/promote 鍒ゆ柇鍙ｅ緞
2. `Hermes` 涓嶅啀鍙鈥滃閮ㄦ柊鏂规鈥濆仛姣旇緝锛屼篃寮€濮嬪鍐呴儴骞冲彴鍩虹嚎鐨勫畬鏁村害鍋?keep / promote 鍒ゆ柇
3. `Gate Runtime traceability` 涓嶅啀鍙槸涓€浠藉瓟妗堟垨涓€娈典唬鐮侊紝鑰屾槸宸茬粡杩涘叆 `Hermes` 鏈轰細鎸佺画淇濇寔鐨勫钩鍙板熀绾?

## 13. 鏈疆鍥炴煡

- 鐢ㄦ埛璇夋眰锛氬洖鍒?PMOS 骞冲彴涓荤嚎
  - 褰撳墠鐘舵€侊細`partial`
  - 璇存槑锛?
    - `Gate Runtime traceability` 绗竴娈典笌 `design / writeback gate history` 宸插叆浠撳簱浠ｇ爜
    - `Hermes compare/promote` 宸叉帴鍏?`gate traceability` 鍜?`design governance` 涓ゆ潯涓荤嚎鍩虹嚎
    - 浣嗚繕鏈揣鍙婃洿瀹屾暣鐨?actor / evidence / proof 鎴栨洿绮剧粏鐨勫墠鍙板睍绀?
## 14. Operator-visible actor / evidence / proof

`proof-of-work` 鐨?recent gate events 宸插啀鍓嶈繘涓€姝ワ細

1. 鏄剧ず `actorRole`
2. 鏄剧ず `recordedAt`
3. 鏄剧ず `artifactRefs`
4. 鏄剧ず `evidenceRefs`

杩欒 `gateHistory` 涓嶅啀鍙槸绠€鍗曠殑鈥滄湁浜嬩欢鈥濓紝鑰屾槸鍙互鐩存帴璇诲埌鈥滆皝鍦ㄤ粈涔堟椂鍊欏洜涓哄摢涓瘉鎹仛浜嗗摢娆?gate 鍔ㄤ綔鈥濈殑杩愯璇佹嵁灞傘€?
## 15. Proof-of-work latest decision event

`proof-of-work bundle` 鐜板湪涓嶅彧鏈?recent events 鍒楄〃锛岃€屼笖鏂板浜?`latestDecisionEvent`锛屽叏灞€鍦ㄩ獙鏀跺寘灞備笂鏄剧ず鏈€杩戜竴娆″叧閿?gate 鍒ゆ柇锛?

1. 鏄摢涓?gate
2. 鍒ゆ柇鍒颁簡 `pass` 杩樻槸 `block`
3. 璋佸仛鍑鸿繖娆″垽鏂?
4. 浠€涔堟椂鍊欒褰?

杩欒 proof-of-work 寮€濮嬪叿澶囨洿鎺ヨ繎鈥滈獙鏀剁粨璁衡€濈殑涓€涓皬闂幆锛屼笉鍐嶅彧鏄妸鍘嗗彶浜嬩欢鍏ㄩ儴鍫嗗湪涓€璧风瓑浜虹溂鑷繁鍒ゆ柇銆?
