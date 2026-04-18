# Canonical Tool Notes

## CLI-like command grammar
- `cli apps list`
- `cli media list`
- `cli teams list`
- `cli ads report day`
- `cli ads report hour`
- `cli ads report retention`
- `cli ads report roi`

## Shared parameter layers
1. Scope
2. Time Range
3. Filters
4. Metrics / Options

## Stable defaults
- `granularity=day`
- `include_organic=true`
- `roi_type=cumulative`
- `retention_type=device`
- `view_mode=cumulative`

## Current implementation rule
Both native MCP and CLI-like input are normalized into the same `operation_id + canonical_params` shape before any transport-specific serialization.

## Parameter evidence from updated docs

### list_apps
- Acts as the required pre-step for downstream report queries.
- Transport classification:
  - `dimension lookup`
  - not a BI report endpoint
  - upstream path still unresolved
- Canonical match behavior:
  - exact match returns directly
  - fuzzy match must return candidates for confirmation
  - no guessing or auto-recommendation
- Stable returned identity fields:
  - `appId`
  - `appName`
  - `appRegion`
  - `thirdPartAppTypes`
  - `mfAppId`
  - `spMultiTeam`

### list_media
- Transport classification:
  - `dimension lookup`
  - not a BI report endpoint
  - upstream path still unresolved
- Stable returned identity fields:
  - `media_id`
  - `media_name`
  - `promotion_source`
  - `region`
  - `media_ad_type`
- Matching order from docs:
  - exact match
  - alias match
  - fuzzy match
  - ambiguous candidate confirmation
- Scope rule from docs:
  - day/week/month reports support only `promotion_source=AD` media, with organic only via `media_id=99999`
  - ROI / retention / hour reports support all media types

### list_team
- Transport classification:
  - `lookup`
  - MCP-facing HTTP endpoint evidence exists
- Stable returned identity fields:
  - `team_ids`
  - `team_name`
  - `query_start_date`
- Matching order from docs:
  - exact match
  - fuzzy match
  - ambiguous candidate confirmation
- Special value:
  - `MAINLAND` means all mainland ad teams / 所有投放

### get_ad_day_report
- Source parameter names in updated doc:
  - `app_id`
  - `start`
  - `end`
  - `dateType`
  - `mediaId`
  - `appPackageType`
  - `teamIds`
  - `organic`
  - `subGroup`
- Canonical implications:
  - normalize `app_id` -> `app_id`
  - `dateType` maps to canonical day/week/month granularity
  - `organic` should remain explicit because docs mark it required with default 0 semantics
  - `subGroup` supports up to 2 dimensions

### get_ad_hour_report
- Source parameter names in updated doc:
  - `appId`
  - `startDate`
  - `endDate`
  - `timeType`
  - `baseTimeType`
  - `subGroup`
  - `viewCriteria`
  - `dh`
  - `appPackageType`
  - `mediaId`
  - `teamIds`
- Canonical implications:
  - normalize `startDate/endDate` -> canonical time range
  - `timeType` distinguishes hourly vs day aggregation within this report
  - `baseTimeType` should map to a canonical base-time dimension, not be dropped
  - `viewCriteria=CURRENT_SUMMARY` means cumulative summary for subgroup view
  - `dh` is only needed for subgroup-specific hour-slice queries

### get_ad_roi_report
- Source parameter names in updated doc:
  - `appId`
  - `start`
  - `end`
  - `dataType`
  - `dateType`
  - `mediaId`
  - `appPackageType`
  - `organic`
  - `subGroup`
- Canonical implications:
  - doc `dataType=section|total` should map from canonical ROI mode
  - `dateType` maps to canonical day/week/month granularity
  - downstream BI example confirms `dataType` also appears in POST body

### get_ad_retention_report
- Source parameter names in updated doc:
  - `appId`
  - `start`
  - `end`
  - `dataType`
  - `dateType`
  - `appPackageType`
  - `mediaId`
  - `organic`
  - `teamids`
  - `subGroup`
- Canonical implications:
  - doc `dataType=DEVICE_RETENTION|REG_RETENTION|PAY_D1_RETENTION` should map from canonical retention type
  - normalize `teamids` casing to canonical `team_ids`
  - doc mixes `mediaid/teamids` in subgroup examples, so serializer should normalize casing before transport mapping
