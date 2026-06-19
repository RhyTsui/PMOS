# 需求沟通与 Case 细节问题评估与落地方案

## 1. 文档定位

本文承接 `docs/design-v1/12-需求沟通与Case闭环系统设计.md`，补齐需求草案、Case、用户确认、Case 字段、追加信息和类型区分。

## 2. 需求草案与 Case 的区别

需求草案是 Chat 侧临时结构化内容，不是后台 Case。

需求草案用于：

- 把用户模糊需求整理成目标、背景、范围、字段、验收标准。
- 标记未确认问题。
- 支持用户继续补充和修改。

Case 是保存到后台需求池或异常池的正式记录。只有调用真实服务创建成功并返回编号，才能说“已创建 Case”。

## 3. Case 创建确认

用户已确认：Case 必须用户确认后创建。

流程：

1. 系统整理需求草案或异常 Case 草案。
2. 展示核心字段和未确认问题。
3. 用户确认创建。
4. Chat 调用真实 Case 服务。
5. 返回 Case 编号和后续处理路径。

不能把“已整理草案”说成“已提交 Case”。

## 4. Case 字段

标准字段：

```json
{
  "title": "",
  "type": "capability_missing | business_anomaly | product_requirement | data_issue",
  "priority": "P0 | P1 | P2 | P3",
  "project": "",
  "evidence": [],
  "unconfirmed_questions": [],
  "conversation_ref": "",
  "trace_ref": ""
}
```

用户已确认不需要建议负责人字段。

## 5. 同一 Case 更新

用户补充信息后，默认更新同一个 Case，而不是创建新 Case。

只有以下情况才创建新 Case：

- 用户明确要求新建。
- 问题类型不同。
- 影响项目不同且不能合并。
- 后台 Case 已关闭且不允许重开。

## 6. Case 类型区分

能力未接入生成的 Case 和业务异常 Case 是不同类型。

| 类型 | 场景 |
|---|---|
| capability_missing | MCP/Workflow/Skill 未接入、未绑定、不可用 |
| business_anomaly | 数据异常、回传异常、联调失败等业务问题 |
| product_requirement | 用户提出新增产品能力或流程改造 |
| data_issue | 数据源、ETL、权限、字典、schema 问题 |

## 7. 验收规则

- 未经用户确认不得创建 Case。
- 创建成功必须返回后台编号。
- 用户补充信息默认更新同一个 Case。
- 能力缺失和业务异常必须是不同 Case 类型。
- 前台不出现 Workflow、Skill、MCP 等工程词，除非后台管理场景。

