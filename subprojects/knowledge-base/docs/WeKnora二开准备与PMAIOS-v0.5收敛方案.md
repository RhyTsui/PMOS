# WeKnora 二开准备与 PMAIOS v0.5 收敛方案

- 版本：v0.5
- 日期：2026-04-23
- 状态：进行中
- 适用范围：`subprojects/knowledge-base` 在进入 WeKnora 业务二开前的准备阶段

## 1. 收敛后的问题定义

这轮工作的真实目标不是“马上改 WeKnora 业务功能”，而是先把知识库项目补成一个可开工、可验证、可回滚、可长期迭代的二开工程包。

对应到仓库语境，当前要解决的是三层问题：

1. `knowledge-base` 子项目缺少专门面向 WeKnora 二开的准备包，现有文档多，但没有稳定开工入口。
2. PMAIOS v0.5 已经具备共享上下文、技能注册、版本治理、人读层等基础能力，但还没有下沉到知识库二开场景。
3. WeKnora 本体已经进仓，但“代码扫描、环境验证、架构边界、冲突确认”还没有形成执行闭环。

## 2. 当前现状

### 2.1 已具备的底座

- PMAIOS 已有 `session-state`、`mcp-context`、`task/checkpoint`、版本进度、技能注册、工作流和人读层入口。
- `knowledge-base` 已有 WeKnora 适配评估、v1.1 二开计划、研发任务单、权限分析和 SVG 资产。
- WeKnora 源码已落在 `subprojects/knowledge-base/WeKnora/`，不是纸面方案。

### 2.2 当前缺口

- 缺 WeKnora 二开前的统一准备真源。
- 缺可执行的代码扫描与证据产物。
- 缺知识库子项目专用技能入口，无法把“准备阶段能力”挂到 PMAIOS skill registry。
- 缺项目入口层的 roadmap / decision / change-log 资产，子项目仍是 partial adoption。
- 缺环境结论：能不能直接开工、卡在哪一层、哪些安装必须补。

## 3. 分母进度

### 3.1 准备包分母

- total tracked items: `8`
- solved: `6`
- partial: `1`
- blocked: `1`
- still missing placement: `0`

当前分母：

1. 准备真源文档
2. 开工条件检查清单
3. 代码扫描脚本
4. 首批扫描产物
5. 子项目技能入口
6. 项目入口板补齐
7. 环境启动验证
8. 架构影响与冲突确认

### 3.2 当前判断

- `1` 已解决：本文件即为统一准备真源。
- `2` 已解决：见 `WeKnora开工条件检查清单.md`。
- `3` 已解决：新增 `tools/weknora-prep-scan.mjs`。
- `4` 已解决：首批扫描产物已生成到 `docs/scan/`。
- `5` 已解决：补充 knowledge-base 子项目专用 skill registry。
- `6` 已解决：`project-board / roadmap-board / decision-board / change-log` 已补齐。
- `7` 阻塞：Docker 可用，但镜像拉取被外部网络/代理阻断。
- `8` 部分完成：已有初步判断，前台接管入口已收敛，但平台归属仍待后续实现阶段继续细化。

## 4. 架构影响评估

### 4.1 对现有 PMAIOS 架构的影响

低影响：

- 新增准备文档、扫描脚本、子项目 skill 配置。
- 新增项目入口板和 change-log。
- 这些变更都属于外挂式扩展，不会改动平台主运行内核。

中影响：

- 若后续把代码扫描接入 PMAIOS CLI/API，需要决定它属于 `knowledge-base` 子项目能力，还是平台级 code graph 能力。
- 若把 WeKnora 开工条件检查并入版本门禁，需要和现有 `review / release / rollback` 治理链路做映射。

高影响：

- 已确认短期沿用 WeKnora 前端壳推进知识库工作台，但这只能视为知识库子项目阶段性壳层，不应直接上抬为 PMAIOS 全局产品壳。
- 若把 WeKnora 前端、会话、Agent、IM、模型配置直接固化为最终平台壳，会与 PMAIOS 既有的 Chat、Prompt、Runtime、治理层边界冲突。
- 若把 WeKnora 的 organization / tenant / share 权限模型直接抬升为平台唯一权限模型，会影响其他子项目的一致性。

