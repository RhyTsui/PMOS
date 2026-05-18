# 小乔智投 Chat 连弩观测 SDK 对接文档

## 1. 对接说明

小乔智投 Chat 接入连弩观测 SDK 后，每次真实 Chat 请求可生成一条 Trace，用于在连弩平台查看用户问题、Chat 回答、前端传参、Agent 调度、LLM 调用、MCP/工具调用、耗时和异常信息。

本期只接入真实 Chat 观测数据，不要求接入实验、评测集、评测任务、`run_id` 或 `case_id`。

如果后续需要关联实验，可在 Trace input 中透传 `experiment_id`、`experiment_group`、`run_id`、`case_id`、`sample_id` 等实验上下文字段。

## 2. 接入参数

连弩提供以下接入参数：

    COZELOOP_API_BASE_URL=http://liannu.dc.yokagames.com:1117
    COZELOOP_WORKSPACE_ID=7637782635946704897
    COZELOOP_API_TOKEN=<连弩单独安全提供>
    LIANLU_PROJECT_ID=<小乔智投项管系统项目 ID>
    LIANLU_ENV=<test/pre/prod>
    LIANLU_SERVICE_NAME=xiaoqiao-zhitou-chat-service

|  **参数**  |  **说明**  |
| --- | --- |
|  `COZELOOP_API_BASE_URL`  |  连弩 SDK 上报服务地址。当前地址为联调/测试环境地址  |
|  `COZELOOP_WORKSPACE_ID`  |  连弩观测空间 ID，由连弩线下提供  |
|  `COZELOOP_API_TOKEN`  |  上报鉴权 Token，由连弩单独安全提供  |
|  `LIANLU_PROJECT_ID`  |  小乔智投在项管系统中的项目 ID  |
|  `LIANLU_ENV`  |  接入环境，建议为 `test` / `pre` / `prod`  |
|  `LIANLU_SERVICE_NAME`  |  小乔智投 Chat 服务名  |

注意事项：

1.  `COZELOOP_API_TOKEN` 是密钥，不要写入代码仓库、日志或公开文档。
    
2.  测试、预发、生产环境建议使用不同 Token。
    
3.  当前 `http://liannu.dc.yokagames.com:1117` 、空间ID 仅作为联调/测试环境地址，生产环境地址由连弩另行提供。
    
4.  `LIANLU_PROJECT_ID` 使用项管系统项目 ID，不由连弩单独分配；`COZELOOP_WORKSPACE_ID` 是连弩观测空间 ID，两者不要混用。
    
5.  接入方不需要直接调用上报接口，只需要使用 SDK 埋点。
    

## 3. SDK 安装

小乔智投按服务技术栈选择对应 SDK。

Python：

    pip install CozeLoop

Node.js：

    npm install @cozeloop/ai

Go：

    go get github.com/coze-dev/cozeloop-go

## 4. 环境变量配置

Linux / macOS：

    export COZELOOP_API_BASE_URL=http://liannu.dc.yokagames.com:1117
    export COZELOOP_WORKSPACE_ID=<连弩线下提供>
    export COZELOOP_API_TOKEN=<连弩单独安全提供>
    export LIANLU_PROJECT_ID=<小乔智投项管系统项目 ID>
    export LIANLU_ENV=<test/pre/prod>
    export LIANLU_SERVICE_NAME=xiaoqiao-zhitou-chat-service

Windows PowerShell：

    $env:COZELOOP_API_BASE_URL="http://liannu.dc.yokagames.com:1117"
    $env:COZELOOP_WORKSPACE_ID="<连弩线下提供>"
    $env:COZELOOP_API_TOKEN="<连弩单独安全提供>"
    $env:LIANLU_PROJECT_ID="<小乔智投项管系统项目 ID>"
    $env:LIANLU_ENV="<test/pre/prod>"
    $env:LIANLU_SERVICE_NAME="xiaoqiao-zhitou-chat-service"

