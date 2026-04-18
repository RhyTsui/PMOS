from app.eval.case_loader import load_cases
from app.eval.runner import evaluate_case, run_evaluation


CSV_PATH = "E:/AI/ai-os/subprojects/mcp/docs/projects/v0.3-cli-like-prompts-validation/incoming/测试集1.0.csv"



def test_load_cases_reads_seed_csv():
    cases = load_cases(CSV_PATH)

    assert cases
    assert cases[0].case_id == "DATE-001"
    assert cases[0].category == "日期识别"
    assert "指间山海" in cases[0].query



def test_evaluate_case_generates_equivalent_cli_and_native_results():
    case = load_cases(CSV_PATH)[0]

    result = evaluate_case(case, execution_profile="seed")

    assert result["expected_operation_id"] == "get_ad_day_report"
    assert result["execution_profile"] == "seed"
    assert result["cli"]["success"] is True
    assert result["native"]["success"] is True
    assert result["cli"]["response_source"] == "seed"
    assert result["native"]["response_source"] == "seed"
    assert result["mode_equivalent"] is True
    assert result["cli"]["bi_payload"] is not None



def test_evaluate_case_seed_profile_uses_seed_report_responses():
    case = load_cases(CSV_PATH)[0]

    result = evaluate_case(case, execution_profile="seed")

    assert result["cli"]["bi_response"]["status"] == "success"
    assert result["native"]["bi_response"]["status"] == "success"
    assert result["cli"]["bi_response"]["kind"] == "report_seed"
    assert result["native"]["bi_response"]["kind"] == "report_seed"
    assert result["cli"]["bi_response"]["operation_id"] == "get_ad_day_report"
    assert result["native"]["bi_response"]["operation_id"] == "get_ad_day_report"



def test_evaluate_case_supports_non_report_operation_formatting():
    case = load_cases(CSV_PATH)[2]

    result = evaluate_case(case)

    assert result["expected_operation_id"] is None
    assert result["cli"]["success"] is False
    assert result["native"]["success"] is False



def test_run_evaluation_builds_report(tmp_path, monkeypatch):
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
        log_root=base_settings.log_root,
        report_root=str(tmp_path),
    )
    monkeypatch.setattr(settings_module, "get_settings", lambda: patched_settings)
    monkeypatch.setattr(report_builder_module, "get_settings", lambda: patched_settings)

    summary, details, report_path = run_evaluation(CSV_PATH, target_service="cli_only", execution_profile="seed")

    assert summary["total_cases"] >= 1
    assert summary["target_service"] == "cli_only"
    assert summary["execution_profile"] == "seed"
    assert summary["response_sources"]["cli"]["seed"] >= 1
    assert summary["response_sources"]["native"]["skipped"] >= 1
    assert details
    assert all(detail["execution_profile"] == "seed" for detail in details)
    assert all(detail["target_service"] == "cli_only" for detail in details)
    assert report_path.exists()
    assert report_path.parent == tmp_path
