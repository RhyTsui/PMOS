# iOS Branching

iOS 需要先判断是不是：

- `iOS/Harmony 激活-SDK初始化/虚拟激活参考分支`
  - `branch_key=ios_activation_sdk_virtual`
  - 含义：更接近“激活归因已成立，SDK 初始化也有参考证据”，主链常见为 `attr-res -> d_c_init_i -> 虚拟激活/804参考`
- `iOS/Harmony 激活-规则规则门禁分支`
  - `branch_key=ios_activation_sdk_rule_gated`
  - 含义：理论上应走激活/SDK链路，但当前设置了规则或前置条件
- `iOS/Harmony API回推分支`
  - `branch_key=ios_api_feedback`
  - 含义：更接近 `REGISTER / PAY / KEY_ACTION` 通过 `feedback-res` 判断 API 回推结果的链路
- `无需回推分支`
  - `branch_key=no_callback_expected`
- `配置不足/配置异常分支`
  - `branch_key=config_missing`

常见主链：

- `ACTIVATION`
  - `attr-res -> d_c_init_i -> 虚拟激活/804参考证据`
- `REGISTER / PAY / KEY_ACTION`
  - `attr-res -> feedback-res`

iOS 关键解释字段：

- `idfv`
- `caid1`
- `caid2`
- `os_version`
- `app_version`
- `sdk_version`

不建议把 Android 的 `PAY -> d_c_order_i -> 804` 口径直接迁移到 iOS。

对用户解释时，优先使用中文分支名称；`branch_key` 只作为工具返回的内部标识保留。
