# 2026-05-20 至 2026-05-27 工作日报与蒸馏

更新时间：2026-05-27

## 总览

本阶段工作横跨 PMOS、智投 Chat、小乔智投设计与实现收敛，主线从前期的能力规划、边界清理、UI 验收，推进到 5 月 26 日的小乔智投全景 Review、Master Spec、实施计划，以及后续会话区问题修复和本地历史数据清理。

核心结论：

- 小乔智投当前方向应收敛为 Fat MCP / Fat Skill + Thin Chat Runtime。
- Chat Runtime 只负责 Intent Router、Skill Router、参数补齐、结果展示、Timeline、Card Renderer。
- MCP / Skill 侧承载步骤、状态、失败原因、建议和 Workflow。
- 不优先建设复杂 Multi-Agent Runtime、Autonomous Agent、Recursive Agent、Self-Evolving Runtime、复杂 Planner。
- 会话标题规则控制面是后台 Prompt，不应写死在代码里。
- 会话消息区之外的前端组件样式已经经过特殊处理，后续默认禁止修改，除非单独提出。

## 2026-05-20

主题：行业文章采集服务与关键词设计找回。

主要处理：

- 找回行业文章采集服务与关键词设计。

沉淀：

- 这是行业情报 / 文章采集方向的恢复工作。
- 后续可服务于智投 Chat 的行业洞察、知识库、Skill 能力。
- 可作为“行业情报数据源与关键词体系”的早期基础。

## 2026-05-21

主题：PMOS v1.0 收口、边界清理与部署选型调研。

主要处理：

- 推进 PMOS v1.0 非页面待办收口。
- 继续处理剩余非页面待办 2/4/5/8/9/10/11。
- 删除部分不应继续推进的边界清理待办。
- 纠正待办边界：
  - 保留 PMOS vs Codex 边界问题。
  - 删除 Cloud mirror 对外发布方向。
- 处理 PMOS vs Codex 边界清理。
- 调研 PMOS 桌面客户端开源框架选型。
- 启动 PMOS Web 开源部署服务选型调研。

沉淀：

- 这一天核心是 PMOS v1.0 收尾和边界治理。
- 重点不是做新功能，而是清理任务边界、确认哪些方向继续、哪些方向删掉。
- PMOS vs Codex 边界被保留为重要问题。

## 2026-05-22

主题：智能体结构梳理与 GitLab 推送。

主要处理：

- 生成当前智能体结构全景图与交互示意图。
- 检查当日工作并推送到 GitLab。

沉淀：

- 这一天偏交付整理和结构表达。
- 重点是把当时的智能体 / 交互结构可视化，并完成版本同步。

## 2026-05-23

共享任务记录里没有明确创建于 2026-05-23 的任务。

说明：

- 可能是休整 / 非 Codex 记录工作。
- 也可能工作记录落在 5/22 或 5/24 的跨时区边界。
- 当前不凭空补日报。

## 2026-05-24

主题：智投 Chat UI 细节打磨与 PMOS 自动归档能力。

主要处理：

- 实现 PMOS plan archive 自动归档能力。
- 智投 Chat 反馈项集中修复：
  - 复制反馈单点优化与浏览器复核。
  - 附件后输入框按钮遮盖修复。
  - 对话内容与输入框宽度对齐。
  - 长横向内容支持左右滚动。
  - 主色 / 辅助色定义调整。
  - 菜单更多按钮默认隐藏、悬停展示。
  - 复制链接去除多余弹框。
  - 切换菜单闪动修复。

沉淀：

- 这一天主要是 UI 验收反馈收口。
- 重点是交互细节、视觉一致性、横向溢出和菜单行为。
- 这些样式后续应视为“已特殊处理区域”，默认不要再随意动。

## 2026-05-25

主题：小乔智投个人记忆、知识库隔离、问数系统化与包交付闭环设计推进。

主要处理：

- 推进“小乔智投个人记忆与知识库用户隔离”方向。
- 推进“问数系统化落地实施”方向。
- 推进“小乔智投包交付与问数闭环工程实施清单落地”。
- 梳理包交付、联调、问数、日报、数据查询等能力的工程边界。
- 形成多份实施评估 / 细节问题文档草稿，涉及：
  - 对话路由细节问题。
  - 项目权限细节问题。
  - 个人记忆与知识库细节问题。
  - 数据查询与报表细节问题。
  - 包交付与联调细节问题。
  - 异常排查细节问题。
  - 指标解释细节问题。
  - 需求沟通与 Case 细节问题。
  - 前端交互细节问题。
  - Trace 与评测细节问题。
- 梳理 DeerFlow / AgentRuntimeContract / 智投 Chat 架构收敛相关材料。
- 开始形成第一批代码实施任务拆解、验收门禁、任务看板等材料。

重要判断：

- 小乔智投不应走复杂 Multi-Agent Runtime。
- 当前方向应收敛到 Fat MCP / Fat Skill + Thin Chat Runtime。
- Chat Runtime 重点是 Intent Router、Skill Router、参数补齐、结果展示、Timeline、Card Renderer。
- MCP / Skill 侧承载更重的业务步骤、状态、失败原因、建议和 Workflow。
- 不优先建设 Multi-Agent Runtime、Autonomous Agent、Recursive Agent、Self-Evolving Runtime、复杂 Planner。

风险：

- 文档和任务线较多，容易产生上下文过载。
- 后续实现时必须避免从架构讨论直接跳到大规模改造。
- 必须严格区分设计收敛、局部 Patch、真实问题修复。

## 2026-05-26

