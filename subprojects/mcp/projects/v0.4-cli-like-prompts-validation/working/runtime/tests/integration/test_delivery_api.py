from fastapi.testclient import TestClient

from app.main import MCP_PROTOCOL_VERSION, app


client = TestClient(app)



def test_native_mcp_initialize_returns_protocol_metadata():
    response = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": MCP_PROTOCOL_VERSION, "capabilities": {}, "clientInfo": {"name": "test"}},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["jsonrpc"] == "2.0"
    assert body["id"] == 1
    assert body["result"]["protocolVersion"] == MCP_PROTOCOL_VERSION
    assert body["result"]["capabilities"] == {"tools": {}}
    assert body["result"]["serverInfo"]["name"] == "delivery-mcp-gateway"
    assert body["result"]["serverInfo"]["version"] == "0.3.0"



def test_native_mcp_tools_list_is_available_via_jsonrpc():
    response = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})

    assert response.status_code == 200
    body = response.json()
    assert [tool["name"] for tool in body["result"]["tools"]] == [
        "list_apps",
        "list_media",
        "list_team",
        "get_ad_day_report",
        "get_ad_hour_report",
        "get_ad_retention_report",
        "get_ad_roi_report",
    ]
    day_tool = next(tool for tool in body["result"]["tools"] if tool["name"] == "get_ad_day_report")
    app_id_schema = day_tool["inputSchema"]["properties"]["app_id"]
    app_ref_schema = day_tool["inputSchema"]["properties"]["app_ref"]
    assert day_tool["inputSchema"]["anyOf"] == [{"required": ["app_id"]}, {"required": ["app_ref"]}]
    assert app_id_schema["x-query-method"]
    assert app_id_schema["description"].startswith("游戏应用ID")
    assert "Required: yes, unless app_ref is supplied." in app_id_schema["description"]
    assert "Alternative to app_id: yes." in app_ref_schema["description"]



def test_native_mcp_tools_call_returns_mcp_content_and_structured_payload():
    response = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "list_apps", "arguments": {}},
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["content"][0]["type"] == "text"
    assert result["structuredContent"]["operation_id"] == "list_apps"
    assert result["structuredContent"]["response_source"] == "seed"
    assert result["structuredContent"]["execution_profile"] == "seed"
    assert result["structuredContent"]["bi_response"]["status"] == "success"
    assert any(item["appId"] == "10100002" for item in result["structuredContent"]["bi_response"]["data"])



def test_native_mcp_rejects_cli_tool_via_jsonrpc():
    response = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 30,
            "method": "tools/call",
            "params": {"name": "cli", "arguments": {"command": "cli apps list"}},
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == -32602
    assert body["error"]["message"] == "Native MCP server does not expose tool 'cli'"



def test_cli_mcp_tools_list_is_available_via_jsonrpc():
    response = client.post("/cli", json={"jsonrpc": "2.0", "id": 4, "method": "tools/list", "params": {}})

    assert response.status_code == 200
    tools = response.json()["result"]["tools"]
    assert len(tools) == 1
    assert tools[0]["name"] == "cli"
    assert "either --app-id or --app-ref" in tools[0]["description"]
    assert "--time-range" in tools[0]["description"]
    assert "required flags" in tools[0]["inputSchema"]["properties"]["command"]["description"]



