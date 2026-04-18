# CLI-like Validation Report

## Summary
```json
{
  "by_category": {
    "业务场景": {
      "cli_success_rate": 0.75,
      "equivalence_rate": 0.75,
      "native_success_rate": 0.75,
      "total": 4
    },
    "多维度交叉": {
      "cli_success_rate": 1.0,
      "equivalence_rate": 1.0,
      "native_success_rate": 1.0,
      "total": 12
    },
    "多轮对话": {
      "cli_success_rate": 1.0,
      "equivalence_rate": 1.0,
      "native_success_rate": 1.0,
      "total": 4
    },
    "媒体识别": {
      "cli_success_rate": 0.8571,
      "equivalence_rate": 0.8571,
      "native_success_rate": 0.8571,
      "total": 7
    },
    "数据准确性": {
      "cli_success_rate": 0.75,
      "equivalence_rate": 0.75,
      "native_success_rate": 0.75,
      "total": 12
    },
    "日期识别": {
      "cli_success_rate": 0.75,
      "equivalence_rate": 0.75,
      "native_success_rate": 0.75,
      "total": 8
    },
    "用户反馈": {
      "cli_success_rate": 0.0,
      "equivalence_rate": 0.0,
      "native_success_rate": 0.0,
      "total": 1
    },
    "语义理解": {
      "cli_success_rate": 0.64,
      "equivalence_rate": 0.64,
      "native_success_rate": 0.64,
      "total": 25
    },
    "边缘场景": {
      "cli_success_rate": 0.5,
      "equivalence_rate": 0.5,
      "native_success_rate": 0.5,
      "total": 4
    }
  },
  "by_mode": {
    "cli": {
      "success_count": 58,
      "success_rate": 0.7532
    },
    "native": {
      "success_count": 58,
      "success_rate": 0.7532
    }
  },
  "equivalence_rate": 0.7532,
  "metrics": {
    "参数完整率": 0.7532,
    "参数正确率": 0.7289,
    "工具匹配准确率": 0.7532,
    "幻觉/拒绝率": 0.2468,
    "格式合规率": 0.7532
  },
  "processable_cases": 70,
  "total_cases": 77
}
```

## By Category
| Category | Total | CLI Success | Native Success | Equivalence |
|---|---:|---:|---:|---:|
| 业务场景 | 4 | 0.75 | 0.75 | 0.75 |
| 多维度交叉 | 12 | 1.0 | 1.0 | 1.0 |
| 多轮对话 | 4 | 1.0 | 1.0 | 1.0 |
| 媒体识别 | 7 | 0.8571 | 0.8571 | 0.8571 |
| 数据准确性 | 12 | 0.75 | 0.75 | 0.75 |
| 日期识别 | 8 | 0.75 | 0.75 | 0.75 |
| 用户反馈 | 1 | 0.0 | 0.0 | 0.0 |
| 语义理解 | 25 | 0.64 | 0.64 | 0.64 |
| 边缘场景 | 4 | 0.5 | 0.5 | 0.5 |

## Failures
- DATE-003: cli=unable to derive cli command from query native=unable to infer expected operation from query
- DATE-F005: cli=missing required parameter: time_range native=missing required parameter: time_range
- MEDIA-004: cli=missing required parameter: time_range native=missing required parameter: time_range
- CSEM-001: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-009: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-025: cli=unable to derive cli command from query native=unable to infer expected operation from query
- SEM-026: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-F015: cli=unable to derive cli command from query native=unable to infer expected operation from query
- ACC-F006: cli=missing required parameter: time_range native=missing required parameter: time_range
- ACC-F007: cli=missing required parameter: time_range native=missing required parameter: time_range
- ACC-F008: cli=missing required parameter: time_range native=missing required parameter: time_range
- EDGE-001: cli=unable to derive cli command from query native=unable to infer expected operation from query
- EDGE-003: cli=unable to derive cli command from query native=unable to infer expected operation from query
- BUS-001: cli=unable to derive cli command from query native=unable to infer expected operation from query
- SEM-F018: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-F019: cli=unable to derive cli command from query native=unable to infer expected operation from query
- SEM-F020: cli=missing required parameter: time_range native=missing required parameter: time_range
- FBK-F004: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-F021: cli=missing required parameter: time_range native=missing required parameter: time_range

## Notes
- Current score uses heuristic intent extraction from the CSV natural-language queries.
- Report endpoints are verified from BI docs; list_team path is verified from SQL export; list_apps/list_media remain config-driven pending stronger path evidence.

## Details

### DATE-001 · 日期识别

- query: 指间山海 2026 年 3 月 1 日至 3 月 15 日的激活数和注册数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-01:2026-03-15 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "DATE-001",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-15",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-01:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 96944645-e894-44a5-887c-cb6f8443a4bf\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-01:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-15\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-01:2026-03-15 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-03-01:2026-03-15"
  },
  "expected_result": "激活 11,819 注册 10,554",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-15",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-01:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: d47fc03d-71ab-4829-addf-87e51e3c5c78\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-01:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-15\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "日期解析正确",
  "query": "指间山海 2026 年 3 月 1 日至 3 月 15 日的激活数和注册数"
}
```

### DATE-002 · 日期识别

- query: 指间山海最近 30 天的 ROI 情况
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-11:2026-04-09 --granularity day --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "DATE-002",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-11"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-11:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: bd934df6-bf39-4df2-a705-0953a90578fa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-11:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-11\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-11:2026-04-09 --granularity day --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "cumulative",
    "time_range": "2026-03-11:2026-04-09"
  },
  "expected_result": "累计 ROI 24% 左右.人工核对",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-11"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-11:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: e1de2a5e-074f-4fb2-9b9d-b1046f6ceb45\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-11:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-11\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "日期解析正确",
  "query": "指间山海最近 30 天的 ROI 情况"
}
```

### DATE-003 · 日期识别

- query: 指间山海 2026 年 2 月 29 日的数据
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "DATE-003",
  "category": "日期识别",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "不存在日期不返回数据",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "日期解析正确",
  "query": "指间山海 2026 年 2 月 29 日的数据"
}
```

### DATE-F001 · 日期识别

- query: 指间山海2026-03-25日报中，查询广告投放一部 各媒体激活数、注册数和消耗
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "DATE-F001",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: dcc1dae6-9bdf-4ca9-9f69-6024c4eb8990\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "巨量：激活126 注册106 消耗115000\ntap: 激活71，注册64，消耗7010.83",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: e307feb5-6179-4d23-bca9-b489c91a790e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：日报+媒体+团队",
  "query": "指间山海2026-03-25日报中，查询广告投放一部 各媒体激活数、注册数和消耗"
}
```

### DATE-F002 · 日期识别

- query: 指间山海上周周报中，广告投放一部按应用类型筛选的激活数、注册数和消耗
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "DATE-F002",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 35078f9f-376b-44e9-9c8a-8b6f5b4601fd\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "iOS应用：激活 607、注册 535、消耗66873.27\r\n安卓应用：激活309、注册589，消耗28158.46",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: ec033721-9bed-467d-99f2-15cb52f1d9b4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：周报+应用类型+团队",
  "query": "指间山海上周周报中，广告投放一部按应用类型筛选的激活数、注册数和消耗"
}
```

### DATE-F003 · 日期识别

- query: 指间山海2026年2月月报中，广告投放一部按媒体细分的累计ROI情况
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "DATE-F003",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: e233db2e-49df-44dc-b477-54f23a7c6dca\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "巨量 :31.13% tap:62.03% 苹果：54.06%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: c3b85d8e-9a7a-4502-a5f4-d3b2ba53a168\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：月报+媒体+应用类型+团队",
  "query": "指间山海2026年2月月报中，广告投放一部按媒体细分的累计ROI情况"
}
```

