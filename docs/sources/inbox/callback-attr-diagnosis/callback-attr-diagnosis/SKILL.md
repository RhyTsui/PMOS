---
name: callback-attr-diagnosis
description: "Diagnose Android or iOS or other platform like harmonyOS,weixin callback attribution issues by direct top-level MCP tools. Use when investigating callback problems and you need one shared workflow that branches by platform while keeping stable domain knowledge in references. 用于统一诊断排查和分析 Android/iOS 以及鸿蒙微信等平台媒体归因回推问题，直接调用 MCP 工具"
---

# Callback Attr Diagnosis

适用于 `ANDROID` / `IOS` 以及鸿蒙微信等平台媒体回推排查。先确认平台和事件，再做分支；不要把 Android 的 SDK/`804` 经验直接套到 iOS。

## How To Use

1. 先读 [references/execution-mode.md](./references/execution-mode.md)。
2. 结论前必须读 [references/checklist.md](./references/checklist.md) 与 [references/rubric.md](./references/rubric.md)。
3. 如需统一概念解释，再读 [references/concepts.md](./references/concepts.md)。
4. 根据平台只补充一份分支参考：
   - Android: [references/android-branching.md](./references/android-branching.md)
   - iOS: [references/ios-branching.md](./references/ios-branching.md)
5. 资料索引页：[references/index.md](./references/index.md)

## 默认规则

- `app_package_type` 。用户没说清楚时，先追问。支持的类型包括：
   - `ANDROID` 安卓
   - `IOS` 苹果
   - `HARMONY` 鸿蒙
   - `WEIXIN` 微信小游戏、微小
   - `DOUYIN` 抖音小游戏、抖小
   - `BILIBILI` B站小游戏
   - `KUAISHOU` 快手小游戏、快小
   - `ALIPAY` 支付宝小游戏、支小
   - 其它`PC/WEB/OTHER`
- 支持的 `event_type`：
  - `ACTIVATION`激活
  - `REGISTER`注册
  - `PAY`付费
  - `KEY_ACTION`关键行为
  - `DEVICE_RETENTION`设备次留
- 用户未指定 `event_type` 时，必须先追问，不得默认成 `PAY`。
- `diag.check_base_event_ingestion` 虽然支持不传 `event_type` 做概览，但这只适合低频辅助判断，不改变主流程里“先明确 `event_type` 再继续”的规则。
- 用户提供数字 `media_id` 时直接使用，但仍要调用 `diag.fetch_media_context` 补全 `media_name`。
- 用户既没给 `media_id` 也没给媒体名时，必须先追问，不得直接下结论说媒体不回推。
- **智投**,**新智投**都是我们的自归因系统

## 工具使用规范

1. 看工具的必填参数，确认之后再发起工具调用。
2. 若必填字段缺失且不能由上一步稳定推导，立即追问用户，不要盲调下游。
3. 在进入业务诊断前，先确认 `date_start`、`date_end`、`event_type`。如果没有指定时间，默认使用最近7天。
4. `problem_desc` 仅用于首个真正进入业务排查的工具，不要把整段用户问题复制到所有工具。
5. 工具输出是证据，不是结论。最终根因与下一步建议由你综合判断。
6. skill 中出现的工具都应能在 MCP `tools/list` 找到；若找不到，先停止执行并检查暴露状态。

## 结论前门禁

在输出任何业务根因前，必须先完成以下门禁；未完成时只能说明“证据不足/参数需修正”，不得给出业务结论。

### 上下文锁定

