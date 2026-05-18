# WeKnora 前台沿用接管方案

- 版本：v0.1
- 日期：2026-04-23
- 状态：已确认方向，待进入实现
- 决策前提：知识库子项目短期沿用 WeKnora 现有前台壳推进，不单独重做一套前端工作台

## 1. 接管目标

这轮前台策略不是“重写前端”，而是先基于 WeKnora 已有工作台，把知识库项目需要的入口、导航、会话流和资产流接过来。

目标分三层：

1. 保留 WeKnora 现有可运行壳层，缩短可用工作台落地时间。
2. 把知识库项目真正需要的入口收敛出来，减少无关路由和菜单干扰。
3. 给后续 PMAIOS 平台层接管留出切口，不把知识库前台临时方案误升为平台全局壳。

## 2. 首批接管切口

### 2.1 路由壳

文件：`subprojects/knowledge-base/WeKnora/frontend/src/router/index.ts`

当前作用：

- 定义 `/platform` 下的主工作台路由壳。
- 组织知识库、知识检索、Agent、组织、聊天、设置等页面。
- 处理登录态、Lite 模式恢复和自动初始化。

建议接管方式：

- 第一阶段保留 `/platform` 作为知识库项目主壳。
- 把 `knowledge-bases`、`knowledge-search`、`creatChat`、`chat/:chatid` 视为核心主线。
- `agents`、`organizations`、`settings` 视为可裁剪区域，按知识库项目实际需要保留或降级。

### 2.2 菜单壳

文件：`subprojects/knowledge-base/WeKnora/frontend/src/stores/menu.ts`

当前作用：

- 定义左侧一级菜单。
- 管理聊天子会话列表。
- 控制 Lite 模式下菜单隐藏。

建议接管方式：

- 第一阶段直接在这个 store 上做菜单收敛。
- 主保留项：`knowledge-bases`、`knowledge-search`、`creatChat`、`chat`。
- 待评估项：`agents`、`organizations`、`settings`。
- 明确禁止项：不要在现阶段继续扩张一级菜单，先收敛后改造。

### 2.3 平台容器壳

文件：`subprojects/knowledge-base/WeKnora/frontend/src/views/platform/index.vue`

当前作用：

- 提供整体布局容器。
- 承接菜单与子路由视图。

建议接管方式：

- 作为知识库项目阶段性主容器继续保留。
- 后续若要接 PMAIOS 的统一头部、项目态、版本态、审阅态，这里是第一切口。
- 第一阶段优先做视觉与信息架构收敛，不优先拆布局机制。

### 2.4 知识库列表入口

文件：`subprojects/knowledge-base/WeKnora/frontend/src/views/knowledge/KnowledgeBaseList.vue`

当前作用：

- 知识空间列表和主入口。

建议接管方式：

- 作为知识资产首页第一落点。
- 后续优先往这里叠加“知识资产对象”“资产消费绑定”“版本视角”，而不是重新发明入口。

### 2.5 新建对话入口

文件：`subprojects/knowledge-base/WeKnora/frontend/src/views/creatChat/creatChat.vue`

当前作用：

- 发起新会话。
- 从知识空间进入会话创建。

建议接管方式：

- 作为知识消费入口保留。
- 后续适配“提示词资产 / 资产绑定 / 工作流模板”时，优先从这里加接入层，不直接重做聊天新建逻辑。

### 2.6 聊天主界面

文件：`subprojects/knowledge-base/WeKnora/frontend/src/views/chat/index.vue`

当前作用：

- 承载实际对话、引用返回、上下文消费。

建议接管方式：

- 保留为知识库项目阶段性会话主界面。
- 后续重点看消息结构、引用展示、资产挂载、权限控制和审计事件，不先做样式层大修。

## 3. 第一阶段菜单收敛建议

建议保留：

- 知识库
- 知识检索
- 新建对话
- 历史会话

建议降级为二级或条件显示：

- Agents
- Settings

建议默认隐藏：

- Organizations

原因：

- 这轮目标是“知识库项目二开开工”，不是完整复刻 WeKnora 多租户产品。
- 菜单越多，后续平台边界越难收敛。

## 4. 与 PMAIOS 现有架构的关系

低冲突：

- 继续沿用 WeKnora 前台壳，不会直接改 PMAIOS 主前端代码。
- 作为 `knowledge-base` 子项目阶段性工作台，边界清晰。

中冲突：

- 若在这个前台壳里继续塞入平台级 Prompt / Agent / Runtime 主入口，会和 PMAIOS 现有架构职责重叠。

高冲突：

- 若把 WeKnora 的菜单、组织模型、会话模型直接定义为 PMAIOS 全局标准，会影响其他子项目的一致性。

## 5. 实施顺序

1. 先跑通容器环境，拿到可用前台。
2. 再做一级菜单收敛和默认首页调整。
3. 再做知识资产首页、会话入口、引用链路的项目化改名与接缝接管。
4. 最后才评估是否把部分前台能力上提为平台共用层。

## 6. 当前结论

- “前台也用他的改”已经收敛为明确执行策略。
- 这不是直接接受 WeKnora 全产品边界，而是接受它的前台壳作为知识库子项目阶段性工作台。
- 真正需要继续警惕的冲突，不在前台能不能用，而在平台控制面是否被它反向绑定。
