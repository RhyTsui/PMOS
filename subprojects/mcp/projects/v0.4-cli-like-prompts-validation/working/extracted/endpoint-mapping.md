# Endpoint Mapping Notes

## Confirmed layers
- There appear to be **two transport layers** in the current evidence set:
  1. **MCP-facing layer** documented in tool prompt docs, using `/api/mcp/v1/...` examples.
  2. **Underlying BI layer** documented in `incoming/BI报表接口示例.md`, using `POST` requests to `/api/aiad-setting/v2/report/auto/...`.
- For implementation, keep both layers config-driven and do not collapse them into a single guessed route.

## Confirmed service split
- `list_apps` should be modeled as a **dimension-service** operation, not a report-system route.
- `list_media` should be modeled as a **dimension-service** operation, not a report-system route.
- `list_team` behaves like a **lookup** operation with MCP-facing HTTP evidence.
- `get_ad_day_report`, `get_ad_hour_report`, `get_ad_roi_report`, and `get_ad_retention_report` are **report** operations backed by BI POST transports.

## Confirmed from BI interface examples
- `get_ad_hour_report` -> `POST /api/aiad-setting/v2/report/auto/15`
- `get_ad_day_report` -> `POST /api/aiad-setting/v2/report/auto/5`
- `get_ad_roi_report` -> `POST /api/aiad-setting/v2/report/auto/9`
- `get_ad_retention_report` -> `POST /api/aiad-setting/v2/report/auto/10`
- Additional non-scope report example also exists: `POST /api/aiad-setting/v2/report/auto/42`

## Confirmed from MCP-style tool docs
- `list_team` list endpoint -> `GET /api/mcp/v1/teams/list`
- `list_team` match endpoint -> `GET /api/mcp/v1/teams/match?name=...`
- `get_ad_retention_report` example endpoint -> `GET /api/mcp/v1/report/retention?...`

## Confirmed request-body evidence from BI examples
- Hour report BI payload includes:
  - `start`, `end`
  - `timeType`
  - `routeKey=page-15_15`
  - `filterField.base_time_type`
  - `filterField.metric_definition_type`
  - `filterField.promotion_source`
- Day report BI payload includes:
  - `start`, `end`
  - `timeType=DAY`
  - `routeKey=page-5_DAY_5`
  - `isDevide`
  - `filterField.metric_definition_type`
  - `filterField.promotion_source`
- ROI report BI payload includes:
  - `start`, `end`
  - `timeType=DAY`
  - `dataType=total`
  - `routeKey=page-9_DAY_9`
  - `isDevide`
  - `filterField.metric_definition_type`
  - `filterField.promotion_source`
- Retention report BI payload includes:
  - `start`, `end`
  - `timeType=DAY`
  - `routeKey=page-10_10`
  - `filterField.metric_definition_type`
  - `filterField.retention_type`
  - `filterField.promotion_source=AD,MKT,OP`

## Still pending stronger path evidence
- `list_apps` tool behavior is well documented, but no explicit upstream HTTP path has been found yet in the updated docs reviewed so far.
- `list_media` tool behavior is well documented, but no explicit upstream HTTP path has been found yet in the updated docs reviewed so far.
- `get_ad_day_report`, `get_ad_hour_report`, and `get_ad_roi_report` parameter contracts are now clearer, but the MCP-facing route examples for these three were not explicitly found in the reviewed markdown files.

## Current implementation rule
- `list_apps` and `list_media` should remain modeled as **dimension-service operations** with unresolved upstream paths until stronger evidence appears.
- Do **not** infer `/api/aiad-setting/v2/report/auto/*` for `list_apps` or `list_media`.
- `list_team` is safe to keep as lookup/MCP HTTP in `working/runtime/config/catalog.yaml`.
- Report serializers should treat MCP query params and BI POST payloads as separate shapes mapped from the same canonical params.
