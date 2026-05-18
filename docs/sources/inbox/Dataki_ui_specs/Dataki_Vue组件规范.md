# Dataki Vue 组件规范（面向 WeKnora 二开）

## 1. 目标
这套规范不是单纯换皮，而是把 Dataki 的品牌语义真正落到 Vue 产品界面里：

- 蓝：数据 / 指标 / 事实 / 实时状态
- 紫：知识 / 规则 / 口径 / Wiki / 结构
- 蓝紫渐变：相遇 / 推理 / 洞察 / 生成
- 深海军蓝：系统底色 / 高级状态 / 全局品牌锚点

Dataki 的界面核心不是“报表工具感”，而是“数据与知识交汇的智能系统感”。

---

## 2. 全局设计原则

### 2.1 视觉原则
1. **信息分层清晰**
   - 页级：背景弱、内容强
   - 模块级：卡片化
   - 结果级：洞察优先于辅助信息

2. **语义颜色优先**
   - 不要随意按组件习惯上色
   - 必须先判断它属于：数据、知识、洞察、系统

3. **AI结果与普通内容必须区分**
   - 普通数据卡 ≠ AI洞察卡
   - Wiki内容区 ≠ 对话回答区

4. **避免传统BI厚重感**
   - 少大面积深灰
   - 少强边框
   - 多留白、多层次弱底色

---

## 3. 布局层级规范

## 3.1 页面级容器
```css
.page-shell {
  background: var(--dataki-color-surface-subtle);
  color: var(--dataki-color-text-primary);
  min-height: 100vh;
}
```

### 规则
- 页面底色统一 `surfaceSubtle`
- 主内容区左右留白建议 `32px ~ 48px`
- 核心内容区最大宽度建议 `1280px ~ 1440px`

---

## 3.2 区块级容器
```css
.section-card {
  background: var(--dataki-card-bg);
  border: 1px solid var(--dataki-card-border);
  border-radius: var(--dataki-card-radius);
  box-shadow: var(--dataki-card-shadow);
}
```

### 规则
- 除首页 Hero 外，核心模块尽量卡片化
- 同层卡片圆角保持一致
- 不要在一个页面里混用太多不同圆角体系

---

## 4. 核心组件规范

## 4.1 AppHeader（全局头部）
### 定位
Dataki 的系统导航入口，不是后台工具栏。

### 结构
- 左：Dataki Logo + 名称
- 中：导航（洞察 / Wiki / 数据 / Agent / 连接）
- 右：全局搜索、主题切换、用户菜单

### 风格
- 高度：64px
- 背景：白色或半透明白
- 底边：1px 弱边框
- Logo 左上角固定使用品牌主标或 icon

### Vue Props
```ts
interface AppHeaderProps {
  activeKey?: string
  showSearch?: boolean
  showThemeSwitch?: boolean
}
```

---

## 4.2 HeroSearch（首页主输入）
### 定位
首页第一屏的核心交互，不是普通搜索框，而是“Dataki 入口”。

### 结构
- 上：标题
- 中：一句解释
- 下：大输入框 + 示例问题 chips

### 状态
- 默认态：浅底 + 弱边框
- Hover：边框增强
- Focus：蓝紫发光边缘
- Loading：右侧出现流动态 icon

### Vue Props
```ts
interface HeroSearchProps {
  placeholder?: string
  suggestions?: string[]
  loading?: boolean
}
```

### 建议样式
```css
.hero-search {
  background: #fff;
  border: 1px solid var(--dataki-color-border);
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(11,19,43,0.08);
}
.hero-search:focus-within {
  border-color: var(--dataki-brand-violet);
  box-shadow: 0 0 0 4px rgba(179,136,255,0.18);
}
```

---

## 4.3 InsightCard（洞察卡）
### 定位
Dataki 最重要的内容组件，用于展示 AI 得出的结论、解释、归因与建议。

### 结构
- 顶部：标题 + 类型标签
- 中部：一句主结论
- 下部：支撑依据（数据/知识来源）
- 底部：操作（追问 / 生成Wiki / 分享）

### 标签类型
- 数据洞察
- 知识解释
- 综合结论
- 风险提示
- 推荐动作

### 颜色规范
- 卡片标题：`textPrimary`
- 主结论可使用深色或渐变标题
- 标签：
  - 数据类：蓝底浅蓝
  - 知识类：紫底浅紫
  - 综合类：蓝紫渐变细描边

