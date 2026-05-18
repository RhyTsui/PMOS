# AI埋点平台数据表文档 v1

日期：2026-05-05

## 1. 目标

定义当前阶段最小可落地数据模型，服务后端实现、报表查询和测试构造。

本文遵循 `详细需求真源-v2` 的关键对象模型，不再使用与旧模块结构强绑定的对象命名。

## 2. 表清单

### 2.1 requirement_versions

- id
- version_code
- project_id
- scope_summary
- start_time
- end_time
- package_count
- package_detail_json
- diff_summary
- event_domain_json
- channel_scope_json
- created_by
- created_at
- updated_at

### 2.2 tracking_events

- id
- requirement_version_id
- event_code
- event_name
- source_type
- event_domain
- category
- event_type
- priority
- acceptance_standard
- owner_role
- owner_user_id
- is_core
- has_steps

### 2.3 event_parameters

- id
- event_id
- level_code
- parameter_code
- parameter_name
- is_required
- usage_desc
- example_value
- trigger_timing
- priority
- owner_role

### 2.4 event_steps

- id
- event_id
- step_code
- step_name
- step_desc
- trigger_timing
- parameter_count
- acceptance_standard

### 2.5 data_dictionary_versions

- id
- project_id
- dictionary_type
- version_code
- update_summary
- uploaded_by
- uploaded_at

### 2.6 data_dictionary_items

- id
- dictionary_version_id
- item_key
- item_name_cn
- item_name_en
- item_type
- business_desc
- ext_json

### 2.7 validation_rules

- id
- requirement_version_id
- rule_code
- rule_name
- rule_source
- rule_level
- rule_type
- target_scope
- condition_expr
- check_expr
- version_code
- status
- created_by
- updated_by

### 2.8 rule_event_relations

- id
- rule_id
- event_id

### 2.9 log_queries

- id
- user_id
- scope_mode
- event_domain
- event_name_keyword
- log_id
- link_id
- device_id
- account_id
- time_from
- time_to
- saved_scheme_name
- package_scope_json
- env_scope_json

### 2.10 log_samples

- id
- source_query_id
- log_id
- link_id
- event_code
- event_domain
- terminal_type
- account_id
- device_id
- report_time
- step_code
- core_params_json
- full_params_json

### 2.11 acceptance_batches

- id
- requirement_version_id
- initiator_role
- initiator_user_id
- event_domain
- scan_mode
- sample_ratio
- time_from
- time_to
- package_scope_json
- env_scope_json
- status
- created_at

### 2.12 acceptance_reports

- id
- batch_id
- total_pass_rate
- core_pass_rate
- non_core_pass_rate
- ad_pass_rate
- client_pass_rate
- server_pass_rate
- report_summary
- share_link
- image_url
- created_at

### 2.13 acceptance_report_issues

- id
- report_id
- event_id
- issue_type
- severity
- error_reason
- wrong_example
- correct_example
- owner_role
- owner_user_id
- scan_count

### 2.14 user_scope_preferences

- id
- user_id
- current_role
- default_scope_mode
- default_event_domain
- default_device_id
- default_account_id

### 2.15 async_tasks

- id
- task_type
- related_object_type
- related_object_id
- status
- progress
- summary
- error_message
- created_by
- created_at
- finished_at

## 3. 关键关系

- 一个需求版本有多个事件
- 一个事件有多个参数
- 一个步骤型事件可有多个步骤
- 一个版本有多个规则
- 一个规则可关联多个事件
- 一个验收批次对应一个版本和一个默认事件域
- 一个报告对应一个验收批次
- 一个报告问题可回链到事件、步骤和规则
- 一个异步任务可回链导入、规则生成、批次扫描和报告生成

### 2.16 standard_event_templates

- id
- template_code
- template_name
- source_type
- event_domain
- category
- default_priority
- default_acceptance_standard
- default_owner_role
- standard_version_code

### 2.17 standard_field_templates

- id
- field_code
- field_name
- field_level
- is_required_by_default
- usage_desc
- example_value
- dictionary_binding
- standard_version_code

### 2.18 project_standard_bindings

- id
- project_id
- requirement_version_id
- standard_version_code
- binding_summary
- inherited_domain_json
- disabled_template_json
- extension_summary_json

### 2.19 import_tasks

- id
- project_id
- source_file_name
- source_type
- target_version_id
- status
- parse_summary
- created_by
- created_at

### 2.20 version_inheritances

- id
- from_version_id
- to_version_id
- inherit_mode
- created_by
- created_at

### 2.21 version_diff_records

- id
- inheritance_id
- diff_type
- target_object_type
- target_object_key
- old_snapshot_json
- new_snapshot_json
- review_status
- review_action

### 2.22 query_schemes

- id
- owner_user_id
- project_id
- version_id
- role_scope
- scheme_name
- filters_json
- sort_json
- is_shared
- created_at
- updated_at

### 2.23 board_snapshots

- id
- board_type
- project_id
- version_id
- related_scheme_ids_json
- comparison_scope_json
- snapshot_summary
- created_by
- created_at

### 2.24 ai_context_packs

- id
- project_id
- version_id
- current_module
- current_role
- scope_mode
- related_object_refs_json
- evidence_refs_json
- created_at

### 2.25 ai_writeback_tasks

- id
- context_pack_id
- target_object_type
- target_object_id
- writeback_type
- proposal_summary
- proposal_payload_json
- status
- review_required
- created_by
- created_at

### 2.26 ai_writeback_reviews

- id
- writeback_task_id
- reviewer_user_id
- decision
- decision_note
- reviewed_at

## 4. 设计要求

- 所有核心对象都保留版本关联
- 所有查询对象都能关联角色作用域
- 日志样本与报告问题要能回链到事件和规则
- 步骤型事件必须作为正式对象承接，不能只靠 `ext_json` 暗存
- 批次、查询、日志样本要能表达包体和环境上下文
- 标准绑定、继承关系、查询方案、AI 回写对象都要保留版本与回链关系

## 8. ϵͳ���ط�ʽ����

���ļ��е����ݶ��󡢹�ϵ��״̬�ֶΣ���ǰͳһ������ `��ϵͳ�滮���`��

��ˣ�

- ��Ĭ�ϼ�����Щ��Ҫֱ��Ƕ���ϵͳ���п����ϵ
- ��Ĭ�ϼ�������ƽ̨���ж���������ֿ�ֱ��ṹ���ǵ�ǰ��ʽ��λ
- ������ʵʩ�׶�Ҫ���þ�ϵͳ���ݿ����������Ҫ����������Ǩ��/ӳ�䷽�������ı䱾�ĵ���ǰ�Ķ���߽�
