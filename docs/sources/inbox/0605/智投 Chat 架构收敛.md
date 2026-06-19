智投 Chat 架构收敛结论（2026）
一、当前问题本质

当前问题不是：

缺 Agent 框架

而是：

Intent Router 不稳定
+
MCP 结果展示混乱
+
思维链不可解释
+
会话区后台感严重
二、当前正确架构方向

采用：

Fat MCP / Fat Skill
+
Thin Chat Runtime

而不是：

复杂 Multi-Agent Runtime
三、最终推荐架构
User Request
    ↓
轻量知识/RAG预检
    ↓
Intent Router
    ├─ 意图识别
    ├─ 参数补齐
    ├─ 置信度判断
    └─ 是否追问
    ↓
Skill Router
    ↓
Fat MCP / Workflow Skill
    ├─ 联调
    ├─ 排查
    ├─ 报表
    ├─ 分析
    └─ 验收
    ↓
Result Protocol
    ↓
Timeline / Stepper / Card Renderer
四、LangGraph 结论

当前阶段：

不强依赖 LangGraph

原因：

已有 MCP / Skill 已经包含：

步骤
状态
失败原因
建议
业务逻辑

本质已经接近：

Workflow Service

当前更缺：

结果协议化
+
前端产品化

而不是：

重新造 Workflow Runtime
五、MCP / Skill / Workflow 定义
MCP

负责：

执行具体业务逻辑

例如：

联调
排查
报表
配置检查
Workflow

当前多数已经内聚在 MCP 内。

不重复建设。

Skill

用户可感知能力：

联调验收
异常排查
报表分析
素材分析

Skill 本质是：

用户入口

不是技术实现。

六、前端核心改造方向
不更换 Ant Design X

保留：

Header
Sidebar
Workspace
Sender
路由
Conversation
核心改造

新增：

MessagePart Protocol
+
Timeline Renderer
+
Card Renderer
七、核心 MessagePart 协议

统一：

{
  "type": "timeline|tool_call|metric_card|chart|table|text",
  "data": {}
}

前端统一渲染：

Stepper
Timeline
ToolCard
指标卡
图表卡
表格卡
八、思维链结论

禁止：

伪 CoT
“我正在思考”

采用：

结构化事件流

例如：

识别意图
→ 检查权限
→ 调用报表
→ 排查异常
→ 生成结论
九、会话区视觉方向

当前问题：

后台白底
内容平铺
缺少聚焦

改造方向：

深色/灰阶背景
居中阅读宽度
渐进披露
折叠卡片
Artifact 面板
十、当前阶段最重要目标

优先级：

1. Intent Router 稳定
2. Result Protocol
3. Timeline / Stepper
4. Tool/Card Renderer
5. 会话视觉体验

不是：

复杂 Multi-Agent
十一、最终结论

当前最佳路线：

已有知识库
+
已有 Fat MCP / Skill
+
自研 Intent Router
+
Result Protocol
+
Timeline / Stepper
+
Ant Design X 会话产品化

而不是：

重构成复杂 Agent Framework