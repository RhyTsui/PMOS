# Dataki v1.2 Prompt 共享与绑定接口草案
- 版本：v1.2
- 日期：2026-04-28
- 状态：Draft
- 适用范围：Prompt 共享与绑定接口设计
- 读者对象：产品、前端、后端、测试、AI

## 1. 接口目标

本文件只定义 `Prompt` 在 Dataki v1.2 中的两类关键接口：
1. 共享到空间
2. 绑定到消费端

其中：
1. 共享接口必须与知识库现有“共享到空间”机制对齐。
2. 绑定接口必须支持主对话框、业务 Chat、外部 Agent。
3. 实际调用前必须串联共享校验、绑定校验、权限校验。

## 2. 设计原则

1. Prompt 是一级菜单模块，但接口层不需要为“一级菜单”单独建模。
2. Prompt 作为正式资产类型进入统一资产体系。
3. 共享与绑定是两条不同链路，不能混成一个字段。
4. 共享解决“谁能访问 Prompt”。
5. 绑定解决“哪个消费端能使用 Prompt”。

## 3. 核心对象

### 3.1 Prompt 资产对象

```json
{
  "prompt_id": "prompt-001",
  "name": "广告投放复盘 Prompt",
  "description": "用于广告投放日报与异常复盘",
  "content": "你是数据分析助手，请基于以下指标...",
  "variables": [
    { "key": "date_range", "required": true, "description": "时间范围" }
  ],
  "scenario": "ads_analysis",
  "owner_user_id": "user-001",
  "status": "active",
  "updated_at": "2026-04-28T12:00:00+08:00"
}
```

### 3.2 Prompt 共享对象

```json
{
  "share_id": "ps-001",
  "prompt_id": "prompt-001",
  "organization_id": "org-001",
  "organization_name": "广告投放协作空间",
  "permission": "viewer",
  "shared_by_user_id": "user-001",
  "shared_at": "2026-04-28T12:10:00+08:00"
}
```

### 3.3 Prompt 绑定对象

```json
{
  "binding_id": "pb-001",
  "prompt_id": "prompt-001",
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "target_name": "广告日报 Chat",
  "binding_mode": "active",
  "bound_by_user_id": "user-001",
  "bound_at": "2026-04-28T12:20:00+08:00"
}
```

### 3.4 调用上下文对象

```json
{
  "prompt_id": "prompt-001",
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "operator_user_id": "user-002",
  "organization_id": "org-001"
}
```

## 4. 共享接口

### 4.1 共享 Prompt 到空间

`POST /api/v1/prompts/:id/shares`

用途：
- 将某个 Prompt 共享到指定空间

请求体：

```json
{
  "organization_id": "org-001",
  "permission": "viewer"
}
```

字段说明：
- `organization_id`：目标空间 ID
- `permission`：共享给空间的权限等级，建议复用知识库现有口径，如 `viewer / editor`

返回示例：

```json
{
  "share_id": "ps-001",
  "prompt_id": "prompt-001",
  "organization_id": "org-001",
  "organization_name": "广告投放协作空间",
  "permission": "viewer",
  "shared_by_user_id": "user-001",
  "shared_at": "2026-04-28T12:10:00+08:00"
}
```

校验要求：
1. 当前用户必须有该 Prompt 的共享权限。
2. 当前用户必须有目标空间内可发起共享的角色能力。
3. 同一 Prompt 可共享到多个空间。
4. 同一空间已存在共享关系时，优先走更新而不是重复创建。

### 4.2 获取 Prompt 共享列表

`GET /api/v1/prompts/:id/shares`

用途：
- 获取某个 Prompt 当前共享到哪些空间

返回示例：

```json
{
  "shares": [
    {
      "share_id": "ps-001",
      "organization_id": "org-001",
      "organization_name": "广告投放协作空间",
      "permission": "viewer",
      "shared_by_user_id": "user-001",
      "shared_at": "2026-04-28T12:10:00+08:00"
    }
  ]
}
```

### 4.3 更新 Prompt 共享权限

`PUT /api/v1/prompts/:id/shares/:share_id`

用途：
- 更新某条共享关系的权限等级

请求体：

```json
{
  "permission": "editor"
}
```

返回示例：

```json
{
  "share_id": "ps-001",
  "prompt_id": "prompt-001",
  "organization_id": "org-001",
  "permission": "editor",
  "updated_at": "2026-04-28T12:30:00+08:00"
}
```

### 4.4 取消 Prompt 共享

`DELETE /api/v1/prompts/:id/shares/:share_id`

用途：
- 从某个空间移除该 Prompt 的共享关系

返回示例：

```json
{
  "success": true
}
```

