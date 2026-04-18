小乔 · Ad OS Demo 开发文档
版本信息
项目	内容
文档名称	小乔·Ad OS Phase 1 Demo 开发文档
版本	V1.0
创建日期	2026-04-16
用途	提交 AI Coding 实现 Demo 验证
一、Demo 总体目标
在 2周内 完成一个可演示的最小闭环，验证四大核心能力的技术可行性和用户体验。

Demo 范围：

智能对接与联调：模拟巨量引擎渠道的自动化联调流程（浏览器 + 手机模拟）。

诊断 Agent：模拟激活 Gap 诊断场景，展示决策树执行和证据链输出。

对话式分析：实现 2 个分析模板（Top N 对比、多维下钻），自然语言触发。

素材 Agent：演示视频→脚本生成→向量聚类→相似素材查询的基础链路。

演示数据：全部使用 Mock 数据，不依赖真实生产环境。

二、技术栈与架构约束
层级	技术选型	说明
前端	React 19 + Vite + Tailwind CSS	对话界面 + 卡片组件 + 流程可视化
Agent 编排	Dify (Workflow DSL) 或 Python 脚本模拟	Demo 阶段可用 Python 直接模拟路由
自动化	Playwright (浏览器) + 模拟 Appium 日志	手机自动化 Demo 阶段用日志回放代替
后端/MCP	Python FastAPI 模拟 MCP 工具	定义标准 Tool Schema，返回 Mock 数据
向量数据库	ChromaDB (本地) 或 numpy 模拟	Demo 用预置向量做相似度计算
LLM	调用公司内部 API 或 OpenAI 兼容接口	用于意图识别和脚本生成
架构原则：

前端与后端通过标准 MCP Tool Schema 通信（JSON-RPC 风格）。

所有 Agent 逻辑先硬编码，后续替换为 Dify Workflow。

三、Demo 用户故事与主流程
故事主线（演示路径）
用户打开小乔对话界面，系统展示欢迎语和快捷指令。

用户点击“开始巨量联调”快捷按钮，系统触发智能对接联调流程。

展示结构化需求表单（预填充 Mock 数据）。

模拟自动预检、MCP 配置、浏览器自动化、联调成功报告。

用户在对话框中输入：“为什么昨天巨量激活比 BI 少 30%？”

系统启动诊断 Agent，展示决策树执行路径。

输出诊断结论、证据链、建议。

用户输入：“帮我对比一下素材 A 和素材 B 最近 7 天的消耗和 ROI。”

系统调用对话式分析模板，返回对比卡片。

用户点击素材分析入口，上传一个 Mock 视频文件。

系统生成结构化脚本，展示相似素材聚类结果。

四、模块详细设计
模块 1：智能对接与联调
4.1.1 功能点
功能	输入	输出	实现方式
结构化需求表单	媒体、应用、事件类型	预检结果 + 工时预估	前端表单，后端 Mock 校验规则
自动预检	应用 ID、测试账号	通过/阻断 + 缺失项列表	调用 Mock MCP check_prerequisites
MCP 自动配置	监测链接配置参数	配置成功 + 监测链接 URL	调用 Mock MCP create_monitoring_link
浏览器自动化模拟	无	登录→创建资产→生成二维码的步骤日志	Playwright 脚本 + 截图（可录制回放）
手机自动化模拟	二维码图片	扫码→刷广告→验证回传的步骤日志	模拟 Appium 日志流
联调报告生成	执行结果	成功/失败报告 + 截图	汇总各步骤状态
4.1.2 MCP 工具定义（Mock）
json
// Tool: check_prerequisites
{
  "name": "check_prerequisites",
  "description": "校验对接前置条件",
  "input_schema": {
    "type": "object",
    "properties": {
      "app_id": {"type": "string"},
      "media": {"type": "string"}
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "passed": {"type": "boolean"},
      "missing_items": {"type": "array", "items": {"type": "string"}},
      "estimated_hours": {"type": "number"}
    }
  }
}

// Tool: create_monitoring_link
{
  "name": "create_monitoring_link",
  "description": "调用媒体API创建监测链接",
  "input_schema": {
    "type": "object",
    "properties": {
      "media": {"type": "string"},
      "app_id": {"type": "string"},
      "event_type": {"type": "string"}
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "success": {"type": "boolean"},
      "link_url": {"type": "string"},
      "link_id": {"type": "string"}
    }
  }
}
4.1.3 前端组件
联调进度条：展示 9 个步骤的状态（等待/执行中/成功/失败）。

日志流面板：滚动展示 Playwright/Appium 模拟日志。

报告卡片：汇总展示成功项、失败项和截图占位。

