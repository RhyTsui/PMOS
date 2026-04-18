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
      "cli_success_rate": 0.9167,
      "equivalence_rate": 0.9167,
      "native_success_rate": 0.9167,
      "total": 12
    },
    "多轮对话": {
      "cli_success_rate": 1.0,
      "equivalence_rate": 1.0,
      "native_success_rate": 1.0,
      "total": 4
    },
    "媒体识别": {
      "cli_success_rate": 0.7143,
      "equivalence_rate": 0.7143,
      "native_success_rate": 0.7143,
      "total": 7
    },
    "数据准确性": {
      "cli_success_rate": 0.5833,
      "equivalence_rate": 0.5833,
      "native_success_rate": 0.5833,
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
      "cli_success_rate": 0.25,
      "equivalence_rate": 0.25,
      "native_success_rate": 0.25,
      "total": 4
    }
  },
  "by_mode": {
    "cli": {
      "success_count": 53,
      "success_rate": 0.6883
    },
    "native": {
      "success_count": 53,
      "success_rate": 0.6883
    }
  },
  "equivalence_rate": 0.6883,
  "metrics": {
    "参数完整率": 0.6883,
    "参数正确率": 0.6883,
    "工具匹配准确率": 0.6883,
    "幻觉/拒绝率": 0.3117,
    "格式合规率": 0.6883
  },
  "processable_cases": 70,
  "total_cases": 77
}
```

## By Category
| Category | Total | CLI Success | Native Success | Equivalence |
|---|---:|---:|---:|---:|
| 业务场景 | 4 | 0.75 | 0.75 | 0.75 |
| 多维度交叉 | 12 | 0.9167 | 0.9167 | 0.9167 |
| 多轮对话 | 4 | 1.0 | 1.0 | 1.0 |
| 媒体识别 | 7 | 0.7143 | 0.7143 | 0.7143 |
| 数据准确性 | 12 | 0.5833 | 0.5833 | 0.5833 |
| 日期识别 | 8 | 0.75 | 0.75 | 0.75 |
| 用户反馈 | 1 | 0.0 | 0.0 | 0.0 |
| 语义理解 | 25 | 0.64 | 0.64 | 0.64 |
| 边缘场景 | 4 | 0.25 | 0.25 | 0.25 |

## Failures
- DATE-003: cli=unable to derive cli command from query native=unable to infer expected operation from query
- DATE-F005: cli=missing required parameter: time_range native=missing required parameter: time_range
- MEDIA-004: cli=missing required parameter: time_range native=missing required parameter: time_range
- MEDIA-F005: cli=missing required parameter: hour_slot native=missing required parameter: hour_slot
- CSEM-001: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-009: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-025: cli=unable to derive cli command from query native=unable to infer expected operation from query
- SEM-026: cli=missing required parameter: time_range native=missing required parameter: time_range
- SEM-F015: cli=unable to derive cli command from query native=unable to infer expected operation from query
- ACC-F001: cli=missing required parameter: hour_slot native=missing required parameter: hour_slot
- ACC-F002: cli=missing required parameter: hour_slot native=missing required parameter: hour_slot
- ACC-F006: cli=missing required parameter: time_range native=missing required parameter: time_range
- ACC-F007: cli=missing required parameter: time_range native=missing required parameter: time_range
- ACC-F008: cli=missing required parameter: time_range native=missing required parameter: time_range
- MDIM-F008: cli=missing required parameter: hour_slot native=missing required parameter: hour_slot
- EDGE-001: cli=unable to derive cli command from query native=unable to infer expected operation from query
- EDGE-003: cli=unable to derive cli command from query native=unable to infer expected operation from query
- EDGE-F001: cli=missing required parameter: hour_slot native=missing required parameter: hour_slot
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-15",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-15",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-01:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 74811bdd-2fa8-4695-a32d-077c1e1f9fc3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-01:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-15\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-15\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-15",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-15",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-01:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 597bc840-7f35-477b-88a0-c017153bac3c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-01:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-15\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-15\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
- derived_cli_command: cli ads report roi --app-ref 指间山海 --time-range 2026-03-10:2026-04-08 --granularity day --roi-type cumulative
- mode_equivalent: True

```json
{
  "case_id": "DATE-002",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-10",
        "time_range": "2026-03-10:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-10:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 65668a43-d195-491c-99d7-5160ea49048b\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-10:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-10\",\n    \"time_range\": \"2026-03-10:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_roi_report",
    "success": true
  },
  "derived_cli_command": "cli ads report roi --app-ref 指间山海 --time-range 2026-03-10:2026-04-08 --granularity day --roi-type cumulative",
  "expected_operation_id": "get_ad_roi_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "roi_type": "cumulative",
    "time_range": "2026-03-10:2026-04-08"
  },
  "expected_result": "累计 ROI 24% 左右.人工核对",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-10",
        "time_range": "2026-03-10:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "cumulative",
      "time_range": "2026-03-10:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 51abd08d-5fc0-4f08-928e-cf2b938bff2a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-10:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-10\",\n    \"time_range\": \"2026-03-10:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 5cd25517-8f3f-45c8-9266-74bd4e3d0f0a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 491092de-2835-4558-afe1-d76b92565d15\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: dedc5d5b-03d2-4fbe-ae5f-6b014f358ac9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 139e2867-58b9-4585-828a-8e54b24cb5c6\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 35106a90-a63c-48df-92ca-90bef4b73d07\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 90baffe4-7520-44b5-8b93-04e46ea16f8c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-04-07:2026-04-07 --granularity hour --team 广告投放一部 --hour-slot 09:00-10:00