## 5. 绑定接口

### 5.1 创建 Prompt 绑定

`POST /api/v1/prompts/:id/bindings`

用途：
- 把某个 Prompt 绑定到主对话框、业务 Chat 或外部 Agent

请求体：

```json
{
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "target_name": "广告日报 Chat"
}
```

`target_type` 建议枚举：
- `main_chat`
- `chat_app`
- `agent`

返回示例：

```json
{
  "binding_id": "pb-001",
  "prompt_id": "prompt-001",
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "target_name": "广告日报 Chat",
  "binding_mode": "active",
  "bound_by_user_id": "user-001",
  "bound_at": "2026-04-28T12:20:00+08:00"
}
```

校验要求：
1. 当前用户必须有该 Prompt 的绑定权限。
2. 绑定目标必须属于当前用户可管理范围。
3. 若绑定目标受空间约束，则该 Prompt 必须已共享到相应空间。

### 5.2 获取 Prompt 绑定列表

`GET /api/v1/prompts/:id/bindings`

用途：
- 获取某个 Prompt 当前已绑定的消费端

返回示例：

```json
{
  "bindings": [
    {
      "binding_id": "pb-001",
      "target_type": "chat_app",
      "target_id": "chat-ads-daily",
      "target_name": "广告日报 Chat",
      "binding_mode": "active",
      "bound_at": "2026-04-28T12:20:00+08:00"
    }
  ]
}
```

### 5.3 删除 Prompt 绑定

`DELETE /api/v1/prompts/:id/bindings/:binding_id`

用途：
- 取消某个 Prompt 与消费端的绑定

返回示例：

```json
{
  "success": true
}
```

## 6. 调用前校验接口口径

### 6.1 调用校验目标

任一消费端在真正使用 Prompt 前，必须依次检查：
1. Prompt 是否对当前空间可访问
2. Prompt 是否绑定到当前消费端
3. 当前主体是否具备绑定 / 调用权限

### 6.2 建议接口

`POST /api/v1/prompts/:id/resolve-access`

用途：
- 在真正调用 Prompt 前，统一判断是否允许当前上下文使用该 Prompt

请求体：

```json
{
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "operator_user_id": "user-002",
  "organization_id": "org-001"
}
```

返回示例：

```json
{
  "allowed": true,
  "share_ok": true,
  "binding_ok": true,
  "permission_ok": true,
  "denied_reason": ""
}
```

失败示例：

```json
{
  "allowed": false,
  "share_ok": false,
  "binding_ok": false,
  "permission_ok": false,
  "denied_reason": "prompt_not_shared_to_current_space"
}
```

## 7. 调用记录接口

### 7.1 记录 Prompt 调用

这条能力可以作为内部服务，不一定必须暴露给前端。

建议记录字段：

```json
{
  "invocation_id": "pi-001",
  "prompt_id": "prompt-001",
  "target_type": "chat_app",
  "target_id": "chat-ads-daily",
  "operator_user_id": "user-002",
  "organization_id": "org-001",
  "invoked_at": "2026-04-28T12:40:00+08:00"
}
```

### 7.2 查询 Prompt 调用记录

`GET /api/v1/prompts/:id/invocations`

用途：
- 查询某个 Prompt 的调用记录

返回示例：

```json
{
  "invocations": [
    {
      "invocation_id": "pi-001",
      "target_type": "chat_app",
      "target_id": "chat-ads-daily",
      "operator_user_id": "user-002",
      "organization_id": "org-001",
      "invoked_at": "2026-04-28T12:40:00+08:00"
    }
  ]
}
```

## 8. 与知识库接口的对齐要求

Prompt 共享接口建议尽量复用知识库现有风格：
1. 路由结构对齐 `/knowledge-bases/:id/shares`
2. 共享对象继续使用 `organization_id`
3. 共享权限继续复用知识库现有权限等级
4. 响应字段命名尽量保持一致

这样做的好处：
1. 前端共享弹层更容易复用
2. 后端共享逻辑更容易抽象
3. 测试与权限评审更容易对齐

## 9. 验收点

1. Prompt 能共享到空间
2. Prompt 共享列表可查
3. Prompt 共享权限可更新
4. Prompt 可取消共享
5. Prompt 能绑定到主对话框 / 业务 Chat / 外部 Agent
6. 调用前能正确完成共享、绑定、权限三级校验
7. 调用记录可落库、可查询

## 10. 一句话结论

Dataki v1.2 的 Prompt 接口设计应明确拆成两条链路：共享链路复用知识库“共享到空间”机制，绑定链路服务主对话框 / 业务 Chat / 外部 Agent，最终在调用前通过共享、绑定、权限三级校验完成受控使用。