- `diag.fetch_app_context` 返回唯一应用后，后续工具统一使用返回的数字 `app_id`；不要继续使用用户输入的代号、游戏名或别名，例如 `C4-H5`。
- `diag.fetch_media_context` 返回媒体后，后续工具统一使用数字 `media_id`；不要把 `media_code`、媒体名或账号名当成 `media_id`。
- 每次调用业务工具前，复述并核对 `app_id`、`media_id`、`date_start`、`date_end`、`event_type`、`app_package_type` 是否与用户问题一致。
- 如果用户明确说 `2026-06-05`，后续任何工具参数出现 `2025-06-05`、其它年份或其它日期，必须先修正参数；不得把错误日期查到的 0 行当成业务证据。
- 如果工具返回 0 行，先检查是否存在 app 代号未解析、日期年份错误、事件类型错误、平台错误或媒体错误；只有参数一致性通过后，0 行才可进入业务判断。

### 关键总量对账

- Android SDK 分支在结论前必须先列出并比较 `base_event_total`、`attr_require_total`、`attr_res_target_media_total`、`sdk_income_total`、`status_804_total`。
- `sdk_income_total > 0` 只表示存在 SDK income 记录，不表示回调闭环正常。
- 若 `attr_res_target_media_total > sdk_income_total`，必须优先定性为“归因结果与 SDK income 不闭环”，不得说“SDK income/回调正常”。
- `804` 是辅助闭环证据；不得在 `attr_res_target_media_total` 与 `sdk_income_total` 存在缺口时，把 804 作为主因或唯一异常。

### Golden Case 反例

- Android SDK PAY：如果证据显示 `attr-res=311`、`SDK income=92`、`804=0`，正确结论是 `attr-res` 与 SDK income 缺口 219，禁止结论为“SDK income 正常”或把 804 当主因。
- WEIXIN REGISTER：如果用户问题是 `C4-H5`、`2026-06-05`，但工具参数是 `app_id='C4-H5'` 或 `date_start/date_end='2025-06-05'` 并返回 0 行，正确动作是修正为 canonical 数字 `app_id` 和正确日期，禁止结论为“2026-06-05 无 base events / 无 attr-require / 无 attr-res”。
- 样本替代聚合：如果 sample 返回 5 条成功样本，但 aggregate 显示总量不足或缺口明显，正确动作是以 aggregate 为准报告缺口，禁止用“有成功样本”推出整体正常。
- 媒体错配：如果用户问巨量就是指定**巨量广告**，但工具实际 `media_id` 命中其它媒体或 `diag.fetch_media_context` 返回多个候选，正确动作是先确认目标媒体，禁止结论为“巨量无数据/未回推”。
- feedback-res 误入 SDK 分支：如果已确认 `callbackMode=SDK`，但 `feedback-res=0`，正确动作是标记为非主证据，禁止直接结论为 API 回推失败或媒体未收到。
- API 分支误查 SDK income：如果已确认 `callbackMode=API`，但 SDK income 为 0，正确动作是改查 `feedback-res`、API log、retry 证据，禁止把 SDK income 缺失当成 API 回推失败根因。
- 目标媒体未命中但 ORGANIC 存在：如果 `attr-res` 存在但命中 `ORGANIC` 或其它媒体，正确结论是“未归到目标媒体”，禁止写成“无归因结果”。
- 事件语义混用：如果 `event_type=REGISTER/ACTIVATION`，正确动作是使用用户数/设备数等对应质量指标，禁止套用 `PAY` 的订单号、金额缺失逻辑作为主结论。

## 主链

```text
diag.fetch_app_context
-> diag.fetch_media_context
-> 平台分支前置判断
   -> ANDROID: diag.check_callback_rule_match
   -> IOS: diag.resolve_callback_diagnosis_branch + diag.check_callback_rule_match
-> 平台分支闭环检查
-> diag.query_callback_media_event_summary
-> diag.check_base_event_ingestion
-> diag.check_attr_preprocess_result
-> 可选深入工具
```

## Step 0：解析应用

调用 `diag.fetch_app_context`。

必填参数：

- `app_query`

推荐参数：

- `app_package_type`
- `app_version`

规则：

- 数字 app id 直接传 `app_query`。
- 游戏名称直接传 `app_query`。
- 若返回 `needs_user_selection`，立即停止并向用户展示候选。
- Android SDK 分支优先复用返回的 `is_sdk_integrated`、`requires_version_check`、`version_threshold`、`version_ok`。

