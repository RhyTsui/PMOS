# Dataki Design Tokens 使用说明

## 1. Figma 变量建议分组
建议在 Figma Variables 中建立以下 Collections：

### Colors / Brand
- brand/navy
- brand/blue
- brand/cyan
- brand/violet
- brand/violetLight

### Colors / Neutral
- neutral/white
- neutral/bg
- neutral/gray900
- neutral/gray700
- neutral/gray500
- neutral/gray300
- neutral/gray100

### Colors / Semantic
- semantic/data
- semantic/dataAccent
- semantic/knowledge
- semantic/knowledgeAccent
- semantic/insight
- semantic/border
- semantic/textPrimary
- semantic/textSecondary
- semantic/textTertiary
- semantic/surface
- semantic/surfaceSubtle
- semantic/surfaceDataSoft
- semantic/surfaceKnowledgeSoft
- semantic/surfaceInsightSoft

### Typography
- font/family/brandLatin
- font/family/brandCJK
- font/size/hero
- font/size/h1
- font/size/h2
- font/size/h3
- font/size/bodyLg
- font/size/body
- font/size/bodySm
- font/size/caption

### Layout
- space/*
- radius/*
- shadow/*

## 2. 前端建议映射
- 数据类模块：使用 semantic/data / semantic/dataAccent
- 知识类模块：使用 semantic/knowledge / semantic/knowledgeAccent
- 洞察 / 推理结果：使用 semantic/insight + data-knowledge gradient
- 页面底色：surfaceSubtle
- 卡片：surface + border + card shadow

## 3. 推荐组件用色
### 主按钮
- bg: brand/blue
- text: neutral/white

### 次按钮
- bg: semantic/surfaceKnowledgeSoft
- text: brand/violet

### 洞察卡
- 标题: semantic/textPrimary
- 标签: semantic/knowledge
- 数据变化: semantic/data
- 背景: semantic/surface
- hover: semantic/surfaceInsightSoft

## 4. Logo 与产品系统统一原则
Dataki logo 使用的数据蓝 + 知识紫，不应只停留在品牌页。
建议在产品中形成统一视觉语义：
- 蓝 = 数据 / 事实 / 指标 / 实时
- 紫 = 知识 / 规则 / 经验 / 结构
- 蓝紫相遇 = 洞察 / 推理 / 生成 / 结论

这样 logo 与系统会形成统一的“语言系统”，而不是孤立品牌图形。
