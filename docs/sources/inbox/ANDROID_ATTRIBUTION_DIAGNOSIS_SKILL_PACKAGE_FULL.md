# Android Attribution Callback Diagnosis Skill Package - Full Markdown


---

# File: `README.md`

# Android Attribution Callback Diagnosis Skill Package

版本：`0.1.0`  
Skill ID：`android-attribution-callback-diagnosis`

本包将 `安卓归因问题排查prompt.md` 从“单一长提示词”升级为 Enterprise AI Chat OS 下的 **诊断型 Skill 工程包**。

## 定位

该 Skill 用于 Android 媒体归因、回推、联调失败、数据准确性复核等问题排查。它不是一个全局 Prompt，也不是一个 MCP 的简单别名，而是由以下对象组成：

```txt
Skill Manifest
+ Slot Schema
+ Capability Requirements
+ MCP Capability Binding
+ Workflow DAG
+ Prompt Fragments
+ Evidence Policy
+ SemanticResultContract Template
+ Runtime Display Rules
+ Golden Cases
+ Guardrails
```

## 架构关系

```txt
Enterprise AI Chat OS
├─ Request Understanding System
│  └─ Skill Routing
│     └─ android-attribution-callback-diagnosis
├─ Capability Orchestration System
│  └─ MCP tools -> CapabilityManifest -> Skill Requirements
├─ Runtime & Agent Orchestration System
│  └─ Workflow DAG + RuntimeDisplayProtocol
├─ Unified Semantic Contract
│  └─ diagnosis result -> regions/evidence/source/actions
└─ Prompt Governance
   └─ prompt fragments, not one monolithic prompt
```

## 使用方式

建议先读：

```txt
CODEX_CLI_IMPLEMENTATION_PROMPT.md
```

然后导入：

```txt
docs/architecture/skills/android-attribution-callback-diagnosis/*
frontend/src/src/contracts/skills/android-attribution-callback-diagnosis/*
management-center/import/*
```

## 关键原则

1. 不把 MCP 等同于 Skill。
2. 不把 24 个 tool 写死进全局 prompt。
3. 不把原始 prompt 直接塞进 system prompt。
4. Tool 先归一化为 capability，再由 Skill/Workflow 使用。
5. Workflow 控制步骤和分支，Prompt 负责证据合成与用户表达。
6. 最终结果必须进入 `SemanticResultContract`。
7. 执行过程必须进入 `RuntimeDisplayProtocol`。
8. 证据级结论必须挂 `evidenceRefs` 和 `sourceRefs`。

## 目录

```txt
docs/architecture/skills/android-attribution-callback-diagnosis/
frontend/src/src/contracts/skills/android-attribution-callback-diagnosis/
management-center/import/
prompts/skills/android-attribution-callback-diagnosis/
source/
```


---

# File: `CODEX_CLI_IMPLEMENTATION_PROMPT.md`

# Codex CLI Implementation Prompt

请基于本工程包，将 `安卓归因问题排查prompt.md` 改造成 Enterprise AI Chat OS 下的诊断型 Skill。

## 总目标

新增 Skill：

```txt
android-attribution-callback-diagnosis
```

它应支持 Android 归因、媒体回推、SDK/API 回推、PAY 未回推、联调失败、数据准确性复核等场景。

## 必须遵守的架构规则

1. 不允许把原始 Markdown 直接塞进一个全局 system prompt。
2. 不允许在全局 router 中硬编码 `工具名 -> 意图`。
3. 不允许把 MCP server 直接等同于 Skill。
4. MCP tools 必须先映射为 capability。
5. Skill 只依赖 capability，不直接依赖具体 toolName。
6. Workflow 控制工具调用顺序和 SDK/API/NOTHING 分支。
7. Prompt fragments 只负责证据合成、结果表达和禁止事项。
8. 缺少必填 slot 时必须先澄清，不得继续执行。
9. 最终诊断结果必须进入 SemanticResultContract。
10. 执行状态必须进入 RuntimeDisplayProtocol。
11. 根因判断必须基于 evidence_items/sourceRefs，不得猜测。

## 建议实施步骤

### 第一阶段：导入 Skill 元数据

导入：

```txt
management-center/import/android-attribution-callback-diagnosis.skill.json
management-center/import/android-attribution-callback-diagnosis.workflow.json
management-center/import/android-attribution-callback-diagnosis.capability-binding.example.json
management-center/import/android-attribution-callback-diagnosis.prompts.json
```