## Step 0.5：解析媒体

调用 `diag.fetch_media_context`。

必填参数：

- `app_id`

推荐参数：

- `media_id`
- `media_query`

规则：

- 即使已有数字 `media_id`，也仍要调用一次，用于补全 `media_name`。
- 后续统一使用数字 `media_id`，不要把 `media_code` 当成 `media_id`。

## Step 1：平台分支判断

### Android 和其它平台通用流程

调用 `diag.check_callback_rule_match`。

必填参数：

- `app_id`
- `media_id`
- `app_package_type`
- `event_type`

若配置证据不完整，可追加 `diag.query_callback_rule_config` 作为低频补证据工具。

Android 分支判断：

- SDK 策略回调：`callbackMode=SDK` 且 `callbackModeDetail=ALL_RULE`
- SDK 全量回调：`callbackMode=SDK` 且 `callbackModeDetail=NO_RULE`
- API 回调：`callbackMode=API`
- 不回调：`callbackMode=NOTHING`
- 配置异常：上述信息缺失或组合矛盾

### iOS/鸿蒙平台流程

先调用 `diag.resolve_callback_diagnosis_branch`，再调用 `diag.check_callback_rule_match` 作为规则佐证。

共同必填参数：

- `app_id`
- `media_id`
- `app_package_type`
- `event_type`

iOS/鸿蒙 分支判断：

- `iOS/Harmony 激活-SDK初始化/虚拟激活参考分支`
  - `branch_key=ios_activation_sdk_virtual`
- `iOS/Harmony 激活-规则门禁分支`
  - `branch_key=ios_activation_sdk_rule_gated`
- `iOS/Harmony API回推分支`
  - `branch_key=ios_api_feedback`
- `无需回推分支`
  - `branch_key=no_callback_expected`
- `配置不足/配置异常分支`
  - `branch_key=config_missing`

规则：

- 以 `diag.resolve_callback_diagnosis_branch` 的 `branch_key` 为主。
- 向用户解释时，优先使用上面的中文分支名称；`branch_key` 只作为工具返回的内部标识附带展示。
- `diag.check_callback_rule_match` 只做规则证据补充，不反向覆盖 branch 结论。
- 如需单独核对融合归因配置，可调用 `diag.query_fusion_attr_config`。
- 详细含义、典型主链和误用提醒，统一参考 [references/ios-branching.md](./references/ios-branching.md)。

## Step 2：平台分支闭环

### Android SDK 分支

调用 `diag.check_callback_delivery_trace`。

重点：

- 先结合 `diag.check_base_event_ingestion` 确认目标时间窗内的接收总事件数，并按 `event_type` 输出对应的质量指标
- 再结合 `diag.check_attr_preprocess_result` 明确 `attr-require` 总数、`attr-res` 总数
- SDK income 是否存在
- `804` 是否形成闭环

Android SDK 分支强约束：

- 当 `callbackMode=SDK` 且 `callbackModeDetail=ALL_RULE/NO_RULE` 时，主链必须显式给出：
  - 基础事件总数
  - `attr-require` 总数
  - `attr-res` 总数
  - SDK income 总数
  - `804` 总数
- `diag.check_attr_preprocess_result` 默认不要先传 `media_id`，先看当前 `event_type` 的全量事件是否已完成归因；只有在需要确认目标媒体是否命中时，才补充媒体过滤视角。
- 基础事件附加指标要随 `event_type` 切换：
  - `PAY`：总金额、订单缺失数、金额缺失数
  - `ACTIVATION`：去重设备数
  - `REGISTER`：去重设备数、去重用户数
  - 其它事件类型：引用工具返回的可确认总数字段，不要硬套 `PAY/REGISTER/ACTIVATION` 语义