### DATE-F004 · 日期识别

- query: 指间山海昨天广告小时报表中，广告投放一部9点-10点的激活数和折后消耗
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-04-08:2026-04-08 --granularity hour --team 广告投放一部 --hour-slot 09:00-10:00
- mode_equivalent: True

```json
{
  "case_id": "DATE-F004",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "dh": "09:00-10:00",
      "endDate": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-04-08",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "hour_slot": "09:00-10:00",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: 8891967f-83d9-43e3-9f34-89865ef1b6b1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"hour_slot\": \"09:00-10:00\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"dh\": \"09:00-10:00\",\n  \"endDate\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-04-08\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-04-08:2026-04-08 --granularity hour --team 广告投放一部 --hour-slot 09:00-10:00",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "hour_slot": "09:00-10:00",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-04-08:2026-04-08"
  },
  "expected_result": "激活数 12  折后消耗 904.65",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "dh": "09:00-10:00",
      "endDate": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-04-08",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "hour_slot": "09:00-10:00",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: 10f0b851-72ee-4c79-a431-fe24fb695bbe\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"hour_slot\": \"09:00-10:00\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"dh\": \"09:00-10:00\",\n  \"endDate\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-04-08\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "功能测试点：广告小时报表+分时段",
  "query": "指间山海昨天广告小时报表中，广告投放一部9点-10点的激活数和折后消耗"
}
```

### DATE-F005 · 日期识别

- query: 指间山海二月同期广告投放一部的累计ROI和合计第2日ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --granularity day --team 广告投放一部 --roi-type interval
- mode_equivalent: False

```json
{
  "case_id": "DATE-F005",
  "category": "日期识别",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --granularity day --team 广告投放一部 --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "interval",
    "team": [
      "广告投放一部"
    ]
  },
  "expected_result": "上月同期：20260201-20260227\r\n累计ROI:39.01\r\n合计第2日ROI:8.38%",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "功能测试点：ROI报表+月累计/区间",
  "query": "指间山海二月同期广告投放一部的累计ROI和合计第2日ROI"
}
```

### MEDIA-001 · 媒体识别

- query: 指间山海在巨量引擎的最近 7 天激活数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day --media 巨量引擎
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-001",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 8569a63b-20cd-445e-9c3f-adcc34df4d1f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day --media 巨量引擎",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "media": [
      "巨量引擎"
    ],
    "time_range": "2026-04-03:2026-04-09"
  },
  "expected_result": "最近 7 天激活数 3692 左右，结果支持1%的浮动",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 4374a49e-5843-47e3-89a9-adfc98accb68\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "媒体解析正确",
  "query": "指间山海在巨量引擎的最近 7 天激活数"
}
```

### MEDIA-004 · 媒体识别

- query: 指间山海在巨量引擎和苹果广告的消耗对比
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --granularity day --media 巨量引擎,苹果广告
- mode_equivalent: False

```json
{
  "case_id": "MEDIA-004",
  "category": "媒体识别",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --granularity day --media 巨量引擎,苹果广告",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "media": [
      "巨量引擎",
      "苹果广告"
    ]
  },
  "expected_result": "巨量最近7天\r\n日期：2026-04-08 媒体：巨量广告  消耗：19442.02\r\n日期：2026-04-08 媒体：苹果广告  消耗：618.10\r\n日期：2026-04-07 媒体：巨量广告  消耗：22,979.28\r\n日期：2026-04-07 媒体：苹果广告  消耗：1,556.50\r\n日期：2026-04-03 媒体：巨量广告  消耗：20,592.13\r\n日期：2026-04-03 媒体：苹果广告  消耗：1622.08",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "媒体解析正确",
  "query": "指间山海在巨量引擎和苹果广告的消耗对比"
}
```

### MEDIA-F001 · 媒体识别

- query: 指间山海2026-03-25日报中，巨量引擎在广告投放一部的激活数、注册数和折后消耗
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎 --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-F001",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 8207e96b-a57f-4a47-ae42-128ced4e6115\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎 --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "media": [
      "巨量引擎"
    ],
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "激活数126 注册数106 折后消耗11500",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: b950245a-72d8-4234-a9e2-b0831ca33c11\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：日报+细分媒体+团队",
  "query": "指间山海2026-03-25日报中，巨量引擎在广告投放一部的激活数、注册数和折后消耗"
}
```

### MEDIA-F002 · 媒体识别

- query: 指间山海2026-03-25日报中，腾讯广告在广告投放一部、安卓应用类型下的激活数和注册数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 腾讯广告 --team 广告投放一部 --app-type 安卓应用
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-F002",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "appPackageType": "安卓应用",
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10002",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10002"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 6fba82af-9af5-4a00-a966-da75cc0c9d04\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appPackageType\": \"安卓应用\",\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10002\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 腾讯广告 --team 广告投放一部 --app-type 安卓应用",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "安卓应用"
    ],
    "granularity": "day",
    "media": [
      "腾讯广告"
    ],
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "0",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appPackageType": "安卓应用",
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10002",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10002"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 730240e7-35e9-4bc8-9bd6-fa53779f2440\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appPackageType\": \"安卓应用\",\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10002\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：日报+媒体+应用类型+团队",
  "query": "指间山海2026-03-25日报中，腾讯广告在广告投放一部、安卓应用类型下的激活数和注册数"
}
```

### MEDIA-F003 · 媒体识别

- query: 指间山海上周周报中，快手在广告投放一部不同应用类型的ROI对比
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --media 快手 --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-F003",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "快手",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "media": [
        "快手"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 31e95eac-36e8-4f5a-8dcd-b2ec6b26755c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"快手\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"快手\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"快手\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --media 快手 --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "media": [
      "快手"
    ],
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "上周快手没投放数据",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "快手",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "media": [
        "快手"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 6e23ab26-bf91-4ae2-91c2-1e31889d43cc\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"快手\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"快手\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"快手\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：周报+媒体+应用类型",
  "query": "指间山海上周周报中，快手在广告投放一部不同应用类型的ROI对比"
}
```

### MEDIA-F004 · 媒体识别

- query: 指间山海2026年2月月报中，巨量引擎和腾讯广告在广告投放一部的累计ROI对比
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --media 巨量引擎,腾讯广告 --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-F004",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 58cd855d-89d8-4694-8acb-76f70f93ecfa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --media 巨量引擎,腾讯广告 --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "media": [
      "巨量引擎",
      "腾讯广告"
    ],
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "巨量：31.13% 腾讯没数据",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: fa675387-be4f-410d-8099-d974b051806a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：月报+多媒体ROI",
  "query": "指间山海2026年2月月报中，巨量引擎和腾讯广告在广告投放一部的累计ROI对比"
}
```

### MEDIA-F005 · 媒体识别

- query: 指间山海2026-03-25广告小时报表中，按媒体汇总全天数据，查看巨量引擎和腾讯广告的激活数与消耗
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --media 巨量引擎,腾讯广告
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-F005",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: 729cbdb8-7341-4deb-82a8-5b301329d7af\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --media 巨量引擎,腾讯广告",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "media": [
      "巨量引擎",
      "腾讯广告"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "巨量：激活126 消耗11500\n腾讯没数据",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: 47885485-1726-44a6-aecc-2f391433b4d7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "功能测试点：小时报表+按媒体汇总全天",
  "query": "指间山海2026-03-25广告小时报表中，按媒体汇总全天数据，查看巨量引擎和腾讯广告的激活数与消耗"
}
```

