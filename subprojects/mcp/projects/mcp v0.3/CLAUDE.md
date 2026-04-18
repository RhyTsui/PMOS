# 广告聚合 MCP - CLAUDE 配置

## 项目定位
PMAIOS MCP 项目的子项目，负责广告报表聚合、标签筛选、报表推送的 MCP 工具集。

## 项目结构
```
广告聚合-mcp/
├── README.md              # 项目说明
├── CLAUDE.md              # 本文件（AI 配置）
├── docs/
│   ├── 01-产品需求文档.md
│   ├── 02-开发任务清单.md
│   └── 03-MCP 工具定义.md
├── src/tools/             # MCP 工具实现
├── tests/                 # 测试
└── config/                # 配置
```

## 开发规范
- 工具实现遵循 MCP Server 标准
- 配置与代码分离
- 文档随代码更新

## 核心工具
| 工具名 | 功能 |
|--------|------|
| `get_ad_hour_report` | 广告小时报表 |
| `get_ad_day_report` | 广告日/周/月报表 |
| `get_ad_roi_report` | 广告 ROI 报表 |
| `get_ad_retention_report` | 广告留存报表 |
| `list_team` | 优化师列表 |
| `list_apps` | 项目列表 |
| `list_media` | 媒体列表 |
| `send_report_push` | 报表推送 |

## 依赖
- 广告 BI 接口
- MCP Server 框架 (v0.3-cli-like)

## 参考
- 父项目：`subprojects/mcp/`
- 需求文档：`docs/01-产品需求文档.md`