def test_cli_mcp_tools_call_executes_cli_tool_via_jsonrpc():
    response = client.post(
        "/cli",
        json={
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {"name": "cli", "arguments": {"command": "cli apps list"}},
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["structuredContent"]["operation_id"] == "list_apps"
    assert result["structuredContent"]["command_path"] == ["apps", "list"]
    assert result["structuredContent"]["response_source"] == "seed"
    assert result["structuredContent"]["execution_profile"] == "seed"
    assert result["structuredContent"]["bi_response"]["status"] == "success"



def test_cli_server_rejects_native_tool_call_via_jsonrpc():
    response = client.post(
        "/cli",
        json={
            "jsonrpc": "2.0",
            "id": 6,
            "method": "tools/call",
            "params": {"name": "list_apps", "arguments": {}},
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == -32602
    assert body["error"]["message"] == "CLI server only exposes tool 'cli'"



def test_initialized_notification_returns_no_body():
    response = client.post("/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"})

    assert response.status_code == 202
    assert response.text == ""



def test_mcp_list_tools_supports_get_for_demo_clients():
    response = client.get("/mcp/list-tools")

    assert response.status_code == 200
    body = response.json()
    assert [tool["name"] for tool in body["tools"]] == [
        "list_apps",
        "list_media",
        "list_team",
        "get_ad_day_report",
        "get_ad_hour_report",
        "get_ad_retention_report",
        "get_ad_roi_report",
    ]



def test_cli_list_tools_supports_get_for_demo_clients():
    response = client.get("/cli/list-tools")

    assert response.status_code == 200
    body = response.json()
    assert [tool["name"] for tool in body["tools"]] == ["cli"]



def test_dimension_tool_returns_seeded_app_rows():
    response = client.post("/mcp/call-tool", json={"name": "list_apps", "arguments": {}})

    assert response.status_code == 200
    body = response.json()
    assert body["isError"] is False
    structured = body["structuredContent"]
    assert structured["operation_id"] == "list_apps"
    assert structured["bi_payload"] is None
    assert structured["response_source"] == "seed"
    assert structured["execution_profile"] == "seed"
    assert structured["bi_response"]["status"] == "success"
    assert structured["bi_response"]["count"] >= 4
    assert any(item["appId"] == "10100002" for item in structured["bi_response"]["data"])



def test_dimension_tool_returns_seeded_media_rows():
    response = client.post("/mcp/call-tool", json={"name": "list_media", "arguments": {}})

    assert response.status_code == 200
    structured = response.json()["structuredContent"]
    assert structured["operation_id"] == "list_media"
    assert structured["response_source"] == "seed"
    assert structured["bi_response"]["status"] == "success"
    assert any(item["media_id"] == "10001" for item in structured["bi_response"]["data"])



def test_dimension_tool_returns_seeded_team_rows():
    response = client.post("/mcp/call-tool", json={"name": "list_team", "arguments": {}})

    assert response.status_code == 200
    structured = response.json()["structuredContent"]
    assert structured["operation_id"] == "list_team"
    assert structured["response_source"] == "seed"
    assert structured["bi_response"]["status"] == "success"
    assert any(item["team_ids"] == "221" for item in structured["bi_response"]["data"])



def test_delivery_catalog_lists_bi_mcp_and_cli_inventory():
    from app import settings as settings_module

    response = client.get("/delivery/catalog")

    assert response.status_code == 200
    body = response.json()
    base_url = settings_module.get_settings().base_url.rstrip("/")
    assert body["service"]["delivery_docs"].endswith("/docs")
    assert body["service"]["console"].endswith("/console")
    assert body["service"]["canonical_mcp_endpoint"] == f"{base_url}/mcp"
    assert body["services"]["mcp"]["service_address"] == f"{base_url}/mcp"
    assert body["services"]["mcp"]["tool_count"] == 7
    assert body["services"]["mcp"]["protocol_scope"] == "native_only"
    assert body["services"]["cli_compat"]["service_address"] == f"{base_url}/cli"
    assert body["services"]["cli_compat"]["status"] == "cli_only"
    assert body["model"]["name"]
    assert body["model"]["status"]

    day_report = next(item for item in body["bi_reports"] if item["report_id"] == "get_ad_day_report")
    assert day_report["description"]
    assert day_report["interface_address"].endswith("/api/aiad-setting/v2/report/auto/5")
    assert any(param["name"] == "app_id" for param in day_report["parameter_definitions"])
    assert any(param["required"] for param in day_report["parameter_definitions"] if param["name"] == "app_id")
    assert any(param["query_method"] for param in day_report["parameter_definitions"] if param["name"] == "app_id")

    day_tool = next(item for item in body["mcp_tools"] if item["tool_name"] == "get_ad_day_report")
    assert any(param["name"] == "time_range" for param in day_tool["parameter_rows"])
    assert any(item["tool_name"] == "list_apps" for item in body["mcp_tools"])

    day_cli = next(item for item in body["cli_list"] if item["cli_command"] == "cli ads report day")
    assert day_cli["cli_name"] == "cli-ads-report-day"
    assert "必填 flag" in day_cli["cli_description"]
    assert day_cli["cli_address"] == f"{base_url}/cli"
    assert day_cli["compat_cli_address"] == f"{base_url}/cli"
    assert any(param["name"] == "app_id" for param in day_cli["parameter_definition"])



def test_reports_page_lists_generated_reports(tmp_path, monkeypatch):
    from app import settings as settings_module

    base_settings = settings_module.get_settings()
    report_root = tmp_path / "reports"
    report_root.mkdir()
    report_file = report_root / "20260409-101010-000001-validation-report.md"
    report_file.write_text("# demo report\n", encoding="utf-8")
    patched_settings = settings_module.AppSettings(
        base_url=base_settings.base_url,
        bi_base_url=base_settings.bi_base_url,
        bi_token=base_settings.bi_token,
        bi_app_id=base_settings.bi_app_id,
        bi_debug_env=base_settings.bi_debug_env,
        request_timeout_seconds=base_settings.request_timeout_seconds,
        execution_profile=base_settings.execution_profile,
        eval_model_name=base_settings.eval_model_name,
        eval_model_status=base_settings.eval_model_status,
        log_root=base_settings.log_root,
        report_root=str(report_root),
    )
    monkeypatch.setattr(settings_module, "get_settings", lambda: patched_settings)

    response = client.get("/reports")

    assert response.status_code == 200
    assert "生成报告列表" in response.text
    assert "20260409-101010-000001-validation-report.md" in response.text
    assert "/reports/files/20260409-101010-000001-validation-report.md" in response.text
    assert "报表列表" in response.text



def test_mcp_tools_page_renders_mcp_tool_list_only():
    response = client.get("/mcp-tools")

    assert response.status_code == 200
    assert "MCP Tool列表" in response.text
    assert "总览" in response.text
    assert "报表列表" in response.text
    assert "CLI列表" in response.text
    assert "后台管理" in response.text
    assert "MCP地址" in response.text
    assert "Tool名称" in response.text
    assert "Tool中文名" in response.text
    assert "Tool描述" in response.text
    assert "Tool参数定义" in response.text
    assert "是否必填" in response.text
    assert "枚举语义" in response.text
    assert "list_apps" in response.text
    assert "应用维表" in response.text
    assert "CLI名" not in response.text
    assert "报表ID" not in response.text



def test_cli_tools_page_renders_cli_list_only_and_docs_page_renders_all_sections():
    response = client.get("/cli-tools")

    assert response.status_code == 200
    assert "CLI列表" in response.text
    assert "总览" in response.text
    assert "报表列表" in response.text
    assert "MCP Tool列表" in response.text
    assert "后台管理" in response.text
    assert "CLI Tool 统一经由 CLI-only 兼容地址" in response.text
    assert "协议状态" in response.text
    assert "cli-ads-report-day" in response.text
    assert "cli ads report day" in response.text
    assert "是否必填" in response.text
    assert "Tool名称" not in response.text
    assert "报表ID" not in response.text

    docs_response = client.get("/docs")

    assert docs_response.status_code == 200
    assert "v0.3 交付清单" in docs_response.text
    assert "总览" in docs_response.text
    assert "报表列表" in docs_response.text
    assert "MCP Tool列表" in docs_response.text
    assert "CLI列表" in docs_response.text
    assert "后台管理" in docs_response.text
    assert "BI报表列表" in docs_response.text
    assert "MCP-tool列表" in docs_response.text
    assert "机器可读目录" in docs_response.text



def test_home_and_console_render_management_page():
    from app import settings as settings_module

    home_response = client.get("/")
    console_response = client.get("/console")

    assert home_response.status_code == 200
    assert console_response.status_code == 200
    assert "v0.3 CLI-like Prompts Validation 管理后台" in home_response.text
    assert "CLI-like的工程级可视化" in home_response.text
    assert "CLI Tool和MCP Tool关系说明" in home_response.text
    assert 'target="_blank"' in home_response.text
    assert "https://ai.studio/apps/b7893ee7-f9a4-44d0-8e3c-2cc52f496970?fullscreenApplet=true" in home_response.text
    assert "https://ai.studio/apps/c4c03924-b48b-480e-bb48-a166f4d9bec3" in home_response.text
    assert "执行全量评估" in console_response.text
    assert "/playground/run" in console_response.text
    assert "/eval/run" in console_response.text
    assert "/eval/cases" in console_response.text
    assert "/artifacts/cleanup" in console_response.text
    assert "前台交付页" in console_response.text
    assert "模型状态" in console_response.text
    assert "模型名称" in console_response.text
    assert "modeCompare" in console_response.text
    assert "caseList" in console_response.text
    assert "renderComparison(data.summary || {})" in console_response.text
    assert "modeCompare.innerHTML = ''" in console_response.text
    assert "state.lastEvalToken = token" in console_response.text
    assert "if (state.lastEvalToken !== token) return;" in console_response.text
    assert "runPlayground" in console_response.text
    assert "runEval" in console_response.text
    assert "refreshCases" in console_response.text
    assert "resetPlayground" in console_response.text
    assert "cleanupArtifacts" in console_response.text
    assert "fetchJson('/playground/run'" in console_response.text
    assert "playgroundStatusHint" in console_response.text
    assert "evalRunHint" in console_response.text
    assert "setPlaygroundStatus(`执行中（${state.mode} / ${executionProfile.value}）`)" in console_response.text
    assert "setEvalRunStatus(`评测中（${targetService.value} / ${executionProfile.value}）`)" in console_response.text
    assert "setPlaygroundStatus('已重置示例')" in console_response.text
    assert "setEvalRunStatus('测试产物已清理')" in console_response.text
    assert "item.expected_operation_id" in console_response.text
    assert "item.expected_params" in console_response.text
    assert "JSON.stringify(item.expected_params, null, 2)" in console_response.text
    assert "已选择案例 ${item.case_id}，可继续执行全量评测" in console_response.text
    assert "target_service: targetService.value" in console_response.text
    assert "execution_profile: executionProfile.value" in console_response.text
    assert "reportSummary" in console_response.text
    assert "summary-card" in console_response.text
    assert ".list-item.active" in console_response.text
    assert "state.activeCaseId" in console_response.text
    assert "state.activeCaseId = null;" in console_response.text
    assert "state.cases.some((item) => item.case_id === state.activeCaseId)" in console_response.text
    assert "div.classList.add('active')" in console_response.text
    assert "renderCases(cases);" in console_response.text
    assert "当前为原生 MCP 调试模式" in console_response.text
    assert "当前为 CLI-like 调试模式" in console_response.text
    assert "renderReportSummary(data);" in console_response.text
    assert "renderReportSummary(null);" in console_response.text
    assert "总案例：${summary.total_cases || 0}" in console_response.text
    assert "一致率：${(Number(summary.equivalence_rate || 0) * 100).toFixed(1)}%" in console_response.text
    assert "setMode('cli')" in console_response.text
    assert "loadCases()" in console_response.text
    assert "原生 MCP 与 CLI-only 双地址联调" in console_response.text
    assert "原生 MCP 地址" in console_response.text
    assert "CLI-only 地址" in console_response.text
    assert "executionProfile" in console_response.text
    assert "targetService" in console_response.text
    base_url = settings_module.get_settings().base_url.rstrip("/")
    assert f"{base_url}/mcp" in console_response.text
    assert f"{base_url}/cli" in console_response.text



def test_eval_cases_preview_returns_seed_case_suggestions():
    response = client.get("/eval/cases")

    assert response.status_code == 200
    body = response.json()
    assert "incoming" in body["csv_path"]
    assert body["csv_path"].endswith(".csv")
    assert body["count"] >= 1
    assert any(item["case_id"] == "DATE-001" for item in body["cases"])
    assert any(item["suggested_cli_command"] for item in body["cases"])
    date_case = next(item for item in body["cases"] if item["case_id"] == "DATE-001")
    assert date_case["expected_operation_id"]
    assert isinstance(date_case["expected_params"], dict)
    assert date_case["suggested_cli_command"].startswith("cli ")



def test_playground_run_supports_native_mode():
    response = client.post("/playground/run", json={"mode": "native", "tool_name": "list_apps", "arguments": {}})

    assert response.status_code == 200
    body = response.json()
    assert body["content"]
    assert body["structuredContent"]["operation_id"] == "list_apps"
    assert body["structuredContent"]["response_source"] == "seed"
    assert body["structuredContent"]["bi_response"]["status"] == "success"



def test_playground_run_supports_cli_mode():
    response = client.post("/playground/run", json={"mode": "cli", "command": "cli apps list"})

    assert response.status_code == 200
    body = response.json()
    assert body["content"]
    assert body["structuredContent"]["operation_id"] == "list_apps"
    assert body["structuredContent"]["command_path"] == ["apps", "list"]
    assert body["structuredContent"]["response_source"] == "seed"



def test_playground_run_passes_execution_profile():
    response = client.post(
        "/playground/run",
        json={"mode": "native", "tool_name": "list_apps", "arguments": {}, "execution_profile": "seed"},
    )

    assert response.status_code == 200
    assert response.json()["structuredContent"]["execution_profile"] == "seed"



def test_playground_run_validates_required_inputs():
    native_response = client.post("/playground/run", json={"mode": "native", "arguments": {}})
    cli_response = client.post("/playground/run", json={"mode": "cli", "command": "   "})

    assert native_response.status_code == 400
    assert native_response.json()["error"] == "tool_name is required for native mode"
    assert cli_response.status_code == 400
    assert cli_response.json()["error"] == "command is required for cli mode"



def test_eval_run_returns_summary_details_report_and_model_metadata(tmp_path, monkeypatch):
    from app import settings as settings_module
    from app.eval import report_builder as report_builder_module

    base_settings = settings_module.get_settings()
    patched_settings = settings_module.AppSettings(
        base_url=base_settings.base_url,
        bi_base_url=base_settings.bi_base_url,
        bi_token=base_settings.bi_token,
        bi_app_id=base_settings.bi_app_id,
        bi_debug_env=base_settings.bi_debug_env,
        request_timeout_seconds=base_settings.request_timeout_seconds,
        execution_profile="seed",
        eval_model_name="claude-sonnet-4-6",
        eval_model_status="ready",
        log_root=base_settings.log_root,
        report_root=str(tmp_path),
    )
    monkeypatch.setattr(settings_module, "get_settings", lambda: patched_settings)
    monkeypatch.setattr(report_builder_module, "get_settings", lambda: patched_settings)

    response = client.post("/eval/run", json={"target_service": "cli_only", "execution_profile": "seed"})

    assert response.status_code == 200
    body = response.json()
    assert "incoming" in body["csv_path"]
    assert body["csv_path"].endswith(".csv")
    assert body["summary"]["total_cases"] >= 1
    assert body["summary"]["target_service"] == "cli_only"
    assert body["summary"]["execution_profile"] == "seed"
    assert body["summary"]["response_sources"]["cli"]["seed"] >= 1
    assert body["summary"]["response_sources"]["native"]["skipped"] >= 1
    assert body["details"]
    assert body["report_path"].endswith(".md")
    assert body["report_name"].endswith(".md")
    assert body["report_url"] == f"/reports/files/{body['report_name']}"
    assert "# CLI-like Validation Report" in body["report_markdown"]
    assert "cli_response_source: seed" in body["report_markdown"]
    assert body["evaluation"]["generated_at"]
    assert body["evaluation"]["model_name"] == "claude-sonnet-4-6"
    assert body["evaluation"]["model_status"] == "ready"
    assert "by_mode" in body["summary"]
    assert "equivalence_rate" in body["summary"]



def test_report_file_page_returns_markdown(tmp_path, monkeypatch):
    from app import settings as settings_module

    base_settings = settings_module.get_settings()
    report_root = tmp_path / "reports"
    report_root.mkdir()
    report_name = "20260409-101010-000001-validation-report.md"
    (report_root / report_name).write_text("# demo report\nbody\n", encoding="utf-8")
    patched_settings = settings_module.AppSettings(
        base_url=base_settings.base_url,
        bi_base_url=base_settings.bi_base_url,
        bi_token=base_settings.bi_token,
        bi_app_id=base_settings.bi_app_id,
        bi_debug_env=base_settings.bi_debug_env,
        request_timeout_seconds=base_settings.request_timeout_seconds,
        execution_profile=base_settings.execution_profile,
        eval_model_name=base_settings.eval_model_name,
        eval_model_status=base_settings.eval_model_status,
        log_root=base_settings.log_root,
        report_root=str(report_root),
    )
    monkeypatch.setattr(settings_module, "get_settings", lambda: patched_settings)

    response = client.get(f"/reports/files/{report_name}")

    assert response.status_code == 200
    assert response.text == "# demo report\nbody\n"
    assert response.headers["content-type"].startswith("text/markdown")



def test_cleanup_artifacts_deletes_only_generated_files(tmp_path, monkeypatch):
    from app import settings as settings_module

    base_settings = settings_module.get_settings()
    report_root = tmp_path / "reports"
    log_root = tmp_path / "logs"
    report_root.mkdir()
    log_root.mkdir()
    (report_root / "demo.md").write_text("# report\n", encoding="utf-8")
    (log_root / "runner.log").write_text("log\n", encoding="utf-8")
    protected_file = tmp_path / "outside.txt"
    protected_file.write_text("keep\n", encoding="utf-8")
    patched_settings = settings_module.AppSettings(
        base_url=base_settings.base_url,
        bi_base_url=base_settings.bi_base_url,
        bi_token=base_settings.bi_token,
        bi_app_id=base_settings.bi_app_id,
        bi_debug_env=base_settings.bi_debug_env,
        request_timeout_seconds=base_settings.request_timeout_seconds,
        execution_profile=base_settings.execution_profile,
        eval_model_name=base_settings.eval_model_name,
        eval_model_status=base_settings.eval_model_status,
        log_root=str(log_root),
        report_root=str(report_root),
    )
    monkeypatch.setattr(settings_module, "get_settings", lambda: patched_settings)

    response = client.post("/artifacts/cleanup", json={"clear_reports": True, "clear_logs": True})

    assert response.status_code == 200
    body = response.json()
    assert body["deleted_report_count"] == 1
    assert body["deleted_log_count"] == 1
    assert body["deleted_reports"] == ["demo.md"]
    assert body["deleted_logs"] == ["runner.log"]
    assert not (report_root / "demo.md").exists()
    assert not (log_root / "runner.log").exists()
    assert protected_file.exists()


