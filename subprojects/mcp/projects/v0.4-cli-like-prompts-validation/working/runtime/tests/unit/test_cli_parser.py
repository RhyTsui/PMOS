from app.cli.parser import CliParseError, parse_cli_command


def test_parse_cli_day_report_with_defaults():
    parsed = parse_cli_command(
        "cli ads report day --time-range 2026-04-01:2026-04-08 --app-id 10100042"
    )

    assert parsed.operation_id == "get_ad_day_report"
    assert parsed.canonical_params["app_id"] == "10100042"
    assert parsed.canonical_params["time_range"] == "2026-04-01:2026-04-08"
    assert parsed.canonical_params["granularity"] == "day"
    assert parsed.canonical_params["include_organic"] is True



def test_parse_cli_hour_report_supports_base_time_type_default():
    parsed = parse_cli_command(
        "cli ads report hour --time-range 2026-04-08:2026-04-08 --app-id 10100042"
    )

    assert parsed.canonical_params["base_time_type"] == "event_time"



def test_parse_cli_rejects_unknown_hour_granularity_flag_value():
    try:
        parse_cli_command(
            "cli ads report hour --time-range 2026-04-08:2026-04-08 --app-id 10100042 --base-time-type invalid"
        )
    except CliParseError as exc:
        assert "invalid value for --base-time-type" in str(exc)
    else:
        raise AssertionError("expected CliParseError")