模块 2：诊断 Agent
4.2.1 功能点
功能	输入	输出	实现方式
意图识别	用户自然语言	诊断类型（激活/付费 Gap）	LLM 调用 + Prompt 约束
决策树执行	诊断类型 + 时间范围	每个节点的执行结果和证据	硬编码决策树逻辑，调用 Mock MCP
证据链汇总	节点结果	根因结论 + 置信度 + 建议	模板化拼接，LLM 润色
诊断报告卡片	结构化结论	可折叠证据链、操作按钮	前端组件
4.2.2 诊断决策树定义（激活 Gap Mock）
python
# 伪代码
def diagnose_activation_gap(start_date, end_date, media):
    # Step 1: SDK 日志检查
    sdk_count = mcp.query_sdk_logs(event='activation', date_range)
    if sdk_count == 0:
        return {"root_cause": "SDK未上报", "confidence": 0.95, "evidence": [...]}
    
    # Step 2: 点击日志匹配
    click_matched = mcp.check_click_match(media, date_range)
    if not click_matched:
        return {"root_cause": "点击日志未匹配，可能为非归因流量", ...}
    
    # Step 3: 归因状态
    attribution_success = mcp.check_attribution(media, date_range)
    if not attribution_success:
        return {"root_cause": "归因失败，可能为风控过滤", ...}
    
    # Step 4: 回传状态
    postback_status = mcp.check_postback(media, date_range)
    if postback_status != 200:
        return {"root_cause": f"媒体回传接口异常，状态码：{postback_status}", ...}
    
    # 默认结论
    return {"root_cause": "数据延迟，请等待同步", "confidence": 0.7, ...}
4.2.3 MCP 工具定义（Mock）
json
// Tool: query_sdk_logs
{
  "name": "query_sdk_logs",
  "description": "查询SDK原始日志量",
  "input_schema": {
    "properties": {
      "event": {"type": "string", "enum": ["activation", "register", "purchase"]},
      "start_date": {"type": "string"},
      "end_date": {"type": "string"},
      "media": {"type": "string"}
    }
  },
  "output_schema": {
    "properties": {
      "count": {"type": "integer"},
      "sample_logs": {"type": "array"}
    }
  }
}
// 类似定义：check_click_match, check_attribution, check_postback
4.2.4 前端组件
诊断路径可视化：横向流程图，高亮当前执行节点。

证据链列表：可展开，每一项支持 Mock 下钻（弹窗展示 Mock 日志）。

置信度进度条。

模块 3：对话式分析
4.3.1 功能点
功能	输入	输出	实现方式
意图识别与槽位填充	用户自然语言	模板类型、维度、指标、时间	LLM 提取，映射到预定义模板参数
模板查询执行	模板 ID + 参数	表格/图表数据	调用 Mock MCP，返回聚合数据
结果卡片渲染	数据	对比表格、趋势图	Recharts 渲染
追加指标/过滤	对话上下文	更新后的卡片	模拟状态保持
4.3.2 预置分析模板（Demo 实现 2 个）
模板名称	参数	返回格式
compare_dimensions	维度（如素材组）、指标（消耗、ROI）、时间范围、对比值（A vs B）	两列对比表格 + 差异箭头
top_n_analysis	维度（素材）、指标（消耗、转化率）、时间范围、N	Top N 列表 + 趋势迷你图
4.3.3 MCP 工具定义
json
// Tool: execute_analysis_template
{
  "name": "execute_analysis_template",
  "description": "执行预定义分析模板",
  "input_schema": {
    "properties": {
      "template_id": {"type": "string"},
      "params": {"type": "object"}
    }
  },
  "output_schema": {
    "properties": {
      "columns": {"type": "array"},
      "rows": {"type": "array"},
      "chart_data": {"type": "object"}
    }
  }
}
模块 4：素材 Agent
4.4.1 功能点
功能	输入	输出	实现方式
视频上传	本地视频文件	上传成功	前端上传组件
脚本生成	视频文件	结构化脚本文本	调用多模态 LLM API（Mock 返回固定脚本）
向量化与聚类	脚本文本	聚类标签、相似素材列表	使用预置向量和余弦相似度计算（Mock）
创意报表	素材 ID	消耗、转化等关联指标	关联 Mock 广告数据
4.4.2 脚本生成 Prompt（示例）
text
你是一个广告创意分析师。请观看以下视频，并输出一个结构化的脚本文本，包含以下字段：
- hook：开头3秒的抓人点
- conflict：主要冲突或痛点
- resolution：解决方案或反转
- cta：结尾行动号召
请用简洁中文描述。
Demo 阶段可直接返回 Mock 脚本。

4.4.3 向量聚类实现（Mock）
python
# 预置 10 个素材的脚本向量（384 维随机向量）
mock_embeddings = np.random.rand(10, 384)
# 计算相似度
def find_similar(video_id, top_k=3):
    target_vec = mock_embeddings[video_id]
    similarities = cosine_similarity([target_vec], mock_embeddings)[0]
    top_indices = np.argsort(similarities)[-top_k-1:-1][::-1]
    return [{"id": i, "score": similarities[i]} for i in top_indices]