### 4.2 对 knowledge-base 子项目架构的影响

正向影响：

- 把“研究优先”从口头原则变成开工前必过的工程门槛。
- 让 v1.1 二开计划不再直接跳到页面和功能，而是先落代码扫描、环境验证、架构边界。
- 让二开准备可以复用到后续长周期项目，而不是只服务这一次 WeKnora。

新增边界：

- `WeKnora` 当前定位升级为“知识引擎候选底座 + 知识库子项目阶段性前台壳”，不是 PMAIOS 的默认全局产品壳。
- 代码扫描完成前，不直接改主业务模块。
- 环境验证失败时，不把“启动不起来”误判为“方案不可行”。

## 5. 安装与环境结论

### 5.1 已确认可用

- `node`
- `npm`
- `docker`
- `docker compose`

### 5.2 当前缺口

- 本机 `go` 命令不可用，因此不能直接按源码模式编译 WeKnora Go 后端。
- `python` 仅看到 Windows App Execution Alias，是否为真实可用解释器仍未确认。

### 5.3 已验证的阻塞

- `docker compose up -d` 在 `subprojects/knowledge-base/WeKnora` 下已执行。
- Docker Desktop 本身可用。
- 实际阻塞点是 Docker Hub 镜像拉取失败，错误指向“无 HTTPS proxy / 无法连接 registry-1.docker.io”。

结论：

- 当前不是仓库结构问题。
- 当前已明确走容器路线，不再切到源码编译路线。
- 当前阻塞是“外部镜像访问/代理问题”，必须先解决镜像源或代理。
- 只要网络侧打通，就可以继续按容器方式启动 WeKnora。

## 6. 建议执行顺序

### P0：准备阶段

1. 固化准备文档和检查清单
2. 执行代码扫描并落首批证据
3. 打通 Docker 镜像代理或镜像源
4. 按已确认定位推进 WeKnora 在知识库子项目中的接管

### P1：底座 PoC

1. 跑通最小容器环境
2. 验证知识导入、检索、引用返回
3. 只做能力映射，不做业务页面重构

### P2：平台接缝

1. 定义资产对象、权限对象、消费绑定对象
2. 确认知识中台与 Chat / Prompt / Agent Runtime 的边界
3. 评估哪些 WeKnora 路由保留，哪些只作为内部能力

### P3：产品化二开

1. 再进入首页、主对话框、知识资产、提示词资产等 v1.1 结构改造
2. 引入测试、diff、回滚、发布门禁

## 7. 当前需要你确认的冲突

### 冲突 1：容器外部依赖

当前路线已确认走容器，实际阻塞只剩镜像访问。

需要在执行层继续解决：

- Docker Desktop 代理配置
- Docker Hub 可访问镜像源
- 必要镜像的预拉取或离线导入策略

### 冲突 2：平台归属

待确认：

- Prompt / Chat / Agent Runtime / 权限控制面，哪些必须归平台层
- knowledge-base 子项目哪些能力可以临时承接

## 8. 回查到原始用户需求

- 用户需求：为知识库项目二开 WeKnora 做准备工作，并提升长周期迭代能力 -> `partial`
- 产品需求：形成 v0.5 级别的准备包、扫描、技能入口、项目入口与架构影响判断 -> `solved`

为什么用户需求还是 `partial`：

- 准备包、扫描器、技能入口、项目入口和前台接管方向都已落库。
- 但环境还没真正跑起来，容器网络问题仍未清除。
- “准备工作”已基本成型，“可运行的二开工作台”仍差容器栈启动。

## 9. 本轮输出

- 准备真源：`WeKnora二开准备与PMAIOS-v0.5收敛方案.md`
- 检查清单：`WeKnora开工条件检查清单.md`
- 前台接管：`WeKnora前台沿用接管方案.md`
- 容器依赖：`WeKnora容器启动依赖清单.md`
- 扫描工具：`tools/weknora-prep-scan.mjs`
- 子项目 skill registry：`config/skill-registry.json`
- 项目入口板：`project-board.svg`、`roadmap-board.svg`、`decision-board.svg`
- 项目变更记录：`change-log.md`
