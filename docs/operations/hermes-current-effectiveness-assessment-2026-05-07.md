# Hermes 当前生效度评估（2026-05-07）

- version: v0.1
- date: 2026-05-07
- status: active
- owner: product office

## Purpose

这份文档回答一个明确问题：

`Hermes 作为 PMAIOS 平台能力，当前到底生效了多少？`

这里不按“是否存在 Hermes 页面或文档”判断，
而按 Hermes 在平台真源中定义的职责闭环来判断真实生效度。

## Evaluation Denominator

本次按 5 类职责作为分母：

1. `Research`
2. `Compare`
3. `Judge`
4. `Promote`
5. `Watch`

## Current Overall Judgment

### Platform View

`Hermes minimum loop 已生效`

### User-Value View

`Hermes 对真实交付效率的帮助仍然只是部分生效`

### Current Effective Coverage

`约 88%`

这不是“全部完成度 85%”，而是：

- compare / judge 最小闭环已成立
- runtime governance 已经落地
- structured research findings / auto promotion / watch history 已经落地
- 自动外部研究执行 / 跨项目默认复用 仍未完全落地

## Category Assessment

### 1. Research

- 状态：`partial`
- 已生效：
  - retrieval governance 检查
  - open-source-first 证据检查
  - latest-information baseline drift 检查
  - Dataki 默认知识库上下文治理检查
  - structured research findings candidate pool
- 未生效：
  - 自动外部研究执行
  - 自动候选方案抓取
  - 自动跨域候选池
- 当前判断：`60%`

### 2. Compare

- 状态：`solved`（minimum-loop 层）
- 已生效：
  - UIUX stack baseline compare
  - design delivery chain compare
  - runtime mainline compare
  - gate traceability baseline compare
  - design governance baseline compare
- 当前判断：`80%`

### 3. Judge

- 状态：`solved`（minimum-loop 层）
- 已生效：
  - `keep / promote / park` 结构化判断
  - enhancement 与 promotion recommendation 输出
- 当前判断：`75%`

### 4. Promote

- 状态：`solved`（runtime governance 层）
- 已生效：
  - promote recommendation
  - promote target path
  - promote baseline suggestion
  - repeat-correction candidate -> requirement pool promotion API
  - comparison `promote / replace` -> governed requirement auto promotion
  - governed requirement active-state writeback
  - workflow / prompt / template / operations-doc default writeback targets
  - writeback target -> governed execution task materialization
  - per-target closure evidence return
- 未生效：
  - 平台默认值替换仍不是全自动全域生效
- 当前判断：`80%`

### 5. Watch

- 状态：`partial`
- 已生效：
  - baseline stale / missing / inactive 检查
  - workspace 可见 Hermes policy report
  - workspace 可见 v0.7 runtime governance snapshot
  - 重复纠正候选识别
  - repeat-correction promoted-to-requirement check
  - Product Chief multi-agent review usable-loop check
  - skill-effectiveness-check
  - design-tool-effectiveness-check
  - component-reuse-memory
  - structured watch findings with carried unresolved items
  - compare result park/reject watch
  - unresolved checks -> governed rectification task requirements
  - completed writeback tasks -> closure evidence recovery
  - cross-run recurrence memory / stable-run counting / low-signal suppression
- 未生效：
  - 跨项目默认复用仍未完全稳定
- 当前判断：`88%`

## Why User Perception Still Feels Weak

从 `tracking-acceptance` 三天实施反馈看，用户真正期待的 Hermes 价值不是：

- 会出一份 policy report
- 会做一次 baseline compare

而是：

1. 按阶段切换不同专业工作模式
2. 自动读取并执行 UI 规范
3. 吸收重复纠正，不再反复说
4. 用过的组件后续默认复用
5. 做完一个项目，其他项目沿用同样方法

这些能力此前都没有进入真实 runtime。当前已经有第一层运行时落地，但还没形成足够强的默认自动化。

## Final Conclusion

当前 Hermes 应被判断为：

`已经从“运行时可见态”推进到“带 research/promote/watch 闭环的 agent layer”，但尚未进入“自动外部研究 + 跨项目默认替换”的最终态。`

更直白地说：

- 作为平台能力：`solved`
- 作为用户效率放大器：`partial`

## Required Next Capabilities

### P0

1. `stage-agent orchestration`
2. `ui-spec-activation-gate`
3. `repeat-correction-memory`

### P1

4. `component reuse memory`
5. `skill-effectiveness-check`
6. `design-tool-effectiveness-check`

## Current Back-Check

- Hermes minimum loop 是否已落地：`solved`
- Hermes 是否已成为真实高效率平台能力：`partial`
- Hermes 是否已解决“说一次不再说第二次”：`partial`

## 2026-05-08 Delta

本轮新增：

1. `research findings`
   - Hermes 不再只做 check，而会产出结构化 research candidate pool
2. `auto promotions`
   - 对 `promote / replace` 类比较结果，Hermes 现在会自动写入 governed requirement candidate，并激活到 requirement pool
3. `watch findings`
   - Hermes 现在会记录未解决检查项、park/reject 结论、以及已完成 auto-promotion 的持续观察对象
   - 未解决检查项现在会自动落成 governed rectification task requirement，而不是只停在 watch 提醒
4. `system-state knowledge grounding`
   - Hermes 现在会读取平台或子项目的 Dataki 默认知识库上下文，并把它纳入 runtime governance 与 research finding，避免系统现状知识继续停留在手动 side lookup
5. `default-KB retrieval summary`
   - Hermes 现在会基于默认知识库执行 system-state retrieval，并把 query / result count / excerpt summary 一并写回 research finding，避免“挂了知识库但没有真正进入治理闭环”
6. `default writeback closure targets`
   - `promote / replace` 结果现在会带出 workflow / prompt / template / operations 文档级默认回写目标，避免 Hermes 只知道“该推广”，却不知道该改哪一层真源
7. `governed writeback execution`
   - 默认回写目标现在会继续落成 governed execution task，并在完成后把 closure evidence 反向带回 Hermes report / watch finding
8. `committee / proof / operator closure surface`
   - Hermes 的 writeback/watch 状态现在会继续进入 committee summary、proof-of-work acceptance evidence 和 operator attention，避免闭环状态只存在于原始 Hermes report
9. `operator-triggered loop closure`
   - proof/operator 面现在可直接触发 `close-hermes-loop`，按当前 run 的 repo 产物关闭可确认的 writeback/watch task，并即时刷新 Hermes 治理结果
10. `cross-run watch memory`
   - Hermes watch 现在会保留 recurrence count、stable-run count、first/last seen 时间，并对连续重复的低信号提醒做降噪，避免每次 run 都把同一类 parked/pending 项重新当成新问题

因此当前 Hermes 更接近：

`enhance-only guardrail 内相对完整的优化 agent`