- mode_equivalent: True

```json
{
  "case_id": "DATE-F004",
  "category": "日期识别",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_hour_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "hour",
        "hour_slot": "09:00-10:00",
        "include_organic": true,
        "start_date": "2026-04-07",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_hour_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "hour",
      "hour_slot": "09:00-10:00",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: cli\n- correlation_id: 1b5ad9a3-010a-44e1-9d57-a248a0368f73\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"hour\",\n  \"hour_slot\": \"09:00-10:00\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_hour_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"hour\",\n    \"hour_slot\": \"09:00-10:00\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_hour_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_hour_report",
    "success": true
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-04-07:2026-04-07 --granularity hour --team 广告投放一部 --hour-slot 09:00-10:00",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "hour_slot": "09:00-10:00",
    "team": [
      "广告投放一部"
    ],
    "time_range": "2026-04-07:2026-04-07"
  },
  "expected_result": "激活数 12  折后消耗 904.65",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_hour_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "hour",
        "hour_slot": "09:00-10:00",
        "include_organic": true,
        "start_date": "2026-04-07",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_hour_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "hour",
      "hour_slot": "09:00-10:00",
      "include_organic": true,
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_hour_report\n\n- mode: native\n- correlation_id: 38c7977f-bdb7-4545-b8be-5becb2bcfb43\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"hour\",\n  \"hour_slot\": \"09:00-10:00\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_hour_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"hour\",\n    \"hour_slot\": \"09:00-10:00\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_hour_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day --media 巨量引擎
- mode_equivalent: True

```json
{
  "case_id": "MEDIA-001",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 408e8e27-359e-4118-a9b6-03848db49ffa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day --media 巨量引擎",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "media": [
      "巨量引擎"
    ],
    "time_range": "2026-04-02:2026-04-08"
  },
  "expected_result": "最近 7 天激活数 3692 左右，结果支持1%的浮动",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 43826764-1e06-4a95-8610-b06f069648cf\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 05625289-fc8b-494e-b7df-7b5cb2ae713a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 8aa8beb5-6e18-4088-81db-6f7d7af95b25\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "腾讯广告"
        ],
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "腾讯广告"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: b7cf78f1-1497-468a-a3bb-9bf3e48f08d2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"腾讯广告\"\n    ],\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "腾讯广告"
        ],
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "腾讯广告"
      ],
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 6f4f28b8-8a85-4bee-a47e-9cae9e4fec23\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"腾讯广告\"\n    ],\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "media": [
          "快手"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 7f59c43e-6270-472a-9f05-f7ef3de3fbed\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"快手\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"快手\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"media\": [\n      \"快手\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "media": [
          "快手"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 3d32623f-6b34-4f53-9bf0-52b63dba69f0\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"快手\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"快手\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"media\": [\n      \"快手\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "腾讯广告"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "media": [
        "巨量引擎",
        "腾讯广告"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 21019e50-f15a-4a60-8dc2-8ff579d962a3\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"腾讯广告\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "腾讯广告"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "month",
      "include_organic": true,
      "media": [
        "巨量引擎",
        "腾讯广告"
      ],
      "roi_type": "cumulative",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-02-01:2026-02-28",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: abe0e6c1-2c85-4fca-968c-8dbfe30f55e0\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"腾讯广告\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
