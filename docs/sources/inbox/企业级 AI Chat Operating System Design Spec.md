统一语义契约 是上层总契约，定义结果如何被前端自主渲染：screenType / regions / evidenceRefs / sourceRefs / action。Data Visualization UX 不能另起一套并行契约，应该作为统一语义契约里的一个渲染域，类似：
  contract / componentBindings。
 SemanticResultContract
    └─ regions[]
        └─ componentBinding: "data-visualization"


企业级 AI Chat Operating System Design Spec
01-visual-system
02-interaction-system
03-frontend-engineering
04-ai-chat-system
05-data-visualization
06-agent-workflow-system

包括
一、视觉设计规范（Visual System）

这是你现在正在做的“字体、颜色、图标”层。

1. Typography（字体系统）

你已经在做。

包括：

字体族
字号体系
字重体系
行高
字间距
数字字体
中英文混排规则
等宽字体
标题层级
Label/Caption/Body 规范
Token 化命名
2. Color System（色彩系统）

包括：

主色
功能色
中性色
背景层级
Hover/Active/Disabled
Dark Mode
透明度规范
渐变规范
图表配色
风险等级颜色
AI 状态颜色
3. Icon System（图标系统）

你正在做。

包括：

图标库
尺寸体系
描边粗细
Filled / Outlined
图标语义
AI 专属图标
数据类图标
Hover/Active
动效规则
4. Spacing System（间距系统）

很多系统最容易乱。

包括：

Grid
间距 scale
页面边距
Card padding
Section gap
Flex gap
表单间距
弹窗间距
响应式 spacing
5. Radius & Border（圆角边框系统）

包括：

圆角等级
Border color
分割线
Hairline
Card 边框
Focus ring
阴影与边框关系
6. Shadow & Elevation（层级系统）

包括：

阴影层级
浮层层级
Modal 层级
Drawer 层级
Tooltip 层级
AI 面板层级
毛玻璃/backdrop-filter 规范
7. Motion System（动效系统）

这个在 AI Chat 非常重要。

包括：

页面切换
渐进显示
Skeleton
打字机
流式输出
Loading
Hover 动效
列表插入动画
Toast 动效
AI 思考状态
Framer Motion 规范
动效时长
easing 曲线
8. Illustration / Visual Language（视觉语言）

包括：

AI 风格
插画风格
Empty 状态
Loading 状态
Logo 风格
Banner 风格
图表视觉统一
二、交互体验规范（Interaction System）

这是很多系统缺失的部分。

9. Navigation System（导航系统）

包括：

Chat-first 导航
无菜单设计
动态入口
快捷入口
面包屑
Workspace 切换
多项目切换
最近访问
Command Palette
10. Conversation UX（会话体验系统）

这是你系统核心。

包括：

消息布局
用户/AI 消息规范
思维链展示
Tool Call 展示
Trace 展示
引用消息
消息状态
Streaming UX
长消息折叠
Markdown 规范
多 Agent 展示
结果卡片规范
结构化消息规范
AI 状态机
会话恢复
多轮追问
上下文压缩
11. Input System（输入系统）

包括：

输入框
Mention
Slash Commands
Prompt Shortcut
文件上传
拖拽
粘贴
语音
多模态输入
Prompt 模板
输入状态
自动补全
12. Feedback System（反馈系统）

包括：

Toast
Error
Warning
Success
Retry
空状态
AI 错误解释
权限失败
MCP 拒绝
数据延迟提示
Loading Feedback
13. Data Visualization UX（数据可视化体验）

你这个广告系统很重要。

包括：

指标卡
表格规范
Drill-down
图表交互
Sankey
路径分析
Tooltip
大数据量处理
移动端展示
图表联动
AI Insight 展示
14. Workflow UX（工作流体验）

包括：

Agent 执行流
DAG Viewer
Trace Timeline
任务状态
自动化任务
Step 展示
Review Gate
Retry UX
异常恢复
执行日志
15. Permission UX（权限体验）

企业系统核心。

包括：

无权限状态
部分权限
引导申请权限
权限解释
脱敏展示
多角色视角
16. AI Trust UX（AI可信体验）

未来很重要。

包括：

Evidence
引用来源
Confidence
推理状态
是否 AI 推断
是否真实数据
AI 幻觉风险提示
人工确认机制
三、前端工程规范（Frontend Engineering System）

这是你刚才提到的“会话长加载性能规范”那一层。

17. Rendering Architecture（渲染架构）

包括：

虚拟列表
懒加载
分块渲染
Suspense
Streaming Rendering
SSR/CSR 边界
大消息优化
Markdown 性能
React 渲染边界
18. State Management（状态管理）

包括：

全局状态
会话状态
Workflow 状态
缓存策略
optimistic update
store 分层
memory cache
persistence
19. Data Fetching（数据获取规范）

包括：

cursor pagination
polling
websocket
streaming
retry
timeout
cache strategy
SWR/react-query
数据一致性
20. Performance System（性能规范）

你已经开始做了。

包括：

首屏时间
会话加载
图片优化
bundle split
code split
virtualization
chart optimization
memo strategy
fps
动效性能
21. Component System（组件体系）

包括：

基础组件
业务组件
AI 组件
schema renderer
registry
token system
主题系统
组件命名
22. Responsive System（响应式规范）

包括：

Desktop-first
移动端适配
超宽屏
折叠策略
平板
输入方式适配
23. Accessibility（可访问性）

包括：

键盘导航
aria
focus
screen reader
色弱支持
高对比模式
24. Security UX（安全与风控体验）

包括：

敏感数据展示
Token 隐藏
风险操作确认
AI 风控提示
审计痕迹
25. Observability UX（可观测性体验）

你系统会非常重要。

包括：

Trace Viewer
Agent Timeline
Tool Call
Latency
Error Surface
Prompt Version
Execution Replay