## 5. 埋点位置

建议在小乔智投 Chat 的一次完整请求链路外层埋点：

    收到用户问题
      -> start_span
      -> set_input：写入用户问题、前端参数、会话信息、项目 ID
      -> 执行小乔智投 Chat / Agent / LLM / MCP / 工具调用
      -> set_output：写入最终回答、耗时、状态、异常信息
      -> finish
    返回 Chat 结果

要求：

1.  每次用户 Chat 请求至少创建一个 root span。
    
2.  成功和失败都必须执行 `finish()`。
    
3.  SDK 上报失败不应阻断 Chat 主流程，建议只记录日志。
    
4.  长驻服务建议在进程启动时初始化 `client = cozeloop.new_client()`，请求内复用 `client.start_span()`；不要每次请求都 close SDK，服务退出前再 close/flush。
    

## 6. Python 接入示例

    import json
    import os
    import time
    from datetime import datetime, timezone
    
    import cozeloop
    
    
    client = cozeloop.new_client()
    
    
    def handle_chat(
        question: str,
        conversation_id: str,
        message_id: str,
        user_id_hash: str,
        frontend_params=None,
    ) -> str:
        start_time = time.time()
        span = client.start_span("xiaoqiao.zhitou.chat", "custom")
    
        try:
            span.set_input(json.dumps({
                "project_id": int(os.getenv("LIANLU_PROJECT_ID", "0")),
                "env": os.getenv("LIANLU_ENV", "test"),
                "service_name": os.getenv("LIANLU_SERVICE_NAME", "xiaoqiao-zhitou-chat-service"),
                "conversation_id": conversation_id,
                "message_id": message_id,
                "user_id_hash": user_id_hash,
                "question": question,
                "frontend_params": frontend_params or {},
                "request_time": datetime.now(timezone.utc).isoformat(),
            }, ensure_ascii=False))
    
            answer = call_xiaoqiao_zhitou_chat(question)
    
            span.set_output(json.dumps({
                "answer": answer,
                "status": "success",
                "latency_ms": int((time.time() - start_time) * 1000),
            }, ensure_ascii=False))
    
            return answer
    
        except Exception as exc:
            span.set_output(json.dumps({
                "status": "error",
                "error_message": str(exc),
                "latency_ms": int((time.time() - start_time) * 1000),
            }, ensure_ascii=False))
            raise
    
        finally:
            span.finish()
    
    
    def call_xiaoqiao_zhitou_chat(question: str) -> str:
        # 替换为小乔智投 Chat 真实调用逻辑
        return "示例回答"

## 7. 推荐 Trace 结构

每次用户 Chat 请求建议生成一条 Trace。P0 至少上报 root span；如果小乔智投侧接入成本可控，建议继续拆分 Agent、LLM、MCP、工具、SQL、检索等子 span。

|  **Span**  |  **必需**  |  **建议名称**  |  **记录内容**  |
| --- | --- | --- | --- |
|  Chat 请求 root span  |  是  |  `xiaoqiao.zhitou.chat`  |  用户问题、前端参数、最终回答、总耗时、状态、错误摘要  |
|  Agent 调度 span  |  建议  |  `xiaoqiao.zhitou.agent`  |  意图识别、规划步骤、选择的工具、Agent 版本、状态  |
|  LLM 调用 span  |  建议  |  `xiaoqiao.zhitou.llm`  |  模型名、prompt 摘要、模型参数、输出摘要、token、耗时  |
|  MCP 调用 span  |  建议  |  `xiaoqiao.zhitou.mcp`  |  MCP server、tool、入参摘要、出参摘要、耗时、状态  |
|  普通工具调用 span  |  建议  |  `xiaoqiao.zhitou.tool`  |  工具名、入参摘要、返回摘要、耗时、状态  |
|  SQL 生成 span  |  可选  |  `xiaoqiao.zhitou.sql_generate`  |  SQL 生成结果摘要、SQL hash、生成耗时  |
|  SQL 执行 span  |  可选  |  `xiaoqiao.zhitou.sql_execute`  |  SQL hash、结果行数、执行耗时、状态  |
|  检索召回 span  |  可选  |  `xiaoqiao.zhitou.retrieval`  |  召回来源、召回数量、top 结果摘要  |

