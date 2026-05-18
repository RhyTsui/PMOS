from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any
from urllib import error, request

from fastapi import HTTPException

from ad.settings import load_aiad_monitor_mcp_settings


TOOL_NAME = "create_monitor_campaign"
TOOL_NAME_ALIASES = {"add_attribution_campaign", "create_promotion_campaign"}
SERVER_NAME = "aiad-monitor-mcp"
PROTOCOL_VERSION = "2024-11-05"


@dataclass(frozen=True)
class MonitorCampaignPayload:
    campaign_name: str
    account_id: str
    app_id: int | None = None
    app_name: str | None = None
    create_mode: str = "SINGLE"
    promotion_type: str = "LINKING"
    app_package_type: str = "ANDROID"
    media_type: str | None = None
    media_id: str = "10001"
    media_name: str | None = None
    action_type: str = "DOWNLOAD"
    marketing_scene: str = "VIDEO_AND_IMAGE"
    team_id: str = "249"
    app_package_id: int = 101000421024
    attr_package_type: str = "CHANNEL"
    campaign_group_list: list[dict[str, Any]] | None = None
    additional_config: dict[str, Any] | None = None
    campaign_num: int | None = None
    campaign_name_suffix: int | None = None
    download_url: str | None = None
    ios_attr_app_info: dict[str, Any] | None = None
    android_attr_app_info: dict[str, Any] | None = None

    def to_upstream_payload(self) -> dict[str, Any]:
        payload = {
            "createMode": self.create_mode,
            "promotionType": self.promotion_type,
            "appPackageType": self.app_package_type,
            "mediaType": self.media_type,
            "mediaId": self.media_id,
            "mediaName": self.media_name,
            "accountId": self.account_id,
            "actionType": self.action_type,
            "linkAttrAppInfo": {
                "appPackageId": self.app_package_id,
                "attrPackageType": self.attr_package_type,
            },
            "marketingScene": self.marketing_scene,
            "teamId": self.team_id,
            "campaignName": self.campaign_name,
            "campaignGroupList": self.campaign_group_list or [],
            "additionalConfig": self.additional_config or {},
            "appId": self.app_id,
            "appName": self.app_name,
            "campaignNum": self.campaign_num,
            "campaignNameSuffix": self.campaign_name_suffix,
            "downloadUrl": self.download_url,
            "iosAttrAppInfo": self.ios_attr_app_info,
            "androidAttrAppInfo": self.android_attr_app_info,
        }
        return {key: value for key, value in payload.items() if value is not None}


def get_mcp_server_token() -> str:
    return load_aiad_monitor_mcp_settings().server_token


def get_initialize_result() -> dict[str, Any]:
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": {
            "tools": {},
        },
        "serverInfo": {
            "name": SERVER_NAME,
            "version": "0.1.0",
        },
    }


def get_tools_result() -> dict[str, Any]:
    return {
        "tools": [
            {
                "name": TOOL_NAME,
                "description": "创建归因监测计划，封装 aiad-setting 的 campaign add 接口。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "campaignName": {
                            "type": "string",
                            "description": "活动名称，例如 创建监测512。",
                        },
                        "accountId": {
                            "type": "string",
                            "description": "账户ID，分链接推广时必填。",
                        },
                        "appId": {
                            "type": "integer",
                            "description": "项目ID。",
                        },
                        "appName": {
                            "type": "string",
                            "description": "项目名称。",
                        },
                        "createMode": {
                            "type": "string",
                            "description": "创建类型，SINGLE 或 BATCH。",
                            "default": "SINGLE",
                        },
                        "promotionType": {
                            "type": "string",
                            "description": "推广方式，LINKING 或 ONELINK。",
                            "default": "LINKING",
                        },
                        "appPackageType": {
                            "type": "string",
                            "description": "应用包类型。",
                            "default": "ANDROID",
                        },
                        "mediaType": {
                            "type": "string",
                            "description": "媒体类型，SYS 或 CUSTOM。",
                        },
                        "mediaId": {
                            "type": "integer",
                            "description": "媒体ID。",
                            "default": 10001,
                        },
                        "mediaName": {
                            "type": "string",
                            "description": "媒体名称。",
                        },
                        "actionType": {
                            "type": "string",
                            "description": "下载方式。",
                            "default": "DOWNLOAD",
                        },
                        "marketingScene": {
                            "type": "string",
                            "description": "营销场景。",
                            "default": "VIDEO_AND_IMAGE",
                        },
                        "teamId": {
                            "type": "string",
                            "description": "团队ID。",
                            "default": "249",
                        },
                        "appPackageId": {
                            "type": "integer",
                            "description": "渠道归因应用包ID。",
                            "default": 101000421024,
                        },
                        "attrPackageType": {
                            "type": "string",
                            "description": "归因包类型。",
                            "default": "CHANNEL",
                        },
                        "campaignNum": {
                            "type": "integer",
                            "description": "批量创建时的活动数量。",
                        },
                        "campaignNameSuffix": {
                            "type": "integer",
                            "description": "活动名称后缀起始值。",
                        },
                        "campaignGroupList": {
                            "type": "array",
                            "items": {"type": "object"},
                            "description": "活动组列表。",
                            "default": [],
                        },
                        "additionalConfig": {
                            "type": "object",
                            "description": "补充信息，动态表单填入。",
                            "default": {},
                        },
                        "downloadUrl": {
                            "type": "string",
                            "description": "下载地址。",
                        },
                        "iosAttrAppInfo": {
                            "type": "object",
                            "description": "iOS 归因应用信息。",
                        },
                        "androidAttrAppInfo": {
                            "type": "object",
                            "description": "Android 归因应用信息。",
                        },
                    },
                    "required": ["campaignName", "accountId"],
                },
            }
        ]
    }