### 第二阶段：接入 Request Understanding

新增路由规则：

```txt
用户问题涉及 Android 归因、媒体回推、SDK/API 回推、PAY 事件、804、feedback-res、联调失败、媒体未收到、归因链路等，进入 Skill candidate。
```

不得让该 Skill 抢所有广告数据查询。普通问数仍走 report_query；只有涉及归因/回推/联调/数据准确性复核时才进入该 Skill 或作为子流程使用。

### 第三阶段：接入 Capability Preflight

执行前检查：

```txt
- requiredSlots 是否齐全
- requiredCapabilities 是否可用
- MCP tool catalog 是否 exposed/published
- 当前用户是否有调用权限
- required_fields 是否满足
```

缺少 `date_start` / `date_end` 时必须澄清。

### 第四阶段：接入 Workflow DAG

执行顺序：

```txt
list_tool_catalog
-> resolve_app_context
-> optional resolve_media_context
-> check_base_event_ingestion
-> check_attr_preprocess_result
-> check_callback_rule_match
-> branch_by_callback_mode
```

分支：

```txt
SDK: check_app_sdk_integration -> check_callback_delivery_trace
API: check_api_callback_result -> optional retry/log detail
NOTHING: stop with no-callback conclusion
CONFIG_ANOMALY: query_callback_rule_config
```

### 第五阶段：接入 SemanticResultContract

最终结果至少包含 regions：

```txt
summary
branch-status
workflow-trace
evidence-panel
source-list
next-actions
```

### 第六阶段：接入 Golden Cases

导入：

```txt
frontend/src/src/contracts/skills/android-attribution-callback-diagnosis/golden-cases/*.json
```

至少覆盖：

```txt
- 缺少 date_start/date_end
- 应用候选需要用户选择
- 媒体候选需要用户选择
- 基础事件不存在
- attr-require 缺失
- attr-res 缺失
- callbackMode = NOTHING
- SDK income 有但 804 缺失
- API feedback-res 缺失
- MCP 未挂载或缺工具
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/skill-overview.md`

# Skill Overview：Android 归因与回推问题排查

Skill ID：`android-attribution-callback-diagnosis`

## 背景

原始 `安卓归因问题排查prompt.md` 已经包含角色、默认场景、工具调用原则、主排查链路、SDK/API/不回推分支、最终输出要求和禁止事项。它不是普通文案提示词，而是一个诊断 playbook。

## 总纲落点

```txt
Enterprise AI Chat OS
└─ Skill System
   └─ Diagnosis Skill
      └─ android-attribution-callback-diagnosis
```

该 Skill 横跨：

```txt
Request Understanding
Capability Orchestration
MCP Governance
Workflow Runtime
AI Trust UX
Unified Semantic Contract
Observability & Evaluation
```

## Skill 边界

该 Skill 适用于：

- Android 归因异常
- 媒体回推失败
- SDK 回推链路排查
- API 回推链路排查
- PAY 事件未回推
- 804 闭环异常
- feedback-res 缺失
- 联调失败排查
- 媒体侧未收到数据
- 数据准确性复核中的归因/回推链路校验

不适用于：

- 普通报表问数
- 纯趋势查询
- 素材表现分析
- 广告预算建议
- 不涉及归因/回推链路的数据看板

## 三种调用模式

### 1. 主 Skill 模式

用户明确询问归因、回推、SDK/API、PAY 未回传、联调失败等问题时，直接进入本 Skill。

### 2. 子流程复核模式

用户在更大的数据准确性复核或联调排查中，需要验证归因/回推链路时，本 Skill 作为子 workflow 被调用。

### 3. 原子 capability 模式

如果用户只想检查一个环节，例如“PAY 是否入仓”，可以只调用 `base_event_ingestion.check` capability，不必跑完整 workflow。

## 设计原则