P0 如果只做最小接入，root span 必须包含用户问题、前端关键传参、最终回答、状态、耗时和异常信息。

## 8. 埋点字段规范

### 8.1 Root Span Input 字段

|  **字段**  |  **必填**  |  **示例**  |  **说明**  |
| --- | --- | --- | --- |
|  `project_id`  |  是  |  `<小乔智投项管系统项目 ID>`  |  项管系统项目 ID，由双方约定使用  |
|  `env`  |  是  |  `test` / `pre` / `prod`  |  运行环境  |
|  `service_name`  |  是  |  `xiaoqiao-zhitou-chat-service`  |  服务名  |
|  `question`  |  是  |  `帮我查一下...`  |  用户原始问题  |
|  `conversation_id`  |  建议  |  `conv_xxx`  |  会话 ID  |
|  `message_id`  |  建议  |  `msg_xxx`  |  消息 ID  |
|  `request_id`  |  建议  |  `req_xxx`  |  请求 ID，便于和业务日志关联  |
|  `user_id_hash`  |  建议  |  `u_xxx`  |  用户 ID 哈希，不建议上报明文  |
|  `channel`  |  可选  |  `web` / `api`  |  请求来源  |
|  `frontend_params`  |  建议  |  `{"page_id":"campaign_detail"}`  |  前端传入的业务参数，需白名单上报  |
|  `agent_id`  |  建议  |  `agent_xiaoqiao_zhitou`  |  Agent 标识  |
|  `agent_version`  |  建议  |  `v20260511`  |  Agent 配置或编排版本  |
|  `request_time`  |  建议  |  `2026-05-11T14:00:00+08:00`  |  请求时间  |

说明：`project_id` 使用项管系统项目 ID，不由连弩单独分配，用于后续筛选和归属识别；`COZELOOP_WORKSPACE_ID` 是连弩观测空间 ID，两者含义不同，不要混用。

### 8.2 Root Span Output 字段

|  **字段**  |  **必填**  |  **示例**  |  **说明**  |
| --- | --- | --- | --- |
|  `answer`  |  是  |  `查询结果如下...`  |  Chat 最终回答  |
|  `status`  |  是  |  `success` / `error`  |  请求状态  |
|  `latency_ms`  |  是  |  `1234`  |  端到端耗时，单位毫秒  |
|  `model_name`  |  建议  |  `qwen-plus`  |  最终回答使用的主模型  |
|  `finish_reason`  |  建议  |  `stop`  |  模型或 Chat 完成原因  |
|  `token_usage`  |  建议  |  `{"input": 100, "output": 200}`  |  token 消耗  |
|  `error_stage`  |  异常时建议  |  `model_call`  |  错误阶段  |
|  `error_code`  |  异常时建议  |  `TIMEOUT`  |  错误码  |
|  `error_message`  |  异常时必填  |  `timeout`  |  错误摘要  |

### 8.3 前端传参信息

前端传参用于还原用户在哪个页面、带着什么业务上下文发起 Chat。建议只上报白名单字段，不要透传完整 URL、Cookie、Header、localStorage 或用户隐私字段。

