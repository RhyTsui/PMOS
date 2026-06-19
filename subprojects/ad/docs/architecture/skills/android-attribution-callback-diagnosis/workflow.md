# Workflow

主链路：

```text
resolve_app_context
-> resolve_media_context
-> check_base_event_ingestion
-> check_attr_preprocess_result
-> check_callback_rule_match
-> branch_by_callback_mode
```

分支：

```text
SDK -> check_app_sdk_integration -> check_callback_delivery_trace
API -> check_api_callback_result
NOTHING -> stop
CONFIG_ANOMALY -> query_callback_rule_config
```