def _build_payload(arguments: dict[str, Any]) -> MonitorCampaignPayload:
    campaign_name = str(arguments.get("campaignName", "")).strip()
    account_id = str(arguments.get("accountId", "")).strip()
    if not campaign_name:
        raise HTTPException(status_code=400, detail="campaignName 不能为空")
    if not account_id:
        raise HTTPException(status_code=400, detail="accountId 不能为空")

    return MonitorCampaignPayload(
        campaign_name=campaign_name,
        account_id=account_id,
        app_id=_optional_int(arguments.get("appId")),
        app_name=_optional_str(arguments.get("appName")),
        create_mode=str(arguments.get("createMode", "SINGLE")),
        promotion_type=str(arguments.get("promotionType", "LINKING")),
        app_package_type=str(arguments.get("appPackageType", "ANDROID")),
        media_type=_optional_str(arguments.get("mediaType")),
        media_id=str(arguments.get("mediaId", "10001")),
        media_name=_optional_str(arguments.get("mediaName")),
        action_type=str(arguments.get("actionType", "DOWNLOAD")),
        marketing_scene=str(arguments.get("marketingScene", "VIDEO_AND_IMAGE")),
        team_id=str(arguments.get("teamId", "249")),
        app_package_id=int(arguments.get("appPackageId", 101000421024)),
        attr_package_type=str(arguments.get("attrPackageType", "CHANNEL")),
        campaign_group_list=_ensure_list(arguments.get("campaignGroupList")),
        additional_config=_ensure_dict(arguments.get("additionalConfig")),
        campaign_num=_optional_int(arguments.get("campaignNum")),
        campaign_name_suffix=_optional_int(arguments.get("campaignNameSuffix")),
        download_url=_optional_str(arguments.get("downloadUrl")),
        ios_attr_app_info=_ensure_optional_object(arguments.get("iosAttrAppInfo"), "iosAttrAppInfo"),
        android_attr_app_info=_ensure_optional_object(arguments.get("androidAttrAppInfo"), "androidAttrAppInfo"),
    )


def _ensure_list(value: Any) -> list[dict[str, Any]] | None:
    if value is None:
        return None
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    raise HTTPException(status_code=400, detail="campaignGroupList 必须是对象数组")


def _ensure_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    raise HTTPException(status_code=400, detail="additionalConfig 必须是对象")


def _ensure_optional_object(value: Any, field_name: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    raise HTTPException(status_code=400, detail=f"{field_name} 必须是对象")


def _optional_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def call_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    if tool_name != TOOL_NAME and tool_name not in TOOL_NAME_ALIASES:
        raise HTTPException(status_code=404, detail=f"未知工具: {tool_name}")

    settings = load_aiad_monitor_mcp_settings()
    if not settings.upstream_url:
        raise HTTPException(status_code=500, detail="未配置 AIAD_MONITOR_UPSTREAM_URL")
    if not settings.upstream_bearer_token:
        raise HTTPException(status_code=500, detail="未配置 AIAD_MONITOR_UPSTREAM_BEARER_TOKEN")
    if not settings.upstream_app_id:
        raise HTTPException(status_code=500, detail="未配置 AIAD_MONITOR_UPSTREAM_APP_ID")

    payload = _build_payload(arguments).to_upstream_payload()
    upstream_response = _post_upstream(settings.upstream_url, settings.upstream_bearer_token, settings.upstream_app_id, payload)
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(
                    {
                        "ok": True,
                        "tool": TOOL_NAME,
                        "upstream": upstream_response,
                    },
                    ensure_ascii=False,
                ),
            }
        ],
        "structuredContent": {
            "ok": True,
            "tool": TOOL_NAME,
            "upstream": upstream_response,
        },
        "isError": False,
    }


def _post_upstream(url: str, bearer_token: str, app_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    raw_body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        url,
        data=raw_body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bearer_token.removeprefix('Bearer ').strip()}",
            "x-app-id": app_id,
        },
    )

    try:
        with request.urlopen(req, timeout=20) as resp:
            body_text = resp.read().decode("utf-8")
            return {
                "status": resp.status,
                "body": _try_parse_json(body_text),
            }
    except error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail={
                "message": "上游接口返回错误",
                "status": exc.code,
                "body": _try_parse_json(body_text),
            },
        ) from exc
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"上游接口不可达: {exc.reason}") from exc


def _try_parse_json(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value
