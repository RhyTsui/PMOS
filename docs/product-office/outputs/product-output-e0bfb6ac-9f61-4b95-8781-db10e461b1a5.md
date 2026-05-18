# Page-by-page image2 prompt pack

## Design Scope
本次设计交付范围为一个 AI 埋点数据管理平台的三个核心页面：首页、需求中心、事件字典。设计风格需符合 B 端 SaaS 产品的专业、高效与清晰特征，强调数据可视化与操作流程的顺畅性。

## Page Inventory
1. **首页**：作为平台入口，提供全局概览与快捷导航。
2. **需求中心**：管理埋点需求的生命周期，核心业务操作区。
3. **事件字典**：查看与管理埋点事件定义的技术参考库。

## Page-by-Page Prompt Pack

### Page 1
- page name: 首页
- page goal: 展示平台核心价值与数据概览，提供快捷入口，帮助用户快速掌握当前埋点项目状态。
- target user / scenario: 产品经理/数据分析师，每日首次登录查看整体进度与待办事项。
- information hierarchy: 顶部导航 > 欢迎语/项目切换 > 核心数据卡片（待审核、进行中、已完成） > 快捷操作入口 > 最近动态列表。
- key sections: 全局导航栏、数据统计看板、快捷功能入口、最近操作记录。
- primary actions: 查看数据详情、跳转新建需求、切换项目空间。
- visual direction: 现代 B 端 SaaS 风格，浅色背景，卡片式布局，关键数据使用品牌色高亮，图表简洁清晰。
- layout constraints: 经典左右布局（左侧导航+顶部面包屑），栅格系统对齐，响应式适配考虑。
- required components: 侧边导航菜单、统计数字卡片、数据趋势迷你图、列表组件、按钮组件。
- prohibited traits: 禁止过度装饰性插画、禁止深色模式（除非特定主题）、禁止信息堆砌无留白。
- image2 main prompt: UI design of a SaaS dashboard homepage for an AI data tracking platform, clean and modern B2B style, light mode. Left sidebar navigation with icons. Main content area features a welcome header, a row of three summary statistic cards showing 'Pending', 'In Progress', and 'Completed' counts with small trend lines. Below cards is a 'Quick Actions' section with buttons. Bottom section shows a 'Recent Activity' table. Professional, high fidelity, 4k resolution, white and blue color palette.
- optional negative prompt: dark mode, messy, low quality, blurry, 3d icons, cartoonish, heavy gradients.

### Page 2
- page name: 需求中心
- page goal: 集中管理埋点需求，支持用户进行需求的创建、查询、审批及状态流转。
- target user / scenario: 产品经理提交需求，开发/数据同学查看待办并进行处理。
- information hierarchy: 筛选/搜索区 > 功能按钮区（新建） > 数据表格列表（ID、名称、状态、负责人、时间） > 分页控件。
- key sections: 高级筛选栏、需求列表表格、状态标签、批量操作栏。
- primary actions: 新建需求、搜索/筛选、查看详情、变更状态。
- visual direction: 功能导向型设计，强调表格的可读性与操作效率，状态标签色彩区分明确（进行中-蓝、待审核-橙、已完成-绿）。
- layout constraints: 表格占据主要视口高度，筛选区紧凑置顶，操作按钮固定在表格上方。
- required components: 搜索输入框、下拉选择器、日期选择器、数据表格、状态标签、分页器、主次按钮。
- prohibited traits: 禁止表格行高过大导致一屏展示数据过少、禁止状态颜色混淆。
- image2 main prompt: UI design of a Requirement Center page for a data tracking platform, enterprise software style. Top area has a filter bar with search box, status dropdown, and date picker. A primary blue 'New Requirement' button is on the top right. Main content is a clean data table with columns for ID, Requirement Name, Status tags (color-coded), Assignee, and Update Time. Hover state on a row. Clean white background, sharp typography, high fidelity.
- optional negative prompt: dark mode, cluttered, poor alignment, unrealistic text, distorted layout, mobile view.

### Page 3
- page name: 事件字典
- page goal: 提供所有埋点事件的标准化定义查询，作为技术实施与数据校验的参考依据。
- target user / scenario: 开发人员查找事件 ID 进行代码埋点，数据分析师确认字段定义。
- information hierarchy: 左侧分类树状导航 > 右侧详情区（事件基础信息、属性字段列表、预置参数、代码示例）。
- key sections: 事件分类树、事件详情卡片、属性参数表格、JSON 预览块。
- primary actions: 搜索事件、展开分类树、复制事件 ID/字段、查看示例代码。
- visual direction: 技术文档风格，左右分栏结构，强调代码块与参数名的易读性，使用等宽字体展示代码。
- layout constraints: 左侧树宽度固定，右侧自适应，详情区内信息分组清晰。
- required components: 树形控件、详情面板、描述列表、代码块组件、复制图标、搜索框。
- prohibited traits: 禁止纯文本堆砌无结构、禁止代码块无背景色区分。
- image2 main prompt: UI design of an Event Dictionary page, technical documentation style. Layout is split-view. Left side has a search bar and a tree view menu for event categories. Right side displays detailed event information: a header with event name and ID, a table listing event properties and types, and a bottom section showing a JSON code snippet preview with a copy button. Monospaced font for code. Clean, structured, developer-friendly interface, high fidelity.
- optional negative prompt: artistic, colorful, messy text, lack of structure, dark mode, low resolution.

## Generated Design Images

- No design image was generated.

## Image Generation Warnings

- 首页: API key not valid. Please pass a valid API key. [status=400]
- 需求中心: API key not valid. Please pass a valid API key. [status=400]
- 事件字典: API key not valid. Please pass a valid API key. [status=400]