### CSEM-001 · 语义理解

- query: 指间山海 - 国内 2026 年 3 月 18 日安卓应用激活数和首日 ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --granularity day --app-type 安卓应用 --roi-type cumulative
- mode_equivalent: False

```json
{
  "case_id": "CSEM-001",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --granularity day --app-type 安卓应用 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "安卓应用"
    ],
    "granularity": "day",
    "roi_type": "cumulative"
  },
  "expected_result": "激活数 645 首日 ROI 11.12%",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间山海 - 国内 2026 年 3 月 18 日安卓应用激活数和首日 ROI"
}
```

### CSEM-010 · 语义理解

- query: 指间山海 - 国内最近一周（不含查询当天）的激活数环比变化
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "CSEM-010",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-02"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 6e86cd34-efad-4c3a-9c73-4e273d68740d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-02\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-02:2026-04-08"
  },
  "expected_result": "最近一周：2026-04-07 ~ 2026-04-01，激活数 5667\r\n前一周：2026-03-25 ~ 2026-03-31，激活数 8301\r\n激活数环比变化 = (5667 - 8301) / 5667 = -46.48%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-02"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 42b4d9ea-9976-4afb-8f19-16246f14dfb7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-02\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "-",
  "query": "指间山海 - 国内最近一周（不含查询当天）的激活数环比变化"
}
```

### SEM-009 · 语义理解

- query: 指间山海哪个媒体的累计 ROI 最高
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --granularity day --roi-type cumulative
- mode_equivalent: False

```json
{
  "case_id": "SEM-009",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --granularity day --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "cumulative"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "语义理解没问题",
  "query": "指间山海哪个媒体的累计 ROI 最高"
}
```

### SEM-011 · 语义理解

- query: 指间山海最近 7 天激活到注册的转化率
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "SEM-011",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: b8d735f4-33ea-4358-b05c-c85e84dfb48b\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-03:2026-04-09"
  },
  "expected_result": "激活 35,557 注册31,727 转化率 89.2%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 4aca6768-4635-4219-9f64-3d090e3632a2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "语义理解没问题",
  "query": "指间山海最近 7 天激活到注册的转化率"
}
```

### SEM-025 · 语义理解

- query: 指间山海 - 国内最近7天哪个媒体的激活成本最低
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "SEM-025",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "巨量广告",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "-",
  "query": "指间山海 - 国内最近7天哪个媒体的激活成本最低"
}
```

### SEM-026 · 语义理解

- query: 指间山海 - 国内激活数最多的三个媒体
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --granularity day
- mode_equivalent: False

```json
{
  "case_id": "SEM-026",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day"
  },
  "expected_result": "巨量  TapTap 苹果",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间山海 - 国内激活数最多的三个媒体"
}
```

### SEM-F001 · 语义理解

- query: 指间山海2026-03-25日报中，广告投放一部、巨量引擎、安卓应用类型的激活数、注册数、消耗和首日ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎 --team 广告投放一部 --app-type 安卓应用 --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "SEM-F001",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "安卓应用",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 50e378a3-cc9a-4dbf-a688-85562adb224a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"安卓应用\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎 --team 广告投放一部 --app-type 安卓应用 --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "安卓应用"
    ],
    "granularity": "day",
    "media": [
      "巨量引擎"
    ],
    "roi_type": "interval",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "激活数2 注册数4 消耗0 roi 0或没数据",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "安卓应用",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 4e479302-65a1-4837-be60-a20b11da3ee3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"安卓应用\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：日报综合查询",
  "query": "指间山海2026-03-25日报中，广告投放一部、巨量引擎、安卓应用类型的激活数、注册数、消耗和首日ROI"
}
```

### SEM-F002 · 语义理解

- query: 指间山海2026-03-25日报中，广告投放一部按细分媒体+应用类型查看激活数和注册数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "SEM-F002",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: ee0a56a8-ca5c-4849-920b-241dcb5df7b3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "巨量IOS：激活126 消耗11500\ntap安卓：激活71，消耗7010.83\n苹果和b站也有数据",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: d2ef569b-82d1-467d-95f4-757b658084c9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：日报+细分媒体+应用类型",
  "query": "指间山海2026-03-25日报中，广告投放一部按细分媒体+应用类型查看激活数和注册数"
}
```

### SEM-F003 · 语义理解

- query: 指间山海2026-03-25日报中，广告投放一部按细分媒体+团队查看激活数和ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "SEM-F003",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: bfe212d5-f25f-4e7a-a0a6-4f70c7d3b2e8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "巨量：激活126 注册106 消耗115000\ntap: 激活71，注册64，消耗7010.83",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 3bc1f035-56d7-424b-a6ac-77fbb81c8d9d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：日报+细分媒体+团队",
  "query": "指间山海2026-03-25日报中，广告投放一部按细分媒体+团队查看激活数和ROI"
}
```

### SEM-F004 · 语义理解

- query: 指间山海2026-03-25日报中，按细分应用类型+团队查看激活数和首日ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "SEM-F004",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: f2132bba-d477-4358-9bf5-6717abeb52e0\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "interval",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "创新部安卓：激活数353，首日ROI 9.01%\n其他数据也有",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 11883901-6331-421b-8ddd-df46d59d1906\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：日报+细分应用类型+团队",
  "query": "指间山海2026-03-25日报中，按细分应用类型+团队查看激活数和首日ROI"
}
```

### SEM-F005 · 语义理解

- query: 指间山海上周周报中，广告投放一部按媒体、应用类型细分的激活数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "SEM-F005",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: b6dde16e-661d-49ce-a81e-910d67f06c48\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-30",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: fcfe0f60-4f14-4e53-ab22-c080d1d2df2c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-30\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：周报综合查询",
  "query": "指间山海上周周报中，广告投放一部按媒体、应用类型细分的激活数"
}
```

### SEM-F007 · 语义理解

- query: 指间山海20260320-20260405那一周周报中，广告投放一部按细分媒体查看区间首周ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-20:2026-04-05 --granularity week --team 广告投放一部 --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "SEM-F007",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-20",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-20:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: c947126f-e862-4674-ac57-fde999c813bf\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-20\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-20:2026-04-05 --granularity week --team 广告投放一部 --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "roi_type": "interval",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-20:2026-04-05"
  },
  "expected_result": "巨量18.41% tap4.88% 苹果18.86%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-20",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-20:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 4652edcc-ec07-4f45-9425-d43d893411c9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-20\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：周报+细分媒体+团队",
  "query": "指间山海20260320-20260405那一周周报中，广告投放一部按细分媒体查看区间首周ROI"
}
```

### SEM-F008 · 语义理解

- query: 指间山海20260320-20260405那一周周报中，广告投放一部按细分应用类型查看累计ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-20:2026-04-05 --granularity week --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "SEM-F008",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-20",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-20:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 53cab0f2-8b63-47da-bee5-a951bde26959\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-20\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-20:2026-04-05 --granularity week --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-20:2026-04-05"
  },
  "expected_result": "安卓 16.14% IOS 4.92%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-20",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-20:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: c92ae68a-cc5d-4d0d-bc2b-20d49a211d45\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-20\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：周报+细分应用类型+团队",
  "query": "指间山海20260320-20260405那一周周报中，广告投放一部按细分应用类型查看累计ROI"
}
```

### SEM-F009 · 语义理解

