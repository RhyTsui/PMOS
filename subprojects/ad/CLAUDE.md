# Ads Flow Insight 项目 CLAUDE 配置

## 项目定位
本地广告流量分析系统，可视化展示广告点击到转化的用户流转。

## 技术栈
- 后端：Python + FastAPI
- 前端：React + Vite + ECharts
- 数据：Mock 数据（暂无真实数据源）

## 开发规范
- 后端从 `ad/` 目录运行：`pip install -e .` && `ad`
- 前端从 `ad/frontend/` 目录运行：`npm run dev`
- 后端端口：8020，前端端口：5180
- API 请求通过 Vite 代理转发到后端

## 核心功能
- Sankey 图展示用户流转（click → filter → install → new_user/old_device）
- 用户追踪查询
- 健康检查接口

## 注意事项
- 节点使用规范 ID：`click`, `filter`, `install`, `new_user`, `old_device`
- 支持 Docker Compose 一键启动
