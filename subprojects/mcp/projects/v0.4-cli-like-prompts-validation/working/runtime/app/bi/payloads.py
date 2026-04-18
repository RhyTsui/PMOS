from __future__ import annotations

from typing import Any

from app.bi.mappings import get_endpoint_config, is_report_operation
from app.domain.normalize import NormalizedRequest


PROMOTION_SOURCES = {
    "get_ad_day_report": "AD",
    "get_ad_hour_report": "AD",
    "get_ad_roi_report": "AD,MKT,OP",
    "get_ad_retention_report": "AD,MKT,OP",
}

RETENTION_DATA_TYPES = {
    "device": "DEVICE_RETENTION",
    "account": "REG_RETENTION",
    "first_pay": "PAY_D1_RETENTION",
}

ROI_DATA_TYPES = {
    "cumulative": "total",
    "interval": "section",
}



def build_bi_payload(request: NormalizedRequest) -> dict[str, Any]:
    if not is_report_operation(request.operation_id):
        raise ValueError(f"{request.operation_id} is not a BI report operation")

    endpoint = get_endpoint_config(request.operation_id)
    params = dict(request.canonical_params)
    start_date, end_date = _split_time_range(params.get("time_range"))
    group_by = _as_list(params.get("group_by"))

    payload: dict[str, Any] = {
        "operationId": request.operation_id,
        "serializer": endpoint.get("serializer", request.operation_id),
        "routeKey": endpoint.get("route_key"),
        "filterField": {
            "metric_definition_type": "ALL",
            "promotion_source": PROMOTION_SOURCES.get(request.operation_id, "ALL"),
        },
    }

    if request.operation_id == "get_ad_day_report":
        payload.update(
            {
                "app_id": params.get("app_id"),
                "start": start_date,
                "end": end_date,
                "dateType": _map_date_granularity(params.get("granularity")),
                "organic": _bool_to_flag(params.get("include_organic")),
            }
        )
    elif request.operation_id == "get_ad_hour_report":
        payload.update(
            {
                "appId": params.get("app_id"),
                "startDate": start_date,
                "endDate": end_date,
                "timeType": _map_hour_time_type(params.get("granularity")),
                "baseTimeType": _map_base_time_type(params.get("base_time_type")),
            }
        )
        view_criteria = _map_view_criteria(params)
        if view_criteria is not None:
            payload["viewCriteria"] = view_criteria
        if params.get("hour_slot"):
            payload["dh"] = params["hour_slot"]
    elif request.operation_id == "get_ad_roi_report":
        payload.update(
            {
                "appId": params.get("app_id"),
                "start": start_date,
                "end": end_date,
                "dateType": _map_date_granularity(params.get("granularity")),
                "dataType": ROI_DATA_TYPES.get(str(params.get("roi_type", "cumulative")), "total"),
                "organic": _bool_to_flag(params.get("include_organic")),
            }
        )
    elif request.operation_id == "get_ad_retention_report":
        payload.update(
            {
                "appId": params.get("app_id"),
                "start": start_date,
                "end": end_date,
                "dateType": _map_date_granularity(params.get("granularity")),
                "dataType": RETENTION_DATA_TYPES.get(
                    str(params.get("retention_type", "device")),
                    "DEVICE_RETENTION",
                ),
                "organic": _bool_to_flag(params.get("include_organic")),
            }
        )
        payload["filterField"]["retention_type"] = payload["dataType"]

    if params.get("media"):
        payload["mediaId"] = _join_csv(params.get("media"))
    if params.get("app_type"):
        payload["appPackageType"] = _join_csv(params.get("app_type"))
    if params.get("team"):
        team_key = "teamids" if request.operation_id == "get_ad_retention_report" else "teamIds"
        payload[team_key] = _join_csv(params.get("team"))
    subgroup = _map_subgroup(group_by)
    if subgroup:
        payload["subGroup"] = subgroup

    return _drop_none(payload)



def _split_time_range(value: Any) -> tuple[str | None, str | None]:
    if isinstance(value, str) and ":" in value:
        return tuple(value.split(":", 1))
    return None, None



def _map_date_granularity(value: Any) -> str:
    mapping = {
        "day": "DAY",
        "week": "NATURAL_WEEK",
        "month": "NATURAL_MONTH",
    }
    return mapping.get(str(value or "day"), "DAY")



def _map_hour_time_type(value: Any) -> str:
    if str(value or "hour") == "day":
        return "DAY"
    return "HOURLY"



def _map_base_time_type(value: Any) -> str:
    if str(value or "event_time") == "register_time":
        return "REGISTER_TIME"
    return "EVENT_TIME"



def _map_view_criteria(params: dict[str, Any]) -> str | None:
    if not _map_subgroup(_as_list(params.get("group_by"))):
        return None
    if params.get("hour_slot"):
        return None
    if str(params.get("view_mode") or "cumulative") == "cumulative":
        return "CURRENT_SUMMARY"
    return None



def _bool_to_flag(value: Any) -> int:
    return 1 if bool(value) else 0



def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if value is None:
        return []
    return [str(value)]



def _join_csv(value: Any) -> str:
    return ",".join(_as_list(value))



def _map_subgroup(group_by: list[str]) -> str | None:
    mapping = {
        "media": "media_id",
        "team": "teamids",
        "app_type": "appPackageType",
    }
    subgroup = [mapping[item] for item in group_by if item in mapping]
    if not subgroup:
        return None
    return ",".join(subgroup[:2])



def _drop_none(value: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, item in value.items():
        if item is None:
            continue
        if isinstance(item, dict):
            nested = _drop_none(item)
            if nested:
                result[key] = nested
            continue
        result[key] = item
    return result