- query: 指间山海2026年2月月报中，广告投放一部按媒体、应用类型细分的top3的激活数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "SEM-F009",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 8e11ff99-aaaa-4699-bfba-81c5b602b90a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "巨量IOS 1537 tap安卓 1581 巨量安卓1562",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 2c14a904-82cc-4b5b-bef4-1881ba8eeae4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：月报综合查询",
  "query": "指间山海2026年2月月报中，广告投放一部按媒体、应用类型细分的top3的激活数"
}
```

### SEM-F010 · 语义理解

- query: 指间山海2026年2月月报中，广告投放一部按细分媒体查看累计ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "SEM-F010",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: f5b4fc8c-ce9f-4a25-b5bf-5a4dd4165418\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "巨量：31.13% tap: 62.03% 苹果54.06%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 0d0677ab-c92b-4b4e-b99e-ef30289a47eb\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：月报+细分媒体+应用类型",
  "query": "指间山海2026年2月月报中，广告投放一部按细分媒体查看累计ROI"
}
```

### SEM-F011 · 语义理解

- query: 指间山海2026年2月月报中，广告投放一部按细分媒体查看区间首月ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "SEM-F011",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: ef85e611-8c35-48a4-99ff-7bfe2f0c6755\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "roi_type": "interval",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "巨量：31.13% tap: 62.03% 苹果54.06%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 1e24e162-d528-4544-9f27-b4d0d64a707c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：月报+细分媒体+团队",
  "query": "指间山海2026年2月月报中，广告投放一部按细分媒体查看区间首月ROI"
}
```

### SEM-F012 · 语义理解

- query: 指间山海2026年2月月报中，广告投放一部按细分应用类型查看累计ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "SEM-F012",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 68d1b58e-d1a8-4411-96c3-5117d788adfe\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-02-01:2026-02-28 --granularity month --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-28"
  },
  "expected_result": "安卓 44.12% IOS 33.74%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-02-28",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-02-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: fac4b788-fb8a-42dd-b335-0954b8fe9a82\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-02-28\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-02-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：月报+细分应用类型+团队",
  "query": "指间山海2026年2月月报中，广告投放一部按细分应用类型查看累计ROI"
}
```

### ACC-001 · 数据准确性

- query: 验证指间山海 2026-03-15 的广告激活数是否为 1250
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-15:2026-03-15 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "ACC-001",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-15",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-15"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-15:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 66f2aa2d-0b15-468a-9a50-2b61df9e9575\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-15:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-15\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-15\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-15:2026-03-15 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-03-15:2026-03-15"
  },
  "expected_result": "3 月 15 广告激活数为 707",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-15",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-15"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-15:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: c5d6d091-1e47-465d-ba63-e24ae7ebd6db\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-15:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-15\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-15\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "查询没问题，结论没问题",
  "query": "验证指间山海 2026-03-15 的广告激活数是否为 1250"
}
```

### ACC-002 · 数据准确性

- query: 验证指间山海最近 7 天各媒体激活数之和是否等于总激活数
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "ACC-002",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 2aeea642-a829-4914-b403-15c808d5e4d2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-03:2026-04-09 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-03:2026-04-09"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-09",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-03"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-03:2026-04-09",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 0d975cb6-0240-4746-8945-0073f9d38971\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-03:2026-04-09\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-09\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-03\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "-",
  "query": "验证指间山海最近 7 天各媒体激活数之和是否等于总激活数"
}
```

### ACC-005 · 数据准确性

- query: 指间山海 20260325 日报消耗是否等于各媒体消耗之和
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "ACC-005",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: daa6ba82-d95f-4ef5-925e-9ccf98bc81a5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "20260325 消耗为 31,368",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: fee05b49-e0bc-43ac-b93a-9d27330ee1d3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "-",
  "query": "指间山海 20260325 日报消耗是否等于各媒体消耗之和"
}
```

### SEM-F013 · 语义理解

- query: 指间日报20260324 自然量激活数是多少
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --time-range 2026-03-24:2026-03-24 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "SEM-F013",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-24",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-24"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-24:2026-03-24",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: c4a995db-c247-48f5-9553-697dbdf1a1e7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-24:2026-03-24\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-24\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-24\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --time-range 2026-03-24:2026-03-24 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "time_range": "2026-03-24:2026-03-24"
  },
  "expected_result": "20260324 自然量激活数为 121",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-24",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-24"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-24:2026-03-24",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 1ac1145a-36ed-4013-870e-add0ff821754\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-24:2026-03-24\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-24\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-24\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "日报自然量",
  "query": "指间日报20260324 自然量激活数是多少"
}
```

### SEM-F015 · 语义理解

- query: 分别查询指间山海20260101那一天、所在周、所在月的 自然量的注册次留、注册3留
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "SEM-F015",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "注册次留率: 57.29% (55人留存)、•注册次留率: 52.01% (363人留存)、•注册次留率: 52.66% (1,038人留存)",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "分别查询指间山海20260101那一天、所在周、所在月的 自然量的注册次留、注册3留"
}
```

### SEM-F016 · 语义理解

- query: 查询指间20260101那一天市场星图的7日设备留存率
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --media 市场星图 --retention-type device
- mode_equivalent: True

```json
{
  "case_id": "SEM-F016",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "mediaId": "市场星图",
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "市场星图"
      ],
      "retention_type": "device",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 151aca41-b7eb-4dcc-88da-2f6aad3c957d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场星图\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"市场星图\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"mediaId\": \"市场星图\",\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --media 市场星图 --retention-type device",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "media": [
      "市场星图"
    ],
    "retention_type": "device",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "50%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "mediaId": "市场星图",
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "市场星图"
      ],
      "retention_type": "device",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 64ab4b72-4eaa-4a21-8c4d-d6f128b48b77\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场星图\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"市场星图\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"mediaId\": \"市场星图\",\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "",
  "query": "查询指间20260101那一天市场星图的7日设备留存率"
}
```

### SEM-F017 · 语义理解

- query: 查询指间20260101那一天市场量的7日设备留存率
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --media 市场量 --retention-type device
- mode_equivalent: True

```json
{
  "case_id": "SEM-F017",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "mediaId": "市场量",
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "市场量"
      ],
      "retention_type": "device",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 4a72a8ce-61a0-4fbb-8d78-606a85e91284\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场量\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"市场量\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"mediaId\": \"市场量\",\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --media 市场量 --retention-type device",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "media": [
      "市场量"
    ],
    "retention_type": "device",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "50%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "mediaId": "市场量",
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "市场量"
      ],
      "retention_type": "device",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 488c347c-138b-4cfc-8807-5f2a22c4f105\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场量\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"市场量\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"mediaId\": \"市场量\",\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "",
  "query": "查询指间20260101那一天市场量的7日设备留存率"
}
```

### ACC-F001 · 数据准确性

- query: 验证指间山海2026-03-25广告小时报表按分时段查询的各小时消耗之和是否等于当天总消耗（广告投放一部）
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "ACC-F001",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: 9a4d7d93-756d-4357-9a0b-977e16329b56\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --team 广告投放一部",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "13,647.98 不等于 20,658.81",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: 6b29c930-8511-447d-94fe-e83e7b187d14\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "功能测试点：小时报表汇总一致性",
  "query": "验证指间山海2026-03-25广告小时报表按分时段查询的各小时消耗之和是否等于当天总消耗（广告投放一部）"
}
```

### ACC-F002 · 数据准确性

- query: 验证指间山海2026-03-25广告小时报表按媒体汇总的全天激活数之和是否等于当天总激活数
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour
- mode_equivalent: True

