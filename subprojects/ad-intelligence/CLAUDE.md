# 广告素材情报项目 CLAUDE 配置

## 项目定位
广告素材采集与分析系统，用于抓取和分析各大广告平台（Facebook Ads Library, TikTok, Google Ads 等）的创意素材。

## 技术栈
- TypeScript + Express 后端
- Vite + React 前端（待添加）
- 计划集成：Playwright（爬虫）、Tesseract（OCR）

## 开发规范
- 代码以中文注释为主，变量名用英文
- 新功能优先写测试
- API 设计遵循 RESTful 风格

## 核心功能规划
1. 广告素材采集模块
2. AI 分析模块（OCR、标签识别、文案提取）
3. 趋势分析与可视化
4. 竞品广告监控

## 注意事项
- 爬虫需遵守各平台 robots.txt
- 注意请求频率限制
- 敏感数据（API Keys）存入 .env 文件
