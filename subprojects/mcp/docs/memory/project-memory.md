# Project Memory
- projectId: mcp
- projectName: MCP 项目
- description: PMAIOS 内的 MCP 业务子项目
- reference: `subprojects/mcp/docs/knowledge/AI-Data-OS-架构图.md` 是 MCP 项目刚更新的 Q2-34 规划演进图；后续涉及 MCP 路线、阶段规划、架构演进、版本比较或方案继承时优先参考该文档。

## 项目结构规范
- **子项目/版本项目目录**: `subprojects/mcp/projects/{项目名}/`
- **示例**: `v0.3-cli-like-prompts-validation`、`广告聚合-mcp`
- **原因**: 配置与代码分离，文档集中管理

## 子项目列表
| 项目名 | 路径 | 状态 |
|--------|------|------|
| v0.3-cli-like-prompts-validation | `projects/v0.3-cli-like-prompts-validation/` | ✅ 已验证 |
| 广告聚合-mcp | `projects/广告聚合-mcp/` | 🆕 已创建 |

## 广告聚合 MCP v1.0 - 四大核心需求
1. **数据资产建设**: 账户/广告系列/广告/素材四层标签体系，输出用户手册供发行、数分、系统和 AI 使用
2. **报表 MCP 发布**: 素材、回流、LTV、活动、直播、包体 6 类报表
3. **向上聚合计算**: 预制聚合 SQL，支持小时→日→周→月→年维度聚合
4. **Hive 数据推送**: 将数据资产表推送到 Hive 供数分查询