|  **字段**  |  **示例**  |  **说明**  |
| --- | --- | --- |
|  `page_id`  |  `campaign_detail`  |  页面标识  |
|  `page_route`  |  `/campaigns/detail`  |  页面路由，不建议带完整 query  |
|  `client_request_id`  |  `web_req_xxx`  |  前端请求 ID  |
|  `entry`  |  `chat_panel`  |  入口来源  |
|  `selected_campaign_id`  |  `camp_1001`  |  当前投放计划 ID  |
|  `selected_account_id`  |  `acct_1001`  |  当前广告账号 ID  |
|  `time_range`  |  `last_7_days`  |  用户选择的时间范围  |
|  `filters_summary`  |  `{"platform":"巨量"}`  |  筛选条件摘要，需脱敏  |

建议结构：

    {
      "frontend_params": {
        "page_id": "campaign_detail",
        "page_route": "/campaigns/detail",
        "client_request_id": "web_req_xxx",
        "entry": "chat_panel",
        "selected_campaign_id": "camp_1001",
        "selected_account_id": "acct_1001",
        "time_range": "last_7_days",
        "filters_summary": {
          "platform": "巨量"
        }
      }
    }

### 8.4 Agent 调用信息

如小乔智投 Chat 通过 Agent 编排完成意图识别、计划生成、工具选择和答案合成，建议记录 Agent 调度信息：

|  **字段**  |  **示例**  |  **说明**  |
| --- | --- | --- |
|  `agent_id`  |  `agent_xiaoqiao_zhitou`  |  Agent 标识  |
|  `agent_version`  |  `v20260511`  |  Agent 编排版本  |
|  `intent`  |  `query_campaign_metric`  |  识别出的用户意图  |
|  `plan_summary`  |  `先解析投放指标，再查询计划数据`  |  规划摘要  |
|  `selected_tools`  |  `["query_campaign_report"]`  |  Agent 选择的工具  |
|  `memory_hit`  |  `true`  |  是否命中记忆或上下文  |
|  `rewrite_question`  |  `查询最近7天投放核心指标`  |  改写后的问题  |
|  `latency_ms`  |  `120`  |  Agent 调度耗时  |
|  `status`  |  `success`  |  调度状态  |

### 8.5 LLM 调用信息

如小乔智投 Chat 内部调用大模型，建议在模型调用 span 或 root output 中记录：

|  **字段**  |  **示例**  |  **说明**  |
| --- | --- | --- |
|  `model_name`  |  `qwen-plus`  |  模型名称  |
|  `provider`  |  `aliyun`  |  模型供应商  |
|  `temperature`  |  `0.7`  |  采样温度  |
|  `top_p`  |  `0.8`  |  采样参数  |
|  `max_tokens`  |  `2048`  |  最大输出长度  |
|  `prompt_version`  |  `v20260511`  |  prompt 或策略版本  |
|  `prompt_summary`  |  `投放分析助手系统提示词`  |  prompt 摘要，不建议上报完整敏感 prompt  |
|  `input_tokens`  |  `100`  |  输入 token  |
|  `output_tokens`  |  `200`  |  输出 token  |
|  `latency_ms`  |  `800`  |  模型调用耗时  |
|  `status`  |  `success`  |  调用状态  |

### 8.6 MCP 调用信息

如小乔智投 Chat 通过 MCP 调用外部工具或数据服务，建议对每次 MCP 调用创建子 span，或在 root output 中记录 MCP 调用摘要。

|  **字段**  |  **示例**  |  **说明**  |
| --- | --- | --- |
|  `mcp_server`  |  `ad-report-mcp`  |  MCP server 名称  |
|  `mcp_tool`  |  `query_campaign_report`  |  MCP tool 名称  |
|  `mcp_method`  |  `tools/call`  |  MCP 调用方法  |
|  `tool_args_summary`  |  `{"metric":"cost","range":"last_7_days"}`  |  脱敏后的入参摘要  |
|  `tool_args_schema_version`  |  `v1`  |  工具入参 schema 版本  |
|  `tool_result_summary`  |  `返回3条投放指标数据`  |  工具返回摘要  |
|  `latency_ms`  |  `320`  |  MCP 调用耗时  |
|  `status`  |  `success`  |  调用状态  |
|  `error_code`  |  `MCP_TIMEOUT`  |  错误码  |
|  `error_message`  |  `timeout`  |  错误摘要  |