- Android SDK income 主判断字段以 `media_id`、`mapped_event_names`、聚合总数 `total_count` 为准。
- `total_count > 0` 只表示存在 SDK income 记录；必须与目标媒体 `attr-res` 总数对账后，才能判断是否闭环正常。
- 若目标媒体 `attr-res` 总数大于 SDK income 总数，必须优先报告缺口，不得写成“SDK income 正常”。
- `push_media_code` 不是 Android SDK 分支主证据；即使样本里为 `null`，也不能单独推出“未实际发送到媒体”“SDK 未下发”之类结论。
- 该分支禁止把 `feedback-res` 当主证据，禁止基于 `feedback-res=0` 直接下“回推断层”结论。
- 该分支禁止调用：
  - `diag.check_api_callback_retry_detail`
  - `diag.query_api_callback_log_detail`
  - `diag.check_activation_callback_gap`
- 如果已经确认是 Android SDK 分支，却出现上述 API/激活工具证据，只能标记为“误入非本分支证据”，不得纳入根因结论。

### Android API 分支

调用 `diag.check_api_callback_result`。

必要时追加：

- `diag.query_callback_event_detail`
- `diag.check_api_callback_retry_detail`
- `diag.query_api_callback_log_detail`

重点：

- `feedback-res` 是否存在
- 是否与 `event_type`、`app_package_type`、`media_id` 对齐

### iOS/鸿蒙 激活分支

调用：

- `diag.check_ios_activation_callback_closure`
- `diag.query_ios_virtual_activation_summary`

必要时追加：

- `diag.query_sdk_init_delivery`

重点：

- `attr-res` 是否存在
- `d_c_init_i` 是否存在
- `804` 仅作参考，不可单独定性失败
- `V_ACTIVATION`、`reserve_media_id` 与后续 API 事件分布
- 如工具样本中出现 `push_media_code`，可作为 iOS/Harmony 相关分支的辅助判断字段；但仍不能替代 `attr-res`、`d_c_init_i`、`feedback-res` 等主链证据。

### iOS/鸿蒙 API 分支

调用：

- `diag.check_ios_api_callback_closure`

必要时追加：

- `diag.query_callback_event_detail`
- `diag.check_api_callback_retry_detail`
- `diag.query_api_callback_log_detail`

重点：

- `feedback-res` 是否存在
- 最近未回推样本
- `push_fail_reason`、`skip_reason`
- `push_media_code` 仅可作为辅助样本字段使用，不要越级替代 `feedback-res` 主证据。

## Step 3：查询媒体指标

调用 `diag.query_callback_media_event_summary`。

必填参数：

- `app_id`
- `date_start`
- `date_end`

推荐参数：

- `event_type`
- `media_name`

规则：

- 它是媒体指标证据，告知媒体数据供参考，不作为关键证据。

## Step 4：检查基础事件

调用 `diag.check_base_event_ingestion`。

必填参数：

- `app_id`
- `date_start`
- `date_end`

推荐参数：

- `event_type`
- `device_id`
- `user_id`
- `order_id`
- `cpsid`
- `channel_id`
- `uuid`
- `event_content_keyword`
- `activation_attr_window_days`

规则：

- 先确认 `event_type`，再调用这个工具进入标准排查。
- 若仅用于低频辅助识别候选事件类型，可临时不传 `event_type` 使用概览模式；但概览结果不能替代用户确认，也不要把候选事件类型直接当成最终输入。
- 若已知单条事件线索，优先使用 `uuid`；其次再考虑 `order_id`、`device_id`、`cpsid`、`channel_id`。
- 当 `event_type=PAY` 时，工具会自动追加用户画像表关联证据，用于检查付费用户画像缺失；不需要额外传画像开关。
- 当 `event_type=REGISTER` 时，工具会自动追加激活归因分布证据，仅使用 `click_attr_source/click_media_id` 口径；默认回看 7 天，可传 `activation_attr_window_days` 调整，最大 30 天。
- `event_content_keyword` 只适合做低频模糊缩小范围，例如已知 `event_name`、`push_media_code`、`h5_param` 等片段时使用；不要把它当主过滤条件。
- 基础事件不存在时，不要直接下结论说回推失败。
- iOS 场景额外注意身份字段质量；Android 场景额外注意 SDK 前置条件。

