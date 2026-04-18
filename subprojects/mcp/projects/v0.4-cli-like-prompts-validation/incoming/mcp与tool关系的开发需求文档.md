方案A（1个mcp-内部分层）当前方案
方案B（2个mcp-特殊声明）

设计 统一 MCP Server（兼容 CLI + MCP）代码结构，一个 MCP Server
同时支持：
原生 MCP Tools
类似命令行工具
后续可扩展 Workflow / Agent
并且核心是：统一 Catalog 驱动一切
一、整体架构（先把骨架定死）
┌────────────────────┐
│聊天/LLM │
└─────────┬──────────┘
↓
┌────────────────────┐
│ MCP Server │ ← 对外唯一入口
└─────────┬──────────┘
↓
┌─────────────────┼───────────────────┐
↓↓↓
CLI适配器原生工具工作流引擎
↓↓↓
┌────────────────────┐
│ Catalog │ ← 核心
└──────────────────────┘
二、项目目录结构（直接能建 repo）
aios-mcp-server/
├── app/
│ ├── main.py # MCP server 启动入口
│ ├── config.py
│
│ ├── catalog/ # ⭐ 能力注册中心（最核心）
│ │ ├── registry.py # tool 注册 & 查询
│ │ ├── schema.py # tool 定义 schema
│ │ └── loader.py # 从 yaml/json 加载
│
│ ├── adapters/ # ⭐ 协议适配层
│ │ ├── cli_adapter.py # CLI → 工具
│ │ └── mcp_adapter.py # 原生 MCP tool
│
│ ├── router/ # ⭐ 工具路由层
│ │ └── tool_router.py
│
│ ├── execution/ # ⭐ 执行层
│ │ ├── engine.py # 调度（串行/并发）
│ │ └── context.py # 执行上下文
│
│ ├── planner/ # （可选，后续 Agent）
│ │ └── planner.py
│
│ ├── tools/ # ⭐ 具体工具实现
│ │ ├── cli/ # 命令行工具
│ │ └── native/ # MCP 工具
│
│ ├── workflows/ # （未来）
│ └── utils/
│
├── catalog/ # ⭐ 声明式注册（推荐）
│ ├── 工具/
│ │ ├── cli/
│ │ │ └── get_uids.yaml
│ │ └── 本地/
│ │ └── query_db.yaml
│
├── 测试/
└── requirements.txt
三、核心设计：统一 Tool Schema（最关键）
所有能力必须统一成一个结构👇
app/catalog/schema.py
from typing import Callable, Dict, Any
工具类：
定义热（
自己，
名称：str，
类型：str，#“cli”|“mcp”
描述：字符串，
输入模式：字典，
处理程序：可调用对象，
元数据：字典 = 无
）：
self.name = 名字
self.type = 类型
self.description = 描述
self.input_schema = input_schema
self.handler = 处理程序
self.metadata = metadata 或 {}
四、Catalog Registry（能力中枢）
app/catalog/registry.py
class CatalogRegistry:
定义热（自己）：
self.tools = {}
code
代码
def register(self, tool):
    self.tools[tool.name] = tool

def get(self, name):
    return self.tools.get(name)

def list(self):
    return list(self.tools.values())

def search(self, keyword):
    return [
        t for t in self.tools.values()
        if keyword in t.name or keyword in t.description
    ]
catalog = CatalogRegistry()
五、CLI Adapter（把 CLI 变成 Tool）
👉 核心思想：
CLI 命令 = 工具
app/adapters/cli_adapter.py
导入子流程
def cli_handler(command_template: str):
code
代码
def handler(params: dict):
    cmd = command_template.format(**params)

    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True
    )

    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "code": result.returncode
    }

