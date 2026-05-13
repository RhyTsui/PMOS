# AIFS (AI Intelligent Flow System) - 技术规格文档

## 1. Concept & Vision

AIFS 是一个 AI-First 的广告数据智能中枢，通过电影级视觉设计与对话式交互范式，为广告优化师提供全方位的 AI 赋能。整体体验如同置身于未来控制中心，每一个数据点都散发着呼吸灯般的光芒，每一次交互都带来流畅的视觉反馈。

## 2. Design Language

### 2.1 Aesthetic Direction
**风格定位**: 深色未来主义 + 呼吸灯特效 (Cyberpunk Control Center)

### 2.2 Color Palette
```css
:root {
  /* 主色调 - 深空蓝 */
  --primary: #0A0E1A;
  --primary-light: #141B2D;

  /* 强调色 - 科技青 */
  --accent: #00D9FF;
  --accent-glow: rgba(0, 217, 255, 0.3);
  --accent-soft: rgba(0, 217, 255, 0.1);

  /* 呼吸灯渐变 */
  --breath-start: rgba(0, 217, 255, 0.4);
  --breath-end: rgba(0, 217, 255, 0.05);

  /* 功能色 */
  --success: #00FF88;
  --warning: #FFB800;
  --danger: #FF3366;
  --info: #7B61FF;

  /* 文本 */
  --text-primary: #FFFFFF;
  --text-secondary: #8B9DC3;
  --text-muted: #4A5568;

  /* 边框与分割 */
  --border: rgba(0, 217, 255, 0.15);
  --border-active: rgba(0, 217, 255, 0.5);

  /* 玻璃态 */
  --glass-bg: rgba(10, 14, 26, 0.8);
  --glass-border: rgba(0, 217, 255, 0.1);
}
```

### 2.3 Typography
- **UI 字体**: Inter (Google Fonts) - 界面文字
- **数据字体**: JetBrains Mono (Google Fonts) - 数字、代码、指标
- **字号系统**:
  - Hero: 32px / 2rem
  - H1: 24px / 1.5rem
  - H2: 18px / 1.125rem
  - Body: 14px / 0.875rem
  - Caption: 12px / 0.75rem
  - Mono Data: 13px / 0.8125rem

### 2.4 Spatial System
- **基础单位**: 4px
- **间距**: 4, 8, 12, 16, 24, 32, 48, 64px
- **圆角**: 4px (小), 8px (中), 12px (大), 16px (卡片)
- **Dock 圆角**: 24px (底部浮动)

### 2.5 Motion Philosophy
- **呼吸灯效果**: 3s ease-in-out infinite, opacity 0.4 → 1 → 0.4
- **入场动画**: 400ms ease-out, translateY(10px) → 0, opacity 0 → 1
- **交互反馈**: 150ms ease, scale 0.98 → 1
- **面板切换**: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- **打字机效果**: 50ms per character

### 2.6 Visual Assets
- **图标库**: Lucide React (stroke-width: 1.5)
- **装饰元素**:
  - 网格背景 (CSS linear-gradient)
  - 光晕效果 (box-shadow with accent color)
  - 扫描线动画 (repeating-linear-gradient)

## 3. Layout & Structure

### 3.1 整体布局 (Conversation-First)
```
┌─────────────────────────────────────────────────────┐
│  Header: Logo + 标题 + 状态指示器                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   主对话区域                          │
│              (全屏对话流 + 消息卡片)                   │
│                                                     │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [输入区域] - 消息输入框 + 快捷操作                     │
├─────────────────────────────────────────────────────┤
│  [底部 Dock] - 8 大 Agent 快速切换 (浮动圆角)          │
└─────────────────────────────────────────────────────┘
```

### 3.2 Agent 视图布局 (当切换到特定 Agent 时)
```
┌─────────────────────────────────────────────────────┐
│  ← 返回 | Agent 名称 + 图标 + 状态                     │
├────────────────────┬────────────────────────────────┤
│                    │                                 │
│    侧边面板        │        主内容区                  │
│   (可选数据列表)    │    (Agent 专属功能界面)           │
│                    │                                 │
│                    │                                 │
└────────────────────┴────────────────────────────────┘
```

### 3.3 响应式策略
- **Desktop (≥1280px)**: 全功能布局，Dock 完整显示
- **Tablet (768-1279px)**: Dock 收起为图标模式
- **Mobile (<768px)**: 单列布局，Dock 简化为 4 宫格

## 4. Features & Interactions

### 4.1 智能对话中枢 (Cognitive Hub)
- **消息类型**:
  - 用户消息 (右对齐，科技青边框)
  - AI 响应 (左对齐，玻璃态背景)
  - 系统通知 (居中，淡灰色)
  - 代码块 (深色背景，JetBrains Mono)
  - 数据卡片 (图表/指标展示)
- **交互行为**:
  - Enter 发送, Shift+Enter 换行
  - 消息发送后立即显示"思考中"动画
  - AI 响应流式输出 (打字机效果)
  - 点击消息可复制/重新生成

### 4.2 底部 Dock
- **8 大 Agent 图标**:
  1. 🧠 认知中枢 (Hub) - 默认
  2. 📢 广告助手 (Ad)
  3. 📊 监控中心 (Monitor)
  4. 🔍 诊断专家 (Diagnosis)
  5. 📈 分析引擎 (Analysis)
  6. 🔧 联调工具 (Integration)
  7. 📨 回传配置 (Postback)
  8. 🔮 预测模型 (Prediction)
