# 广告小时报表接口说明

## 一、接口基本信息

| 项目 | 说明 |
|------|------|
| 接口名称 | 项目小时指标-混合归因 |
| Tool名称 | get_ad_hour_report |
| 描述 | 获取广告项目按小时粒度的实时报表数据，支持多维度分析（应用类型、媒体、团队等），包含消耗、激活、注册、付费、首日ROI等核心业务指标 |
| 数据范围 | 仅限广告业务数据，不包含市场推广、运营推广、ASO媒体数据 |
| 更新频率 | 消耗和回流占比指标15分钟更新，转化数据每分钟更新 |
| 默认时间范围 | 当日（当天00:00:00至当前时间） |
| 最早可用日期 | 2025-01-01 |
| 最晚可用日期 | 当前日期（包含实时数据） |

---

## 二、参数列表

| 参数ID | 参数名称 | 描述 | 是否必填 | 格式/示例 |
|--------|---------|------|---------|----------|
| appId | 游戏应用ID | 指定查询的游戏应用标识，数字类型字符串，请先调用 list_apps 获取正确的 appId | 是 | "123456789" |
| startDate | 查询开始日期 | 查询开始日期，格式 yyyy-MM-dd，包含该日数据 | 是 | "2026-03-16" (YYYY-MM-DD) |
| endDate | 查询结束日期 | 查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 start 间隔不超过90天 | 是 | "2026-03-26" (YYYY-MM-DD) |
| timeType | 时间粒度 | 指定小时/日报表类型。**小时报表默认传小时，即timeType=HOURLY，默认会返回这天的全部小时数据** | 是 | HOURLY / DAY |
| baseTimeType | 基础时间类型 | 指定时间视角类型，用于区分广告小时报表按时段看数据还是按天累计看数据。支持 EVENT_TIME、REGISTER_TIME。EVENT_TIME 表示按天累计口径，查看截至某小时的当日累计表现，该口径数据本身已按截止时段累计汇总，适合分析当天整体表现，如非用户明确要求，返回结果不要额外累计，否则是二次累计或合计了。REGISTER_TIME 表示按时段口径，查看某个时段新增用户在今天的转化情况，适合分析各时段新用户质量；当用户询问某时段数据时优先使用该口径。按天累计口径下，注册转化指标如首日付费、有效、创角按对应事件发生时间统计，激活转化指标如首日注册设备数按注册时间汇总到小时粒度。按时段口径下，激活转化指标按激活时间归属时段，注册转化指标按注册时间归属时段，仅统计该时段新增用户的转化。返回结果时最好注明使用的口径。 | 是 | EVENT_TIME / REGISTER_TIME |
| subGroup | 细分类型 | 细分类型，填 media_id 时按媒体细分，若看细分维度整天合计数据，则同时传 viewCriteria=CURRENT_SUMMARY ；若查看细分维度某小时数据，则同时传dh=相应小时，不传viewCriteria | 否 | media_id / team_ids |
| viewCriteria | 视图条件 | subGroup 有值时且按细分维度查询整天合计数据时，传固定值 CURRENT_SUMMARY，意思是查看整天汇总数据 | 否 | CURRENT_SUMMARY |
| dh | 小时 | 小时，格式 '2026-03-16 03:00'，当 subGroup=media_id 且查看细分维度指定小时数据 时必传 | 否 | '2026-03-16 03:00' |
| appPackageType | 应用类型筛选 | 筛选应用包类型 | 否 | string | `["ANDROID", "IOS"]` |
| mediaId | 媒体ID筛选 | 媒体ID筛选，可先尝试通过 list_media 接口获取实际code | 否 | "1001,1002" |
| teamIds | 团队ID过滤 | 团队ID过滤，数字类型，多个团队ID用逗号分割，可先尝试通过 list_teams 接口获取实际teamId | 否 | "1,221" |

---

## 三、时间粒度说明

| 参数值 | 说明 | start/end格式要求 |
|--------|------|-------------------|
| HOURLY | 按小时聚合数据，每小时一条记录 | YYYY-MM-DD，如 2026-03-16 ~ 2026-03-16（同一天） |
| DAY | 按自然日聚合数据，每日一条记录 | YYYY-MM-DD，如 2026-03-13 ~ 2026-03-26 |

---

## 四、基础时间类型说明

