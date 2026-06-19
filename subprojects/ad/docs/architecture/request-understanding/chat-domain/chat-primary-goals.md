# Chat Primary Goals

Status: P0.6/P0.7 architecture refresh.

Primary goals are service-level user goals, not tool names.

## Goal Families

- `data_query`: ask for business data.
- `report_delivery`: ask for a report, daily report, weekly report, monthly report, or overview.
- `issue_diagnosis`: ask why a metric changed, dropped, failed, or looks abnormal.
- `help_qa`: ask how to use, configure, or understand fields and metrics.
- `system_operation`: ask the system to run an operation or integration task.
- `light_requirement`: ask for a requirement, draft, or deliverable.
- `general_chat`: ordinary conversation.

## Routing Rule

Question understanding comes before execution planning. A report-like question can be report-oriented without an explicit metric when the selected capability or tool contract supplies defaults.