- mode_equivalent: False

```json
{
  "case_id": "MEDIA-F005",
  "category": "媒体识别",
  "cli": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
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
  "mode_equivalent": false,
  "native": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
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
    "bi_payload": {},
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
    "bi_payload": {},
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
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-01:2026-04-07 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "CSEM-010",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-01",
        "time_range": "2026-04-01:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-01:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 856ac109-fc65-4795-a881-3103bc17dd16\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-01:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-01\",\n    \"time_range\": \"2026-04-01:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-01:2026-04-07 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-01:2026-04-07"
  },
  "expected_result": "最近一周：2026-04-07 ~ 2026-04-01，激活数 5667\r\n前一周：2026-03-25 ~ 2026-03-31，激活数 8301\r\n激活数环比变化 = (5667 - 8301) / 5667 = -46.48%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-01",
        "time_range": "2026-04-01:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-01:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 21beda63-7ced-4fdc-9f0c-b89b08938a1e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-01:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-01\",\n    \"time_range\": \"2026-04-01:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "SEM-011",
  "category": "语义理解",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 5bb80d6c-9b5b-44f1-af1d-9a53819600fe\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
  "expected_result": "激活 35,557 注册31,727 转化率 89.2%",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 344d415a-9672-4ad3-b0d6-63ccb7dbe9b9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: b3fc3aa3-c88a-4745-b9b7-b5bd9466c1f1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "roi_type": "interval",
      "team": [
        "广告投放一部"
      ],
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: c2ad679e-6e27-4b7b-b8c2-d6b0b264d90f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 24ee9515-03a3-49a0-bfe3-5a467957412a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: fdda350e-0296-477c-98f0-39623f1d4c55\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 0a614cd5-9dd4-4db0-86cc-8b75ce859d36\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: ce48c9e0-7fe6-4ea5-8434-fcf0fc193497\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 733c523c-d787-4960-b7c1-08cebe16592f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 9d022435-be1a-44ae-a8e7-500fd50428c1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: e8f900bc-5344-4391-85c2-8ca8506f48ce\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 4c1b0678-435d-4fdd-8b86-2703e46810d8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-20",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-20:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 72b96be1-38a5-4cef-b8d7-3053463853e1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-20\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-20:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-20",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-20:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 54c684e1-990c-485c-aca4-df51aefa3f94\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-20\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-20:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-20",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-20:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 29658673-aa0f-49ed-aaaf-441762e34ef4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-20\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-20:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-20",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-20:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 0b518e06-f1f5-4476-b685-5b07fe0eb74a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-20:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-20\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-20:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: d72f8ef4-7f83-4eef-9720-6f11a708821c\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 7bd23907-ef2a-472c-8f68-82b13415f7cf\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: d4b4dacd-0f0e-41d5-9463-49f9ef871856\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 1c3cb19e-e9d7-42d8-b341-6167ef3fafd8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 0be04bd0-c3bf-4f5d-9025-2276b9b75f8e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 5738a169-cb8c-43e6-8c3a-61cd8e8ae04f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 6ac39b06-bdca-45d9-8212-31360d052637\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-02-28",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-28",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: ba6500d1-cd19-4ea1-ba82-eac0a53d2aaa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-28\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-02-28\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-28\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-15",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-15",
        "time_range": "2026-03-15:2026-03-15",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-15:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: e548e876-24d6-4909-84c3-f581c6dc531d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-15:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-15\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-15\",\n    \"time_range\": \"2026-03-15:2026-03-15\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-15",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-15",
        "time_range": "2026-03-15:2026-03-15",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-15:2026-03-15",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: afa741d2-b219-4879-add3-34fe257af24e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-15:2026-03-15\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-15\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-15\",\n    \"time_range\": \"2026-03-15:2026-03-15\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-02:2026-04-08 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "ACC-002",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 69c46446-644f-4f3d-b1ae-e2ee210ba045\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
  "expected_result": "人工复核",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 4fd5cb3b-f08f-4a88-946f-f6d90f59b9e7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 7af32e9d-83de-4404-99c8-78ccef5557f6\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 2a3a2b7a-38b0-4769-b83d-ce99ae77fe36\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-03-24",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-24",
        "time_range": "2026-03-24:2026-03-24",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-24:2026-03-24",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 641b3a5b-ca2a-4167-a7c2-94400e7ca30f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-24:2026-03-24\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-03-24\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-24\",\n    \"time_range\": \"2026-03-24:2026-03-24\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-03-24",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-24",
        "time_range": "2026-03-24:2026-03-24",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-03-24:2026-03-24",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 00c05a23-7d01-4f54-9363-e8738b84c294\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-03-24:2026-03-24\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-03-24\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-24\",\n    \"time_range\": \"2026-03-24:2026-03-24\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "市场星图"
        ],
        "retention_type": "device",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 8f47fb95-edf6-4977-b7f9-db8a81a860a8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场星图\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"media\": [\n    \"市场星图\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"市场星图\"\n    ],\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "市场星图"
        ],
        "retention_type": "device",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 2a3e7159-9661-42cd-a453-ff55346b9543\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场星图\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"media\": [\n    \"市场星图\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"市场星图\"\n    ],\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "市场量"
        ],
        "retention_type": "device",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 25797fe6-d82f-4556-b05a-8961c77dd561\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场量\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"media\": [\n    \"市场量\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"市场量\"\n    ],\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "市场量"
        ],
        "retention_type": "device",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: ab35e9e9-c348-4814-87c0-1a84d78dbe2e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"市场量\"\n  ],\n  \"retention_type\": \"device\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"media\": [\n    \"市场量\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"市场量\"\n    ],\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
- mode_equivalent: False

```json
{
  "case_id": "ACC-F001",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
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
  "mode_equivalent": false,
  "native": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
  },
  "notes": "功能测试点：小时报表汇总一致性",
  "query": "验证指间山海2026-03-25广告小时报表按分时段查询的各小时消耗之和是否等于当天总消耗（广告投放一部）"
}
```

### ACC-F002 · 数据准确性

- query: 验证指间山海2026-03-25广告小时报表按媒体汇总的全天激活数之和是否等于当天总激活数
- expected_operation_id: get_ad_hour_report
- derived_cli_command: cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour
- mode_equivalent: False

```json
{
  "case_id": "ACC-F002",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间山海 --time-range 2026-03-25:2026-03-25 --granularity hour",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "hour",
    "time_range": "2026-03-25:2026-03-25"
  },
  "expected_result": "225 等于",
  "mode_equivalent": false,
  "native": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 8bbcac69-7746-4d27-91ac-a8e4c32e5cd4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2026-03-25:2026-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 28c1f193-3bdf-42c7-b7d7-9af98912ae38\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-30",
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "week",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "roi_type": "cumulative",
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: d1e141e9-c63a-46c2-8934-486a6fd025f1\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-30\",\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "安卓应用"
        ],
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "media": [
          "巨量引擎"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-30",
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "安卓应用"
      ],
      "granularity": "week",
      "include_organic": true,
      "media": [
        "巨量引擎"
      ],
      "roi_type": "cumulative",
      "time_range": "2026-03-30:2026-04-05",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: b4fa5603-837e-475f-a239-32f479139db5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"安卓应用\"\n  ],\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-30\",\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "media": [
          "腾讯广告"
        ],
        "roi_type": "interval",
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "month",
      "include_organic": true,
      "media": [
        "腾讯广告"
      ],
      "roi_type": "interval",
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: b792d8f3-7445-4579-b21c-269179b0ea0e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"腾讯广告\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"media\": [\n      \"腾讯广告\"\n    ],\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "media": [
          "腾讯广告"
        ],
        "roi_type": "interval",
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "month",
      "include_organic": true,
      "media": [
        "腾讯广告"
      ],
      "roi_type": "interval",
      "time_range": "2026-03-01:2026-03-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 13403f33-88aa-4866-a594-a808a70a3cad\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"media\": [\n    \"腾讯广告\"\n  ],\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"腾讯广告\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"media\": [\n      \"腾讯广告\"\n    ],\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "腾讯广告"
        ],
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎",
        "腾讯广告"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 80eda683-d4ce-4be9-9eae-b492a8063c4d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"腾讯广告\"\n    ],\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-04-08",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "腾讯广告"
        ],
        "start_date": "2026-04-02",
        "time_range": "2026-04-02:2026-04-08",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "app_type": [
        "iOS应用"
      ],
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎",
        "腾讯广告"
      ],
      "time_range": "2026-04-02:2026-04-08",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 1e528c69-e4d7-43db-adc3-ad011a4d180f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ],\n  \"time_range\": \"2026-04-02:2026-04-08\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"腾讯广告\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-04-08\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"腾讯广告\"\n    ],\n    \"start_date\": \"2026-04-02\",\n    \"time_range\": \"2026-04-02:2026-04-08\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用",
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: ecb83be3-6d50-40a7-a4eb-895d5a2b65cb\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\",\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\",\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "app_type": [
          "iOS应用",
          "安卓应用"
        ],
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 5988137c-fe52-46d6-b39e-27b5879bb330\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"app_type\": [\n    \"iOS应用\",\n    \"安卓应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"app_type\": [\n      \"iOS应用\",\n      \"安卓应用\"\n    ],\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 2809faf5-7b84-4c31-aef7-66eeb8d705bd\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 62f0bdca-79a0-47be-a783-d928b97d42ee\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-02-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: b34f0461-0463-408d-b1f3-422cc884acfa\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-02-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-02-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-02-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-02-01:2026-02-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 0b130425-7782-4e57-8984-a23e6aff25ae\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-02-01:2026-02-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-02-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-02-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-02-01:2026-02-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: c15aff83-866c-44e6-bba3-b59e4234ddd7\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 9968d854-9b84-4831-8c37-489e0357b6d8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 1c689d7a-cdde-4d59-83ac-7294a8d4ed70\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 00bad627-1c7f-473d-9722-01ef44e7ac83\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 0ad4ceb5-5a9e-448b-904a-5bea2a936a1d\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: c7410d0f-4272-46be-8347-8399fa95ed8f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2025-12-31",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2025-12-01",
        "time_range": "2025-12-01:2025-12-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2025-12-01:2025-12-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 564106ff-f00c-452d-804d-78374d411b53\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2025-12-01:2025-12-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2025-12-31\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2025-12-01\",\n    \"time_range\": \"2025-12-01:2025-12-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2025-12-31",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2025-12-01",
        "time_range": "2025-12-01:2025-12-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "retention_type": "first_pay",
      "time_range": "2025-12-01:2025-12-31",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: e55077df-0784-412e-b07c-9e3e20d126ae\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2025-12-01:2025-12-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2025-12-31\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2025-12-01\",\n    \"time_range\": \"2025-12-01:2025-12-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: dfc3df21-dbae-4669-9c21-746ac448a534\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-01-01",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-01-01",
        "time_range": "2026-01-01:2026-01-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-01-01:2026-01-01",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 7c69a2a9-a627-45b9-ab51-9a390b0e8e48\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-01-01:2026-01-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-01-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-01-01\",\n    \"time_range\": \"2026-01-01:2026-01-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