1. Skill 依赖 capability，不直接绑定具体 toolName。
2. MCP 是 capability provider，不是 Skill 本身。
3. Workflow 管步骤，Prompt 管表达，Evidence 管可信。
4. 缺少必填字段时必须澄清。
5. MCP 不存在或能力缺失时不得输出证据级根因。
6. 最终输出必须挂证据、来源和下一步动作。


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/skill-manifest.md`

# Skill Manifest

## 目标

定义该 Skill 的身份、触发条件、适用域、依赖能力、默认配置和输出契约。

## Manifest 示例

```json
{
  "skillId": "android-attribution-callback-diagnosis",
  "version": "0.1.0",
  "name": "Android 归因与回推问题排查",
  "category": "diagnosis",
  "domain": "ad-attribution-diagnosis",
  "description": "用于 Android 媒体归因、SDK/API 回推、PAY 未回传、联调失败等链路排查。",
  "enabled": true,
  "routing": {
    "topIntent": "diagnosis",
    "candidateRoutes": [
      "ad_attribution_diagnosis",
      "integration_debugging",
      "data_quality_review"
    ],
    "triggerTerms": [
      "安卓归因",
      "Android回推",
      "媒体没收到",
      "PAY没回传",
      "SDK回推",
      "API回推",
      "804",
      "feedback-res",
      "联调失败",
      "回传失败",
      "归因失败"
    ],
    "excludeRoutes": [
      "plain_report_query",
      "creative_analysis",
      "budget_recommendation"
    ]
  },
  "defaults": {
    "app_package_type": "ANDROID",
    "event_type": "PAY",
    "media_id": "10002"
  },
  "slotSchemaRef": "android-attribution-callback-diagnosis.slot-schema",
  "capabilityRequirementsRef": "android-attribution-callback-diagnosis.capabilities",
  "workflowRef": "android-attribution-callback-diagnosis.workflow",
  "promptFragmentRefs": [
    "diagnosis-role",
    "evidence-first-policy",
    "slot-clarification-policy",
    "branch-judgement-policy",
    "result-assembly-policy",
    "forbidden-patterns"
  ],
  "resultScreenType": "diagnosis-attribution-callback",
  "visibility": {
    "user": "enabled",
    "admin": "debuggable"
  }
}
```

## 注意

`triggerTerms` 只是候选召回，不等于硬路由。最终是否进入 Skill 需要结合：

```txt
RouteDecision
+ Slot Resolution
+ CapabilityPreflight
+ Policy
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/slot-schema.md`

# Slot Schema

## 目标

把原提示词中的默认值、必填项、可选定位字段变成可校验的 slot schema。

## Slot 定义

```json
{
  "schemaId": "android-attribution-callback-diagnosis.slot-schema",
  "required": [
    "app_query_or_app_id",
    "date_start",
    "date_end"
  ],
  "defaults": {
    "app_package_type": "ANDROID",
    "event_type": "PAY",
    "media_id": "10002"
  },
  "slots": {
    "app_query_or_app_id": {
      "type": "string",
      "description": "游戏名、应用描述或 app_id。若是纯数字 app_id，作为 app_query 精确查询。"
    },
    "date_start": {
      "type": "date",
      "required": true,
      "clarification": "请补充排查开始日期，例如 2026-05-01。"
    },
    "date_end": {
      "type": "date",
      "required": true,
      "clarification": "请补充排查结束日期，例如 2026-05-03。"
    },
    "media_id": {
      "type": "string",
      "default": "10002"
    },
    "media_query": {
      "type": "string",
      "description": "媒体名称、简称或模糊描述，例如 taptap、腾讯、巨量。"
    },
    "event_type": {
      "type": "string",
      "default": "PAY"
    },
    "app_package_type": {
      "type": "enum",
      "values": ["ANDROID", "IOS", "HARMONY"],
      "default": "ANDROID"
    },
    "device_id": { "type": "string" },
    "user_id": { "type": "string" },
    "order_id": { "type": "string" },
    "app_version": { "type": "string" },
    "callback_mode": { "type": "string" },
    "problem_desc": {
      "type": "string",
      "description": "仅用于服务端日志追踪，不是工具字段匹配主条件。"
    }
  }
}
```

## 澄清规则

1. 缺少 `date_start` 或 `date_end`：必须追问，不得执行业务工具。
2. 应用候选多：必须让用户选择 app_id/app_name。
3. 媒体候选多：必须让用户选择 media_id/media_name。
4. `media_id` 是数字且用户明确提供时，不再额外查媒体。
5. 未提供 `media_id` 或 `media_query` 时，默认 `media_id = 10002`。


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/capability-requirements.md`

# Capability Requirements

## 目标