```json
{
  "case_id": "ACC-F002",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: e52214c3-75cd-471d-b7ce-03e9693a1dfc\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "225 等于",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: d0dfe529-db44-456f-b16e-d72d1ec2e686\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "功能测试点：小时报表按媒体汇总",
  "query": "验证指间山海2026-03-25广告小时报表按媒体汇总的全天激活数之和是否等于当天总激活数"
}
```

### ACC-F003 · 数据准确性

- query: 验证指间山海2026-03-25广告ROI日报中区间ROI和累计ROI计算是否正确
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "ACC-F003",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: ecc91b96-cdd9-42fe-a1c8-a53a01ddc42d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "interval",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: af7c9730-e62e-4400-98a3-4ee5297bae70\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：ROI日报计算",
  "query": "验证指间山海2026-03-25广告ROI日报中区间ROI和累计ROI计算是否正确"
}
```

### ACC-F004 · 数据准确性

- query: 验证指间山海上周广告ROI周报中巨量引擎安卓应用类型的累计ROI计算是否正确、
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --media 巨量引擎 --app-type 安卓应用 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "ACC-F004",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "安卓应用",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-30"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "week",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "roi_type": "cumulative",
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 6ac82ac0-6dec-4b50-99ab-979d3219f4b5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"安卓应用\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-30\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --media 巨量引擎 --app-type 安卓应用 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "安卓应用"
    ],
    "granularity": "week",
    "media": [
      "巨量引擎"
    ],
    "roi_type": "cumulative",
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "安卓应用",
      "dataType": "total",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-30"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "week",
      "include_organic": true,
      "media": [
        "10001"
      ],
      "roi_type": "cumulative",
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 69bc8c0c-54eb-48a0-802e-9767edfe85f7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"安卓应用\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-30\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：ROI周报计算",
  "query": "验证指间山海上周广告ROI周报中巨量引擎安卓应用类型的累计ROI计算是否正确、"
}
```

### ACC-F005 · 数据准确性

- query: 验证指间山海2026年3月广告ROI月报中腾讯广告iOS应用类型的区间ROI计算是否正确、
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --media 腾讯广告 --app-type iOS应用 --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "ACC-F005",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "section",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10002",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "month",
      "include_organic": true,
      "media": [
        "10002"
      ],
      "roi_type": "interval",
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 14b6c359-c3e9-471b-8190-9834e0d528c9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10002\"\n  ],\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10002\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --media 腾讯广告 --app-type iOS应用 --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "month",
    "media": [
      "腾讯广告"
    ],
    "roi_type": "interval",
    "time_range": "2026-03-01:2026-03-31"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "section",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10002",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "month",
      "include_organic": true,
      "media": [
        "10002"
      ],
      "roi_type": "interval",
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: a313bff8-7341-4922-b1b8-5b7abb034e79\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10002\"\n  ],\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"section\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10002\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：ROI月报计算",
  "query": "验证指间山海2026年3月广告ROI月报中腾讯广告iOS应用类型的区间ROI计算是否正确、"
}
```

### ACC-F006 · 数据准确性

- query: 验证指间山海新增设备留存日报中的次留计算是否正确
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --granularity day --retention-type device
- mode_equivalent: False

```json
{
  "case_id": "ACC-F006",
  "category": "数据准确性",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --granularity day --retention-type device",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "retention_type": "device"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "功能测试点：新增设备留存日报",
  "query": "验证指间山海新增设备留存日报中的次留计算是否正确"
}
```

### ACC-F007 · 数据准确性

- query: 验证指间山海注册用户留存周报中的7日留存计算是否正确
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --granularity week --retention-type account
- mode_equivalent: False

```json
{
  "case_id": "ACC-F007",
  "category": "数据准确性",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --granularity week --retention-type account",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "retention_type": "account"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "功能测试点：注册用户留存周报",
  "query": "验证指间山海注册用户留存周报中的7日留存计算是否正确"
}
```

### ACC-F008 · 数据准确性

- query: 验证指间山海首日付费账号留存月报中的30日留存计算是否正确
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --granularity month --retention-type first_pay
- mode_equivalent: False

```json
{
  "case_id": "ACC-F008",
  "category": "数据准确性",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --granularity month --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "retention_type": "first_pay"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "功能测试点：首日付费账号留存月报",
  "query": "验证指间山海首日付费账号留存月报中的30日留存计算是否正确"
}
```

### MDIM-001 · 多维度交叉

- query: 指间山海在 iOS 端巨量引擎和腾讯广告的2026-04-02 至 2026-04-08 激活数对比
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day --media 巨量引擎,腾讯广告 --app-type iOS应用
- mode_equivalent: True

```json
{
  "case_id": "MDIM-001",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appPackageType": "iOS应用",
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-02"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: c41b19e0-bfdc-4fb9-a7ee-5b7c6ebb28a3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appPackageType\": \"iOS应用\",\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-02\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day --media 巨量引擎,腾讯广告 --app-type iOS应用",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "media": [
      "巨量引擎",
      "腾讯广告"
    ],
    "time_range": "2026-04-02:2026-04-08"
  },
  "expected_result": "巨量 1218 腾讯0",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appPackageType": "iOS应用",
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "mediaId": "10001,10002",
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-02"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001",
        "10002"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: cd7bc23a-df32-44aa-9159-e1e6ce3f1c5f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"10002\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appPackageType\": \"iOS应用\",\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"mediaId\": \"10001,10002\",\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-02\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "",
  "query": "指间山海在 iOS 端巨量引擎和腾讯广告的2026-04-02 至 2026-04-08 激活数对比"
}
```

### MDIM-007 · 多维度交叉

- query: 指间山海 20260325 iOS 端和 Android 端的激活数对比
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --app-type iOS应用,安卓应用 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "MDIM-007",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用,安卓应用",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用",
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 35c79825-5e3a-4457-8acc-a45a73811454\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\",\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用,安卓应用\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --app-type iOS应用,安卓应用 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "app_type": [
      "iOS应用",
      "安卓应用"
    ],
    "granularity": "day",
    "roi_type": "cumulative",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "ios 激活 286 安卓 426",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用,安卓应用",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用",
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 299c6954-934c-4fd4-8f4e-e2808d95306d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\",\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用,安卓应用\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "-",
  "query": "指间山海 20260325 iOS 端和 Android 端的激活数对比"
}
```

### MDIM-F001 · 多维度交叉

- query: 指间2026-01-01 IOS应用类型+巨量+广告投放一部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数
分别是多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F001",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 2733671c-2846-4fcf-9988-7cb904334d0e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "retention_type": "first_pay",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "激活数：84\n累计45日roi：47.65%\n第45日roi：0.06%\n2周roi：26.17%\n第2周roi:12.7%\n累计2月ROI：51.26%\n第2月ROI: 18.81%\n3日设备留存率：44.05%\n3日注册留存率：49.37%\n4日首日付费留存数：50%\n按时段19点-20点的首日注册设备数：9\n按天截止到20点的首日付费账号数：10",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 2654adde-636f-4e6c-bd2c-b6a71c451b41\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表筛选+按天",
  "query": "指间2026-01-01 IOS应用类型+巨量+广告投放一部 全天激活数、累计45日roi、第45日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、按时段19点-20点的首日注册设备数、按天截止到20点的首日付费账号数\n分别是多少"
}
```

### MDIM-F002 · 多维度交叉

- query: 指间2026-02-01 IOS应用类型+自然量+广告投放一部 全天激活数、3日设备留存数、3日注册留存数、4日首日付费留存数分别是多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-02-01:2026-02-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F002",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-02-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-02-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: e164e87b-703c-4f59-a379-25f8574a9639\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-02-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-02-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-02-01:2026-02-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "retention_type": "first_pay",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-02-01:2026-02-01"
  },
  "expected_result": "激活数：459\n3日设备留存率：39.87%\n3日注册留存率：41.12%\n4日首日付费留存数：69.39%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-02-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-02-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 6907dc4d-e66a-4d47-9347-5d6ba4bbb353\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-02-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-02-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表筛选+按周",
  "query": "指间2026-02-01 IOS应用类型+自然量+广告投放一部 全天激活数、3日设备留存数、3日注册留存数、4日首日付费留存数分别是多少"
}
```

