# PMOS 与其他子项目清理判断

- version: v0.2
- date: 2026-05-08
- status: active
- scope: PMAIOS platform and non-tracking subprojects

## 1. 这份文档解决什么

这份文档用于回答：

1. 哪些旧任务应该继续推进
2. 哪些旧任务只需要补 closure，不应按原 label 继续跑
3. 哪些子项目当前不应进入主执行线

## 2. 当前平台判断

平台当前正式主线仍然是：

1. `PMAIOS v0.7`
2. `Hermes` 完整治理闭环
3. 平台默认产品工作流和评审治理深化
4. 页面与文档真源去漂移

因此，旧任务判断不再按“它是否曾经活跃”来定，而按：

- 是否仍服务于当前平台主线
- 是否已被新真源覆盖
- 是否值得继续投入

## 3. 任务分类规则

### `continue`

仍与当前平台或活跃子项目主线直接相关，应继续推进。

### `closure-only`

结果已经被后续真源吸收，但共享任务状态仍未关闭，应补 closure，不应沿旧 label 继续执行。

### `archive-or-park`

当前不应继续投入，但可以保留为历史参考或未来重启素材。

## 4. 子项目判断

### 应继续关注

1. `knowledge-base`
   - 原因：仍是平台 workflow adoption、Dataki / WeKnora 研究和知识底座的重要承接点
2. `chokonu`
   - 原因：已有较完整的子项目真源与活跃上下文
3. `cozeloop`
   - 原因：已有相对成熟的 plan / functional spec / deployment truth，可继续按当前真源推进

### 只做 closure，不沿旧任务续跑

1. 历史 `PMAIOS v0.5 / v0.6` 平台旧任务
2. 历史 `knowledge-base / WeKnora / Dataki` 分析任务
3. `ChoKoNu` 早期收口任务
4. 临时性恢复类任务

### 当前应 park 或降级观察

1. `ad`
2. `server`
3. `mcp`
4. `data-service`
5. `ad-intelligence`

这不是说它们“没价值”，而是它们当前不应抢占平台 v0.7 主线注意力。

## 5. PMOS 自身的清理结论

当前对 PMOS 的判断：

1. `v0.7` 是唯一有效平台版本叙事
2. 历史平台任务不应与当前 backlog 混跑
3. `Hermes` 继续保留为平台 active line
4. PMOS 文档、页面和全景图应统一回到 `v0.7` 真源口径

## 6. 本轮已吸收的结果

本轮已明确吸收到 PMOS 真源的内容包括：

1. `pmaios-introduction.md`
2. `PMAIOS_product_management_agent_operating_model.md`
3. `pmaios-v0.7-direction.md`
4. `pmaios-runtime-panorama-v0.7.svg`
5. `frontend-workbench-antipattern-ban.md`

## 7. 用户诉求回查

- 用户诉求：先不动埋点主线，先处理 PMOS 和其他子项目
  - 当前状态：`solved`
  - 说明：平台主线、清理规则、文档真源和页面反漂移工作已在 PMOS 侧继续收口