Skill 不直接依赖具体 MCP toolName，而是依赖抽象 capability。

## Capability 列表

```json
{
  "capabilitySetId": "android-attribution-callback-diagnosis.capabilities",
  "requiredCapabilities": [
    "tool.catalog.list",
    "app_context.resolve",
    "base_event_ingestion.check",
    "attr_preprocess_result.check",
    "callback_rule_match.check"
  ],
  "optionalCapabilities": [
    "media_context.resolve",
    "callback_rule_config.query"
  ],
  "branchCapabilities": {
    "sdk": [
      "sdk_integration.check",
      "callback_delivery_trace.check"
    ],
    "api": [
      "api_callback_result.check",
      "api_callback_retry_detail.check",
      "api_callback_log_detail.query"
    ],
    "config_anomaly": [
      "callback_rule_config.query"
    ],
    "pay_event_skip": [
      "attr_clue_event_detail.query"
    ]
  }
}
```

## 当前 MCP 工具名映射示例

| Capability | 当前工具名示例 | 说明 |
|---|---|---|
| `tool.catalog.list` | `list_exposed_tool_catalog` | 获取 exposed/published 工具与 schema |
| `app_context.resolve` | `fetch_app_context` | 解析应用上下文 |
| `media_context.resolve` | `fetch_media_context` | 解析媒体上下文 |
| `base_event_ingestion.check` | `check_base_event_ingestion` | 检查基础事件入仓 |
| `attr_preprocess_result.check` | `check_attr_preprocess_result` | 检查 attr-require / attr-res |
| `callback_rule_match.check` | `check_callback_rule_match` | 检查回推规则匹配 |
| `callback_rule_config.query` | `query_callback_rule_config` | 复核原始配置 |
| `sdk_integration.check` | `check_app_sdk_integration` | 检查 GSSDK 接入与版本门槛 |
| `callback_delivery_trace.check` | `check_callback_delivery_trace` | 检查 SDK income / 804 |
| `api_callback_result.check` | `check_api_callback_result` | 检查 feedback-res |
| `api_callback_retry_detail.check` | `check_api_callback_retry_detail` | API 失败重试明细 |
| `api_callback_log_detail.query` | `query_api_callback_log_detail` | API 请求日志明细 |
| `attr_clue_event_detail.query` | `query_attr_clue_event_detail` | PAY 场景默认跳过 |

## Preflight 规则

1. 每次执行前先获取 tool catalog。
2. 校验当前 capability 是否存在对应 exposed/published tool。
3. 校验 tool `required_fields` 是否齐全。
4. 缺少必填参数时返回 clarification，不得继续调用。
5. 某个 branch capability 缺失时，允许部分执行，但必须在最终结果披露证据缺口。
6. MCP 未挂载时，Skill 可以返回“能力不可用”的解释，但不能输出证据级根因。


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/mcp-capability-binding.md`

# MCP Capability Binding

## 目标

把管理中心配置的 MCP tools 映射为 Skill 可使用的 capabilities。

## 绑定原则

```txt
MCP Server
  -> Tools
  -> Tool Schema
  -> CapabilityManifest
  -> Skill Capability Requirements
