# 广告自动化项目架构

## 目录结构
```
ad/
├── src/                    # 后端源代码 (Python/FastAPI)
│   └── ad/                 # Python 包
├── frontend/               # 前端源代码 (React + Vite)
│   ├── src/
│   ├── public/
│   └── index.html
├── automation/             # 广告自动化与 Agent 设计
│   └── CLAUDE.md
├── docs/                   # 项目文档
│   └── memory/             # 项目记忆
├── config/                 # 配置文件
├── tests/                  # 测试代码
├── pyproject.toml          # Python 项目配置
├── package.json            # 前端依赖配置
└── docker-compose.yml      # Docker 编排
```

## 技术栈
- 后端：Python + FastAPI
- 前端：React + Vite + ECharts
- 部署：Docker Compose

## 模块划分
1. **API 服务** - FastAPI 后端，提供数据查询与分析接口
2. **前端可视化** - React + ECharts 流量可视化
3. **自动化模块** - 广告 Agent、归因分析、可观测性
