# Coze Studio 模型配置 Runbook

- version: v0.1
- date: 2026-05-12
- status: active

## 1. 目的

这份文档只解决一件事：

`让本地 Coze Studio 从“能打开页面”进入“可实际开发 agent / workflow / app”状态。`

## 2. 当前前提

本地 `Coze Studio` 已运行在：

- `http://127.0.0.1:8890`

首次登录前仍需要：

1. 注册账号：`/sign`
2. 登录后台
3. 进入模型管理页

## 3. 官方最小必做项

官方 README 已明确：

- 部署后必须配置模型
- 否则无法在 agent / workflow / app 中选择模型

因此在 PMOS 里，`Coze Studio` 的“已部署”不等于“已可用于实现阶段”。

只有满足以下条件，才算可用：

1. 平台可访问
2. 至少一个模型已配置
3. 可以在开发页面选到模型

## 4. 当前本地配置入口

环境文件：

- `subprojects/coze-studio/docker/.env`

当前预留字段包括：

- `MODEL_PROTOCOL_0`
- `MODEL_NAME_0`
- `MODEL_ID_0`
- `MODEL_API_KEY_0`
- `MODEL_BASE_URL_0`

以及内置能力模型字段：

- `BUILTIN_CM_ARK_*`
- `BUILTIN_CM_QWEN_*`

## 5. 推荐优先策略

当前推荐策略不是直接大改容器内部模型文件，而是：

1. 保持 docker stack 已启动
2. 通过管理后台完成首个模型登记
3. 仅在需要批量化或固定化时，再把 `.env` 的占位值转成本地私密注入

原因：

- 这样最贴近官方主路径
- 不会因为误配环境变量导致整体服务不可用
- 便于先验证 PMOS -> Coze Studio 的实现链是否通

## 6. 推荐首个模型方案

### 方案 A：Qwen

适合：

- 当前仓内已有 `DASHSCOPE_API_KEY` 使用经验
- 想快速接阿里云百炼链路

建议在后台模型管理页填入：

- protocol: 对应 `qwen` 或兼容协议
- model name: 实际展示名
- model id: 实际调用模型，如 `qwen-plus`
- api key: 本地真实密钥
- base url: 百炼兼容地址

### 方案 B：Ark

适合：

- 当前团队已有火山 / BytePlus / Ark 模型资源
- 想沿官方默认 `MODEL_PROTOCOL_0="ark"` 走

建议在后台模型管理页填入：

- protocol: `ark`
- model name: 展示名
- model id: 实际调用模型
- api key: 本地真实密钥
- base url: Ark 对应地址

## 7. PMOS 侧治理要求

无论选 `Qwen` 还是 `Ark`，都要遵守：

1. 不把真实密钥写进 repo
2. 真实密钥只走本地私密注入
3. PMOS 只记录：
   - 使用哪类 provider
   - 模型别名
   - 对应 implementation lane
   - 验收结果

## 8. 与 implementation lane 的默认映射

推荐默认映射：

- `coze-studio-agent`
  - 主模型：通用对话/推理模型
  - 可配 knowledge / memory / plugin
- `coze-studio-workflow`
  - 主模型：工作流节点执行模型
  - 可配 plugin / database / retrieval
- `coze-studio-app`
  - 主模型：应用主会话模型
  - 可配 workflow / chat-sdk
- `hybrid`
  - Coze Studio 管 AI runtime
  - repo code 管业务页面与外围服务

## 9. 下一步最小操作

1. 打开 `http://127.0.0.1:8890/sign`
2. 注册账号
3. 打开 `http://127.0.0.1:8890/admin/#model-management`
4. 新增首个模型
5. 回到 PMOS，把该模型对应到某个 `implementationLane`
