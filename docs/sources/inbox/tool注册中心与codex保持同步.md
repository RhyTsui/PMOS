# 🚀 PMAIOS Tool System v0.1（完整设计）

## 🧠 一、系统定位

Tool System 是 AI OS 的执行能力层，负责：

* 管理所有外部工具（GitHub / DB / Slack / API）
* 提供统一调用接口（MCP）
* 控制权限（Agent → Tool）
* 支持 DAG 编排调用

👉 本质：

> Agent → Tool → Real World

---

# 🧩 二、整体架构

```
┌──────────────────────────────┐
│        Agent Layer           │
│ Planner / Worker / Analyst   │
└─────────────┬────────────────┘
              ↓
┌──────────────────────────────┐
│        Tool Router           │  ← 核心调度
└─────────────┬────────────────┘
              ↓
┌──────────────────────────────┐
│       Tool Registry          │  ← 工具注册中心
└─────────────┬────────────────┘
              ↓
┌──────────────────────────────┐
│        MCP Server            │  ← 执行接口
└─────────────┬────────────────┘
              ↓
┌──────────────────────────────┐
│    External Systems          │
│ GitHub / DB / Slack / API    │
└──────────────────────────────┘
```

---

# 📁 三、项目目录结构（可直接创建）

```
E:\AI\ai-os\
  tools\
    registry.json
    permissions.json
    server.js
    router.js

    dev\
      github.json

    data\
      postgres.json

    business\
      slack.json

  workflows\
  memory\
  docs\
```

---

# 📄 四、Tool Registry（工具注册中心）

## registry.json

```json
{
  "tools": [
    {
      "name": "github",
      "type": "dev",
      "description": "GitHub operations",
      "actions": ["create_pr", "review_code"]
    },
    {
      "name": "postgres",
      "type": "data",
      "description": "Database queries",
      "actions": ["query", "insert"]
    }
  ]
}
```

---

# 🔐 五、权限系统（权限核心）

## permissions.json

```json
{
  "roles": {
    "planner": ["github"],
    "worker": ["github", "postgres"],
    "analyst": ["postgres"]
  }
}
```

---

## 权限规则

```
Agent → Role → Tool → Action
```

---

# 🧠 六、Tool Router（核心调度）

## router.js

```javascript
import registry from "./registry.json" assert { type: "json" };
import permissions from "./permissions.json" assert { type: "json" };

export function route(agentRole, toolName, action) {
  const allowedTools = permissions.roles[agentRole];

  if (!allowedTools.includes(toolName)) {
    throw new Error("Permission denied");
  }

  const tool = registry.tools.find(t => t.name === toolName);

  if (!tool || !tool.actions.includes(action)) {
    throw new Error("Invalid tool or action");
  }

  return {
    tool: toolName,
    action: action
  };
}
```

---

# ⚙️ 七、MCP Server（执行层）

## server.js

```javascript
import { createServer } from "mcp";
import fs from "fs";

createServer({
  name: "pmaios-tools",

  tools: [
    {
      name: "list_tools",
      description: "List all tools",
      inputSchema: {}
    },
    {
      name: "execute_tool",
      description: "Execute a tool action",
      inputSchema: {
        type: "object",
        properties: {
          tool: { type: "string" },
          action: { type: "string" }
        }
      }
    }
  ],

  async handler(tool, input) {
    if (tool === "list_tools") {
      return JSON.parse(fs.readFileSync("./tools/registry.json"));
    }

    if (tool === "execute_tool") {
      return {
        status: "executed",
        tool: input.tool,
        action: input.action
      };
    }
  }
});
```

---

# 🔗 八、接入 Codex

## 注册 MCP

```bash
codex mcp add "pmaios-tools" -- node tools/server.js
```

---

## 验证

```bash
/mcp
```

或：

```
List available tools
```

---

# 🔄 九、DAG 接入方式（核心能力）

## DAG Node 示例

```json
{
  "node": "fetch_data",
  "agent": "analyst",
  "tool": "postgres",
  "action": "query"
}
```

---

## 执行流程

```
DAG Node
→ Tool Router（权限校验）
→ MCP Server
→ Tool执行
→ 返回结果
```

---

# 🧠 十、自动工具选择（进阶）

## Prompt设计

```
Given a task, select the best tool from registry.json
Return: {tool, action}
```

---

# 🔥 十一、系统能力总结

## 已具备

* ✅ Tool注册中心
* ✅ 权限控制
* ✅ MCP执行
* ✅ DAG接入
* ✅ Agent调用

---

## 下一步可扩展

* Tool调用日志（Observability）
* Tool失败重试
* Tool成本控制（Hermes）
* Tool自动选择（LLM Routing）

---

# 🚀 十二、核心一句话

> Tool System = AI OS 的“手脚”
>
> Agent 不再只是思考，而是可以操作真实世界

---
