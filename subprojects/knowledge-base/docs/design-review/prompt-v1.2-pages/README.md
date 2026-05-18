# Dataki v1.2 Prompt 页面视觉稿索引

本目录沉淀 `Dataki v1.2 Prompt 知识资产管理` 的首批 P0 页面视觉稿，供产品、设计、前端切图与评审直接引用。

## 当前建议基线

当前优先参考 `v3` 稿：

1. `prompt-list-all-v3.png`
2. `prompt-list-my-v3.png`
3. `prompt-list-collab-v3.png`
4. `prompt-edit-modal-v3.png`
5. `prompt-share-modal-v3.png`
6. `prompt-group-create-modal-v1.png`
7. `prompt-group-detail-list-v1.png`

说明：
- `v3` 基于 `docs/sources/inbox/image.png` 与 `docs/sources/inbox/image1.png` 的现有 Dataki 风格参考重新收敛
- 相比早期稿，`v3` 更贴近现有系统的 logo、背景气质、左侧菜单、卡片列表与共享弹层结构
- 若后续继续细化，默认在 `v3` 基线之上迭代，而不是回退到早期表格式方案
- Prompt 按知识库结构补齐了“先建组，再进入组内建提示词”的两层交互

## 页面清单

1. `prompt-list-page.png`
   - Prompt 一级菜单列表页
   - 对应能力：搜索、共享范围筛选、状态筛选、列表浏览、新增入口

2. `prompt-detail-page.png`
   - Prompt 资产详情页
   - 对应能力：正文展示、变量说明、版本说明、已共享空间、已绑定对象、详情动作

3. `prompt-edit-page.png`
   - Prompt 新建 / 编辑页
   - 对应能力：基础信息编辑、正文编辑、变量配置、模型/场景说明、保存、发布

4. `prompt-share-modal.png`
   - Prompt 共享弹层
   - 对应能力：按空间共享、共享权限选择、查看已共享空间、取消共享

5. `prompt-binding-drawer.png`
   - Prompt 绑定抽屉
   - 对应能力：绑定到主对话框 / 业务 Chat / 外部 Agent、查看绑定状态、权限说明

6. `prompt-group-create-modal-v1.png`
   - 新建提示词分组弹窗
   - 对应能力：创建分组名称与描述，作为组内提示词管理前置入口

7. `prompt-group-detail-list-v1.png`
   - 提示词分组详情列表页
   - 对应能力：左侧展示分组分类，右侧展示当前分组内提示词列表，并从组内发起新建提示词

## 设计口径

- `Prompt` 为一级菜单，与 `知识库`、`智能体` 并列
- 沿用 Dataki 现有企业后台布局，不新起平台框架
- 共享机制统一走空间口径，不走部门权限树
- 当前有效范围已扩展到“分组 + 组内提示词”结构
- `绑定到消费端` 独立管理图已移出当前有效范围，不作为默认基线
