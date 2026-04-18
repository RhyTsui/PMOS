# MCP 工具定义

## 工具注册配置

```yaml
tools:
  # ========== 报表工具集 ==========
  - name: get_ad_hour_report
    description: 获取广告小时级报表数据
    input_schema:
      date_start: string (required)
      date_end: string (required)
      ad_ids: array (optional)
      optimizer_ids: array (optional)
    output_schema:
      data: array
      total: object

  - name: get_ad_day_report
    description: 获取广告日/周/月级报表数据
    input_schema:
      date_start: string (required)
      date_end: string (required)
      aggregate: enum [day, week, month] (required)
      filters: object (optional)
    output_schema:
      data: array
      total: object

  - name: get_ad_roi_report
    description: 获取广告 ROI 报表数据
    input_schema:
      date_start: string (required)
      date_end: string (required)
      project_ids: array (optional)
    output_schema:
      roi_data: array
      ltv_data: array

  - name: get_ad_retention_report
    description: 获取广告留存报表数据
    input_schema:
      date_start: string (required)
      date_end: string (required)
      retention_type: enum [next_day, day7, day30] (required)
    output_schema:
      retention_rate: array
      retention_users: array

  # ========== 标签工具集 ==========
  - name: list_team
    description: 获取广告团队/优化师列表
    input_schema:
      team_id: string (optional)
    output_schema:
      teams: array

  - name: list_apps
    description: 获取项目/应用列表
    input_schema: {}
    output_schema:
      apps: array

  - name: list_media
    description: 获取广告媒体列表
    input_schema:
      media_type: string (optional)
    output_schema:
      media: array

  # ========== 推送工具集 ==========
  - name: send_report_push
    description: 推送报表到指定渠道
    input_schema:
      report_type: string (required)
      scope: enum [day, week, month] (required)
      schedule: string (optional)
      recipients: array (required)
      channel: enum [wechat, email] (required)
    output_schema:
      status: string
      push_id: string
```

---

**路径**: `E:\AI\ai-os\subprojects\mcp\projects\广告聚合-mcp\docs\03-MCP 工具定义.md`