### MDIM-F003 · 多维度交叉

- query: 指间2026-01-01那一周 IOS应用类型+巨量+广告投放一部 总激活数、2周roi、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数
分别是多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F003",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 844a2f00-3bb2-479d-bee9-564c482e3cc5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "retention_type": "first_pay",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "激活数：716\n2周roi：26.17%\n第2周roi:12.7%\n3日设备留存率：47.63%\n3日注册留存率：49.50%\n4日首日付费留存数：67.07%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 570356ea-e4f4-4e78-8ed0-6dac6e5dcd18\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表筛选+按月",
  "query": "指间2026-01-01那一周 IOS应用类型+巨量+广告投放一部 总激活数、2周roi、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数\n分别是多少"
}
```

### MDIM-F004 · 多维度交叉

- query: 查询指间2026年1月1号广告投放一部的总激活数、2日roi、第2日roi 、3日设备留存数、3日注册留存数、4日首日付费留存数在应用类型维度的分布情况
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F004",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 1c64b6f8-8ce8-44f8-b646-8f8fcf8eef97\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --team 广告投放一部 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "retention_type": "first_pay",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 5447023c-5e1f-48df-9ae2-6745996dc14a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表细分+按天",
  "query": "查询指间2026年1月1号广告投放一部的总激活数、2日roi、第2日roi 、3日设备留存数、3日注册留存数、4日首日付费留存数在应用类型维度的分布情况"
}
```

### MDIM-F005 · 多维度交叉

- query: 查询指间2026年1月1号那一周广告媒体总激活数、2周roi 、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数在团队的分布情况
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F005",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: e6120ac7-8bab-4aca-8fd3-73539f72e361\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "retention_type": "first_pay",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 905033b3-3187-45f1-8aac-bcbf53b399d9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表细分+按周",
  "query": "查询指间2026年1月1号那一周广告媒体总激活数、2周roi 、第2周roi、3日设备留存数、3日注册留存数、4日首日付费留存数在团队的分布情况"
}
```

### MDIM-F006 · 多维度交叉

- query: 查询指间2025年12月1号那一月广告媒体的总激活数、2月累计roi 、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2025-12-01:2025-12-31 --granularity day --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F006",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2025-12-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2025-12-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2025-12-01:2025-12-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 9adbf0c4-d7cf-4138-8f2f-281b0628ad18\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2025-12-01:2025-12-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-12-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2025-12-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2025-12-01:2025-12-31 --granularity day --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "retention_type": "first_pay",
    "time_range": "2025-12-01:2025-12-31"
  },
  "expected_result": "总激活数：30584\r\n2月累计roi: 57.39%\r\n第2月roi: 21.79\r\n3日设备留存率 36.73\r\n3日注册留存数：41.14%\r\n4日首日付费留存数：59.02%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2025-12-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2025-12-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2025-12-01:2025-12-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: cac21ed9-19aa-4575-a404-b6682facb1aa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2025-12-01:2025-12-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-12-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2025-12-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "各报表细分+按月",
  "query": "查询指间2025年12月1号那一月广告媒体的总激活数、2月累计roi 、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数"
}
```

### MDIM-F007 · 多维度交叉

- query: 查询指间20260101 日报、所在周、所在月的激活数、注册数、有效数、首日付费数、首日创角数、新设备老账号数、消耗、折后消耗
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F007",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 505e879d-a070-4469-906a-e0797a8f6981\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-01-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 37449e90-5d39-4083-9bc4-152142bcba4d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-01-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "日报指标范围",
  "query": "查询指间20260101 日报、所在周、所在月的激活数、注册数、有效数、首日付费数、首日创角数、新设备老账号数、消耗、折后消耗"
}
```

### MDIM-F008 · 多维度交叉

- query: 查询指间20260101 小时报表 广告量激活数、注册数、有效数、首日付费数、首日创角数、新设备老账号数、消耗、折后消耗
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity hour
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F008",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-01-01",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: fc4db488-9e7e-4166-a524-14b7aa8a9df4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-01-01\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity hour",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "hour",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-01-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-01-01",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: f2bb4eca-98be-4999-b497-beb4b7a5e2d2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-01-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-01-01\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "小时报表指标范围",
  "query": "查询指间20260101 小时报表 广告量激活数、注册数、有效数、首日付费数、首日创角数、新设备老账号数、消耗、折后消耗"
}
```

### MDIM-F009 · 多维度交叉

- query: 指间2025-12-01那一月IOS应用类型+巨量+广告投放一部 总激活数、2月roi、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数
分别是多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2025-12-01:2025-12-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F009",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2025-12-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2025-12-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2025-12-01:2025-12-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 8c87daf1-0795-4cac-bc18-14e51580f5ce\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2025-12-01:2025-12-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-12-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2025-12-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2025-12-01:2025-12-01 --granularity day --team 广告投放一部 --app-type iOS应用 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "retention_type": "first_pay",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2025-12-01:2025-12-01"
  },
  "expected_result": "激活数：2348\n累计2月ROI：51.26%\n第2月ROI: 18.81%\n3日设备留存率：42.42%\n3日注册留存率：44.86%\n4日首日付费留存数：59.09%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2025-12-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2025-12-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2025-12-01:2025-12-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 3c3429ae-e726-49ec-91ac-992d6dd132d5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2025-12-01:2025-12-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-12-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2025-12-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "",
  "query": "指间2025-12-01那一月IOS应用类型+巨量+广告投放一部 总激活数、2月roi、第2月roi、3日设备留存数、3日注册留存数、4日首日付费留存数\n分别是多少"
}
```

### EDGE-001 · 边缘场景

- query: 指间山海 2026 年 2 月 30 日的数据
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "EDGE-001",
  "category": "边缘场景",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "不存在日期不返回数据",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "通过",
  "query": "指间山海 2026 年 2 月 30 日的数据"
}
```

### EDGE-003 · 边缘场景

- query: 指间山海未来日期（2027 年 1 月 1 日）的数据
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "EDGE-003",
  "category": "边缘场景",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "未来日期不返回数据",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "通过",
  "query": "指间山海未来日期（2027 年 1 月 1 日）的数据"
}
```

### EDGE-F001 · 边缘场景

- query: 指间山海2026-03-25广告小时报表中，广告投放一部按不存在的媒体筛选分时段激活数
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "EDGE-F001",
  "category": "边缘场景",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: 4e68c121-0dc2-4f68-91d9-b3f85d1e5052\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour --team 广告投放一部",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "baseTimeType": "EVENT_TIME",
      "endDate": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_hour_report",
      "routeKey": "page-15_15",
      "serializer": "hour_report",
      "startDate": "2026-03-25",
      "teamIds": "广告投放一部",
      "timeType": "HOURLY"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "base_time_type": "event_time",
      "granularity": "hour",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: eac7ff80-9189-467c-87e5-3ae4c045ee83\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"base_time_type\": \"event_time\",\n  \"granularity\": \"hour\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"baseTimeType\": \"EVENT_TIME\",\n  \"endDate\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_hour_report\",\n  \"routeKey\": \"page-15_15\",\n  \"serializer\": \"hour_report\",\n  \"startDate\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\",\n  \"timeType\": \"HOURLY\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "notes": "功能测试点：小时报表异常媒体",
  "query": "指间山海2026-03-25广告小时报表中，广告投放一部按不存在的媒体筛选分时段激活数"
}
```