```

Skill 不应直接知道 MCP server URL，也不应把工具名写进总纲或全局路由。

## 绑定示例

```json
{
  "bindingId": "android-attribution-diagnosis-mcp.binding",
  "mcpServerId": "ad-attribution-diagnosis-mcp",
  "skillId": "android-attribution-callback-diagnosis",
  "toolBindings": {
    "tool.catalog.list": {
      "toolName": "list_exposed_tool_catalog"
    },
    "app_context.resolve": {
      "toolName": "fetch_app_context"
    },
    "media_context.resolve": {
      "toolName": "fetch_media_context"
    },
    "base_event_ingestion.check": {
      "toolName": "check_base_event_ingestion"
    },
    "attr_preprocess_result.check": {
      "toolName": "check_attr_preprocess_result"
    },
    "callback_rule_match.check": {
      "toolName": "check_callback_rule_match"
    },
    "callback_rule_config.query": {
      "toolName": "query_callback_rule_config"
    },
    "sdk_integration.check": {
      "toolName": "check_app_sdk_integration"
    },
    "callback_delivery_trace.check": {
      "toolName": "check_callback_delivery_trace"
    },
    "api_callback_result.check": {
      "toolName": "check_api_callback_result"
    },
    "api_callback_retry_detail.check": {
      "toolName": "check_api_callback_retry_detail"
    },
    "api_callback_log_detail.query": {
      "toolName": "query_api_callback_log_detail"
    },
    "attr_clue_event_detail.query": {
      "toolName": "query_attr_clue_event_detail",
      "skipWhen": {
        "event_type": "PAY"
      }
    }
  }
}
```

## 如果 MCP 未挂载

返回：

```json
{
  "executable": false,
  "reason": "missing_capability_provider",
  "missingCapabilities": [
    "tool.catalog.list",
    "app_context.resolve",
    "base_event_ingestion.check"
  ],
  "userMessage": "当前未接入广告归因排查 MCP，无法完成证据级链路排查。"
}
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/workflow-dag.md`

# Workflow DAG

## 目标

把原提示词里的主排查链路变成可执行、可观测、可回放的 workflow。

## DAG

```txt
list_tool_catalog
-> resolve_app_context
-> resolve_media_context? 
-> check_base_event_ingestion
-> check_attr_preprocess_result
-> check_callback_rule_match
-> branch_by_callback_mode
   ├─ SDK -> check_app_sdk_integration -> check_callback_delivery_trace
   ├─ API -> check_api_callback_result -> optional retry/log detail
   ├─ NOTHING -> stop
   └─ CONFIG_ANOMALY -> query_callback_rule_config
```

## 分支规则

### SDK 策略回推

条件：

```txt
callbackModeDetail = SDK
callbackMode = ALL_RULE
PAY 事件规则存在且 OPEN
```

后续：

```txt
check_app_sdk_integration
-> check_callback_delivery_trace
```

### SDK 全量回推

条件：

```txt
callbackModeDetail = SDK
callbackMode = NO_RULE
```

后续：

```txt
check_app_sdk_integration
-> check_callback_delivery_trace
```

### API 回推

条件：

```txt
callbackModeDetail = API
```

后续：

```txt
check_api_callback_result
```

可选深挖：

```txt
check_api_callback_retry_detail
query_api_callback_log_detail
```

### 不回推

条件：

```txt
callbackMode = NOTHING
```

后续：

```txt
停止 SDK income / 804 / feedback-res 排查
```

### 配置异常

条件：

```txt
callbackMode 缺失
callbackModeDetail 缺失
组合不符合 SDK/API/NOTHING
事件规则缺失但配置声称规则回推
```

后续：

```txt
query_callback_rule_config
```

## Runtime 展示

普通用户只展示：

```txt
正在解析应用
正在检查基础事件
正在检查归因链路
正在检查回推配置
当前分支：SDK/API/不回推/配置异常
已完成排查
```

管理员可展开：

```txt
Tool calls
Tool inputs
Tool outputs summary
Latency
Errors
Evidence ids
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/evidence-policy.md`

# Evidence Policy

## 目标

根因判断必须来自工具返回的 evidence，而不是模型猜测。

## 四类基础证据

最终诊断结论应尽量覆盖：

1. 基础事件证据
   - PAY 是否入仓
   - 身份字段是否完整
   - 订单和金额是否完整

2. 归因链路证据
   - attr-require 是否存在
   - attr-res 是否存在
   - 归因媒体是否匹配目标媒体

3. 回推配置证据
   - callbackMode
   - callbackModeDetail
   - PAY 规则
   - OPEN 规则数

4. 分支闭环证据
   - SDK：SDK income / 804
   - API：feedback-res
   - NOTHING：配置不回推证据

## EvidenceRef

```ts
type SkillEvidenceRef = {
  evidenceId: string
  evidenceType:
    | 'base_event'
    | 'attribution_preprocess'
    | 'callback_rule'
    | 'sdk_delivery'
    | 'api_feedback'
    | 'config_sample'
    | 'tool_catalog'
  toolCapability: string
  toolName?: string
  sampleCount?: number
  summary: string
  rawRef?: string
  confidence: 'high' | 'medium' | 'low'
}
```

## 禁止

1. 不允许单个异常样本直接成为最终根因。
2. 不允许没有 evidenceRefs 的根因判断。
3. 不允许 SDK 分支要求 feedback-res。
4. 不允许 API 分支使用 SDK income / 804 作为主证据。
5. 不允许 callbackMode = NOTHING 时继续判定回推失败。


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/result-contract-template.md`

