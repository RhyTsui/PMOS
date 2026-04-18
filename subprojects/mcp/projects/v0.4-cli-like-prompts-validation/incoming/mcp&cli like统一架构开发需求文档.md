统一的 Tool Platform 架构（CLI ⇄ MCP 双向统一）。我给你一版企业级但可落地的设计蓝图。

🧠 总体目标

让 CLI 和 MCP 只是两种“调用入口”，底层共享同一套 Tool 体系。

最终效果：

            ┌──────────────┐
            │     LLM      │
            └──────┬───────┘
                   │
           ┌───────▼────────┐
           │  Tool Router    │  ← 自动选择 CLI / MCP
           └───────┬────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼                             ▼
 MCP Adapter                  CLI Adapter
 (JSON-RPC)                 (subprocess)
     │                             │
     └─────────────┬───────────────┘
                   ▼
             Tool Registry
                   │
                   ▼
              Business Systems
🧩 一、核心设计理念（关键）
1️⃣ Tool 是唯一抽象（不是 CLI / MCP）

所有能力统一抽象为：

👉 Tool（工具）

{
  "name": "game-data.get_uids",
  "type": "cli | mcp | api",
  "entry": "...",
  "schema": {...}
}
2️⃣ CLI / MCP 都只是“执行适配器”
层	职责
Tool	定义能力
MCP Adapter	JSON-RPC 调用
CLI Adapter	命令行执行

👉 本质：同一个 Tool，多种执行方式

🏗️ 二、核心模块设计
1️⃣ Tool Registry（工具注册中心）

统一管理所有工具：

{
  "tools": [
    {
      "name": "game-data.get_uids",
      "description": "获取用户ID",
      "schema": {...},
      "execution": {
        "type": "cli",
        "command": "game-data get-uids"
      }
    }
  ]
}
2️⃣ Execution Adapter（执行适配层）
CLI Adapter
def execute_cli(command, args):
    cmd = build_command(command, args)
    result = subprocess.run(cmd, capture_output=True)
    return parse_output(result.stdout)
MCP Adapter
def execute_mcp(tool, args):
    return mcp_client.call("tools.call", {
        "name": tool,
        "arguments": args
    })
3️⃣ Tool Router（智能路由）

核心组件（非常关键）：

LLM / Agent → Tool Router → 选择执行方式

逻辑：

优先 MCP（结构化强）
CLI（兼容 legacy / 本地工具）
API（远程服务）
🔄 三、CLI ⇄ MCP 双向映射

这是你这个体系最核心的“桥梁”。

1️⃣ CLI → MCP（包装 CLI 为 MCP Tool）
CLI command
   ↓
MCP tool wrapper
   ↓
LLM 可调用

示例：

game-data get-uids --min-pay 500

映射为 MCP tool：

{
  "name": "game-data.get_uids",
  "input_schema": {
    "min_pay": "number"
  }
}
2️⃣ MCP → CLI（反向执行）
MCP call
   ↓
CLI command builder
   ↓
subprocess

示例：

{
  "name": "game-data.get_uids",
  "arguments": {
    "min_pay": 500
  }
}

转换为：

game-data get-uids --min-pay 500
🧠 四、关键能力设计（平台壁垒）
1️⃣ Tool Schema 自动生成

从 CLI 自动生成 MCP schema：

--help / --json-schema

或：

name: get-uids
args:
  min-pay: number
2️⃣ Tool 自动注册

支持三种来源：

CLI（扫描命令）
MCP Server
API Registry
3️⃣ Tool 描述标准化（给 LLM 用）
{
  "name": "game-data.get_uids",
  "description": "获取付费用户ID",
  "examples": [
    {
      "input": {"min_pay": 500},
      "output": {"uids": [1,2,3]}
    }
  ]
}
4️⃣ Prompt 自动注入（Agent 关键）
你可以使用以下工具：

- game-data.get_uids
- order.query

👉 来自 Tool Registry 自动生成

⚙️ 五、执行流程（完整链路）
用户输入
   ↓
LLM 理解
   ↓
Tool Router 决策
   ↓
选择 Tool
   ↓
选择执行方式（CLI / MCP）
   ↓
Adapter 执行
   ↓
返回结构化结果
   ↓
LLM 继续推理 / 输出
🔐 六、统一规范（建议强制）
Tool 命名
<domain>.<action>
CLI 命名
<domain> <action>
MCP 命名
domain.action

👉 三者可以自动映射：

CLI:  game-data get-uids
MCP:  game-data.get_uids
🚀 七、平台能力（你这个项目的护城河）

如果做完整，会具备：

1️⃣ Tool Marketplace
CLI / MCP / API 工具统一上架
2️⃣ Tool 自动发现
自动扫描 CLI
自动注册 MCP
3️⃣ Agent 自动调度
自动选择 CLI / MCP / API
4️⃣ Workflow 编排（CLI pipeline → Agent DSL）
cmd1 | cmd2 | cmd3

👉 进化为：

agent workflow
🧾 八、最小可落地版本（MVP）

你可以先做这个版本：

✅ 必做模块
Tool Registry（JSON / DB）
CLI Adapter（subprocess）
MCP Adapter（JSON-RPC client）
Tool Router（规则 + 简单 LLM）
Tool Schema（手动 + 半自动）
🧠 一句话总结（核心认知）

CLI 是执行接口
MCP 是通信协议
Tool 是统一抽象
Router 是大脑
Adapter 是执行器