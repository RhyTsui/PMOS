# 广告聚合 MCP v3.14.16

## 当前定位

广告聚合 MCP 是广告业务问数与报表能力的统一承接层。

当前版本口径以 `docs/sources/inbox/` 中的输入为准，重点围绕：

1. 广告报表 MCP 能力
2. 标签与维度查询能力
3. 多维分析承接聚合诉求
4. 广州二部与需求池新增需求收口

## 当前版本文档

- `docs/prd.md`
- `docs/02-开发任务清单.md`
- `docs/03-MCP 工具定义.md`
- `docs/04-v3.14.16页面与MCP映射.md`

## 现状与目标

### 当前已存在的工具层事实

- 报表工具：`get_ad_hour_report`, `get_ad_day_report`, `get_ad_roi_report`, `get_ad_retention_report`
- 实体查询：`list_team`, `list_apps`, `list_media`

### 当前版本要承接的页面级需求

- 概览
- 实时数据
- 日周月报
- 流量来源
- 广告素材
- ROI 分析
- LTV 分析
- 留存分析

页面级需求不等于“一页一个 MCP 工具”。  
本版要求先把页面视图、报表语义、现有工具层和待补能力映射清楚，再进入开发排期。

## 项目结构

```text
subprojects/mcp/projects/mcp v0.3/
├── docs/
├── src/
├── tests/
└── config/
```