# Result Contract Template

## 目标

Skill 最终输出必须进入 `SemanticResultContract`，不能只返回 Markdown。

## screenType

```txt
diagnosis-attribution-callback
```

## regions

```json
[
  {
    "regionType": "summary",
    "componentBinding": "markdown-result"
  },
  {
    "regionType": "diagnosis-status",
    "componentBinding": "decision-card"
  },
  {
    "regionType": "workflow-trace",
    "componentBinding": "workflow-trace"
  },
  {
    "regionType": "evidence",
    "componentBinding": "evidence-panel"
  },
  {
    "regionType": "source",
    "componentBinding": "source-list"
  },
  {
    "regionType": "next-actions",
    "componentBinding": "action-list"
  }
]
```

## 示例

```json
{
  "screenType": "diagnosis-attribution-callback",
  "regions": [
    {
      "regionType": "summary",
      "componentBinding": "markdown-result",
      "data": {
        "markdown": "本次排查显示：PAY 基础事件已入仓，attr-res 已产出，配置为 SDK 策略回推，但 SDK income 存在后未观察到 804 闭环。"
      }
    },
    {
      "regionType": "diagnosis-status",
      "componentBinding": "decision-card",
      "data": {
        "status": "needs_engineering_review",
        "branch": "SDK_POLICY",
        "rootCause": "SDK 闭环状态缺失",
        "confidence": "medium"
      },
      "evidenceRefs": ["ev_base_event", "ev_attr_res", "ev_callback_rule", "ev_sdk_delivery"]
    },
    {
      "regionType": "workflow-trace",
      "componentBinding": "workflow-trace",
      "runtimeRefs": ["run_android_attr_diag_xxx"]
    },
    {
      "regionType": "evidence",
      "componentBinding": "evidence-panel",
      "data": {
        "groups": ["base_event", "attribution_preprocess", "callback_rule", "sdk_delivery"]
      }
    },
    {
      "regionType": "next-actions",
      "componentBinding": "action-list",
      "data": {
        "actions": [
          {
            "actionType": "follow_up",
            "label": "补充 app_version 复核版本门槛"
          },
          {
            "actionType": "retry_step",
            "label": "继续检查 SDK 804 明细"
          },
          {
            "actionType": "handoff",
            "label": "提交研发排查"
          }
        ]
      }
    }
  ],
  "sourceRefs": [
    {
      "sourceType": "mcp-tool-result",
      "label": "广告归因排查 MCP"
    }
  ]
}
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/prompt-fragments.md`

# Prompt Fragments

## 目标

原始长提示词拆成可治理、可版本化的 prompt fragments。

## Fragment 列表

```txt
diagnosis-role.md
evidence-first-policy.md
slot-clarification-policy.md
branch-judgement-policy.md
result-assembly-policy.md
forbidden-patterns.md
runtime-narration-policy.md
```

## 放置原则

- 角色、表达风格、证据合成放 Prompt。
- 工具顺序、分支、必填字段校验放 Workflow / Slot / Preflight。
- toolName 映射放 Capability Binding。
- 禁止事项同时进入 Prompt、Guardrail 和 Golden Cases。

## 版本治理

每个 fragment 应有：

```txt
promptId
version
owner
status
lastUpdated
changeLog
goldenCases
rollbackVersion
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/guardrails.md`

# Guardrails

## 架构 Guardrails

1. 不允许把原始 prompt 作为全局 system prompt。
2. 不允许 Skill 直接调用 toolName，必须通过 capability binding。
3. 不允许 workflow 外部绕过 slot validation 调业务工具。
4. 不允许最终结果只输出 Markdown。
5. 不允许根因判断没有 evidenceRefs。

## 业务 Guardrails

1. 不要跳过基础事件和归因链路，直接判定回推失败。
2. 不要把 SDK 分支要求 feedback-res。
3. 不要在 callbackMode = NOTHING 时继续判回推失败。
4. 不要把 API 分支当 SDK 分支处理。
5. 不要把 SDK income / 804 当 API 主证据。
6. PAY 场景默认跳过 `query_attr_clue_event_detail`。
7. 工具失败或证据不完整时不得硬判根因。

## 静态检查建议

检查代码中是否出现：