## Step 5：检查归因预处理

调用 `diag.check_attr_preprocess_result`。

必填参数：

- `app_id`
- `date_start`
- `date_end`
- `event_type`

推荐参数：

- `app_package_type`

规则：

- `attr-require` 存在但无 `attr-res`，优先判断为归因未完成。
- `attr-res` 命中其他媒体时，不能认定为目标媒体回推失败。
- Android SDK 分支必须在最终结论中显式引用 `attr-require` 总数与 `attr-res` 总数，不能只引用样本或“有无”判断。

## 可选深入工具

- `diag.query_callback_rule_config`：配置证据不完整时查看原始规则样本
- `diag.query_fusion_attr_config`：单独确认融合归因状态
- `diag.query_sdk_init_delivery`：按 `convert_id` 查看 SDK 启动发送记录；如上游拿到的是该链路等价标识，也可作为 `convert_id` 传入。支持 `event_content_keyword` 做低频模糊缩小范围。
- `diag.check_api_callback_retry_detail`：API 重试失败排查
- `diag.query_api_callback_log_detail`：API 请求日志排查
- `diag.query_callback_event_detail`：API 回推明细与失败原因样本
- `diag.query_attr_clue_event_detail`：仅在明确需要下钻 clue 或拒绝原因时使用

限制：

- `diag.check_api_callback_retry_detail`、`diag.query_api_callback_log_detail` 仅允许在 API 分支使用。
- `diag.check_activation_callback_gap` 不属于本 skill 主链；不要用于 Android SDK 分支回推诊断。
- `push_media_code` 仅允许在 iOS/Harmony 相关分支中作为辅助判断字段引用；不要把它当作 Android SDK 分支的主判断条件。

## 最终回答要求

通用输出命名要求：

- 最终回答里的“根因分析”标题，输出时统一改名为 `基于 AI 联网检索与文档聚合，建议排查方向如下，供参考：`。
- 这只是展示名称变更，不改变该部分承载的分析内容与作用。

结论至少覆盖：

1. 已解析的应用和媒体上下文
2. 目标 `app_package_type` 与 `event_type`
3. 当前平台分支判断结果
4. 分支闭环证据
5. 趋势层证据
6. 基础事件证据
7. 归因预处理证据
8. 根因判断
9. 下一步建议

Android SDK 输出模板强约束：

- 当分支判断结果为 Android SDK（含 `ALL_RULE` / `NO_RULE`）时，最终回答必须单独列出一个“关键总量对账”小节。
- 该小节必须逐项展示以下 5 个字段，缺一不可：
  1. 基础事件总数
  2. `attr-require` 总数
  3. `attr-res` 总数
  4. SDK income 总数
  5. `804` 总数
- 这 5 个字段都应绑定当前 `event_type` 解读，不能把 `PAY` 的金额/订单语义套到 `ACTIVATION/REGISTER`。
- 如果工具还返回事件类型相关的附加指标，应随 `event_type` 一并展示：
  - `PAY`：总金额、订单缺失数、金额缺失数
  - `ACTIVATION`：去重设备数
  - `REGISTER`：去重设备数、去重用户数
- 这 5 个字段必须直接引用工具证据中的聚合结果，不能只写“有/无”“少量”“命中若干样本”。
- 若某个字段当前查不到，必须明确写成 `0` 或“工具未返回可确认总量”，不得省略该字段。
- 在这 5 个字段展示之前，不得先下“回推断层”“归因成功但未回推”这类结论。
- Android SDK 分支不要根据 `push_media_code` 的空值/非空值直接下结论；如需引用该字段，必须明确标注为“非主证据样本字段”。
