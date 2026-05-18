# SDD 与 Superpowers 测试协议

- version: v0.1
- date: 2026-05-11
- status: active
- scope: PMOS 平台、所有子项目、前端最终交付页、Codex 默认执行路径

## 目的

把 `SDD` 与 `Superpowers` 从“外部理念”压成 PMOS 当前可执行的默认测试协议。

这里的定义固定为：

- `SDD`
  - `Specification-Driven Delivery`
  - 先规格、后实现、再按规格验收
- `Superpowers`
  - prompt 增强、上下文增强、工作流增强、工具增强
  - 只能提高产出效率和质量
  - 不能替代规格、测试、浏览器验收、最终状态验证

## 核心结论

PMOS 现在的默认交付顺序必须是：

`spec -> implementation -> automated checks -> real browser regression -> final-state validation -> user review`

而不是：

`idea -> page -> 用户自己测`

## SDD 规则

每个重要交付必须先有规格对象，再允许进入实现。

最小规格集合：

1. requirement refs
2. functional spec refs
3. ui-schema refs
4. route / layout shell
5. target roles
6. data refs
7. component bindings
8. state matrix
   - loading
   - empty
   - error
   - permission
   - success
9. acceptance matrix

如果以上关键项缺失，任务只能算 `candidate`，不能算 `delivery-ready`。

## Superpowers 规则

`Superpowers` 在 PMOS 中只承担增强层，不承担验收层。

允许承担：

- prompt refinement
- context injection
- route suggestion
- implementation acceleration
- artifact generation
- regression organization

禁止承担：

- 替代 requirement / functional spec
- 替代真实浏览器测试
- 替代 final-state validation
- 替代 testing agent
- 替代 proof-of-work evidence

## 默认测试阶梯

PMOS 默认要求至少经过这四层：

### 1. 规格一致性检查

确认实现对象与以下真源一致：

- requirement
- functional spec
- ui-schema
- design system baseline
- component binding rule

### 2. 自动化工程检查

最少应跑：

- build
- unit / focused regression
- relevant service/runtime tests

### 3. 自动验收

对于前端或最终页面相关任务，必须跑：

- `frontend-browser-verification`
- `auto-acceptance`
- `final-state validation`

未通过不得进入用户首轮验收。

### 4. 真实页面回归

对最终交付页，必须做多轮真实浏览器回归，而不是只跑一轮。

默认最小要求：

- desktop: `3` 轮
- mobile: `2` 轮

如果页面涉及复杂状态、异步数据、分步动作、批量操作，轮次应继续上调。

## 前端页面专属规则

前端页面默认遵循：

`ui-schema -> implementation-handoff -> implementation -> auto-acceptance -> multi-run browser regression`

硬规则：

1. 不能只跑一次浏览器测试就算通过
2. 不能只跑静态截图对比就算通过
3. 不能把用户人工测试当首轮测试
4. 不能用 prompt 说“应该没问题”代替真实验证
5. 不能跳过 desktop / mobile 双视口

## 交接物要求

每次交付必须显式给出：

- spec refs
- acceptance matrix
- executed commands
- pass/fail summary
- browser regression rounds
- remaining known risks

## 不通过判定

任一情况成立，都不能算完成：

1. 没有 spec refs
2. 没有 acceptance matrix
3. 没有自动验收结果
4. 没有真实浏览器回归
5. 只有一轮浏览器测试且无理由
6. 先给用户看，再补测试
7. 只有 Superpowers 增强痕迹，没有真实验证证据

## 与 OpenSpec / Superpowers 的边界

PMOS 不在仓内重造完整的 OpenSpec / Superpowers 产品。

但 PMOS 必须吸收它们在当前仓内最有价值的行为原则：

- spec-first
- acceptance-first
- enhancement-is-not-evidence
- prompt-power-does-not-cancel-proof

## 当前默认结论

从现在开始，PMOS 的严格测试口径应被理解为：

`SDD 先行，Superpowers 增强，自动验收强制，多轮真实回归必跑，用户只看通过后的结果。`