| 参数值 | 说明 |
|--------|------|
| EVENT_TIME | 按天累计口径，查看截至某小时的当日累计表现。该口径数据已按截止时段累计汇总，适合分析当日广告整体表现的累计趋势。若非用户明确要求，返回结果时不要再加合计行。注册转化类指标按对应事件发生时间统计，激活转化类指标如首日注册设备数按注册时间汇总到小时粒度。 |
| REGISTER_TIME | 按时段口径，查看某个时段新增用户在今天的转化情况，适合分析各时段新用户质量。若用户询问某个时段的数据，应优先使用该口径。激活转化类指标按激活时间归属时段，注册转化类指标按注册时间归属时段 |

---

## 五、可用维度（返回字段）

| 维度字段名称 | 说明 | 值示例 |
|-------------|------|--------|
| dh | 时段 | "2026-03-16 03:00" |
| appId | 应用ID（数字类型字符串） | "123456789" |
| appPackageType | 应用类型 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" |
| mediaId | 媒体ID | "10001" (巨量引擎) / "10002" (腾讯广告) |

---

## 六、支持的维度组合

| 参数组合 | 说明 | 适用场景 |
|---------|------|---------|
																																							   
| subGroup=media_id | 按媒体细分 | 对比不同媒体渠道的实时投放效果，需配合 viewCriteria=CURRENT_SUMMARY 或dh 使用|
																														  

---

## 七、通用基础指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| dh | 时段 | 报表时段（小时） | - |
| composite_act_cnt | 激活设备数 | 混合归因下的激活设备数 | 个 |
| composite_reg_cnt | 注册数 | 混合归因下的注册用户数 | 个 |
| cost_amount | 消耗 | 广告投放实际消耗金额 | 元 |
| rebate_cost_amount | 折后消耗 | 折扣后的消耗金额 | 元 |

---

## 八、小时维度付费指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_pay_d1_amount | 首日付费金额 | 注册首日付费的金额 | 元 |
| composite_pay_d1_cnt | 首日付费账号数 | 首日付费的账号数 | 个 |
| composite_pay_d1_rate | 首日付费率 | 首日付费的账号数/该时段的注册账号数 | % |
| composite_pay_d1_cost | 首日付费成本 | 该时段的折后消耗/该时段的首日付费账号数 | 元 |
| composite_arpu_d1_amount | 首日ARPU | 当前时段的首日付费金额/当前时段的注册账号数 | 元 |
| composite_arppu_d1_amount | 首日ARPPU | 首日付费金额/首日付费数 | 元 |

---

## 九、小时维度ROI指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_d1_roi_rate | 首日ROI | 首日付费金额/消耗 | - |

---

## 十、小时维度创角指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_create_role_d1_cnt | 创角账号数 | 首日创角账号数 | 个 |
| composite_create_role_d1_rate | 创角率 | 首日创角账号数/该时段的注册账号数 | % |
| composite_create_role_d1_cost | 创角成本 | 该时段的折后消耗/该时段的首日创角账号数 | 元 |

---

## 十一、小时维度有效指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_effective_d1_cnt | 有效数 | 今天达到有效条件的账号数 | 个 |
| composite_effective_d1_rate | 有效率 | 有效账号数/该时段的注册账号数 | % |
| composite_effective_d1_cost | 有效成本 | 该时段的折后消耗/该时段的有效账号数 | 元 |

---

## 十二、小时维度注册设备指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_reg_d1_new_device_cnt | 首日注册设备数 | 该时段的激活设备在今天的累计注册的设备数 | 个 |
| composite_reg_d1_new_device_rate | 首日注册率 | 首日注册设备数/该时段的激活数 | % |
| composite_reg_d1_new_device_cost | 注册设备成本 | 该时段的折后消耗/该时段的首日注册设备数 | 元 |
| composite_reg_cost | 注册成本 | 折后消耗/注册账号数 | 元 |

---

## 十三、小时维度激活指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| composite_act_cost | 激活成本 | 折后消耗/新设备数 | 元 |
| composite_act_old_user_cnt | 新设备老账号数 | 该时段当日激活但登录了老账号的设备数 | 个 |
| composite_act_old_user_rate | 新设备老账号占比 | 该时段当日激活但登录了老账号的设备数/激活数 | % |

---

## 十四、PC游戏专用指标

**说明**：以下指标仅适用于PC游戏，其他游戏类型不返回这些指标。