MCP 入参建议只上报业务必要字段和脱敏摘要，不要上报认证信息、连接信息或完整大字段返回。

### 8.7 工具调用、检索和 SQL 信息

如小乔智投 Chat 内部存在工具调用、检索、SQL 生成等链路，建议补充摘要信息：

    {
      "agent": {
        "agent_id": "agent_xiaoqiao_zhitou",
        "agent_version": "v20260511",
        "intent": "query_campaign_metric",
        "selected_tools": ["query_campaign_report"]
      },
      "llm_call": {
        "model_name": "qwen-plus",
        "temperature": 0.7,
        "prompt_version": "v20260511",
        "input_tokens": 100,
        "output_tokens": 200
      },
      "mcp_calls": [
        {
          "mcp_server": "ad-report-mcp",
          "mcp_tool": "query_campaign_report",
          "tool_args_summary": {
            "metric": "cost",
            "range": "last_7_days"
          },
          "status": "success",
          "latency_ms": 320
        }
      ],
      "tool_calls": [
        {
          "tool_name": "query_campaign_report",
          "status": "success",
          "latency_ms": 320,
          "input_summary": "查询最近7天投放核心指标",
          "output_summary": "返回3个投放指标"
        }
      ],
      "retrieval": {
        "source": "knowledge_base",
        "top_k": 5,
        "hit_count": 3
      },
      "sql_hash": "sha256_xxx",
      "sql_preview": "select ... limit 100",
      "sql_rows": 20
    }

SQL 建议默认只上报：

|  **字段**  |  **说明**  |
| --- | --- |
|  `sql_hash`  |  对完整 SQL 做 hash，用于同类问题聚合  |
|  `sql_preview`  |  脱敏后的 SQL 摘要  |
|  `sql_rows`  |  查询返回行数  |
|  `sql_latency_ms`  |  SQL 执行耗时  |
|  `sql_status`  |  SQL 执行状态  |

## 9. 状态和错误阶段

`status` 建议统一使用：

    success
    error

`error_stage` 建议从以下枚举中选择：

    request_validate
    intent_parse
    agent_plan
    retrieval
    sql_generate
    sql_execute
    tool_call
    mcp_call
    model_call
    response_render
    unknown

## 10. 生产环境采样建议

生产环境接入时，建议按请求类型设置采样策略，避免 Trace 数据量过大。

|  **请求类型**  |  **建议采样**  |
| --- | --- |
|  测试 / 预发环境  |  100% 上报  |
|  生产成功请求  |  建议 10%-30%，具体比例由双方按流量确认  |
|  生产异常请求  |  建议 100% 上报  |
|  重点灰度用户 / 排障会话  |  可临时提高到 100%  |

采样建议在业务侧埋点前完成判断。被采样丢弃的请求不创建 span，避免额外开销。

## 11. 脱敏和字段长度限制

字段上报前建议执行脱敏和截断。超过限制时可以截断，并补充 `truncated=true` 或在字段值后追加省略标记。

|  **字段**  |  **建议最大长度**  |  **处理建议**  |
| --- | --- | --- |
|  `question`  |  4000 字符  |  超长截断  |
|  `answer`  |  8000 字符  |  超长截断  |
|  `frontend_params`  |  4000 字符  |  只保留白名单字段  |
|  `prompt_summary`  |  2000 字符  |  只上报摘要，不上报完整敏感 prompt  |
|  `tool_args_summary`  |  4000 字符  |  脱敏后截断  |
|  `tool_result_summary`  |  4000 字符  |  脱敏后截断  |
|  `sql_preview`  |  1000 字符  |  只上报脱敏摘要  |
|  `error_message`  |  2000 字符  |  去除堆栈中的敏感路径和密钥  |