### EDGE-F002 · 边缘场景

- query: 指间山海2026年3月广告ROI月报中，广告投放一部按不存在的应用类型查看累计ROI
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "EDGE-F002",
  "category": "边缘场景",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 7da6ecbc-0177-4fc5-840b-5df916b473cb\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-01:2026-03-31"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-01",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: d0998d55-dbed-4067-9f53-78249ba39e34\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-01\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：ROI月报异常应用类型",
  "query": "指间山海2026年3月广告ROI月报中，广告投放一部按不存在的应用类型查看累计ROI"
}
```

### BUS-001 · 业务场景

- query: 指间山海最近 7 天（不含当天）的投放效果综合评估
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "BUS-001",
  "category": "业务场景",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "-",
  "query": "指间山海最近 7 天（不含当天）的投放效果综合评估"
}
```

### BUS-F001 · 业务场景

- query: 给我生成指间山海上周广告投放一部的投放效果周报，按媒体、应用类型拆分并包含ROI和留存结论
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部 --retention-type device
- mode_equivalent: True

```json
{
  "case_id": "BUS-F001",
  "category": "业务场景",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-30",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "retention_type": "device",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 3ad50918-7999-42e0-8978-eec17a4c43b6\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-30\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity week --team 广告投放一部 --retention-type device",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "week",
    "retention_type": "device",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "NATURAL_WEEK",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-30",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "week",
      "include_organic": true,
      "retention_type": "device",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 9b4cf6b8-4d08-41a9-9ee8-90b72ae0f93b\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"NATURAL_WEEK\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-30\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "功能测试点：周报综合输出",
  "query": "给我生成指间山海上周广告投放一部的投放效果周报，按媒体、应用类型拆分并包含ROI和留存结论"
}
```

### BUS-F002 · 业务场景

- query: 请评估指间山海2026年3月广告投放一部的月报表现，要求结合媒体、应用类型、ROI和留存给出结论
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --team 广告投放一部 --retention-type device
- mode_equivalent: True

```json
{
  "case_id": "BUS-F002",
  "category": "业务场景",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "retention_type": "device",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 9b1e8dbb-0612-4e6f-a460-b31e1cc9c6b7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --time-range 2026-03-01:2026-03-31 --granularity month --team 广告投放一部 --retention-type device",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "month",
    "retention_type": "device",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-01:2026-03-31"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "DEVICE_RETENTION",
      "dateType": "NATURAL_MONTH",
      "end": "2026-03-31",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "DEVICE_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-01",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "retention_type": "device",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 07d9ba84-562b-4c3a-9e9a-393a2531cfc4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"DEVICE_RETENTION\",\n  \"dateType\": \"NATURAL_MONTH\",\n  \"end\": \"2026-03-31\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"DEVICE_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-01\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "功能测试点：月报综合评估",
  "query": "请评估指间山海2026年3月广告投放一部的月报表现，要求结合媒体、应用类型、ROI和留存给出结论"
}
```

### BUS-F003 · 业务场景

- query: 请分析指间山海2026-03-25广告投放一部日报中表现最差的媒体和应用类型组合，并给出优化建议
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部
- mode_equivalent: True

```json
{
  "case_id": "BUS-F003",
  "category": "业务场景",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: f6ac143b-ca07-4bb9-99d3-618d7321e088\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --team 广告投放一部",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "首日roi 是taptap 安卓最低",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 13343e84-99a9-4359-be38-484e7702e266\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "功能测试点：日报问题诊断",
  "query": "请分析指间山海2026-03-25广告投放一部日报中表现最差的媒体和应用类型组合，并给出优化建议"
}
```

### DIA-001 · 多轮对话

- query: 指间山海昨天的激活数是多少？如果超过 700 就算好
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-08:2026-04-08 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "DIA-001",
  "category": "多轮对话",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-08"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: a38a7caf-a033-44cd-9f25-95382c34780d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-08\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-08:2026-04-08 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-08:2026-04-08"
  },
  "expected_result": "",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-08"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 8ffbca13-7859-4079-be16-b6b6feef37a9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-08\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "",
  "query": "指间山海昨天的激活数是多少？如果超过 700 就算好"
}
```

### DIA-002 · 多轮对话

- query: 指间山海 20250325 哪个媒体的 首日ROI 最高？数据是多少？
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2025-03-25:2025-03-25 --granularity day --roi-type interval
- mode_equivalent: True

```json
{
  "case_id": "DIA-002",
  "category": "多轮对话",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2025-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2025-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2025-03-25:2025-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 3c142088-8bde-4178-b3f9-1217955f91f7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2025-03-25:2025-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2025-03-25\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2025-03-25:2025-03-25 --granularity day --roi-type interval",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "interval",
    "time_range": "2025-03-25:2025-03-25"
  },
  "expected_result": "苹果广告最高55.9%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "section",
      "dateType": "DAY",
      "end": "2025-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2025-03-25"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2025-03-25:2025-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 808c1451-0c1e-49b8-b919-3a9b3fea8ea1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2025-03-25:2025-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"section\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2025-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2025-03-25\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "",
  "query": "指间山海 20250325 哪个媒体的 首日ROI 最高？数据是多少？"
}
```

### DIA-F001 · 多轮对话

- query: 先看指间山海2026-03-25广告投放一部日报的巨量引擎激活数，如果ROI低于20%再补充看苹果广告
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎,苹果广告 --team 广告投放一部 --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "DIA-F001",
  "category": "多轮对话",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001,苹果广告",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001",
        "苹果广告"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 377919b5-700d-4e9d-a449-5b1e8571805c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"苹果广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"苹果广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001,苹果广告\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity day --media 巨量引擎,苹果广告 --team 广告投放一部 --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "media": [
      "巨量引擎",
      "苹果广告"
    ],
    "roi_type": "cumulative",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "20260325广告投放一部巨量引擎激活回溯 126，首日roi地域20%,苹果广告的激活数是26",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "total",
      "dateType": "DAY",
      "end": "2026-03-25",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP"
      },
      "mediaId": "10001,苹果广告",
      "operationId": "get_ad_roi_report",
      "organic": 1,
      "routeKey": "page-9_DAY_9",
      "serializer": "roi_report",
      "start": "2026-03-25",
      "teamIds": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "10001",
        "苹果广告"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 1ee7e3eb-f108-447e-a769-cf6604233a1f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"10001\",\n    \"苹果广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"media\": [\n    \"10001\",\n    \"苹果广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"total\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-25\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\"\n  },\n  \"mediaId\": \"10001,苹果广告\",\n  \"operationId\": \"get_ad_roi_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-9_DAY_9\",\n  \"serializer\": \"roi_report\",\n  \"start\": \"2026-03-25\",\n  \"teamIds\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "notes": "功能测试点：日报条件追问",
  "query": "先看指间山海2026-03-25广告投放一部日报的巨量引擎激活数，如果ROI低于20%再补充看苹果广告"
}
```

### DIA-F002 · 多轮对话

