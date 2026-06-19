# Action Contract Specification

> Canonical path: `docs/architecture/semantic-contract/action-contract.md`  
> Type source: `frontend/src/src/contracts/semantic/action-contract.ts`  
> Scope: 所有用户可点击动作、系统触发动作、AI 建议动作的统一协议

## 1. 文档定位

`ActionContract` 是 Enterprise AI Chat OS 的唯一动作协议。

所有以下动作必须收口到 `ActionContract`：

- 图表下钻
- 表格排序 / 筛选 / 导出
- 打开来源
- 打开证据
- 打开 Artifact
- 继续分析
- 重新生成
- 重试工具调用
- 审批 / 拒绝
- 创建任务
- 导航
- 复制
- 下载
- 风险操作确认

禁止 Data Visualization、Report、MetricExplainer、Runtime、Workflow 各自定义私有 action。

## 2. 核心结构

```txt
ActionContract
├─ id
├─ type
├─ intent
├─ label
├─ description
├─ icon
├─ target
├─ payload
├─ confirm
├─ feedbackPolicy
├─ permission
├─ visibility
├─ evidenceRefs
├─ sourceRefs
├─ runtimeRefs
├─ disabledReason
├─ audit
└─ telemetry
```

## 3. ActionType

推荐初始枚举：

```txt
navigate                页面内导航
open-url                打开外部链接
open-source             打开来源
open-evidence           打开证据
open-artifact           打开文件 / 表格 / 图表 artifact
query                   发起语义查询
drill-down              下钻
filter                  筛选
sort                    排序
export                  导出
copy                    复制
share                   分享
continue-analysis       继续分析
regenerate              重新生成
retry                   重试
run-workflow            运行 workflow
approve                 审批
reject                  拒绝
request-access          申请权限
create-task             创建任务
submit-feedback         提交反馈
dismiss                 关闭 / 忽略
custom                  扩展动作
```

规则：

1. 新增 `ActionType` 前必须确认无法由现有类型表达。
2. 图表下钻必须用 `drill-down`，不能私有定义 `chartDrilldown`。
3. 继续分析必须用 `continue-analysis`，不能私有定义 `followupAction`。
4. Runtime 重试必须用 `retry`，不能私有定义 `toolRetryAction`。

## 4. ActionIntent

`intent` 描述动作意图和风险等级。

推荐枚举：

```txt
primary                 主动作
secondary               次动作
tertiary                弱动作
destructive             破坏性动作
risky                   风险动作
system                  系统动作
background              后台动作
```

规则：

1. `destructive` 必须配置 `confirm.required = true`。
2. `risky` 必须提供证据或来源，并显示风险提示。
3. `primary` 在同一区域中建议最多一个。
4. `background` 不应作为普通按钮直接暴露。

## 5. ActionTarget

动作目标统一使用 `target` 描述。

推荐 target 类型：

```txt
route                   前端路由
url                     外部 URL
semantic-query          语义查询
artifact                Artifact id
source                  SourceRef id
evidence                EvidenceRef id
runtime                 Runtime id / event id / tool call id
workflow                Workflow id / step id
api                     后端 API action id，不直接暴露 URL
clipboard               剪贴板
local-state             前端局部状态
```

规则：

1. 前端不得直接信任后端传入的任意 URL。
2. `api` 类型必须走 action dispatcher，不得由 renderer 直接 fetch。
3. `semantic-query` 由 Chat / Query 层执行。
4. `source` / `evidence` 目标必须能在根级 refs 中找到。

## 6. ActionConfirm

高风险动作必须定义确认策略。

字段：

```txt
required                是否必需确认
title                   确认标题
description             确认说明
riskLevel               low / medium / high / critical
requireTextInput        是否要求输入确认文本
confirmText             需要输入的文本
consequences            后果说明数组
```

规则：

1. `destructive` 和 `critical` 必须二次确认。
2. 涉及预算、账户、权限、删除、外发数据的动作必须二次确认。
3. 确认文案必须说明后果，不得只写“确定吗”。

## 7. ActionFeedbackPolicy

动作执行反馈统一定义。

字段：

```txt
loadingMessage          执行中文案
successMessage          成功文案
errorMessage            失败文案
showToast               是否 toast
showInlineStatus        是否在原区域内展示状态
optimistic              是否乐观更新
retryable               是否可重试
resultHandling          ignore / refresh-region / append-message / replace-result / open-panel
```

规则：

1. 所有异步 action 必须有 loading 状态。
2. 所有失败必须可解释。
3. `retryable=true` 时必须能重新执行相同 action。
4. `append-message` 通常用于继续分析、追问、重新生成。

## 8. 权限与可见性

动作可见性和可执行性分离：

```txt
visibility 控制是否展示
permission 控制是否可执行
```

规则：

1. 无权限但需要引导申请时，展示 disabled 状态 + request-access action。
2. 不应把不可执行动作完全隐藏，除非暴露该动作本身会泄露信息。
3. 所有高风险动作必须写 audit。

## 9. Action Dispatcher

前端必须通过统一 dispatcher 执行动作：

```txt
ActionContract
    ↓
ActionDispatcher
    ↓
Permission Check
    ↓
Confirm Check
    ↓
Executor
    ↓
FeedbackPolicy
```

禁止 renderer 内部直接执行 API 调用、跳转、导出、下钻。

## 10. 最小示例

```json
{
  "id": "act_drilldown_campaign",
  "type": "drill-down",
  "intent": "secondary",
  "label": "按 Campaign 下钻",
  "target": {
    "kind": "semantic-query",
    "value": "drilldown:campaign"
  },
  "payload": {
    "metric": "CPA",
    "dimension": "campaign_id"
  },
  "feedbackPolicy": {
    "loadingMessage": "正在下钻分析 Campaign...",
    "resultHandling": "append-message",
    "retryable": true
  },
  "evidenceRefs": ["ev_001"],
  "sourceRefs": ["src_001"]
}
```

## 11. 验收清单

- [ ] 所有可点击动作都使用 `ActionContract`。
- [ ] 不存在 chart / table / report 私有 action。
- [ ] destructive / risky 动作都有 confirm。
- [ ] 异步 action 都有 feedbackPolicy。
- [ ] renderer 不直接执行 action。
- [ ] action 可以关联 evidence / source / runtime。
