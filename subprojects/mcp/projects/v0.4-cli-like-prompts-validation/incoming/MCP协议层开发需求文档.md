📄 MCP 协议层开发需求文档（v0.1 简化版）
1. 项目目标

构建一个 c，用于：

标准化 Chat Client 与工具系统的通信
支持 LLM 进行工具调用（Tool Calling）
支持会话上下文管理（Context）
支持多工具 / 多服务扩展
2. 系统边界
✅ MCP 负责
工具注册与发现（tools.list）
工具调用（tools.call）
上下文管理（context.*）
资源访问（resources.*）
通信协议实现（JSON-RPC）
❌ MCP 不负责
具体业务逻辑（如 SQL / 数据计算）
LLM 推理
UI / Chat 渲染
3. 总体架构
[ Chat Client ]
      │
      ▼
[ MCP Host Runtime ]
      │
      ▼
[ MCP Server ]
      │
      ├── Tool Handlers
      ├── Resource Handlers
      └── Context Store
4. 通信协议
4.1 协议类型

采用：

JSON-RPC 2.0（必须）

4.2 传输方式（至少实现一种）
方式	优先级	说明
STDIO	⭐⭐⭐⭐	本地工具（推荐先做）
WebSocket	⭐⭐⭐	远程 Agent
HTTP	⭐⭐	简化模式
5. 核心接口定义
5.1 tools.list（工具发现）
请求
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools.list"
}
响应
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "tools": [
      {
        "name": "game-data.get_uids",
        "description": "获取高付费用户",
        "input_schema": {
          "type": "object",
          "properties": {
            "min_pay": { "type": "number" }
          },
          "required": ["min_pay"]
        }
      }
    ]
  }
}
5.2 tools.call（工具调用）
请求
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools.call",
  "params": {
    "name": "game-data.get_uids",
    "arguments": {
      "min_pay": 500
    }
  }
}
响应
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "uids": [1001, 1002]
  }
}
5.3 context.append（上下文写入）
请求
{
  "method": "context.append",
  "params": {
    "session_id": "abc123",
    "messages": [
      {
        "role": "user",
        "content": "筛选高价值用户"
      }
    ]
  }
}
5.4 context.get（上下文读取）
{
  "method": "context.get",
  "params": {
    "session_id": "abc123"
  }
}
5.5 resources.read（资源读取）
{
  "method": "resources.read",
  "params": {
    "uri": "file://report.csv"
  }
}
6. Tool 定义规范（强制）
6.1 命名规范
<domain>.<action>

示例：

game-data.get_uids
order.query_list
user.profile.get
6.2 输入 Schema（必须 JSON Schema）
{
  "type": "object",
  "properties": {
    "min_pay": {
      "type": "number",
      "description": "最小付费金额"
    }
  }
}
6.3 返回结构
必须为 JSON
禁止返回非结构化文本（除非 content 字段）
7. 错误处理规范
标准错误格式
{
  "jsonrpc": "2.0",
  "id": "2",
  "error": {
    "code": -32000,
    "message": "Tool not found"
  }
}
常见错误码
code	含义
-32601	方法不存在
-32602	参数错误
-32000	业务错误
8. 会话管理
必须支持：
session_id
多轮对话上下文
上下文长度控制（可裁剪）
9. 安全与权限（基础版）
必须实现：
Tool 白名单
参数校验（基于 schema）
可选：用户级权限控制
10. 最小可运行版本（MVP）
必须完成：
 JSON-RPC Server（STDIO）
 tools.list
 tools.call
 至少 2 个工具
 简单 context store（内存即可）
11. 推荐技术选型
Node.js
通信：stdio / ws
schema：ajv
Python
通信：stdin/stdout
schema：pydantic / jsonschema
12. 示例目录结构
mcp-server/
├── server.py
├── tools/
│   ├── game_data.py
│   └── order.py
├── schemas/
├── context/
└── utils/
13. 验收标准

满足以下条件即通过：

Chat Client 可获取 tools.list
LLM 能成功触发 tools.call
工具调用结果正确返回
支持基本多轮上下文
✅ 一句话总结（给老板/自己）

MCP 协议层 =
JSON-RPC + Tool Schema + Context 管理 + Tool 调度接口