- mode_equivalent: False

```json
{
  "case_id": "MDIM-F008",
  "category": "多维度交叉",
  "cli": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
  },
  "derived_cli_command": "cli ads report hour --app-ref 指间 --time-range 2026-01-01:2026-01-01 --granularity hour",
  "expected_operation_id": "get_ad_hour_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "hour",
    "time_range": "2026-01-01:2026-01-01"
  },
  "expected_result": "人工复核",
  "mode_equivalent": false,
  "native": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2025-12-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2025-12-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2025-12-01:2025-12-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 80bd3aef-24e9-41cc-95cc-ccb8842f8da4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2025-12-01:2025-12-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2025-12-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2025-12-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2025-12-01:2025-12-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2025-12-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2025-12-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2025-12-01:2025-12-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 1a99aea7-83e6-47ea-a501-edc40a3532d9\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2025-12-01:2025-12-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2025-12-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2025-12-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2025-12-01:2025-12-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
- mode_equivalent: False

```json
{
  "case_id": "EDGE-F001",
  "category": "边缘场景",
  "cli": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "cli",
    "operation_id": "",
    "success": false
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
  "mode_equivalent": false,
  "native": {
    "bi_payload": {},
    "canonical_params": {},
    "error": "missing required parameter: hour_slot",
    "markdown": "",
    "mode": "native",
    "operation_id": "",
    "success": false
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: ab067ea8-85ac-4353-9247-a2490c6de0d2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "roi_type": "cumulative",
        "start_date": "2026-03-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: d0bcde81-46cf-48ab-9516-ecc5fe203624\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "retention_type": "device",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 217b3a01-9712-4de8-a682-68842796e8a8\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "week",
        "include_organic": true,
        "retention_type": "device",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 624b609a-5525-4c10-b556-9805d28cabe6\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"week\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"week\",\n    \"include_organic\": true,\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "retention_type": "device",
        "start_date": "2026-03-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: 3f19417f-50d0-4297-8e36-c77dbcf47ab0\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-03-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-31",
        "granularity": "month",
        "include_organic": true,
        "retention_type": "device",
        "start_date": "2026-03-01",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-01:2026-03-31",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: ab8d21bd-e726-4654-9929-8957846cbc43\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"month\",\n  \"include_organic\": true,\n  \"retention_type\": \"device\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-01:2026-03-31\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-31\",\n    \"granularity\": \"month\",\n    \"include_organic\": true,\n    \"retention_type\": \"device\",\n    \"start_date\": \"2026-03-01\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-01:2026-03-31\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 115bf164-0999-4731-8699-77439fbe8b4f\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 74dfcb66-c814-4939-8e84-57e92365f4d5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
- derived_cli_command: cli ads report day --app-ref 指间山海 --time-range 2026-04-07:2026-04-07 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "DIA-001",
  "category": "多轮对话",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-07",
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: 05ff5fd8-3245-49c3-b1a1-18f126d17eac\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间山海 --time-range 2026-04-07:2026-04-07 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间山海",
    "granularity": "day",
    "time_range": "2026-04-07:2026-04-07"
  },
  "expected_result": "",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-07",
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: 6205dd68-7de4-4360-a45c-a84a3df4648e\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2025-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2025-03-25",
        "time_range": "2025-03-25:2025-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2025-03-25:2025-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: 9da9f59e-773e-46da-bf7c-f24512e775d4\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2025-03-25:2025-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2025-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2025-03-25\",\n    \"time_range\": \"2025-03-25:2025-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2025-03-25",
        "granularity": "day",
        "include_organic": true,
        "roi_type": "interval",
        "start_date": "2025-03-25",
        "time_range": "2025-03-25:2025-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "roi_type": "interval",
      "time_range": "2025-03-25:2025-03-25",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 35fe2dcd-b6d2-4292-8c12-24bae21edf76\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"roi_type\": \"interval\",\n  \"time_range\": \"2025-03-25:2025-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2025-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"roi_type\": \"interval\",\n    \"start_date\": \"2025-03-25\",\n    \"time_range\": \"2025-03-25:2025-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "苹果广告"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎",
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
    "markdown": "# get_ad_roi_report\n\n- mode: cli\n- correlation_id: c3296af9-ceaa-446a-954f-af4953ac3195\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"苹果广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"苹果广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"苹果广告\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_roi_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-03-25",
        "granularity": "day",
        "include_organic": true,
        "media": [
          "巨量引擎",
          "苹果广告"
        ],
        "roi_type": "cumulative",
        "start_date": "2026-03-25",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-25:2026-03-25",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_roi_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
      "app_ref": "指间山海",
      "granularity": "day",
      "include_organic": true,
      "media": [
        "巨量引擎",
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
    "markdown": "# get_ad_roi_report\n\n- mode: native\n- correlation_id: 2c111cfb-b927-4feb-a51b-c0b0a234a445\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"media\": [\n    \"巨量引擎\",\n    \"苹果广告\"\n  ],\n  \"roi_type\": \"cumulative\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-25:2026-03-25\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"media\": [\n    \"巨量引擎\",\n    \"苹果广告\"\n  ],\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_roi_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-03-25\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"media\": [\n      \"巨量引擎\",\n      \"苹果广告\"\n    ],\n    \"roi_type\": \"cumulative\",\n    \"start_date\": \"2026-03-25\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-25:2026-03-25\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_roi_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "account",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: f46fbb0a-f5e7-4186-b2c4-4f396f9565e2\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"account\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"account\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间山海",
        "app_ref": "指间山海",
        "end_date": "2026-04-05",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "account",
        "start_date": "2026-03-30",
        "team": [
          "广告投放一部"
        ],
        "time_range": "2026-03-30:2026-04-05",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间山海",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: 20dfc158-f5a0-4c5f-9d2b-699c206026c5\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"app_ref\": \"指间山海\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"account\",\n  \"team\": [\n    \"广告投放一部\"\n  ],\n  \"time_range\": \"2026-03-30:2026-04-05\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间山海\",\n  \"team\": [\n    \"广告投放一部\"\n  ]\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间山海\",\n    \"app_ref\": \"指间山海\",\n    \"end_date\": \"2026-04-05\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"account\",\n    \"start_date\": \"2026-03-30\",\n    \"team\": [\n      \"广告投放一部\"\n    ],\n    \"time_range\": \"2026-03-30:2026-04-05\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
- derived_cli_command: cli ads report day --app-ref 指间 --time-range 2026-04-07:2026-04-07 --granularity day
- mode_equivalent: True

```json
{
  "case_id": "FBK-F001",
  "category": "数据准确性",
  "cli": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-07",
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: cli\n- correlation_id: abfc46ed-6edd-4f06-acd5-c5079817e839\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
    "mode": "cli",
    "operation_id": "get_ad_day_report",
    "success": true
  },
  "derived_cli_command": "cli ads report day --app-ref 指间 --time-range 2026-04-07:2026-04-07 --granularity day",
  "expected_operation_id": "get_ad_day_report",
  "expected_params": {
    "app_ref": "指间",
    "granularity": "day",
    "time_range": "2026-04-07:2026-04-07"
  },
  "expected_result": "指间：24864.77\r\n怒焰：0.00\r\n合计：24864.77",
  "mode_equivalent": true,
  "native": {
    "bi_payload": {
      "operationId": "get_ad_day_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "end_date": "2026-04-07",
        "granularity": "day",
        "include_organic": true,
        "start_date": "2026-04-07",
        "time_range": "2026-04-07:2026-04-07",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_day_report"
    },
    "canonical_params": {
      "app_id": "指间",
      "app_ref": "指间",
      "granularity": "day",
      "include_organic": true,
      "time_range": "2026-04-07:2026-04-07",
      "view_mode": "cumulative"
    },
    "error": null,
    "markdown": "# get_ad_day_report\n\n- mode: native\n- correlation_id: e2015b45-cb8e-404f-ba8f-16d6059f2439\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"time_range\": \"2026-04-07:2026-04-07\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_day_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"end_date\": \"2026-04-07\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"start_date\": \"2026-04-07\",\n    \"time_range\": \"2026-04-07:2026-04-07\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_day_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
    "bi_payload": {},
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-03-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: cli\n- correlation_id: ca15c61f-c626-4b92-9d09-d04270c0f101\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-03-01:2026-03-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-03-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
      "operationId": "get_ad_retention_report",
      "params": {
        "app_id": "指间",
        "app_ref": "指间",
        "app_type": [
          "iOS应用"
        ],
        "end_date": "2026-03-01",
        "granularity": "day",
        "include_organic": true,
        "retention_type": "first_pay",
        "start_date": "2026-03-01",
        "time_range": "2026-03-01:2026-03-01",
        "view_mode": "cumulative"
      },
      "routeKey": "ad_retention_report"
    },
    "canonical_params": {
      "app_id": "指间",
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
    "markdown": "# get_ad_retention_report\n\n- mode: native\n- correlation_id: bbbf4598-76d8-4509-9a04-db51a6eaf65a\n\n## canonical_params\n```json\n{\n  \"app_id\": \"指间\",\n  \"app_ref\": \"指间\",\n  \"app_type\": [\n    \"iOS应用\"\n  ],\n  \"granularity\": \"day\",\n  \"include_organic\": true,\n  \"retention_type\": \"first_pay\",\n  \"time_range\": \"2026-03-01:2026-03-01\",\n  \"view_mode\": \"cumulative\"\n}\n```\n\n## resolved_ids\n```json\n{\n  \"app_id\": \"指间\"\n}\n```\n\n## bi_payload\n```json\n{\n  \"operationId\": \"get_ad_retention_report\",\n  \"params\": {\n    \"app_id\": \"指间\",\n    \"app_ref\": \"指间\",\n    \"app_type\": [\n      \"iOS应用\"\n    ],\n    \"end_date\": \"2026-03-01\",\n    \"granularity\": \"day\",\n    \"include_organic\": true,\n    \"retention_type\": \"first_pay\",\n    \"start_date\": \"2026-03-01\",\n    \"time_range\": \"2026-03-01:2026-03-01\",\n    \"view_mode\": \"cumulative\"\n  },\n  \"routeKey\": \"ad_retention_report\"\n}\n```\n",
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
    "bi_payload": {},
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
    "bi_payload": {},
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