### 落地页指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| loading_open_cnt | 落地页打开次数 | 落地页打开次数 | 次 |
| loading_peop_cnt | 落地页打开人数 | 按device_id*媒体*广告去重 | 人 |
| loading_change_cnt | 落地页转化数 | 落地页按钮点击人数，按device_id*媒体*广告去重 | 人 |
| loading_conversion_rate | 落地页转化率 | 落地页转化数/落地页打开人数*100% | % |
| loading_conversion_cost | 落地页转化成本 | 折后消耗/落地页转化数 | 元 |

### 下载器指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| downloader_cnt | 下载器激活数 | 下载器首次启动数 | 个 |
| downloader_act_rate | 下载器激活率 | 下载器激活数/落地页转化数 | % |
| downloader_act_cost | 下载器激活成本 | 折后消耗/下载器激活数 | 元 |

### 启动器指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| bootstrapper_cnt | 启动器激活数 | 启动器首次启动数 | 个 |
| bootstrapper_act_rate | 启动器激活率 | 启动器激活数/下载器激活数 | % |
| bootstrapper_act_cost | 启动器激活成本 | 折后消耗/启动器激活数 | 元 |

---

## 十五、数据更新说明

| 指标类型 | 更新频率 | 说明 |
|---------|---------|------|
| 消耗和回流占比指标 | 每15分钟更新一次 | 广告投放消耗数据实时更新 |
| 转化数据 | 每分钟更新一次 | 激活、注册、付费等转化数据实时更新 |

---

## 十六、注意事项

### 16.1 权限与认证
- 需使用内部授权的API Token进行访问
- Token有效期根据公司安全策略，过期需重新申请

### 16.2 数据口径说明
- **仅广告数据**：不包含市场和运营数据
- **不包含ASO媒体**：ASO媒体数据不在本接口统计范围内
- **混合归因**：采用内部混合归因模型，综合考虑点击归因、曝光归因等多种归因方式
- **折后消耗计算**：折后消耗=消耗/(1+折扣)，折扣信息来自代理商合同信息

### 16.3 限制与约束
- 单次查询时间范围不超过90天
- 单次返回数据最多支持1000条记录
- 并发请求限制：同一应用每秒最多10次请求
- subGroup=media_id 且 timeType=HOURLY 时，必须传 dh 参数
- **PC游戏专用指标**：落地页、下载器、启动器指标仅适用于PC游戏

### 16.4 数据范围限制
- 仅包含广告业务数据，不包含以下数据：
  - ❌ ASO媒体数据
  - ❌ 市场推广数据
  - ❌ 运营推广数据
  - ❌ 其他非广告业务数据

---

## 附录：参数速查表

| 用途 | 参数组合 |
|------|---------|
| 按天的口径小时报表 | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME |
| 按注册时间小时报表 | appId + startDate + endDate + timeType=HOURLY + baseTimeType=REGISTER_TIME |
| 按媒体细分（按天口径+按天合计） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME + subGroup=media_id + viewCriteria=CURRENT_SUMMARY |
| 按媒体细分（按时段口径+按天合计） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=REGISTER_TIME + subGroup=media_id + viewCriteria=CURRENT_SUMMARY |
| 按媒体细分（按天口径+某时段数据） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME + subGroup=media_id + dh=指定时段 |
| 按媒体细分（按时段口径+某时段数据） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=REGISTER_TIME + subGroup=media_id + dh=指定时段 |
| 指定应用类型小时数据（按天口径） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME + appPackageType=ANDROID |
| 指定应用类型小时数据（按注册时间） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=REGISTER_TIME + appPackageType=ANDROID |
| 历史小时报表 | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME |
| 多媒体筛选（按天口径） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=EVENT_TIME + mediaId=1001,1002 |
| 多媒体筛选（按时段口径） | appId + startDate + endDate + timeType=HOURLY + baseTimeType=REGISTER_TIME + mediaId=1001,1002 |
| 日报表查询（按天口径） | appId + startDate + endDate + timeType=DAY + baseTimeType=EVENT_TIME |
| 日报表查询（按时段时间） | appId + startDate + endDate + timeType=DAY + baseTimeType=REGISTER_TIME |

---

*文档版本：V2.2*
*更新日期：2026-04-01*
*维护方：数据部团队*