```txt
直接调用 check_* toolName
没有 capability binding
没有 slot validation
没有 evidenceRefs 的 rootCause
SemanticResultContract 缺少 evidence-panel
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/golden-cases.md`

# Golden Cases

## 目标

覆盖 happy path、缺字段、候选选择、能力缺失、分支判断和证据不足。

## 必备 Case

1. 缺少 date_start/date_end，必须澄清。
2. 游戏名返回多个 app 候选，必须让用户选择。
3. 媒体名称模糊，必须让用户选择或使用默认媒体。
4. 基础事件不存在，停止并结论为事件未上报/未入仓。
5. 基础事件存在但 attr-require 缺失，停止为未进入归因预处理。
6. attr-require 存在但 attr-res 缺失，结论为未归因成功或归因结果缺失。
7. attr-res 的媒体不是目标媒体，不判目标媒体回推失败。
8. callbackMode = NOTHING，停止下游回推排查。
9. SDK 策略回推，income 存在但 804 缺失。
10. API 回推，attr-res 存在但 feedback-res 缺失。
11. MCP 未挂载，返回能力不可用，不输出证据级根因。
12. 部分 branch capability 缺失，返回部分结论并披露证据缺口。

## 输出验收

每个 golden case 需要断言：

```txt
RouteDecision
SlotResolution
CapabilityPreflight
Workflow steps
Branch decision
EvidenceRefs
SemanticResultContract regions
User-facing disclosure
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/admin-console-config.md`

# Admin Console Configuration

## 管理中心对象

需要新增或关联：

```txt
Skill Registry
MCP Registry
Capability Binding
Workflow Registry
Prompt Fragment Registry
Slot Schema Registry
Golden Case Registry
Observability Dashboard
```

## 页面建议

### Skill 详情页

展示：

```txt
Skill ID
版本
启用状态
触发规则
Slot Schema
依赖能力
绑定 Workflow
绑定 Prompt Fragments
Golden Cases
运行数据
```

### Capability Binding 页

展示：

```txt
Capability -> MCP toolName
tool exposed 状态
tool published 状态
required_fields
optional_fields
last health check
权限
```

### Workflow 页

展示：

```txt
DAG 图
Step 状态
分支规则
重试策略
超时策略
```

### Observability 页

展示：

```txt
Skill 调用次数
成功率
澄清率
fallback 率
证据不足率
MCP tool 失败率
平均耗时
branch 分布
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/observability-and-evaluation.md`

# Observability and Evaluation

## Trace 对象

每次执行应记录：

```txt
skillRunId
userMessage
RouteDecision
SlotResolution
CapabilityPreflight
WorkflowRuntime
ToolCalls
EvidenceRefs
BranchDecision
SemanticResultContract validation
Renderer errors
```

## Telemetry 事件

```txt
skill_candidate_selected
skill_preflight_failed
skill_slot_clarification_requested
skill_workflow_step_started
skill_workflow_step_completed
skill_workflow_step_failed
skill_branch_decided
skill_evidence_missing
skill_result_assembled
skill_semantic_contract_invalid
```

## 指标

```txt
调用量
成功率
澄清率
MCP 未挂载率
工具失败率
平均耗时
证据不足率
SDK/API/NOTHING/config_anomaly 分支分布
Golden Case 通过率
```


---

# File: `docs/architecture/skills/android-attribution-callback-diagnosis/partial-execution-fallback.md`

# Partial Execution and Fallback Policy

## 能力缺失分类

### 1. Skill 不可执行

缺少核心能力：

```txt
tool.catalog.list
app_context.resolve
base_event_ingestion.check
attr_preprocess_result.check
callback_rule_match.check
```

行为：

```txt
停止执行，说明能力不可用，不输出证据级根因。
```

### 2. 分支能力缺失

例如 API 分支缺少 retry/log 工具，但主分支可执行。

行为：

```txt
继续完成主链路，最终结果披露证据缺口。
```

### 3. Slot 缺失

缺少 `date_start` / `date_end`。

行为：

```txt
先澄清，不执行业务工具。
```

### 4. 工具失败

工具返回错误或 evidence_items 不完整。

行为：

```txt
不硬判根因；尝试原子工具复核或披露证据不足。
```

## Disclosure 文案

```txt
当前缺少 {{missingCapability}} 能力，无法完成 {{branch}} 分支的证据闭环；以下结论仅基于已获取证据，不能作为最终根因。
```
