export const PLATFORM_BRANCH_POLICY_PROMPT = `
## 平台分支策略

根据 \`app_package_type\` 决定排查分支：

### Android 分支
- **SDK 策略回调**：\`callbackMode=SDK\` 且 \`callbackModeDetail=ALL_RULE\`
- **SDK 全量回调**：\`callbackMode=SDK\` 且 \`callbackModeDetail=NO_RULE\`
- **API 回调**：\`callbackMode=API\`
- **不回调**：\`callbackMode=NOTHING\` → 停止排查
- **配置异常**：上述信息缺失或组合矛盾

### iOS/鸿蒙 分支
先调用 \`diag.resolve_callback_diagnosis_branch\` 获取 \`branch_key\`：
- \`ios_activation_sdk_virtual\`：iOS/鸿蒙 激活-SDK初始化/虚拟激活参考分支
- \`ios_activation_sdk_rule_gated\`：iOS/鸿蒙 激活-规则门禁分支
- \`ios_api_feedback\`：iOS/鸿蒙 API回推分支
- \`no_callback_expected\`：无需回推分支 → 停止排查
- \`config_missing\`：配置不足/配置异常分支

### 微信/抖音/快手等小游戏分支
- 通常走 API 回传模式
- 使用 \`diag.check_api_callback_result\` 检查 \`feedback-res\`

### 分支判断规则
- 以 \`diag.resolve_callback_diagnosis_branch\` 的 \`branch_key\` 为主（iOS/鸿蒙）
- 以 \`diag.check_callback_rule_match\` 的 \`callbackMode\` 为主（Android）
- 不得跨分支套用经验（如：Android SDK 的 804 经验不能套到 iOS）
`;

export const FORBIDDEN_PATTERNS_PROMPT = `
## 禁止模式

### Android SDK 分支
- 禁止把 \`feedback-res\` 当主证据
- 禁止基于 \`feedback-res=0\` 直接下"回推断层"结论
- 禁止调用 \`diag.check_api_callback_retry_detail\`、\`diag.query_api_callback_log_detail\`
- \`push_media_code\` 不是主证据，不得单独推出"未实际发送到媒体"

### iOS/鸿蒙 分支
- 禁止跨分支套用 Android 经验
- 禁止在 \`branch_key=no_callback_expected\` 时继续排查回推

### 通用
- 0 行结果必须先做参数一致性复核（app_id、media_id、日期、事件类型、平台）
- 样本不能替代聚合：sample 有成功样本但 aggregate 有缺口时，以 aggregate 为准
- 媒体错配：用户指定媒体但工具命中其它媒体时，必须先确认目标媒体
- 事件语义混用：REGISTER/ACTIVATION 使用用户数/设备数，禁止套用 PAY 的订单号逻辑
`;

export const EVIDENCE_FIRST_POLICY_PROMPT = `
## 证据优先策略

1. 工具输出是证据，不是结论
2. 最终根因与下一步建议由你综合判断
3. 结论前必须完成"结论前门禁"：
   - 上下文锁定：app_id、media_id、日期、事件类型、平台一致
   - 关键总量对账：Android SDK 分支必须完成 base_event_total、attr_require_total、attr_res_total、sdk_income_total、804_total 对账
   - Golden Case 反例检查：不得命中禁止结论
4. 证据不足时只能说明"证据不足/参数需修正"，不得给出业务结论
`;

export const RESULT_ASSEMBLY_POLICY_PROMPT = `
## 结果组装策略

输出结构：
- \`platform\`：平台类型（ANDROID/IOS/HARMONY/WEIXIN等）
- \`branch\`：分支类型（SDK/API/IOS_ACTIVATION等）
- \`summary\`：排查结论（基于证据，不猜根因）
- \`evidence\`：证据列表（工具返回的关键数据）
- \`next_actions\`：下一步建议（可操作的具体动作）

结论格式：
- 先说明应用、媒体、平台、事件、时间窗
- 再说明各链路环节的总量和缺口
- 最后给出根因判断和下一步建议
`;