return handler
👉 示例：注册 CLI Tool
从 app.catalog.registry 导入 catalog
from app.catalog.schema import Tool
from app.adapters.cli_adapter import cli_handler
工具 = 工具(
name="cli.get_uids_by_pay",
type="cli",
描述="获取高付费用户"
输入模式={
"游戏": "字符串，
“最小值”: “整数”
},
handler=cli_handler(
"game-data get-uids-by-pay --game {game} --min {min}"
）
）
catalog.register(tool)
六、Native MCP Tool（原生函数）
app/tools/native/query_db.py
def query_db(params):
sql = params["sql"]
# 调数据库
返回 {"data": "mock_result"}
注册：
catalog.register(
工具（
名称="mcp.query_db",
type="mcp",
描述="运行 SQL 查询",
input_schema={"sql": "string"},
handler=query_db
）
）
七、Tool Router（统一分发）
app/router/tool_router.py
从 app.catalog.registry 导入 catalog
类 ToolRouter：
code
代码
def route(self, tool_name: str):
    tool = catalog.get(tool_name)

    if not tool:
        raise Exception(f"Tool not found: {tool_name}")

    return tool
八、Execution Engine（执行引擎）
app/execution/engine.py
ExecutionEngine 类：
code
代码
def execute(self, tool, params):
    return tool.handler(params)

def execute_plan(self, steps):
    results = []

    for step in steps:
        tool = step["tool"]
        params = step["params"]

        result = self.execute(tool, params)
        results.append(result)

    return results
九、MCP Server 入口（对接 Chat）
app/main.py
from app.router.tool_router import ToolRouter
from app.execution.engine import ExecutionEngine
router = ToolRouter()
engine = ExecutionEngine()
def handle_mcp_call(request):
"""
要求：
{
"工具": "cli.get_uids_by_pay",
"params": {...}
}
"""
code
代码
tool = router.route(request["tool"])
result = engine.execute(tool, request["params"])

return result
十、Catalog YAML（推荐你一定做）
catalog/tools/cli/get_uids.yaml
名称：cli.get_uids_by_pay
类型：命令行
描述：获取高付费用户
命令：game-data get-uids-by-pay --game {game} --min {min}
输入模式：
游戏：字符串
最小值：整数
加载器：
app/catalog/loader.py
导入 yaml
from app.catalog.schema import Tool
from app.adapters.cli_adapter import cli_handler
从 app.catalog.registry 导入 catalog
def load_yaml_tools(path):
使用 open(path) 作为 f：
data = yaml.safe_load(f)
code
代码
if data["type"] == "cli":
    handler = cli_handler(data["command"])

tool = Tool(
    name=data["name"],
    type=data["type"],
    description=data["description"],
    input_schema=data["input_schema"],
    handler=handler
)

catalog.register(tool)
十一、这个架构的“关键价值”（你会用到）
✅ 1. CLI 和 MCP 完全统一
都是 Tool
✅ 2. 后续接 Agent 不用改底层
Planner → 直接调用 catalog tools
✅ 3. 可扩展 Workflow
workflow = 多个 tool 的组合
十二、下一步你应该做什么（非常关键）
我建议你按这个顺序落地：
第一步
先跑通：
CLI → 注册成 Tool → MCP 调用
步骤 2️⃣
加：
目录 YAML + 加载器
步骤 3️⃣
加：
工具搜索/工具排名（给LLM）
Step 4️⃣（再做）
接：
Planner（Agent化）
最后一条（架构本质总结）
你不是在做 MCP Server
你是在做：
👉 AI 能力操作系统（Tool OS） 原生mcp和cli是作为2个mcp接入chat，还是一个。如果是2个，同时开会怎么响应。
这个问题本质是：MCP 在 Chat 侧是“能力源（tool provider）”，还是“执行通道（transport）”。你现在卡在的是接入形态，我给你把正确做法讲清楚👇
一、先说结论（直接给你架构判断）
✅ 推荐方案（行业更优解）
一个 MCP 接入 Chat（统一入口）
内部重新分配：
CLI适配器
原生 MCP 工具
👉 也就是：
聊天
↓
[MCP Server（统一）]
├── 命令行工具
└── 原生 MCP 工具
❌ 不推荐默认做法
聊天
├── MCP 服务器 A（CLI）
└── MCP 服务器 B（原生）
👉 除非你有强隔离需求（后面讲）
二、为什么“一个 MCP 更合理”（核心原因）
1️⃣ Tool 决策必须在同一个上下文
LLM 在做的是：
从 tools 列表中选一个/多个
如果你拆成两个 MCP：
👉 实际变成：
两个 tool universe（工具宇宙）
问题：
❌ 无法统一排序（哪个更优）
❌ 无法组合（CLI + MCP 混用）
❌ prompt/context 被割裂
2️⃣ Catalog 无法统一（你前面已经意识到这个问题）
你现在其实已经在走这条路：
Catalog = 能力全集
如果分两个 MCP：
目录 A（CLI）
产品目录 B（MCP）
👉 会直接炸：
重复定义
能力冲突
无法做统一治理
3️⃣ Planner / Tool Router 会变复杂
统一 MCP：
Planner → Tool Router → One MCP → 执行
两个 MCP：
Planner → 先选 MCP → 再选 tool
👉 多一层决策 = 不稳定源
三、那“两个 MCP 同时开会怎么响应？”（你问的关键点）
如果你真的用了两个 MCP，会发生👇
👉 模型视角
模型看到的是：
{
“工具”： [
"cli.get_users",
"cli.get_revenue",
"mcp.query_db",
"mcp.run_analysis"
]
}
👉 其实已经被平台“flatten（拍平）”了
⚠️ 关键点：不会真的“同时开会”
LLM 行为是：
一次只调用一个 tool（function call）
然后：
tool → 返回结果 → LLM 再决定下一步
👉 所谓“同时”其实是：
情况1：顺序调用（默认）
步骤 1 → MCP 工具
步骤2 → MCP B 工具
情况2：并发（需要你实现）
Execution Engine 并发调：
命令行工具
MCP 工具
👉 注意：
不是 LLM 并发，是你系统并发
四、如果坚持用“两个 MCP”，必须补的机制
否则一定出问题👇
1️⃣ Tool 命名隔离（必须）
cli.get_users
mcp.get_users
否则：
❌ 名字冲突
❌ LLM 选错
2️⃣ 能力描述对齐（超重要）
{
"name": "cli.get_users",
描述：快速、缓存、适用于标准查询
}
{
"name": "mcp.get_users",
描述：灵活，支持复杂过滤器
}
👉 否则 LLM 不知道选谁
3️⃣ Router Hint（强烈建议）
你要加一层：
规则 or embedding routing
例如：
简单查询 → CLI
复杂分析 → MCP