### Vue Props
```ts
interface InsightCardProps {
  title: string
  summary: string
  type?: 'data' | 'knowledge' | 'mixed' | 'risk' | 'action'
  evidence?: Array<{label: string; value: string}>
  actions?: string[]
}
```

---

## 4.4 DataMetricCard（指标卡）
### 定位
承载 KPI / 指标变化 / 趋势信息。

### 结构
- 指标名
- 当前值
- 环比/同比
- 小趋势图（可选）

### 颜色规范
- 数值主色：深色
- 上升/健康：蓝或青
- 下滑/异常：建议使用偏红橙，但需要低占比，不能破坏品牌体系
- 辅助线图：优先用数据蓝

### Vue Props
```ts
interface DataMetricCardProps {
  label: string
  value: string
  trend?: string
  status?: 'normal' | 'up' | 'down' | 'warning'
}
```

---

## 4.5 KnowledgePanel（知识面板）
### 定位
展示 Wiki、指标口径、规则文档、历史沉淀。

### 结构
- 顶部：标题 + 来源
- 主体：摘要 / 结构化条目
- 底部：查看全文 / 引用 / 更新记录

### 风格
- 背景：`surfaceKnowledgeSoft`
- 标签：紫色体系
- 内容区排版偏文档感，而不是卡片摘要感

### Vue Props
```ts
interface KnowledgePanelProps {
  title: string
  source?: string
  content: string
  tags?: string[]
}
```

---

## 4.6 SourceTraceList（来源追踪）
### 定位
Dataki 的可信度组件。所有关键结论应尽可能能回溯到数据或知识来源。

### 结构
- 来源类型图标
- 来源标题
- 来源摘要
- 跳转按钮

### 来源类型
- 数据源
- Wiki
- 指标口径
- SQL结果
- 外部文档
- Agent输出

### Vue Props
```ts
interface SourceTraceListProps {
  items: Array<{
    type: 'data' | 'wiki' | 'metric' | 'sql' | 'doc' | 'agent'
    title: string
    desc?: string
    href?: string
  }>
}
```

---

## 4.7 ChatAnswerBlock（对话结果块）
### 定位
在问答页承载“Dataki 回答”。

### 结构
- 回答标题
- 结论段
- 分点说明
- 证据引用
- 建议动作

### 风格要求
- 文本排版舒展
- 引用块与正文要区分
- 不要像普通 IM 聊天气泡，应该更像“智能分析结果容器”

---

## 4.8 AgentActionPanel（Agent动作面板）
### 定位
展示当前 Dataki 通过 Agent 触发的动作，例如：
- 生成 Wiki
- 回写结论
- 调用 SQL
- 同步文档
- 发送通知

### 结构
- Agent 名称
- 当前状态
- 动作描述
- 输出结果 / 日志摘要

### 状态色
- 待执行：灰
- 执行中：蓝
- 成功：青蓝
- 失败：可用橙/红，但控制比例

---

## 5. 首页组件组合建议

首页建议最少包含以下组件：
1. AppHeader
2. HeroSearch
3. ValueFeatureCard × 3
4. CapabilityFlow
5. InsightPreviewCard × 2
6. KnowledgePanelPreview
7. FooterCTA

---

## 6. 响应式规范

### Desktop（≥1280）
- 首页 Hero 左右布局可做 6:4 或 7:5
- 能力区可 3~4 列

### Tablet（768~1279）
- Hero 改为上下布局
- 卡片区 2 列

### Mobile（<768）
- 全部单列
- Hero 输入框保持首屏优先
- 洞察卡片简化层级，减少浮层和多列信息

---

## 7. 建议目录结构（Vue）
```bash
src/
  components/
    layout/
      AppHeader.vue
      AppSidebar.vue
    hero/
      HeroSearch.vue
    cards/
      InsightCard.vue
      DataMetricCard.vue
      ValueFeatureCard.vue
    panels/
      KnowledgePanel.vue
      SourceTraceList.vue
      AgentActionPanel.vue
    chat/
      ChatAnswerBlock.vue
  views/
    HomeView.vue
    InsightView.vue
    WikiView.vue
  styles/
    tokens.css
    semantic.css
```

---

## 8. 落地建议
- 第一阶段：先做 HomeView + InsightCard + HeroSearch
- 第二阶段：接 SourceTraceList + KnowledgePanel
- 第三阶段：接 AgentActionPanel + AutoWiki 页面

Dataki 不应先从“复杂后台”开始，而应先做出“入口 + 洞察 + 沉淀”三个最核心体验。
