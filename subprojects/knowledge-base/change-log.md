# 知识库项目 Change Log

## 2026-04-23

- 新增 `docs/Dataki-v1.1首版定义.md`，把 Dataki 首版的产品范围、品牌口径、小闪对接、三类知识范围和架构冲突收敛成新的真源。
- 新增 `docs/Dataki-v1.1组件库与小闪登录对齐说明.md`，把在线组件库、YKUI 本地索引和“小闪登录快”登录约束显式写成设计与实现红线。
- 新增 `docs/Dataki-v1.1前台文件接管与组件映射.md`，把 `Login.vue`、`platform/index.vue`、`chat/index.vue` 的 Dataki 接管方向与组件库映射明确到文件级。
- 新增 `docs/Dataki-v1.1设计出图与确认清单.md`、`docs/Dataki-v1.1页面清单与页面流.md`、`docs/Dataki-v1.1统一资产模型与权限模型.md`、`docs/Dataki-v1.1前后端任务拆分表.md`、`docs/Dataki-v1.1本地Demo验收清单.md`、`docs/Dataki-v1.1分支保存与回退机制.md`，对应你要求的 1-7 项执行产物。
- 识别并吸收 `Dataki_brand_pack (1).zip` 与 `Dataki_ui_specs.zip` 内的品牌规范、Tokens、首页 UI 结构与 Vue 组件规范，作为 Dataki 首版设计输入。
- 接通并确认 `http://10.236.15.36:6006/` 组件库可访问，且仓库内已有 `docs/design-review/ykui-index.json` 可作为本地组件镜像索引使用。
- 明确首版范围从旧文档中的多知识范围口径收敛为 `个人 / 部门 / 公司` 三类，并把“小闪开发者密钥待明天提供”记录为外部依赖而非需求未定。
- 新增 `docs/WeKnora二开准备与PMAIOS-v0.5收敛方案.md`，把知识库项目的 WeKnora 二开准备与 PMAIOS v0.5 收敛要求写成统一真源。
- 新增 `docs/WeKnora开工条件检查清单.md`，把环境、扫描、技能、门禁和架构边界转成显式检查项。
- 新增 `tools/weknora-prep-scan.mjs`，用于生成 WeKnora 文件树、模块摘要、前后端路由和扫描报告。
- 新增 `config/skill-registry.json`，为 knowledge-base 子项目补齐 repo bootstrap、code graph、design review、task decompose、test regression、release gate 六类准备技能。
- 更新 `subproject.json`，把 knowledge-base 子项目接入专用 skill registry。
- 重写 `docs/README.md`，增加稳定的准备入口和扫描入口。
- 补齐 `project-board.svg`、`roadmap-board.svg`、`decision-board.svg`，让 knowledge-base 子项目更符合 PMAIOS v0.5 的项目入口约定。
- 实测 `docker compose up -d`：Docker Desktop 可用，但镜像拉取被外部网络/代理阻断，尚未完成容器栈启动。
- 根据最新确认，将知识库项目的 WeKnora 路线收敛为“继续走容器 + 前台沿用 WeKnora 现有壳推进改造”。
- 新增 `docs/WeKnora前台沿用接管方案.md`，把路由、菜单、平台容器、知识库列表、建聊页、聊天页的接管切口显式化。
- 新增 `docs/WeKnora容器启动依赖清单.md`，把 compose 关键镜像和当前网络阻塞点列成执行清单。