4.4.4 前端组件
脚本生成卡片：展示结构化脚本的各个字段。

相似素材网格：展示相似素材的缩略图（占位）和相似度分数。

创意报表表格：展示素材的消耗、点击率、转化率（Mock）。

五、数据 Mock 规范
所有 MCP 工具在 Demo 阶段返回 Mock 数据，数据示例：

5.1 联调 Mock 数据
json
// check_prerequisites 响应
{
  "passed": true,
  "missing_items": [],
  "estimated_hours": 1.5
}

// 联调步骤日志
[
  {"step": 1, "name": "初始化浏览器", "status": "success", "message": "Chromium 启动成功"},
  {"step": 2, "name": "登录巨量工作台", "status": "success", "message": "检测到已登录状态"},
  ...
]
5.2 诊断 Mock 数据
json
// 激活 Gap 诊断结论
{
  "root_cause": "媒体回调 URL 时间戳单位从秒变更为毫秒，导致回传校验失败",
  "confidence": 0.92,
  "evidence": [
    {"step": "SDK日志检查", "result": "1242条激活日志", "status": "pass"},
    {"step": "归因检查", "result": "1200条归因成功", "status": "pass"},
    {"step": "回传检查", "result": "HTTP 400，错误信息：invalid timestamp", "status": "fail"}
  ],
  "suggestion": "请更新回传URL中的 __TIMESTAMP__ 宏，将值乘以1000"
}
5.3 分析模板 Mock 数据
json
// compare_dimensions 响应
{
  "columns": ["指标", "素材组A", "素材组B", "差异"],
  "rows": [
    {"metric": "消耗", "A": 12500, "B": 9800, "diff": "+27.5%"},
    {"metric": "ROI", "A": 1.32, "B": 1.15, "diff": "+14.8%"}
  ]
}
5.4 素材 Mock 数据
json
// 脚本生成响应
{
  "hook": "开局一把刀，装备全靠打",
  "conflict": "BOSS太强，一直过不去",
  "resolution": "使用新英雄，一招秒杀",
  "cta": "点击下载，领取限定皮肤"
}
六、验收标准
模块	验收项	通过标准
整体	主流程演示	可按照用户故事完成完整演示，无报错中断
联调	自动化流程可视化	进度条正确展示 9 个步骤，日志流动态更新
预检与配置	表单提交后能正确显示预检结果和工时预估
诊断	意图识别	输入 Gap 类问题能正确触发诊断流程
决策树执行	界面展示每一步的执行状态，最终输出证据链
置信度展示	诊断结论包含置信度百分比
分析	自然语言查询	“对比素材A和B的消耗和ROI”能正确返回表格
追加指标	对话中追加“再加一个点击率”能更新结果
素材	脚本生成	上传视频后能返回结构化脚本
相似推荐	展示至少 3 个相似素材及其相似度分数
七、前端界面布局建议
text
┌──────────────────────────────────────────────────────────────┐
│  [侧边栏]           │      主对话区                          │
│  - 新对话           │  ┌─────────────────────────────────┐  │
│  - 联调工具         │  │ 用户：帮我做巨量联调               │  │
│  - 素材分析         │  └─────────────────────────────────┘  │
│  - 历史记录         │  ┌─────────────────────────────────┐  │
│                    │  │ 系统：联调任务已创建，执行中...     │  │
│                    │  │ [进度条组件]                      │  │
│                    │  │ [日志流组件]                      │  │
│                    │  └─────────────────────────────────┘  │
│                    │  ┌─────────────────────────────────┐  │
│                    │  │ 系统：联调成功！[查看报告]         │  │
│                    │  └─────────────────────────────────┘  │
│                    │                                        │
│                    │  [输入框] [发送]                       │
└──────────────────────────────────────────────────────────────┘
组件复用：

所有 Agent 响应均使用卡片组件（诊断卡片、分析卡片、联调报告卡片、素材卡片）。

卡片支持折叠/展开、下钻弹窗。

八、交付物清单
源代码：前端 React 项目 + 后端 Python FastAPI 模拟服务。

启动脚本：一键启动前后端的脚本（或 Docker Compose）。

演示视频：录制完整主流程操作视频（备用）。

README：环境配置、启动步骤、Mock 数据修改说明。

九、后续对接真实系统的注意事项
所有 MCP 工具定义保持与真实系统一致，仅后端实现替换。

诊断决策树逻辑后续迁移至 Dify Workflow，但输入输出 Schema 不变。

分析模板 SQL 后续由数分团队提供，当前 Mock 数据结构与真实数仓字段对齐。