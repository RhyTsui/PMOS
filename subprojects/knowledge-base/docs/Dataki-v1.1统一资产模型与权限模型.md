# Dataki v1.1 统一资产模型与权限模型
- 版本：v1.1
- 日期：2026-04-23
- 状态：Draft
- 适用范围：Dataki v1.1 首版对象定义
- 读者对象：产品、前端、后端、测试、AI

## 1. 目标

Dataki v1.1 首版需要一套足够简单但可落地的对象模型，覆盖：

1. 三类知识范围
2. 分享与挂载
3. 发布与受控开放
4. 模型与 MCP 治理
5. 小闪组织映射

## 2. 统一资产模型

### 2.1 核心对象

#### 用户 `user`

- `user_id`
- `third_account`
- `user_name`
- `real_name`
- `group_id`
- `group_name`
- `company_id`
- `company_name`
- `department_id`
- `department_name`
- `org_id`
- `org_name`
- `phone`
- `is_super_admin`
- `status`

#### 知识库 `knowledge_base`

- `kb_id`
- `name`
- `scope_type`
- `owner_type`
- `owner_id`
- `manager_user_ids`
- `status`
- `publish_status`
- `visibility_policy`
- `default_mountable`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

说明：

- `scope_type` 只允许 `personal / department / company`
- `publish_status` 只在部门 / 公司知识库中生效

#### 分享对象 `share_binding`

- `binding_id`
- `kb_id`
- `target_type`
- `target_id`
- `permission_level`
- `created_by`
- `created_at`

说明：

- `target_type` 可为 `user / space / chat_app / ai_app`

#### 挂载对象 `mount_binding`

- `mount_id`
- `target_type`
- `target_id`
- `kb_id`
- `mount_mode`
- `status`
- `created_by`
- `created_at`

说明：

- `target_type` 首版支持 `main_chat / business_chat / ai_app`

#### 模型配置 `model_profile`

- `model_id`
- `model_name`
- `provider`
- `status`
- `visible_to_user`
- `managed_by`

说明：

- 首版只有超管可维护
- 普通用户前台只看 `model_name`

#### MCP 配置 `mcp_profile`

- `mcp_id`
- `name`
- `type`
- `status`
- `is_builtin`
- `visible_to_user`
- `managed_by`

说明：

- 首版默认内置数据部 MCP
- 支持外挂管理

## 3. 权限模型

### 3.1 角色

首版按最小可用角色集收敛：

1. 超管
2. 普通用户
3. 部门管理员
4. 公司知识库负责人

### 3.2 范围规则

#### 个人知识库

- 创建者默认拥有全部权限
- 默认私有
- 可分享给指定用户或空间
- 可挂主对话框

#### 部门知识库

- 由部门管理员维护
- 发布前仅管理范围内可见
- 发布后部门成员可检索和消费
- 可挂指定业务 Chat

#### 公司知识库

- 由指定负责人维护
- 发布前仅负责人和被授权人员可见
- 发布后按受控范围开放给公司用户
- 可挂指定 AI 应用

### 3.3 操作权限

统一操作：

1. 查看
2. 编辑
3. 分享
4. 挂载
5. 发布
6. 管理配置

### 3.4 权限矩阵

| 角色 | 个人知识库 | 部门知识库 | 公司知识库 | 模型配置 | MCP 管理 |
| --- | --- | --- | --- | --- | --- |
| 超管 | 可管理规则，不默认读取全部个人内容 | 可管理 | 可管理 | 可配置 | 可配置 |
| 普通用户 | 可创建/编辑自己的 | 默认无维护权 | 默认无维护权 | 只读模型名称 | 只读挂载结果 |
| 部门管理员 | 仅自己范围内 | 可维护与发布 | 默认无维护权 | 无 | 无 |
| 公司知识库负责人 | 默认无 | 默认无 | 可维护与发布 | 无 | 无 |

## 4. 与现有文档的差异

Dataki v1.1 首版与旧版文档的主要差异：

1. 不再把项目知识库作为一级资产范围
2. 不再把提示词资产单独抬成首版主导航
3. 首版组织体系以小闪返回为真源
4. 模型治理收敛为超管控制

## 5. 技术实现提醒

1. WeKnora 现有组织和租户模型需要映射，而不是直接照搬
2. 权限判断要区分“维护权限”和“消费权限”
3. 分享、挂载、发布必须拆开建模，不能混成一个字段
4. 小闪组织同步必须可重跑