主题：小乔智投会话区问题集中修复与架构边界收敛。

主要处理：

- 排查并修复历史会话点击无反应、消息区不加载、404 `conversation not found`。
- 强化会话列表 / 消息列表接口返回结构兼容。
- 修复发送按钮处理中状态、图标切换、输入区阴影重叠等交互问题。
- 修复 AntD Dropdown `overlayStyle` deprecated 警告。
- 排查标题生成链路，确认标题规则应由后台 Prompt 管理控制。
- 修正错误方向：撤回硬编码标题重写 Prompt，避免代码硬截断大模型标题。
- 修复会话存储层用首条用户消息覆盖标题的问题。
- 完成系统级架构全景 Review、Repomix 复扫、MASTER_SPEC、NEXT_IMPLEMENTATION_PLAN。
- 明确用户约束：后续禁止修改会话消息区之外的前端组件样式，除非单独提出。

问题复盘：

- 处理过程有明显上下文过载和边界判断失误。
- 错误把“标题长度由 Prompt 控制”理解成“代码硬截断”。
- 一度引入硬编码 Prompt，违反后台提示词管理设计。
- 对真实问题验证不充分，曾使用 mock 验证，和用户要求不一致。

稳定结论：

- 标题内容和长度规则由后台 Prompt 管理控制。
- 标题 API 负责取 Prompt、调用模型、清洗模型输出。
- 代码兜底只处理模型不可用时的 fallback，不能替代模型生成规则。
- 前端发送链路必须确保首条消息后确实触发标题生成。

## 2026-05-27

主题：收尾清理本地历史会话、恢复服务可用状态、沉淀问题。

主要处理：

- 用户要求不再重新刷标题，改为删除本地历史会话。
- 清空本地会话数据文件：
  - `ad/.runtime/zhitou-chat/conversations.json`
  - `ad/.runtime/zhitou-chat/users/*/conversations.json`
- 每个清空文件保留备份：
  - `*.bak-clear-20260526161110`
- 发现前端仍显示历史会话的原因：
  - 磁盘已清空，但旧 8002 Node 进程仍有 `conversation-store` 内存缓存。
- 重启 8002 服务以清除内存缓存。
- dev 服务因 `.next` lock / IO 权限问题卡住，页面停在“正在进入”。
- 最终改用生产服务恢复：
  - `node dist/server.js`
  - 8002 恢复可访问。

当前稳定状态：

- 本地历史会话已清空。
- 8002 服务可用。
- 页面可进入。
- 当前服务方式是 `node dist/server.js`。

## 关键约束

- 禁止修改会话消息区之外的前端组件样式，除非用户单独提出。
- 侧边栏、输入框、操作栏等样式是经过特殊处理的，默认不再碰。
- 禁止 mock 用户反馈的问题，必须检查真实链路。
- 如果必须影响架构、Runtime、MCP、协议，需要先和用户确认。
- 当前优先解决实际问题，不做空泛架构扩展。

## 架构蒸馏

### 小乔智投目标形态

采用：

- Fat MCP / Fat Skill
- Thin Chat Runtime

MCP / Skill 负责：

- 步骤。
- 状态。
- 失败原因。
- 建议。
- Workflow。

Chat Runtime 负责：

- Intent Router。
- Skill Router。
- 参数补齐。
- 结果展示。
- Timeline。
- Card Renderer。

当前不优先建设：

- Multi-Agent Runtime。
- Autonomous Agent。
- Recursive Agent。
- Self-Evolving Runtime。
- 复杂 Planner。

### 会话标题链路

正确边界：

- 标题生成规则由后台 Prompt 管理控制：
  - `conversation-title-generate`
  - `conversation-title-update`
- API 服务负责取 Prompt、调用模型、清洗模型输出。
- 模型输出不应被代码硬截断。
- fallback 可以做兜底清洗 / 截断，避免用户原文直接变成长标题。
- 会话存储层不应在首条消息写入时用用户原文覆盖模型标题。

本阶段教训：

- 不应在未完整理解现有控制面时把产品规则写死到代码里。
- 不应把后台 Prompt 控制的规则下沉为硬编码。
- 修复问题前必须先确认控制面、数据流和真实运行路径。

## 运维与数据沉淀

本地历史会话清理：

- 清空范围仅限本地 `conversations.json`。
- 未删除用户、配置、Prompt、MCP、上传文件。
- 已生成备份：
  - `*.bak-clear-20260526161110`

服务状态：

- 8002 当前可用。
- dev 服务曾因 `.next` lock / IO 权限问题卡住。
- 当前临时稳定方式为：
  - `node dist/server.js`

## 后续接续建议

新会话窗口接续时先确认：

- 当前目录：`E:\AI\ai-os\subprojects`
- 项目：`ad`
- 服务：`http://127.0.0.1:8002`
- 不要动非会话消息区样式。
- 如继续修标题，先读：
  - `ad/frontend/src/src/app/api/xiaoqiao/conversations/[id]/title/route.ts`
  - `ad/frontend/src/src/lib/conversation-title.ts`
  - `ad/frontend/src/src/lib/conversation-store.ts`
  - `ad/frontend/src/src/hooks/useConversation.ts`
  - `ad/.runtime/zhitou-chat/prompt-configs.json`

## 一句话总结

本阶段最大收获是边界意识：小乔智投应坚持 Fat MCP / Fat Skill + Thin Chat Runtime，标题和业务策略类规则归后台 Prompt / MCP / Skill 控制，前端和 Runtime 只做触发、路由、展示、状态和兜底，不能把产品规则临时写死到代码里。