敏感信息不要上报，包括但不限于：

    数据库账号、数据库连接串、Token、Cookie、完整 Header、localStorage、身份证号、手机号、完整敏感 SQL、内部密钥。

如果后续确需上报完整 SQL、完整工具入参或完整召回文本，需要先确认脱敏策略。

## 12. 联调验收

小乔智投完成接入后，触发一条测试 Chat 请求，双方确认以下内容。

### 12.1 P0 验收项

P0 是首轮联调必须满足的最小闭环。

|  **验收项**  |  **标准**  |
| --- | --- |
|  Trace 可见  |  连弩页面能看到小乔智投上报的 Trace  |
|  问题可见  |  Trace input 中能看到用户问题  |
|  回答可见  |  Trace output 中能看到最终回答  |
|  耗时可见  |  能看到 `latency_ms`  |
|  状态可见  |  成功为 `success`，失败为 `error`  |
|  异常可见  |  失败请求能看到 `error_message`  |
|  环境可区分  |  能通过 `env` 区分测试、预发、生产  |

### 12.2 P1 验收项

P1 用于完善真实 Agent 链路定位能力，建议在 P0 走通后补齐。

|  **验收项**  |  **标准**  |
| --- | --- |
|  前端参数可见  |  能看到页面、入口、筛选条件等白名单参数  |
|  Agent 链路可见  |  如有 Agent，能看到意图、规划摘要、工具选择  |
|  LLM 调用可见  |  如有模型调用，能看到模型名、参数、token、耗时  |
|  MCP 调用可见  |  如有 MCP，能看到 server、tool、入参摘要、返回摘要、耗时  |
|  采样策略生效  |  生产成功请求按约定比例采样，异常请求优先 100% 上报  |
|  脱敏策略生效  |  页面不可见 Token、Cookie、完整 Header、手机号、身份证等敏感信息  |
|  字段长度受控  |  超长问题、回答、工具返回、SQL 摘要已截断或摘要化  |

连弩页面查看路径：

    观测 -> Trace -> SDK 上报

## 13. 常见问题

### 13.1 页面看不到 Trace

请先检查：

1.  `COZELOOP_API_BASE_URL` 是否为连弩提供的地址。
    
2.  `COZELOOP_WORKSPACE_ID` 是否为连弩提供的观测空间 ID。
    
3.  `COZELOOP_API_TOKEN` 是否使用连弩提供的有效 Token。
    
4.  是否执行了 `span.finish()`。
    
5.  页面时间范围是否覆盖测试请求时间。
    
6.  页面筛选条件是否选择“SDK 上报”。
    

### 13.2 SDK 报鉴权错误

通常是 Token 无效、过期或配置错误。请联系连弩重新确认 Token。

### 13.3 SDK 报网络错误

请确认小乔智投服务所在网络可以访问连弩提供的 `COZELOOP_API_BASE_URL`。

## 14. 交付清单

连弩线下提供：

    APIBaseURL: http://liannu.dc.yokagames.com:1117（联调/测试环境）
    WorkspaceId: <连弩线下提供>
    ProjectId: <小乔智投项管系统项目 ID>
    APIToken: <连弩单独安全提供>

小乔智投联调时反馈：

    接入环境：test / pre / prod
    服务名：service_name
    测试问题：question
    触发时间：request_time
    是否在连弩页面看到 Trace：是 / 否

## 15. 参考资料

1.  CozeLoop 开源版 SDK 使用说明：https://github.com/coze-dev/coze-loop/wiki/8.-%E5%BC%80%E6%BA%90%E7%89%88%E4%BD%BF%E7%94%A8-CozeLoop-SDK
    
2.  CozeLoop Python SDK：https://github.com/coze-dev/cozeloop-python
    
3.  CozeLoop Node.js SDK：https://github.com/coze-dev/cozeloop-js
    
4.  CozeLoop Go SDK：https://github.com/coze-dev/cozeloop-go