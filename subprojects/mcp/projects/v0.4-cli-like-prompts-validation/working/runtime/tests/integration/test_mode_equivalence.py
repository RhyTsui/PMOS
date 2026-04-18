from app.bi.payloads import build_bi_payload
from app.domain.normalize import normalize_cli_request, normalize_native_request
from app.domain.resolvers import resolve_request_entities
from app.domain.validate import validate_request, ValidationError
from app.mcp.cli_server import list_cli_mcp_tools
from app.mcp.native_server import list_native_mcp_tools


CLI_COMMAND = "cli ads report roi --app-id 10100042 --time-range 2026-04-01:2026-04-08 --roi-type interval"
NATIVE_ARGS = {
    "app_id": "10100042",
    "time_range": "2026-04-01:2026-04-08",
    "roi_type": "interval",
    "granularity": "day",
    "include_organic": True,
    "view_mode": "cumulative",
}



def test_mode_equivalence_for_roi_request():
    cli_request, _ = normalize_cli_request(CLI_COMMAND)
    native_request = normalize_native_request("get_ad_roi_report", NATIVE_ARGS)

    cli_request = resolve_request_entities(validate_request(cli_request))
    native_request = resolve_request_entities(validate_request(native_request))

    assert cli_request.operation_id == native_request.operation_id
    assert cli_request.canonical_params == native_request.canonical_params
    assert build_bi_payload(cli_request) == build_bi_payload(native_request)



def test_mode_equivalence_for_list_team_request():
    cli_request, _ = normalize_cli_request("cli teams list")
    native_request = normalize_native_request("list_team", {})

    cli_request = resolve_request_entities(validate_request(cli_request))
    native_request = resolve_request_entities(validate_request(native_request))

    assert cli_request.operation_id == native_request.operation_id
    assert cli_request.canonical_params == native_request.canonical_params



def test_hour_report_payload_uses_historical_field_names():
    cli_request, _ = normalize_cli_request(
        "cli ads report hour --app-id 10100042 --time-range 2026-04-08:2026-04-08 --granularity hour --base-time-type register_time --group-by media"
    )
    cli_request = resolve_request_entities(validate_request(cli_request))

    payload = build_bi_payload(cli_request)

    assert payload["startDate"] == "2026-04-08"
    assert payload["endDate"] == "2026-04-08"
    assert payload["timeType"] == "HOURLY"
    assert payload["baseTimeType"] == "REGISTER_TIME"
    assert payload["subGroup"] == "media_id"
    assert payload["viewCriteria"] == "CURRENT_SUMMARY"



def test_day_report_payload_uses_date_type():
    native_request = normalize_native_request(
        "get_ad_day_report",
        {
            "app_id": "10100042",
            "time_range": "2026-04-01:2026-04-08",
            "granularity": "week",
            "include_organic": False,
        },
    )
    native_request = resolve_request_entities(validate_request(native_request))

    payload = build_bi_payload(native_request)

    assert payload["start"] == "2026-04-01"
    assert payload["end"] == "2026-04-08"
    assert payload["dateType"] == "NATURAL_WEEK"
    assert payload["organic"] == 0



def test_report_validation_requires_app_scope():
    cli_request, _ = normalize_cli_request("cli ads report roi --time-range 2026-04-01:2026-04-08")

    try:
        validate_request(cli_request)
    except ValidationError as exc:
        assert "require app_id or app_ref" in str(exc)
    else:
        raise AssertionError("expected ValidationError")



def test_native_mcp_lists_only_expected_tools():
    response = list_native_mcp_tools()

    assert [tool.name for tool in response.tools] == [
        "list_apps",
        "list_media",
        "list_team",
        "get_ad_day_report",
        "get_ad_hour_report",
        "get_ad_retention_report",
        "get_ad_roi_report",
    ]



def test_cli_mcp_exposes_single_cli_tool_with_command_help():
    response = list_cli_mcp_tools()

    assert len(response.tools) == 1
    tool = response.tools[0]
    assert tool.name == "cli"
    assert "cli ads report day|hour|retention|roi" in tool.description
    assert "cli apps list" in tool.description
    assert "--base-time-type" in tool.description
