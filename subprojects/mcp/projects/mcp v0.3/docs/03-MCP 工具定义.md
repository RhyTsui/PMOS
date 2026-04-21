# MCP 工具定义

## 1. 使用原则

本版工具定义按两层维护：

1. **事实层**：当前代码或配置里已存在、可验证的工具
2. **目标层**：`v3.14.16` 页面与需求需要承接的能力

页面视图不必和工具一一对应。  
优先复用现有工具；只有在数据源、字段体系或筛选逻辑独立时，才新增工具。

## 2. 当前事实工具集

### 2.1 报表工具

```yaml
tools:
  - name: get_ad_hour_report
    description: 获取广告小时级报表数据，优先承接实时数据页
    input_schema:
      start: string
      end: string
      app_id: string
      media_id: string?
      team_ids: string[]?
    output_schema:
      rows: array
      summary: object

  - name: get_ad_day_report
    description: 获取广告日/周/月报表数据，优先承接概览页和日周月报
    input_schema:
      start: string
      end: string
      date_type: enum [day, natural_week, natural_month]
      app_id: string
      dimensions: string[]?
      filters: object?
    output_schema:
      rows: array
      summary: object

  - name: get_ad_roi_report
    description: 获取 ROI 相关报表数据，承接 ROI 分析并可部分承接 LTV 口径
    input_schema:
      start: string
      end: string
      app_id: string
      date_type: enum [day, natural_week, natural_month]
      dimensions: string[]?
      filters: object?
    output_schema:
      rows: array
      summary: object

  - name: get_ad_retention_report
    description: 获取留存报表数据，承接留存分析页
    input_schema:
      start: string
      end: string
      app_id: string
      data_type: enum [DEVICE_RETENTION, REG_RETENTION, PAY_D1_RETENTION]
      date_type: enum [DAY, NATURAL_WEEK, NATURAL_MONTH]
      dimensions: string[]?
      filters: object?
    output_schema:
      rows: array
      summary: object
```

### 2.2 实体查询工具

```yaml
tools:
  - name: list_team
    description: 获取团队、优化师等组织实体

  - name: list_apps
    description: 获取项目和应用实体

  - name: list_media
    description: 获取媒体实体
```

## 3. 页面级能力承接关系

| 页面 | 首选工具 | 说明 |
|---|---|---|
| 概览 | `get_ad_day_report` | 用于 KPI 汇总卡片与月趋势 |
| 实时数据 | `get_ad_hour_report` | 对应小时粒度 |
| 日周月报 | `get_ad_day_report` | 对应日/周/月聚合查询 |
| ROI 分析 | `get_ad_roi_report` | 对应 ROI 专题页 |
| 留存分析 | `get_ad_retention_report` | 对应留存专题页 |
| LTV 分析 | `get_ad_roi_report` 或候选独立工具 | 先复用，必要时再拆 |
| 广告素材 | 候选独立工具 | 当前需补素材报表能力定义 |
| 流量来源 | `get_ad_day_report` 或多维分析派生 | 不急着新造工具 |

## 4. 候选新增工具

以下不是当前事实能力，而是本版可补的候选工具：

```yaml
candidates:
  - name: get_ad_creative_report
    description: 广告素材报表能力，承接素材页和素材层问数
    trigger_condition: 当素材页需要独立数据源、字段体系和筛选能力时启用

  - name: get_ad_ltv_report
    description: LTV 专题报表能力，承接 ROI 无法稳定覆盖的长线价值分析
    trigger_condition: 当 ROI 工具无法满足 LTV1/LTV7/LTV30 和宽表展示时启用

  - name: get_ad_traffic_source_report
    description: 流量来源专题报表能力
    trigger_condition: 当流量来源页无法由日周月报或多维分析稳定派生时启用
```

## 5. 当前定义规则

1. 不再为“聚合分析引擎 MCP”单列工具，统一并入多维分析能力。
2. 概览页是组合视图，不新增独立 `overview` 工具。
3. 是否新增 `creative / ltv / traffic_source`，以真实页面数据边界为准，不靠命名想象。
4. 工具定义必须和 `04-v3.14.16页面与MCP映射.md` 保持一致。

---

**路径**: `E:\AI\ai-os\subprojects\mcp\projects\mcp v0.3\docs\03-MCP 工具定义.md`
