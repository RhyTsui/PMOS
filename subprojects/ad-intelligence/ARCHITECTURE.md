# 广告素材情报项目架构

## 目录结构
```
ad-intelligence/
├── src/                    # 源代码
│   ├── server.ts           # Express 服务器入口
│   ├── collector/          # 广告素材采集模块
│   ├── analyzer/           # AI 分析模块 (OCR/标签)
│   └── api/                # API 路由
├── docs/                   # 项目文档
│   └── memory/             # 项目记忆
├── config/                 # 配置文件
├── tests/                  # 测试代码
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
└── .env.example            # 环境变量模板
```

## 技术栈
- 后端：TypeScript + Express
- 前端：Vite + React（待添加）
- 爬虫：Playwright（计划）
- OCR：Tesseract（计划）

## 模块划分
1. **采集模块** - 各大广告平台素材抓取
2. **分析模块** - OCR、标签识别、文案提取
3. **API 服务** - RESTful 数据接口
4. **可视化** - 趋势分析与竞品监控
