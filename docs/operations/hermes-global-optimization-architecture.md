# Hermes Global Optimization Architecture

- version: v0.2
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

这份文档把 `Hermes` 从局部增强器提升为平台级能力。

当前真正的问题不是某一个设计 prompt 不够好，而是：

- 默认方案会老化
- 旧判断会在多个模块里长期残留
- 系统缺“持续吸收最新信息并更新默认”的统一层

因此 `Hermes` 不应只服务设计，也不应只停留在提示层。

`Hermes` 应成为：

`PMAIOS 的全局寻优与最新信息集成层`

## Core Definition

`Hermes` 负责的不是直接替代主流程执行，而是：

1. 持续吸收外部最新信息
2. 比较候选方案
3. 对默认方案做 keep / replace / park 判断
4. 把判断推进到版本、模板、默认栈、运行时规则
5. 监控旧默认是否已经过期

## Five Responsibilities

### 1. Hermes Research

- 最新信息集成
- 官方文档刷新
- 生态变化扫描
- 新能力 / 新风险 / 新替代项识别

### 2. Hermes Compare

- 统一比较候选方案
- 比较适用场景、迁移成本、兼容性、AI 可读写性、长期复用价值

### 3. Hermes Judge

- 输出 `keep / replace / promote / park / reject`
- 记录 reason / confidence / impacted scope / next action

### 4. Hermes Promote

- 把寻优结果推进到平台真源
- 可落点包括版本规划、默认栈、gate 规则、scheduler 策略、retrieval governance

### 5. Hermes Watch

- 监控当前默认是否已经老化
- 识别应该升级、降级或替换的默认值

## Platform Scope

`Hermes` 至少应覆盖：

1. UI/UX 基线
2. Product Chief 输出链
3. 多 agent 协作协议
4. gate / scheduler / runtime 策略
5. retrieval / knowledge source 选择
6. model / provider / tool routing
7. subproject workflow adoption
8. 版本 backlog 优先级
9. 部署与宿主壳策略

## Relation To Kernel

`Hermes` 给优化判断，`Kernel` 负责实际执行与落地。

所以：

- `Hermes` 不应直接替代 task scheduler
- `Hermes` 不应绕过 gate 强制执行
- `Hermes` 不应因为“新”就替换稳定主线

## v0.6 Minimum Requirement

`v0.6` 阶段至少要做到：

1. 明确 Hermes 是全局层
2. 至少有一个“最新信息集成”入口
3. 至少有一个“候选比较 -> promote to truth-source”闭环
4. 至少能覆盖 UI/UX、provider、workflow 三类对象

## User-Requirement Backcheck

- Hermes 从设计局部能力提升为平台级优化层：`solved`
- “最新信息集成”被正式挂入 Hermes 职责：`solved`
- 真正自动化运行的 Hermes 全局循环：`partial`
## Current Promote Baselines

褰撳墠 `Hermes` 宸茬粡鍦?repo 鍐呯殑 policy report 涓浐鍖栦簡绗竴鎵归潪澶栭儴宸ュ叿鍨嬪姣旓紝鍗虫帴鏀?PMAIOS 鍐呴儴鍩虹嚎鐨?keep / promote 鍒ゆ柇锛?

1. `uiux-stack-baseline`
   - keep `Next.js App Router + Tailwind + shadcn/ui + Radix`
2. `design-delivery-chain`
   - promote `concept image2 -> html direction -> ui-schema -> delivery pack`
3. `runtime-mainline`
   - promote `Task SSOT + Gate + Scheduler + Continuation runtime`
4. `gate-traceability-mainline`
   - promote `Task SSOT gate history + proof-of-work gate events`
5. `design-governance-baseline`
   - promote `DESIGN.md + design-confirmed gate + ai-writeback-confirmation`

杩欒鏄庯細`Hermes` 鐜板湪宸茬粡涓嶅彧鏄€滄壘鏂颁笢瑗裤€濓紝鑰屾槸寮€濮嬪骞冲彴鑷繁鐨勪富绾垮畬鏁村害鍋氭寔缁瘮杈冧笌鎻愬崌鍒ゆ柇銆?