- **状态指示**: 每个 Agent 有运行中/空闲/告警状态
- **悬停效果**: 放大 + 发光 + 显示名称

### 4.3 广告助手 (Ad Assistant)
- **知识问答**: 自然语言查询媒体政策/指标定义
- **指标卡片**: 展示 ROAS, CPM, CPA 等计算过程
- **需求收集**: 表单引导提交对接信息

### 4.4 监控 Agent (Monitoring Agent)
- **实时指标卡**: 展示延迟、QPS、错误率
- **趋势图表**: 迷你折线图 (Recharts)
- **告警列表**: 红/黄/绿状态展示

### 4.5 诊断 Agent (Diagnosis Agent)
- **链路图**: 全链路可视化
- **日志追溯**: 时间线展示
- **根因分析**: AI 生成的诊断结论

### 4.6 分析 Agent (Analysis Agent)
- **多维分析**: 媒体/用户/转化维度
- **洞察卡片**: AI 生成的结论摘要
- **数据导出**: 一键导出 CSV

### 4.7 联调 Agent (Integration Agent)
- **模拟环境**: Debug 虚拟机
- **日志流**: 实时展示回传日志
- **代码生成**: 自动生成埋点代码

### 4.8 回传 Agent & 预测 Agent
- **策略配置**: 表单 + 预览
- **ROI 预测**: 图表 + 置信区间

## 5. Component Inventory

### 5.1 MessageBubble
- **States**: user, assistant, system, loading
- **Variants**: text, code, card, chart
- **Animation**: fade-in + slide-up

### 5.2 AgentDock
- **States**: default, hover, active, alerting
- **Icons**: 8 agents with unique icons
- **Position**: fixed bottom, centered

### 5.3 InputArea
- **States**: default, focused, disabled, loading
- **Features**: auto-resize, submit button, clear

### 5.4 MetricCard
- **States**: normal, warning, critical
- **Variants**: small (dock), medium (monitor), large (dashboard)
- **Animation**: glow pulse on alert

### 5.5 StatusBadge
- **States**: online, idle, warning, error
- **Animation**: breathing glow for active states

### 5.6 GlassPanel
- **Variants**: header, sidebar, content, modal
- **Effect**: backdrop-blur + border glow

### 5.7 CodeBlock
- **Features**: syntax highlight, copy button, language tag
- **Theme**: custom dark theme matching palette

## 6. Technical Approach

### 6.1 Framework & Architecture
- **Framework**: Next.js 16 (App Router)
- **State Management**: React Context + useReducer (Agent state)
- **Styling**: Tailwind CSS 4 + CSS Variables
- **Icons**: Lucide React
- **Charts**: Recharts

### 6.2 Data Flow
```
User Input → AgentRouter → [Specialized Agent] → Response
                ↓
         Context Store (maintains conversation history)
```

### 6.3 Agent Simulation
由于无真实后端，采用前端模拟 Agent 响应：
- 预设响应模板
- 随机延迟模拟思考
- 打字机效果输出
- 本地存储对话历史

### 6.4 Key Components Structure
```
src/
├── app/
│   ├── layout.tsx          # 根布局 + 字体加载
│   ├── page.tsx            # 主页面 (Cognitive Hub)
│   └── agents/
│       ├── ad-assistant/   # 广告助手
│       ├── monitoring/     # 监控中心
│       ├── diagnosis/      # 诊断专家
│       ├── analysis/       # 分析引擎
│       ├── integration/     # 联调工具
│       ├── postback/       # 回传配置
│       └── prediction/     # 预测模型
├── components/
│   ├── cognitive/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── InputArea.tsx
│   │   └── AgentDock.tsx
│   ├── agents/
│   │   └── [AgentPanel].tsx
│   └── ui/
│       ├── MetricCard.tsx
│       ├── StatusBadge.tsx
│       ├── GlassPanel.tsx
│       └── CodeBlock.tsx
├── lib/
│   ├── agents/             # Agent 逻辑
│   │   ├── router.ts       # Agent 路由
│   │   ├── adAssistant.ts
│   │   ├── monitoring.ts
│   │   └── ...
│   └── constants.ts        # 常量定义
├── hooks/
│   ├── useConversation.ts  # 对话管理
│   └── useAgent.ts         # Agent 状态
└── types/
    └── index.ts            # TypeScript 类型
```

## 7. Animation Specifications

### 7.1 呼吸灯效果
```css
@keyframes breathe {
  0%, 100% { opacity: 0.4; box-shadow: 0 0 10px var(--accent-glow); }
  50% { opacity: 1; box-shadow: 0 0 30px var(--accent-glow), 0 0 60px var(--accent-soft); }
}
.breathe { animation: breathe 3s ease-in-out infinite; }
```

### 7.2 扫描线效果
```css
@keyframes scanline {
  0% { background-position: 0 0; }
  100% { background-position: 0 100%; }
}
```

### 7.3 打字机效果
```typescript
const typewriter = (text: string, callback: (char: string) => void, speed = 50) => {
  // 实现逐字输出
};
```

## 8. Accessibility

- 键盘导航支持 (Tab, Enter, Escape)
- ARIA labels for all interactive elements
- 足够的颜色对比度 (4.5:1 minimum)
- Focus visible indicators
- Screen reader friendly structure