- query: 先查指间山海上周广告投放一部新增设备留存，如果注册用户留存更高，再告诉我高多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity day --team 广告投放一部 --retention-type account
- mode_equivalent: True

```json
{
  "case_id": "DIA-F002",
  "category": "多轮对话",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "REG_RETENTION",
      "dateType": "DAY",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "REG_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-30",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "account",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 2675edfa-7ac6-4014-b6de-df27d3c4314e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"account\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"REG_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"REG_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-30\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间山海 --time-range 2026-03-30:2026-04-05 --granularity day --team 广告投放一部 --retention-type account",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "retention_type": "account",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-03-30:2026-04-05"
  },
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "dataType": "REG_RETENTION",
      "dateType": "DAY",
      "end": "2026-04-05",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "REG_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-30",
      "teamids": "广告投放一部"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "account",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: c6a2a63f-6e1c-49dc-82b8-816cad261628\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"account\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"dataType\": \"REG_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-05\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"REG_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-30\",\n  \"teamids\": \"广告投放一部\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "功能测试点：留存条件追问",
  "query": "先查指间山海上周广告投放一部新增设备留存，如果注册用户留存更高，再告诉我高多少"
}
```

### SEM-F018 · 语义理解

- query: 查询指间日报自然量数据
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --granularity day
- mode_equivalent: False

```json
{
  "case_id": "SEM-F018",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "查询指间日报自然量数据"
}
```

### FBK-F001 · 数据准确性

- query: 指间和怒焰昨天的消耗之和
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --time-range 2026-04-08:2026-04-08 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "FBK-F001",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-08"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 17c77e01-1d1d-4843-8535-1d32f9d73756\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-08\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --time-range 2026-04-08:2026-04-08 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "time_range": "2026-04-08:2026-04-08"
  },
  "expected_result": "指间：24864.77\r\n怒焰：0.00\r\n合计：24864.77",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "app_id": "10300001",
      "dateType": "DAY",
      "end": "2026-04-08",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD"
      },
      "operationId": "get_ad_day_report",
      "organic": 1,
      "routeKey": "page-5_DAY_5",
      "serializer": "day_report",
      "start": "2026-04-08"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-08:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 0346510e-84d9-4baf-b5d0-0384fab76781\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-08:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"app_id\": \"10300001\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-04-08\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD\"\n  },\n  \"operationId\": \"get_ad_day_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-5_DAY_5\",\n  \"serializer\": \"day_report\",\n  \"start\": \"2026-04-08\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "notes": "",
  "query": "指间和怒焰昨天的消耗之和"
}
```

### SEM-F019 · 语义理解

- query: 指间山海最近投的怎样
- expected_operation_id: None
- derived_cli_command: None
- mode_equivalent: False

```json
{
  "case_id": "SEM-F019",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to derive cli command from query",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": null,
  "expected_operation_id": null,
  "expected_params": {},
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "unable to infer expected operation from query",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间山海最近投的怎样"
}
```

### SEM-F020 · 语义理解

- query: 指间近 7 天的完整日报数据
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --granularity day
- mode_equivalent: False

```json
{
  "case_id": "SEM-F020",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间近 7 天的完整日报数据"
}
```

### FBK-F004 · 用户反馈

- query: 指间山海roi报表昨日自然量+巨量首日roi
- expected_operation_id: get_ad_roi_report
- derived_cli_command: cli ads report roi --app-ref 指间山海 --granularity day --roi-type cumulative
- mode_equivalent: False

```json
{
  "case_id": "FBK-F004",
  "category": "用户反馈",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --granularity day --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "cumulative"
  },
  "expected_result": "2026-04-07 自然量+巨量 7.37%",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间山海roi报表昨日自然量+巨量首日roi"
}
```

### MDIM-F010 · 多维度交叉

- query: 指间2026-03-01 IOS应用类型 全天激活数、累计10日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、9点-10点的注册数、截止到9点的首日付费账号数分别是多少
- expected_operation_id: get_ad_retention_report
- derived_cli_command: cli ads report retention --app-ref 指间 --time-range 2026-03-01:2026-03-01 --granularity day --app-type iOS应用 --retention-type first_pay
- mode_equivalent: True

```json
{
  "case_id": "MDIM-F010",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-03-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-03-01:2026-03-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 337601fd-5e15-4c0d-af03-8449343ccea1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-03-01:2026-03-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "derived_cli_command": "cli ads report retention --app-ref 指间 --time-range 2026-03-01:2026-03-01 --granularity day --app-type iOS应用 --retention-type first_pay",
  "expected_operation_id": "get_ad_retention_report",
  "expected_params": {
    "app_ref": "指间",
    "app_type": [
      "iOS应用"
    ],
    "granularity": "day",
    "retention_type": "first_pay",
    "time_range": "2026-03-01:2026-03-01"
  },
  "expected_result": "2026-03-01 IOS 激活 202 累计10日ROI: 34.84% 3日设备留存数 85、3日注册留存数  96、4日首日付费留存数 27\r\n2026-03-01 IOS  9点-10点的注册数 13 、截止到9点的首日付费账号数: 12",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "appId": "10300001",
      "appPackageType": "iOS应用",
      "dataType": "PAY_D1_RETENTION",
      "dateType": "DAY",
      "end": "2026-03-01",
      "filterField": {
        "metric_definition_type": "ALL",
        "promotion_source": "AD,MKT,OP",
        "retention_type": "PAY_D1_RETENTION"
      },
      "operationId": "get_ad_retention_report",
      "organic": 1,
      "routeKey": "page-10_10",
      "serializer": "retention_report",
      "start": "2026-03-01"
    },
    "canonical_params": {
      "app_id": "10300001",
      "app_ref": "指间",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-03-01:2026-03-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: f59ef673-c182-48c0-b832-c98af91cea77\n\n## canonical_params\n```json\n{\n  \"app_id\": \"10300001\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-03-01:2026-03-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"10300001\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"appId\": \"10300001\",\n  \"appPackageType\": \"iOS应用\",\n  \"dataType\": \"PAY_D1_RETENTION\",\n  \"dateType\": \"DAY\",\n  \"end\": \"2026-03-01\",\n  \"filterField\": {\n    \"metric_definition_type\": \"ALL\",\n    \"promotion_source\": \"AD,MKT,OP\",\n    \"retention_type\": \"PAY_D1_RETENTION\"\n  },\n  \"operationId\": \"get_ad_retention_report\",\n  \"organic\": 1,\n  \"routeKey\": \"page-10_10\",\n  \"serializer\": \"retention_report\",\n  \"start\": \"2026-03-01\"\n}\n```\n",
    "mode": "native",
    "operation_id": "get_ad_retention_report",
    "success": true
  },
  "notes": "",
  "query": "指间2026-03-01 IOS应用类型 全天激活数、累计10日roi、3日设备留存数、3日注册留存数、4日首日付费留存数、9点-10点的注册数、截止到9点的首日付费账号数分别是多少"
}
```

### SEM-F021 · 语义理解

- query: 指间今日截止到9点巨量激活数据多少
- expected_operation_id: get_ad_day_report
- derived_cli_command: cli ads report day --app-ref 指间 --granularity day
- mode_equivalent: False

```json
{
  "case_id": "SEM-F021",
  "category": "语义理解",
  "cli": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day"
  },
  "expected_result": "激活数： 188",
  "mode_equivalent": false,
  "native": {
    "bi_payload": null,
    "canonical_params": {},
    "error": "missing required parameter: time_range",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "",
  "query": "指间今日截止到9点巨量激活数据多少"
}
```
