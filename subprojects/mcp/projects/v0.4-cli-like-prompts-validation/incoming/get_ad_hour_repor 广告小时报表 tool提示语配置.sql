delete from `mcp_tool_config` where id > 0;
delete from `mcp_tool_parameter` where id > 0;
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportSummaryTool#tool', 'get_oversea_ad_summary_report', '海外游戏广告报表总览：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-概览', '2026-03-30 14:14:45', '2026-03-30 20:29:02');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'get_oversea_ad_day_report', '海外游戏广告分日报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-日周月报', '2026-03-30 14:33:03', '2026-03-30 19:43:05');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'get_oversea_ad_week_report', '海外游戏广告分周报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-日周月报', '2026-03-30 14:33:03', '2026-03-30 19:43:08');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'get_oversea_ad_month_report', '海外游戏广告分月报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-日周月报', '2026-03-30 14:33:03', '2026-03-30 19:43:10');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'get_oversea_ad_roi_day_report', '海外游戏广告ROI分日报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-ROI分析', '2026-03-30 14:33:03', '2026-03-30 19:43:13');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'get_oversea_ad_roi_week_report', '海外游戏广告ROI分周报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-ROI分析', '2026-03-30 14:33:03', '2026-03-30 19:43:15');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'get_oversea_ad_roi_month_report', '海外游戏广告ROI分月报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-ROI分析', '2026-03-30 14:33:03', '2026-03-30 19:43:17');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'get_oversea_ad_retention_day_report', '海外游戏广告留存分日报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-留存日表', '2026-03-30 14:33:03', '2026-03-30 19:43:20');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'get_oversea_ad_retention_week_report', '海外游戏广告留存分周报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-留存周报', '2026-03-30 14:33:03', '2026-03-30 19:43:22');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'get_oversea_ad_retention_month_report', '海外游戏广告留存分月报表：仅在list_apps返回的游戏appRegion为OVERSEAS时才允许调用该接口', 1, 0, '魔方-广告-留存月报', '2026-03-30 14:33:03', '2026-03-30 19:43:25');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'get_kpi_by_day', '1、渠道日报：
---这里有各个游戏（app_id）的细分渠道概况日报，
---日期数据粒度到天，支持渠道、操作系统、分包筛选
2、指标有：
---新增设备、新设备新账号数、新设备新账号次留率、
---新增账号数、新增角色数、有效用户数、新增账号有效率、
---启动设备数（活跃设备）、登录账号数（活跃账号）、
---付费金额、付费账号数、付费率、ARPU、ARPPU、
---新用户首日付费金额、新用户首日付费人数、新用户首日ARPU、新用户首日ARPPU、回流账号数、工作室账号数等
3、如果用户特定指出要查“某某渠道”、“某某分包”等情况，上述指标都可以在这个接口查
4、月活跃账号数、设备数等指标不能从每日加起来，月活跃账号一般要去月报查询、同样的周活跃（活跃账号累加是没有意义的）
5、广告相关指标不在这里查询
6、用户如果要查游戏的整体活跃设备、活跃账号等指标，而不是特定分包，请到get_kpi_summary查询（活跃类型指标不能直接累加）', 1, 1, '运营-KPI日报', '2026-03-25 22:12:09', '2026-03-27 14:31:54');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'get_kpi_by_week', '1、渠道周报：
---这里有各个游戏（app_id）的细分渠道指标周报，
---日期数据粒度到周，支持渠道、操作系统、分包筛选
2、指标有：
---新增设备、新设备新账号数、新增账号数、新增角色数、
---启动设备数（周活跃设备-按周去重）、登录账号数（周活跃账号数-按周去重）、
---日均启动设备数（日均活跃设备）、日均登录账号数（日均活跃账号）
---付费金额、付费账号数（按周去重的付费账号数）、（周）付费率、（周）ARPU、（周）ARPPU、
3、如果用户特定指出要查“某某渠道”、“某某分包”的周指标表现都可以在这个接口查
4、周活跃账号数、设备数等指标只能在这里查询（不能去日报累加）
5、广告相关指标不在这里查询
6、用户如果要查游戏的整体（周）活跃设备、活跃账号等指标，而不是特定分包，请到get_kpi_summary（dateType=''周报''）查询（活跃类型指标不能直接累加）', 1, 1, '运营-KPI周报', '2026-03-25 22:12:09', '2026-03-27 14:41:42');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'get_kpi_by_month', '1、渠道月报：
---这里有各个游戏（app_id）的细分渠道指标月报，
---日期数据粒度到月，支持渠道、操作系统、分包筛选
2、指标有：
---新增设备、新设备新账号数、新增账号数、新增角色数、
---启动设备数（月活跃设备-按月去重）、登录账号数（月活跃账号数-按月去重）、
---日均启动设备数（月日均活跃设备）、日均登录账号数（月日均活跃账号）
---付费金额、付费账号数（按月去重的付费账号数）、（月）付费率、（月）ARPU、（月）ARPPU、
---老用户月付费率、（月）工作室账号数
3、如果用户特定指出要查“某某渠道”、“某某分包”的月指标表现都可以在这个接口查
4、月活跃账号数、设备数等指标只能在这里查询（不能去日报累加）
5、广告相关指标不在这里查询
6、用户如果要查游戏的整体（月）活跃设备、活跃账号等指标，而不是特定分包，请到get_kpi_summary（dateType=''月报''）查询（活跃类型指标不能直接累加）', 1, 1, '运营-KPI月报', '2026-03-25 22:12:09', '2026-03-27 14:41:34');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.day.SummaryReportTool#tool', 'get_kpi_summary', '1、游戏日报、周报、月报：
---dateType选‘日报’：游戏每日总体各个指标的日报，粒度到天
---dateType选‘周报’：游戏每日总体各个指标的周报，粒度到周
---dateType选‘月报’：游戏每日总体各个指标的月报，粒度到月
2、指标有：
---新增设备、新设备新账号数、新设备新账号次留率、
---新增账号数、新增角色数、有效用户数、新增账号有效率、
---启动设备数（活跃设备）、登录账号数（活跃账号）、
---付费金额、付费账号数、付费率、ARPU、ARPPU
---新用户首日付费金额、新用户首日付费人数、新用户首日ARPU、新用户首日ARPPU、
---回流账号数、工作室账号数等指标
---针对周报、月报有：日均活跃设备、日均账号登录账号数（日均活跃设备、日均活跃账号）
3、如果用户要查每个游戏每天、周、月的不分渠道等细分维度的数据，这里是最方便、准确的
4、不支持渠道、系统、分包等筛选：这里不支持查某个特定渠道或者系统、分包的日、周、月数据
5、如果用户没有特定指出要查“广告”、“某某渠道”、“某某分包”等情况，上述指标都建议在这个接口查
6、月活跃账号数、设备数等指标不能从每日加起来，月活跃账号一般要去月报查询、同样的周活跃（活跃账号累加是没有意义的）', 1, 1, '运营-KPI概览', '2026-03-25 22:12:09', '2026-03-30 18:17:54');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdOsTypeTool#tool', 'ad_list_os_type', ' 1、指定游戏广告获取终端、应用类型列表，用于下游报表查询 ', 0, 4, '', '2026-03-25 22:12:09', '2026-03-27 19:59:08');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.PaymentDistributionTool#tool', 'get_payment_distribution_report', '获取付费分布报告：仅在list_apps返回的游戏type为hz时才允许调用该接口', 1, 5, '运营-付费分布', '2026-03-25 22:12:09', '2026-03-27 22:50:12');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'get_payment_day_report', '1、付费日报(充值)：本接口查询各个游戏的付费相关数据，
2、group参数：可根据不同的输入参数展示按不同参数group by的数据
---日期（按日期维度展示）
---终端（按终端操作系统展示）
---渠道（分渠道展示）
---分包（按分包、渠道双维度展示）
3、指标为：
   数据日期（以输入group参数为准）、付费金额、付费账号数、ARPU、ARPPU、付费率、新用户首日付费金额、新用户首日付费人数、新用户首日ARPU、新用户首日ARPPU、新用户首日付费率
4、group参数默认传 ''日期'' 
3、可根据渠道、操作系统、分包筛选数据
4、广告付费相关不在这里查询
5、数据粒度到日（天），如果用户查询周报、月报相关可以通过付费周报、付费月报查询
', 1, 5, '运营-付费日报', '2026-03-25 22:12:09', '2026-03-27 15:32:49');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'get_payment_week_report', '1、付费周报(充值)：本接口查询各个游戏周粒度付费相关数据，
2、group参数：可根据不同的输入参数展示按不同参数group by的数据
---日期（按日期维度展示）
---终端（按终端操作系统展示）
---渠道（分渠道展示）
---分包（按分包、渠道双维度展示）
3、指标为：
   数据日期（周）（以输入group参数为准）、付费金额、付费账号数、ARPU、ARPPU、付费率
4、group参数默认传 ''日期'' 
3、可根据渠道、操作系统、分包筛选数据
4、广告付费相关不在这里查询
5、数据粒度到周
', 1, 5, '运营-付费周报', '2026-03-25 22:12:09', '2026-03-27 15:36:23');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'get_payment_month_report', '1、付费月报(充值)：本接口查询各个游戏以月为粒度付费相关数据，
2、group参数：可根据不同的输入参数展示按不同参数group by的数据
---日期（按日期维度展示）
---终端（按终端操作系统展示）
---渠道（分渠道展示）
---分包（按分包、渠道双维度展示）
3、指标为：
   数据日期（月）（以输入group参数为准）、付费金额、付费账号数、ARPU、ARPPU、付费率、老用户付费率
4、group参数默认传 ''日期'' 
3、可根据渠道、操作系统、分包筛选数据
4、广告付费相关不在这里查询
5、数据粒度到月
', 1, 5, '运营-付费月报', '2026-03-25 22:12:09', '2026-03-27 15:35:57');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'get_retention_day_report', '1、留存率日报：
---支持查询各个游戏的每日的次日留存率，3日留存率，4日留存率……30日留存率，45日留存率，60日留存率，以及90,120,150,180,210,240,270300,330,360日留存率等\n
2、通过参数data_switch可以切换不同类型用户的留存率，目前情况：
当游戏ID为10100080（MA），10100042（指间），10100080（武将觉醒）时，可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
不设置时默认指定：新增留存


当游戏ID为10100004（怒焰）时，可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存

3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到天，按日期维度展示
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘新增设备’……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘新增设备’……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘新增设备’……', 1, 6, '运营-留存日报', '2026-03-25 22:12:09', '2026-03-27 23:00:03');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'get_retention_week_report', '1、留存率周报：
---支持查询各个游戏的每周的次日留存率，3日留存率，4日留存率……30日留存率，45日留存率，60日留存率，以及90,120,150,180,210,240,270300,330,360日留存率等\n
---这里的留存率本质是‘周内平均’，例如‘次日留存率’ 是指这周每天的次日留存率的加权平均值，权重是新增数量
2、通过参数data_switch可以切换不同类型用户的留存率，目前情况：
当游戏ID为10100080（MA），10100042（指间），10100080（武将觉醒）时，可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
不设置时默认指定：新增留存


当游戏ID为10100004（怒焰）时，可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存
3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到周，按（周）日期维度展示
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘新增数量’,''次日留存率''……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘新增数量’,''次日留存率''……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘新增数量’,''次日留存率''……', 1, 6, '运营-留存周报', '2026-03-25 22:12:09', '2026-03-27 23:00:19');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'get_retention_month_report', '1、留存率月报：
---支持查询各个游戏的每月的次日留存率，3日留存率，4日留存率……30日留存率，45日留存率，60日留存率，以及90,120,150,180,210,240,270300,330,360日留存率等\n
---这里的‘留存率’本质是‘月内平均留存率’，例如‘次日留存率’ 是指这个月每天的次日留存率的加权平均值，权重是新增数量
2、通过参数data_switch可以切换不同类型用户的留存率，目前情况：
当游戏ID为10100080（MA），10100042（指间）时，10100080（武将觉醒）可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
不设置时默认指定：新增留存


当游戏ID为10100004（怒焰）时，可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存
3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到月，按（月）日期维度展示
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘新增数量’,''次日留存率''……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘新增数量’,''次日留存率''……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘新增数量’,''次日留存率''……', 1, 6, '运营-留存月报', '2026-03-25 22:12:09', '2026-03-27 23:00:32');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'get_ltv_day_report', '1、LTV日报：
---支持查询各个游戏的每日的LTV1，LTV2，LTV3……LTV30，LTV45，LTV60,LTV90,LTV120,LTV150,LTV180,LTV210,LTV240,LTV270,LTV300,LTV330,LTV360等\n
2、通过参数data_switch可以切换不同类型的LTV，目前支持：
---新增账号（所有新用户的LTV）
---首次付费用户（追踪首次付费用户的LTV）
---有效新用户（通过有效点位的新用户的LTV--剔除了一些质量不好的新用户）
3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到天
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘账号数’‘LTV1’……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘账号数’‘LTV1’……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘账号数’‘LTV1’……', 1, 7, '运营-LTV日报', '2026-03-25 22:12:09', '2026-03-27 16:05:37');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'get_ltv_week_report', '1、LTV周报：
---支持查询各个游戏的每日的LTV1，LTV2，LTV3……LTV30，LTV45，LTV60,LTV90,LTV120,LTV150,LTV180,LTV210,LTV240,LTV270,LTV300,LTV330,LTV360等\n
---这里的LTV本质是‘周内平均’，例如‘LTV1’ 是指这周每天的LTV1的加权平均值，权重是账号数
2、通过参数data_switch可以切换不同类型的LTV，目前支持：
---新增账号（所有新用户的LTV）
---首次付费用户（追踪首次付费用户的LTV）
---有效新用户（通过有效点位的新用户的LTV--剔除了一些质量不好的新用户）
3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到周（自然周）
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘账号数’‘LTV1’……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘账号数’‘LTV1’……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘账号数’‘LTV1’……', 1, 7, '运营-LTV周报', '2026-03-25 22:12:09', '2026-03-27 16:06:19');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'get_ltv_month_report', '1、LTV月报：
---支持查询各个游戏的每日的LTV1，LTV2，LTV3……LTV30，LTV45，LTV60,LTV90,LTV120,LTV150,LTV180,LTV210,LTV240,LTV270,LTV300,LTV330,LTV360等\n
---这里的LTV本质是‘月内平均’，例如‘LTV1’ 是指这个月每天的LTV1的加权平均值，权重是账号数
2、通过参数data_switch可以切换不同类型的LTV，目前支持：
---新增账号（所有新用户的LTV）
---首次付费用户（追踪首次付费用户的LTV）
---有效新用户（通过有效点位的新用户的LTV--剔除了一些质量不好的新用户）
3、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
4、广告相关LTV这里不能查
5、数据粒度到月（自然月）
6、支持按‘终端’、‘渠道’、‘分包’等维度细分--通过subGroup参数
 ---输入‘终端’，输出 ‘数据日期’‘终端’‘账号数’‘LTV1’……
 ---输入‘渠道’，输出 ‘数据日期’‘渠道’‘账号数’‘LTV1’……
 ---输入‘分包’，输出 ‘数据日期’‘分包’‘账号数’‘LTV1’……', 1, 7, '运营-LTV月报', '2026-03-25 22:12:09', '2026-03-27 16:07:46');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'get_ad_hour_report', '# 广告小时报表接口说明

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
| dh | 小时 | 小时，格式 ''2026-03-16 03:00''，当 subGroup=media_id 且查看细分维度指定小时数据 时必传 | 否 | ''2026-03-16 03:00'' |
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
*维护方：数据部团队*', 1, 10, '广告-小时报表', '2026-03-25 22:12:09', '2026-04-01 15:18:51');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'get_ad_day_report', '# 广告日周月报表接口说明

## 一、接口基本信息

| 项目 | 说明 |
|------|------|
| 接口名称 | 项目天指标-混合归因 |
| Tool名称 | get_ad_day_report |
| 描述 | 获取广告项目按日/周/月粒度的混合归因数据，支持多维度分析 |
| 数据范围 | 仅限广告业务数据，不包含市场推广、运营推广、ASO媒体数据 |
| 更新频率 | 今日实时数据每20分钟更新一次 |
| 默认时间范围 | 最近7天 |
| 最早可用日期 | 2025-01-01 |
| 最晚可用日期 | 当前日期（包含今日实时数据） |

## 二、参数列表

| 参数ID | 参数名称 | 描述 | 是否必填 | 参数类型 | 格式/示例 |
|--------|---------|------|---------|----------|----------|
| app_id | 项目ID | 指定查询的项目应用标识，数字类型字符串 | 是 | string | `"123456789"`（需先调用list_apps获取） |
| start | 开始日期 | 查询起始日期 | 是 | string (date) | `"2026-03-13"` (YYYY-MM-DD) |
| end | 结束日期 | 查询结束日期，需 >= start | 是 | string (date) | `"2026-03-26"` (YYYY-MM-DD) |
| dateType | 报表类型 | 指定日报/周报/月报 | 是 | string (enum) | `DAY` (默认) / `NATURAL_WEEK` / `NATURAL_MONTH` |
| mediaId | 媒体ID | 筛选特定媒体渠道 | 否 | integer | `[10001, 10002]` |
| appPackageType | 应用类型 | 筛选应用包类型 | 否 | string | `["ANDROID", "IOS"]` |
| teamIds | 团队ID | 筛选特定团队 | 否 | string | `["1001", "1002"]` |
| organic | 是否包含自然量 | 是否包含自然量数据 | 是 | integer | `1` (包含) / `0` (不包含，默认) |
| subGroup | 报表维度 | 指定数据分组维度 | 否 | string (枚举组合) | `appPackageType` / `mediaId` / `teamIds` / `appPackageType,teamIds` / `appPackageType,mediaId` / `mediaId,teamIds` |

## 三、时间粒度说明

| 参数值 | 说明 | start/end格式要求 |
|--------|------|-------------------|
| DAY | 按自然日聚合数据，每日一条记录 | YYYY-MM-DD，如 2026-03-13 ~ 2026-03-26 |
| NATURAL_WEEK | 按自然周（周一至周日）聚合数据 | 日期范围需包含完整周 |
| NATURAL_MONTH | 按自然月聚合数据 | 日期范围需包含完整月 |

## 四、可用维度（返回字段）

| 维度字段名称 | 说明 | 值示例 |
|-------------|------|--------|
| dt | 日期 | "2026-03-26" |
| app_id | 应用ID（数字类型字符串） | "123456789" |
| appPackageType | 应用类型 | "ANDROID" / "IOS" |
| mediaId | 媒体ID | "10001" (巨量引擎) / "10002" (腾讯广告) |
| media_name | 媒体名称 | "巨量引擎" |
| teamIds | 团队ID | "1" |

## 五、支持的维度组合

| 维度代码 | 说明 | 适用场景 |
|---------|------|---------|
| appPackageType | 应用类型 | 对比不同应用类型的表现（安卓 vs iOS） |
| mediaId | 媒体维度 | 分析不同媒体渠道的投放效果 |
| teamIds | 团队维度 | 对比不同投放团队/业务组的表现 |
| appPackageType,teamIds | 应用类型+团队 | 细化分析不同团队下各应用包类型的表现 |
| appPackageType,mediaId | 应用类型+媒体 | 细化分析不同媒体渠道下各应用包类型的表现 |
| mediaId,teamIds | 媒体+团队 | 细化分析不同团队在各媒体渠道的表现 |

## 六、通用基础指标

| 指标字段名称 | 指标中文名 | 说明 | 单位 |
|-------------|-----------|------|------|
| dt | 日期 | 报表日期（自然日/自然周/自然月） | - |
| composite_act_cnt | 激活设备数 | 混合归因下的激活设备数 | 个 |
| composite_reg_cnt | 注册数 | 混合归因下的注册用户数 | 个 |
| composite_start_total_pay_amount | 累计付费金额 | 混合归因下的累计付费金额 | 元 |
| composite_start_total_roi_rate | 累计ROI | 混合归因下的累计投入产出比 | - |
| cost_amount | 消耗 | 广告投放实际消耗金额 | 元 |
| rebate_cost_amount | 折后消耗 | 折扣后的消耗金额 | 元 |
| cash_cost_amount | 现金消耗 | 现金部分消耗金额 | 元 |
| rebate_cash_cost_amount | 现金折后消耗 | 现金部分折扣后消耗金额 | 元 |
| composite_start_total_roi_cash_rate | 现金累计ROI | 现金部分的累计投入产出比 | - |

## 七、日维度付费指标（日报专用）

| 指标字段名称 | 说明 |
|-------------|------|
| composite_pay_d1_amount 至 composite_pay_d30_amount | 激活后第1-30天的付费金额 |
| composite_pay_d45_amount | 激活后第45天的付费金额 |

## 八、日维度ROI指标（日报专用）

| 指标字段名称 | 说明 |
|-------------|------|
| roi1_rate 至 roi360_rate | 激活后第1-360天的ROI |
| cash_roi1_rate 至 cash_roi360_rate | 激活后第1-360天的现金ROI |

## 九、周维度ROI指标（周报专用）

| 指标字段名称 | 说明 |
|-------------|------|
| w_roi1_rate 至 w_roi52_rate | 激活后第1-52周的ROI |
| w_cash_roi1_rate 至 w_cash_roi52_rate | 激活后第1-52周的现金ROI |

## 十、月维度ROI指标（月报专用）

| 指标字段名称 | 说明 |
|-------------|------|
| m_roi1_rate 至 m_roi36_rate | 激活后第1-36月的ROI |
| m_cash_roi1_rate 至 m_cash_roi36_rate | 激活后第1-36月的现金ROI |

## 十一、筛选功能

### 11.1 基础筛选

通过以下参数直接筛选：
- **mediaId**：按媒体ID筛选（单选或多选，不选即全部）
- **appPackageType**：按应用类型筛选（单选或多选，不选即全部）
- **teamIds**：按团队筛选
- **organic**：是否包含自然量

### 11.2 高级筛选

支持复杂条件组合筛选，格式为JSON对象：

```json
{
  "mediaId": ["10001", "10002"],
  "teamIds": "team_001",
  "app_type": "game",
  "organic": "1"
}
```

筛选操作符支持：eq、in、ne、gt、lt、gte、lte

## 十二、限制与约束

- 单次查询时间范围最长支持90天
- 单次返回数据最多支持1000条记录
- 并发请求限制：同一应用每秒最多10次请求
- 维度组合限制：最多支持2个维度同时分组

## 十三、数据口径说明

- 仅广告数据：不包含市场和运营数据
- 成本回本指标：已排除未录消耗的媒体
- 混合归因：采用混合归因模型，综合考虑点击归因、包体归因等多种归因方式

## 十四、常见错误码

| 错误码 | 说明 | 解决方案 |
|-------|------|---------|
| 400 | 参数错误 | 检查参数格式 |
| 401 | 未授权 | Token无效或已过期，需重新获取 |
| 403 | 权限不足 | 无该应用的数据访问权限 |
| 404 | 应用未找到 | 检查应用名称是否正确，或查看完整的应用列表 |
| 429 | 请求超频 | 降低请求频率 |
| 500 | 服务器错误 | 联系技术支持 |

## 十五、Agent使用规范

### 15.1 参数补全原则（核心原则）

**绝对禁止补全未明确指定的可选参数**

对于所有可选参数：
- ✅ **仅当用户明确指定时才传入**
  - 用户说："巨量引擎的消耗" → 传入 mediaId: [10001]
  - 用户说："iOS端数据" → 传入 appPackageType: ''IOS''
- ❌ **切勿传入未明确指定的参数**
  - 用户说："昨天的消耗" → 不传 mediaId（查询所有媒体）
  - 用户说："今日数据" → 不传 appPackageType（查询所有应用类型）

**默认行为说明**
- 不传 mediaId = 查询所有媒体
- 不传 appPackageType = 查询所有应用类型
- 不传 teamIds = 查询所有团队

### 15.2 数据完整性检查（核心反BUG规则）

**绝对禁止数据补全**

查询多个媒体/项目对比时：
- 检查每个指定维度是否都有数据
- 如果接口只返回了部分媒体的数据，必须明确提示："XXX媒体在该时间段无数据"
- ❌ 绝对禁止：用"0"或默认值填充缺失数据，进行"假对比"

**数据状态的三种情况**
1. 无数据：接口未返回该维度/媒体的数据行 → 明确提示"暂无数据"
2. 数据为0：接口返回数据，但值为0 → 可以展示，并标注"数据为0"
3. 数据缺失：接口返回null/undefined → 明确提示"数据缺失"

### 15.3 时间参数规范

**时间范围识别**
- "昨天" → start/end = 昨天
- "今天" → start/end = 今天
- "最近7天" → start = 今天-7天, end = 今天
- "本周" → start = 本周一, end = 今天
- "上周" → start = 上周一, end = 上周日
- "本月" → start = 本月1号, end = 今天
- "上月" → start = 上月1号, end = 上月最后一天

**时间粒度选择**
- "实时数据"、"今日数据"、"现在的数据" → 使用 get_ad_hour_report
- "历史数据"、"3月1日到3月15日" → 使用 get_ad_day_report 或 get_ad_hour_report
- "日报"、"周报"、"月报" → 使用 get_ad_day_report，设置相应的 dateType

### 15.4 AI友好性机制

**容错与降级策略**

场景1：用户输入模糊或缺少关键信息
- ✅ 不要立即报错或返回空
- ✅ 使用默认值 + 友好提示
- 示例："已为您查询所有媒体的昨日数据。如需特定媒体数据，请告诉我媒体名称（如''巨量引擎''）。"

场景2：无法识别的指标或维度
- ✅ 尝试模糊匹配别名
- ✅ 匹配失败时引导用户
- 示例："未找到''流量''指标，已为您查询''激活设备数''。如需其他流量相关指标，可选择：激活数、注册数、DAU等"

场景3：查询范围过大或超时
- ✅ 拆分查询 + 分批返回
- 示例："数据量较大，已优先展示最近30天。需要查看完整365天数据请回复''继续''或指定具体媒体"

**兜底回复机制**

明确告知能力边界 + 提供替代方案
- ❌ 不能说："我无法回答"
- ✅ 要说："目前不支持XXX功能，但您可以：方案A：查询相关指标YYY（我能支持）；方案B：联系技术团队获取详细数据"

### 15.5 应用名/媒体名匹配策略

**核心原则：宁可多问一句，不要瞎猜用户意图**

**第一层：精确匹配（相似度 =100%）**
- 特征：别名映射表中明确列出的高频别名、行业内通用的、无歧义的简称
- 处理方式：直接匹配，无需确认
- 示例：
  - "巨量" → 巨量引擎(10001)（直接匹配）
  - "腾讯" → 腾讯广告(10002)（直接匹配）
  - "指间" → 指间山海(100042)（高频别名，直接匹配）

**第二层：模糊匹配（相似度 60% - 99%）**
- 特征：别名未明确列出但名称有部分相似
- 处理方式：列出选项让用户选择（必须确认）
- 示例："移动英雄杀" → 列出选项："新怒焰英雄杀 (相似度75%)"、"M22A-港澳台 (相似度40%)"

**第三层：无匹配（相似度 < 60%）**
- 特征：完全不匹配或相似度极低
- 处理方式：不匹配，提示未找到，列出所有可用选项
- 示例："某个游戏名"（完全不存在）→ "未找到''xxx''，当前您有权限的应用包括：..."

**禁止的推理行为**
- ❌ 仅凭部分相似就擅自推断应用名
- ❌ 基于业务常识或行业惯例猜测
- ❌ 忽略用户输入中的关键差异

### 15.6 边缘场景友好性处理

**无效日期处理**
- 用户输入不存在的日期（如"2026年2月30日"）
- ✅ 友好提示："2026年2月只有28天，30日不存在。是否需要查询：2026年2月28日 / 2026年2月全月数据？"

**不存在的媒体/指标处理**
- ✅ 友好提示："未找到''媒体999''，当前支持的媒体包括：巨量引擎(10001)、腾讯广告(10002)、快手广告(10003)... 是否查询''其他媒体''（包含所有非主流渠道）？"

**无数据场景处理**
- 查询结果全为0（如新上线项目，投放还未开始）
- ✅ 友善说明："该时间范围内所有指标均为0，可能原因：① 广告投放尚未开始 ② 数据更新延迟（最新数据每20分钟更新）"

**超长查询范围处理**
- 查询时间范围过大（如"最近365天数据汇总"）
- ✅ 拆分处理 + 分批返回："数据量较大（365天），建议：① 查看月度汇总数据（更简洁） ② 查看最近30天详细数据（更快）"

**复杂计算需求降级**
- 用户需要统计计算，但工具不支持（如"各媒体的激活成本排名"）
- ✅ 提供替代方案："自动排名功能暂不支持，建议：① 返回所有媒体的成本数据，您可在Excel中排序 ② 查询成本最高/最低的媒体"

### 15.7 上下文记忆与追问引导

**多轮对话支持**
- 记住用户之前查询的媒体/项目/时间范围
- 用户问"激活数"时，基于上下文自动补全为"巨量引擎的激活数"（如果之前查过巨量引擎）

**追问式澄清**
- ❌ 不要：直接返回全部数据（会让用户淹没在信息中）
- ✅ 要：关键信息缺失时主动提问
- 示例："好的，请问您需要：① 什么时间范围？（昨天/最近7天/本月）② 查看哪个媒体？（巨量引擎/腾讯广告/全部媒体）③ 查询哪些指标？（激活设备数、注册数、付费数）"

**边缘与异常处理**
- 时间边界检查：用户查询未来日期 → ✅ 提示："2027年1月1日是未来日期，暂无数据。当前最新数据日期为：2026-03-26"
- 媒体/项目不存在：用户输入不存在的媒体 → ✅ 返回："未找到Facebook媒体数据，当前支持的媒体包括：巨量引擎、腾讯广告、快手、百度等。是否查询''海外媒体''（含Facebook、TikTok、Google）？"
- 无数据结果：✅ 友善说明："该时间范围内无数据，可能原因：① 投放未开始 ② 数据更新延迟（最新数据每小时更新）"

### 15.8 渐进式交互

**优先返回核心指标，再提供深入分析**
- 用户："昨天的广告效果怎么样？"
- ❌ 不要：一次性返回100+行详细数据表
- ✅ 要：
  1. 先返回核心KPI摘要（消耗、激活数、ROI）
  2. 提供深入选项："需要查看详细数据，可以回复：① ''媒体维度''：各媒体投放明细 ② ''时间趋势''：每小时/每日数据变化 ③ ''转化漏斗''：激活→注册→付费转化"

**错误恢复与重试机制**
- 工具调用失败时
  - ✅ 不要直接暴露技术错误（如"数据库连接失败"）
  - ✅ 用户友好提示："数据暂时无法加载，正在尝试重新获取..." 或 "数据更新中，请稍后重试。您也可以先查询其他时间段的数据"

- 参数验证失败
  - ✅ 告知具体问题 + 修正建议："时间范围格式不正确，请使用：''2026-03-01'' 格式或自然语言（如''昨天''）"

### 15.9 数据精度与格式友好性

**大数值数据**
- 例：消耗1234567.89元
- ✅ 友好格式化："123.46万元" 或 "1,234,567.89元"

**小数位精度**
- ✅ 统一保留2位小数："ROI: 1.23"（而非1.23456789）

**百分比显示**
- ✅ 自动添加%符号："留存率: 45.6%"（而非0.456）

## 十六、Agent行为规范

### 16.1 禁止的行为

❌ 绝对禁止：
- 随意补全未指定的可选参数
- 返回错误数据或编造数据
- 直接返回技术错误信息给用户
- 忽略用户的明确要求
- 一次性返回超大数据集导致超时
- 递归调用工具导致死循环

### 16.2 必须的行为

✅ 必须遵守：
- 无法理解时主动追问，不瞎猜
- 超出能力时提供替代方案，不直接拒绝
- 数据为空时友善说明原因，不返回空列表
- 工具失败时降级处理，不中断服务
- 查询结果过大时分批返回，不阻塞

### 16.3 推荐的行为

⭐ 最佳实践：
- 返回数据时提供数据解读和洞察
- 提供后续操作的快捷选项（如"需要查看详细数据吗？"）
- 使用表格和图表呈现复杂数据
- 标注关键数据的异常点或趋势
- 提供数据导出建议（如"可导出为Excel进一步分析"）

## 十七、友好性检查清单

在返回任何结果前，问自己以下问题：

- [ ] 我是否真的理解了用户的意图？（如不确定，先追问）
- [ ] 我补全的参数是否都是用户明确指定的？
- [ ] 如果工具失败，我有降级方案吗？
- [ ] 数据为空时，我是否解释了原因？
- [ ] 数据量很大时，我是否提供了摘要或分批方案？
- [ ] 用户可能需要什么后续操作？我是否提供了选项？
- [ ] 我的回复是否使用了自然语言而非技术术语？
- [ ] 我是否提供了替代方案，而不是直接说"不支持"？

**只有所有问题都是 ✓，才能返回结果给用户。**
', 1, 11, '广告-日周月报', '2026-03-25 22:12:09', '2026-03-27 21:54:08');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'get_retention_report', '1、这里是各个游戏详细的各种新用户留存率数据\n
            2、支持每日的次日留存率，3日留存率，4日留存率……30日留存率，45日留存率，60日留存率，以及90,120,150,180,210,240,270300,330,360日留存率查询\n
            3、支持按日、周、月三个粒度输出 （通过dateTypeq切换）\n
            4、通过参数data_switch可以切换不同的留存率，目前支持：新设备新账号留存、新设备留存、新账号留存、创角留存、回流留存、首次付费留存\n
            5、支持渠道（channel）、操作系统（os_type）, 分包（cpsid）筛选\n
            6、大部分需要详细留存率的数据都从这个接口出\n
            7、广告相关留存率这里不能查', 0, 12, '', '2026-03-25 22:12:09', '2026-03-27 13:44:35');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'get_ad_roi_report', '# BI报表MCP工具 - 广告ROI接口说明


文档版本：V2.1
更新日期：2026-03-28
维护方：数据部团队

---

## 一、基本信息

| 项目 | 说明 |
|------|------|
| 接口名称 | ROI日报（项目天指标-混合归因） |
| Tool名称 | get_ad_roi_report |
| 描述 | 广告投放ROI分析报表，提供区间ROI、累计ROI、付费金额等核心指标，支持日报、周报、月报三种时间粒度，覆盖D1-D360的完整ROI分析体系 |
| 业务领域 | 广告投放 |
| 版本号 | V2.1（内部版本） |
| 更新频率 | 20分钟 |
| 默认时间范围 | last_7_days |
| 最早可用日期 | 2025-01-01 |
| 最晚可用日期 | 可查当日数据 |
| 数据范围 | 仅限广告业务数据，包含市场推广、智投分包推广、其它 |

---

### 1.1 归因口径说明

#### 混合归因定义

混合归因是指采用多种归因方式混合计算来衡量广告效果，包括：
- 包体归因：根据应用包体信息进行归因
- 点击归因：根据点击行为进行归因
- 媒体自归因：媒体平台自身提供的归因数据
- 其他归因方式：根据业务需求支持的其他归因维度

#### 平台归因口径

| 平台类型 | 归因口径 |
|----------|----------|
| iOS | 按点击归因统计 |
| Android | 按包体归因统计 |
| HARMONY | 按包体归因统计 |

### 1.2 数据更新说明
- 更新频率：20分钟
- 数据范围限制：仅包含广告业务数据，不包含以下数据：
- ❌ 联运渠道非广告数据
- ❌ 未在智投登记的非广告包数据

---

## 二、核心功能

### 2.1 时间粒度获取（dateType）

| 粒度类型 | 参数值 | 说明 | start/end格式要求 |
|----------|--------|------|-------------------|
| 日报 | DAY | 按自然日聚合数据，每日一条记录，支持D1-D360日ROI | yyyy-MM-dd，如 2026-03-13 ~ 2026-03-26 |
| 周报 | NATURAL_WEEK | 按自然周（周一至周日）聚合数据，支持W1-W52周ROI | 日期范围需包含完整周 |
| 月报 | NATURAL_MONTH | 按自然月聚合数据，支持M1-M36月ROI | 日期范围需包含完整月 |

### 2.2 ROI类型（dataType）

| ROI类型 | 参数值 | 说明 |
|---------|--------|------|
| 区间ROI | section | 按固定区间计算ROI，如D1、D7、D30等特定时间点的ROI |
| 累计ROI | total | 计算累计ROI，从注册开始到指定日期的累计投资回报 |

### 2.3 维度切换

支持以下分析维度的切换：
- 应用类型：按平台类型分组（安卓、iOS、微信小游戏、抖音小游戏等）
- 媒体：按投放媒体渠道分组
- 团队：按投放团队分组
- 应用类型+团队：交叉维度分组
- 应用类型+媒体：交叉维度分组

---

## 三、参数列表

| 参数ID | 参数名称 | 描述 | 排序 | 是否必填 | 格式/示例 |
|--------|---------|------|------|---------|----------|
| appId | 游戏应用ID | 游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId | 0 | 是 | "123456789" |
| start | 开始日期 | 查询开始日期，格式 yyyy-MM-dd，包含该日数据 | 1 | 是 | "2026-03-16" |
| end | 结束日期 | 查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 start 间隔不超过90天 | 2 | 是 | "2026-03-26" |
| dataType | ROI类型 | ROI类型：区间ROI(section)、累计ROI(total) | 3 | 是 | section / total |
| dateType | 报表类型 | 报表类型：日报(DAY)、周报(NATURAL_WEEK)、月报(NATURAL_MONTH) | 4 | 是 | DAY / NATURAL_WEEK / NATURAL_MONTH |
| mediaId | 媒体ID筛选 | 媒体ID筛选，可先尝试通过 list_media 接口获取实际code | 5 | 否 | "10001,10002" |
| appPackageType | 应用类型 | 应用类型筛选："ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC"等 | 6 | 否 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" |
| organic | 是否包含自然量 | 是否包含自然量：是(1)、否(0) | 7 | 否 | 1 (包含) / 0 (不包含) |
| subGroup | 报表类型 | 报表类型：应用类型(appPackageType)、媒体(mediaid)、团队(teamids)、应用类型+团队、应用类型+媒体等 | 8 | 否 | appPackageType / mediaid / teamids / appPackageType,teamids / appPackageType,mediaid |

---

## 四、可用维度（返回字段中的分组维度）

| 维度字段名称 | 描述 | 值示例 |
|-------------|------|--------|
| dt | 数据日期 | "2026-03-26" |
| app_id | 广告项目ID | "123456789" |
| appPackageType | 应用类型 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" |
| mediaid | 媒体ID | "10001" (巨量引擎) / "10002" (腾讯广告) |
| teamids | 所属团队 | "team001" |

---

## 五、可用指标（返回字段中的业务指标）

### 5.1 ROI日报指标

#### 5.1.1 拉新指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| composite_act_cnt | 激活设备数 | 拉新指标 | 混合归因下的激活设备总数 | 个 |
| composite_reg_cnt | 注册数 | 拉新指标 | 混合归因下的注册用户总数 | 个 |
| cost_amount | 消耗 | 拉新指标 | 广告投放总消耗 | 元 |
| rebate_cost_amount | 折后消耗 | 拉新指标 | 折后广告投放总消耗 | 元 |
| composite_start_total_pay_amount | 累计付费金额 | 拉新指标 | 累计用户付费金额总和 | 元 |
| composite_start_total_roi_rate | 累计ROI | 拉新指标 | 累计投资回报率 | % |

#### 5.1.2 ROI指标（D1-D360日ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| roi1_rate | 首日ROI | 拉新指标 | 第1天投资回报率 | % |
| roi2_rate | 2日ROI | 拉新指标 | 第2天投资回报率 | % |
| roi3_rate | 3日ROI | 拉新指标 | 第3天投资回报率 | % |
| roi4_rate | 4日ROI | 拉新指标 | 第4天投资回报率 | % |
| roi5_rate | 5日ROI | 拉新指标 | 第5天投资回报率 | % |
| roi6_rate | 6日ROI | 拉新指标 | 第6天投资回报率 | % |
| roi7_rate | 7日ROI | 拉新指标 | 第7天投资回报率 | % |
| roi8_rate | 8日ROI | 拉新指标 | 第8天投资回报率 | % |
| roi9_rate | 9日ROI | 拉新指标 | 第9天投资回报率 | % |
| roi10_rate | 10日ROI | 拉新指标 | 第10天投资回报率 | % |
| roi11_rate | 11日ROI | 拉新指标 | 第11天投资回报率 | % |
| roi12_rate | 12日ROI | 拉新指标 | 第12天投资回报率 | % |
| roi13_rate | 13日ROI | 拉新指标 | 第13天投资回报率 | % |
| roi14_rate | 14日ROI | 拉新指标 | 第14天投资回报率 | % |
| roi15_rate | 15日ROI | 拉新指标 | 第15天投资回报率 | % |
| roi16_rate | 16日ROI | 拉新指标 | 第16天投资回报率 | % |
| roi17_rate | 17日ROI | 拉新指标 | 第17天投资回报率 | % |
| roi18_rate | 18日ROI | 拉新指标 | 第18天投资回报率 | % |
| roi19_rate | 19日ROI | 拉新指标 | 第19天投资回报率 | % |
| roi20_rate | 20日ROI | 拉新指标 | 第20天投资回报率 | % |
| roi21_rate | 21日ROI | 拉新指标 | 第21天投资回报率 | % |
| roi22_rate | 22日ROI | 拉新指标 | 第22天投资回报率 | % |
| roi23_rate | 23日ROI | 拉新指标 | 第23天投资回报率 | % |
| roi24_rate | 24日ROI | 拉新指标 | 第24天投资回报率 | % |
| roi25_rate | 25日ROI | 拉新指标 | 第25天投资回报率 | % |
| roi26_rate | 26日ROI | 拉新指标 | 第26天投资回报率 | % |
| roi27_rate | 27日ROI | 拉新指标 | 第27天投资回报率 | % |
| roi28_rate | 28日ROI | 拉新指标 | 第28天投资回报率 | % |
| roi29_rate | 29日ROI | 拉新指标 | 第29天投资回报率 | % |
| roi30_rate | 30日ROI | 拉新指标 | 第30天投资回报率 | % |
| roi45_rate | 45日ROI | 拉新指标 | 第45天投资回报率 | % |
| roi60_rate | 60日ROI | 拉新指标 | 第60天投资回报率 | % |
| roi75_rate | 75日ROI | 拉新指标 | 第75天投资回报率 | % |
| roi90_rate | 90日ROI | 拉新指标 | 第90天投资回报率 | % |
| roi120_rate | 120日ROI | 拉新指标 | 第120天投资回报率 | % |
| roi150_rate | 150日ROI | 拉新指标 | 第150天投资回报率 | % |
| roi180_rate | 180日ROI | 拉新指标 | 第180天投资回报率 | % |
| roi210_rate | 210日ROI | 拉新指标 | 第210天投资回报率 | % |
| roi240_rate | 240日ROI | 拉新指标 | 第240天投资回报率 | % |
| roi270_rate | 270日ROI | 拉新指标 | 第270天投资回报率 | % |
| roi300_rate | 300日ROI | 拉新指标 | 第300天投资回报率 | % |
| roi330_rate | 330日ROI | 拉新指标 | 第330天投资回报率 | % |
| roi360_rate | 360日ROI | 拉新指标 | 第360天投资回报率 | % |

#### 5.1.3 付费金额指标（D1-D30日付费金额）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| composite_pay_d1_amount | 首日付费金额 | 拉新指标 | 第1天用户付费金额 | 元 |
| composite_pay_d2_amount | 2日付费金额 | 拉新指标 | 第2天用户付费金额 | 元 |
| composite_pay_d3_amount | 3日付费金额 | 拉新指标 | 第3天用户付费金额 | 元 |
| composite_pay_d4_amount | 4日付费金额 | 拉新指标 | 第4天用户付费金额 | 元 |
| composite_pay_d5_amount | 5日付费金额 | 拉新指标 | 第5天用户付费金额 | 元 |
| composite_pay_d6_amount | 6日付费金额 | 拉新指标 | 第6天用户付费金额 | 元 |
| composite_pay_d7_amount | 7日付费金额 | 拉新指标 | 第7天用户付费金额 | 元 |
| composite_pay_d8_amount | 8日付费金额 | 拉新指标 | 第8天用户付费金额 | 元 |
| composite_pay_d9_amount | 9日付费金额 | 拉新指标 | 第9天用户付费金额 | 元 |
| composite_pay_d10_amount | 10日付费金额 | 拉新指标 | 第10天用户付费金额 | 元 |
| composite_pay_d11_amount | 11日付费金额 | 拉新指标 | 第11天用户付费金额 | 元 |
| composite_pay_d12_amount | 12日付费金额 | 拉新指标 | 第12天用户付费金额 | 元 |
| composite_pay_d13_amount | 13日付费金额 | 拉新指标 | 第13天用户付费金额 | 元 |
| composite_pay_d14_amount | 14日付费金额 | 拉新指标 | 第14天用户付费金额 | 元 |
| composite_pay_d15_amount | 15日付费金额 | 拉新指标 | 第15天用户付费金额 | 元 |
| composite_pay_d16_amount | 16日付费金额 | 拉新指标 | 第16天用户付费金额 | 元 |
| composite_pay_d17_amount | 17日付费金额 | 拉新指标 | 第17天用户付费金额 | 元 |
| composite_pay_d18_amount | 18日付费金额 | 拉新指标 | 第18天用户付费金额 | 元 |
| composite_pay_d19_amount | 19日付费金额 | 拉新指标 | 第19天用户付费金额 | 元 |
| composite_pay_d20_amount | 20日付费金额 | 拉新指标 | 第20天用户付费金额 | 元 |
| composite_pay_d21_amount | 21日付费金额 | 拉新指标 | 第21天用户付费金额 | 元 |
| composite_pay_d22_amount | 22日付费金额 | 拉新指标 | 第22天用户付费金额 | 元 |
| composite_pay_d23_amount | 23日付费金额 | 拉新指标 | 第23天用户付费金额 | 元 |
| composite_pay_d24_amount | 24日付费金额 | 拉新指标 | 第24天用户付费金额 | 元 |
| composite_pay_d25_amount | 25日付费金额 | 拉新指标 | 第25天用户付费金额 | 元 |
| composite_pay_d26_amount | 26日付费金额 | 拉新指标 | 第26天用户付费金额 | 元 |
| composite_pay_d27_amount | 27日付费金额 | 拉新指标 | 第27天用户付费金额 | 元 |
| composite_pay_d28_amount | 28日付费金额 | 拉新指标 | 第28天用户付费金额 | 元 |
| composite_pay_d29_amount | 29日付费金额 | 拉新指标 | 第29天用户付费金额 | 元 |
| composite_pay_d30_amount | 30日付费金额 | 拉新指标 | 第30天用户付费金额 | 元 |

#### 5.1.4 现金指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| cash_cost_amount | 现金消耗 | 现金指标 | 现金投放消耗 | 元 |
| rebate_cash_cost_amount | 现金折后消耗 | 现金指标 | 折后现金投放消耗 | 元 |
| composite_start_total_roi_cash_rate | 现金累计ROI | 现金指标 | 现金累计投资回报率 | % |

#### 5.1.5 现金ROI指标（D1-D360日现金ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| cash_roi1_rate | 现金首日ROI | 现金指标 | 第1天现金投资回报率 | % |
| cash_roi2_rate | 现金2日ROI | 现金指标 | 第2天现金投资回报率 | % |
| cash_roi3_rate | 现金3日ROI | 现金指标 | 第3天现金投资回报率 | % |
| cash_roi4_rate | 现金4日ROI | 现金指标 | 第4天现金投资回报率 | % |
| cash_roi5_rate | 现金5日ROI | 现金指标 | 第5天现金投资回报率 | % |
| cash_roi6_rate | 现金6日ROI | 现金指标 | 第6天现金投资回报率 | % |
| cash_roi7_rate | 现金7日ROI | 现金指标 | 第7天现金投资回报率 | % |
| cash_roi8_rate | 现金8日ROI | 现金指标 | 第8天现金投资回报率 | % |
| cash_roi9_rate | 现金9日ROI | 现金指标 | 第9天现金投资回报率 | % |
| cash_roi10_rate | 现金10日ROI | 现金指标 | 第10天现金投资回报率 | % |
| cash_roi11_rate | 现金11日ROI | 现金指标 | 第11天现金投资回报率 | % |
| cash_roi12_rate | 现金12日ROI | 现金指标 | 第12天现金投资回报率 | % |
| cash_roi13_rate | 现金13日ROI | 现金指标 | 第13天现金投资回报率 | % |
| cash_roi14_rate | 现金14日ROI | 现金指标 | 第14天现金投资回报率 | % |
| cash_roi15_rate | 现金15日ROI | 现金指标 | 第15天现金投资回报率 | % |
| cash_roi16_rate | 现金16日ROI | 现金指标 | 第16天现金投资回报率 | % |
| cash_roi17_rate | 现金17日ROI | 现金指标 | 第17天现金投资回报率 | % |
| cash_roi18_rate | 现金18日ROI | 现金指标 | 第18天现金投资回报率 | % |
| cash_roi19_rate | 现金19日ROI | 现金指标 | 第19天现金投资回报率 | % |
| cash_roi20_rate | 现金20日ROI | 现金指标 | 第20天现金投资回报率 | % |
| cash_roi21_rate | 现金21日ROI | 现金指标 | 第21天现金投资回报率 | % |
| cash_roi22_rate | 现金22日ROI | 现金指标 | 第22天现金投资回报率 | % |
| cash_roi23_rate | 现金23日ROI | 现金指标 | 第23天现金投资回报率 | % |
| cash_roi24_rate | 现金24日ROI | 现金指标 | 第24天现金投资回报率 | % |
| cash_roi25_rate | 现金25日ROI | 现金指标 | 第25天现金投资回报率 | % |
| cash_roi26_rate | 现金26日ROI | 现金指标 | 第26天现金投资回报率 | % |
| cash_roi27_rate | 现金27日ROI | 现金指标 | 第27天现金投资回报率 | % |
| cash_roi28_rate | 现金28日ROI | 现金指标 | 第28天现金投资回报率 | % |
| cash_roi29_rate | 现金29日ROI | 现金指标 | 第29天现金投资回报率 | % |
| cash_roi30_rate | 现金30日ROI | 现金指标 | 第30天现金投资回报率 | % |
| cash_roi45_rate | 现金45日ROI | 现金指标 | 第45天现金投资回报率 | % |
| cash_roi60_rate | 现金60日ROI | 现金指标 | 第60天现金投资回报率 | % |
| cash_roi75_rate | 现金75日ROI | 现金指标 | 第75天现金投资回报率 | % |
| cash_roi90_rate | 现金90日ROI | 现金指标 | 第90天现金投资回报率 | % |
| cash_roi120_rate | 现金120日ROI | 现金指标 | 第120天现金投资回报率 | % |
| cash_roi150_rate | 现金150日ROI | 现金指标 | 第150天现金投资回报率 | % |
| cash_roi180_rate | 现金180日ROI | 现金指标 | 第180天现金投资回报率 | % |
| cash_roi210_rate | 现金210日ROI | 现金指标 | 第210天现金投资回报率 | % |
| cash_roi240_rate | 现金240日ROI | 现金指标 | 第240天现金投资回报率 | % |
| cash_roi270_rate | 现金270日ROI | 现金指标 | 第270天现金投资回报率 | % |
| cash_roi300_rate | 现金300日ROI | 现金指标 | 第300天现金投资回报率 | % |
| cash_roi330_rate | 现金330日ROI | 现金指标 | 第330天现金投资回报率 | % |
| cash_roi360_rate | 现金360日ROI | 现金指标 | 第360天现金投资回报率 | % |

### 5.2 ROI周报指标

#### 5.2.1 拉新指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| composite_act_cnt | 激活设备数 | 拉新指标 | 混合归因下的激活设备总数 | 个 |
| composite_reg_cnt | 注册数 | 拉新指标 | 混合归因下的注册用户总数 | 个 |
| cost_amount | 消耗 | 拉新指标 | 广告投放总消耗 | 元 |
| rebate_cost_amount | 折后消耗 | 拉新指标 | 折后广告投放总消耗 | 元 |
| composite_start_total_pay_amount | 累计付费金额 | 拉新指标 | 累计用户付费金额总和 | 元 |
| composite_start_total_roi_rate | 累计ROI | 拉新指标 | 累计投资回报率 | % |

#### 5.2.2 周ROI指标（W1-W52周ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| w_roi1_rate | 首周ROI | 拉新指标 | 第1周投资回报率 | % |
| w_roi2_rate | 2周ROI | 拉新指标 | 第2周投资回报率 | % |
| w_roi3_rate | 3周ROI | 拉新指标 | 第3周投资回报率 | % |
| w_roi4_rate | 4周ROI | 拉新指标 | 第4周投资回报率 | % |
| w_roi5_rate | 5周ROI | 拉新指标 | 第5周投资回报率 | % |
| w_roi6_rate | 6周ROI | 拉新指标 | 第6周投资回报率 | % |
| w_roi7_rate | 7周ROI | 拉新指标 | 第7周投资回报率 | % |
| w_roi8_rate | 8周ROI | 拉新指标 | 第8周投资回报率 | % |
| w_roi9_rate | 9周ROI | 拉新指标 | 第9周投资回报率 | % |
| w_roi10_rate | 10周ROI | 拉新指标 | 第10周投资回报率 | % |
| w_roi11_rate | 11周ROI | 拉新指标 | 第11周投资回报率 | % |
| w_roi12_rate | 12周ROI | 拉新指标 | 第12周投资回报率 | % |
| w_roi13_rate | 13周ROI | 拉新指标 | 第13周投资回报率 | % |
| w_roi14_rate | 14周ROI | 拉新指标 | 第14周投资回报率 | % |
| w_roi15_rate | 15周ROI | 拉新指标 | 第15周投资回报率 | % |
| w_roi16_rate | 16周ROI | 拉新指标 | 第16周投资回报率 | % |
| w_roi17_rate | 17周ROI | 拉新指标 | 第17周投资回报率 | % |
| w_roi18_rate | 18周ROI | 拉新指标 | 第18周投资回报率 | % |
| w_roi19_rate | 19周ROI | 拉新指标 | 第19周投资回报率 | % |
| w_roi20_rate | 20周ROI | 拉新指标 | 第20周投资回报率 | % |
| w_roi21_rate | 21周ROI | 拉新指标 | 第21周投资回报率 | % |
| w_roi22_rate | 22周ROI | 拉新指标 | 第22周投资回报率 | % |
| w_roi23_rate | 23周ROI | 拉新指标 | 第23周投资回报率 | % |
| w_roi24_rate | 24周ROI | 拉新指标 | 第24周投资回报率 | % |
| w_roi25_rate | 25周ROI | 拉新指标 | 第25周投资回报率 | % |
| w_roi26_rate | 26周ROI | 拉新指标 | 第26周投资回报率 | % |
| w_roi27_rate | 27周ROI | 拉新指标 | 第27周投资回报率 | % |
| w_roi28_rate | 28周ROI | 拉新指标 | 第28周投资回报率 | % |
| w_roi29_rate | 29周ROI | 拉新指标 | 第29周投资回报率 | % |
| w_roi30_rate | 30周ROI | 拉新指标 | 第30周投资回报率 | % |
| w_roi31_rate | 31周ROI | 拉新指标 | 第31周投资回报率 | % |
| w_roi32_rate | 32周ROI | 拉新指标 | 第32周投资回报率 | % |
| w_roi33_rate | 33周ROI | 拉新指标 | 第33周投资回报率 | % |
| w_roi34_rate | 34周ROI | 拉新指标 | 第34周投资回报率 | % |
| w_roi35_rate | 35周ROI | 拉新指标 | 第35周投资回报率 | % |
| w_roi36_rate | 36周ROI | 拉新指标 | 第36周投资回报率 | % |
| w_roi37_rate | 37周ROI | 拉新指标 | 第37周投资回报率 | % |
| w_roi38_rate | 38周ROI | 拉新指标 | 第38周投资回报率 | % |
| w_roi39_rate | 39周ROI | 拉新指标 | 第39周投资回报率 | % |
| w_roi40_rate | 40周ROI | 拉新指标 | 第40周投资回报率 | % |
| w_roi41_rate | 41周ROI | 拉新指标 | 第41周投资回报率 | % |
| w_roi42_rate | 42周ROI | 拉新指标 | 第42周投资回报率 | % |
| w_roi43_rate | 43周ROI | 拉新指标 | 第43周投资回报率 | % |
| w_roi44_rate | 44周ROI | 拉新指标 | 第44周投资回报率 | % |
| w_roi45_rate | 45周ROI | 拉新指标 | 第45周投资回报率 | % |
| w_roi46_rate | 46周ROI | 拉新指标 | 第46周投资回报率 | % |
| w_roi47_rate | 47周ROI | 拉新指标 | 第47周投资回报率 | % |
| w_roi48_rate | 48周ROI | 拉新指标 | 第48周投资回报率 | % |
| w_roi49_rate | 49周ROI | 拉新指标 | 第49周投资回报率 | % |
| w_roi50_rate | 50周ROI | 拉新指标 | 第50周投资回报率 | % |
| w_roi51_rate | 51周ROI | 拉新指标 | 第51周投资回报率 | % |
| w_roi52_rate | 52周ROI | 拉新指标 | 第52周投资回报率 | % |

#### 5.2.3 现金指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| cash_cost_amount | 现金消耗 | 现金指标 | 现金投放消耗 | 元 |
| rebate_cash_cost_amount | 现金折后消耗 | 现金指标 | 折后现金投放消耗 | 元 |
| composite_start_total_roi_cash_rate | 现金累计ROI | 现金指标 | 现金累计投资回报率 | % |

#### 5.2.4 周现金ROI指标（W1-W52周现金ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| w_cash_roi1_rate | 现金首周ROI | 现金指标 | 第1周现金投资回报率 | % |
| w_cash_roi2_rate | 现金2周ROI | 现金指标 | 第2周现金投资回报率 | % |
| w_cash_roi3_rate | 现金3周ROI | 现金指标 | 第3周现金投资回报率 | % |
| w_cash_roi4_rate | 现金4周ROI | 现金指标 | 第4周现金投资回报率 | % |
| w_cash_roi5_rate | 现金5周ROI | 现金指标 | 第5周现金投资回报率 | % |
| w_cash_roi6_rate | 现金6周ROI | 现金指标 | 第6周现金投资回报率 | % |
| w_cash_roi7_rate | 现金7周ROI | 现金指标 | 第7周现金投资回报率 | % |
| w_cash_roi8_rate | 现金8周ROI | 现金指标 | 第8周现金投资回报率 | % |
| w_cash_roi9_rate | 现金9周ROI | 现金指标 | 第9周现金投资回报率 | % |
| w_cash_roi10_rate | 现金10周ROI | 现金指标 | 第10周现金投资回报率 | % |
| w_cash_roi11_rate | 现金11周ROI | 现金指标 | 第11周现金投资回报率 | % |
| w_cash_roi12_rate | 现金12周ROI | 现金指标 | 第12周现金投资回报率 | % |
| w_cash_roi13_rate | 现金13周ROI | 现金指标 | 第13周现金投资回报率 | % |
| w_cash_roi14_rate | 现金14周ROI | 现金指标 | 第14周现金投资回报率 | % |
| w_cash_roi15_rate | 现金15周ROI | 现金指标 | 第15周现金投资回报率 | % |
| w_cash_roi16_rate | 现金16周ROI | 现金指标 | 第16周现金投资回报率 | % |
| w_cash_roi17_rate | 现金17周ROI | 现金指标 | 第17周现金投资回报率 | % |
| w_cash_roi18_rate | 现金18周ROI | 现金指标 | 第18周现金投资回报率 | % |
| w_cash_roi19_rate | 现金19周ROI | 现金指标 | 第19周现金投资回报率 | % |
| w_cash_roi20_rate | 现金20周ROI | 现金指标 | 第20周现金投资回报率 | % |
| w_cash_roi21_rate | 现金21周ROI | 现金指标 | 第21周现金投资回报率 | % |
| w_cash_roi22_rate | 现金22周ROI | 现金指标 | 第22周现金投资回报率 | % |
| w_cash_roi23_rate | 现金23周ROI | 现金指标 | 第23周现金投资回报率 | % |
| w_cash_roi24_rate | 现金24周ROI | 现金指标 | 第24周现金投资回报率 | % |
| w_cash_roi25_rate | 现金25周ROI | 现金指标 | 第25周现金投资回报率 | % |
| w_cash_roi26_rate | 现金26周ROI | 现金指标 | 第26周现金投资回报率 | % |
| w_cash_roi27_rate | 现金27周ROI | 现金指标 | 第27周现金投资回报率 | % |
| w_cash_roi28_rate | 现金28周ROI | 现金指标 | 第28周现金投资回报率 | % |
| w_cash_roi29_rate | 现金29周ROI | 现金指标 | 第29周现金投资回报率 | % |
| w_cash_roi30_rate | 现金30周ROI | 现金指标 | 第30周现金投资回报率 | % |
| w_cash_roi31_rate | 现金31周ROI | 现金指标 | 第31周现金投资回报率 | % |
| w_cash_roi32_rate | 现金32周ROI | 现金指标 | 第32周现金投资回报率 | % |
| w_cash_roi33_rate | 现金33周ROI | 现金指标 | 第33周现金投资回报率 | % |
| w_cash_roi34_rate | 现金34周ROI | 现金指标 | 第34周现金投资回报率 | % |
| w_cash_roi35_rate | 现金35周ROI | 现金指标 | 第35周现金投资回报率 | % |
| w_cash_roi36_rate | 现金36周ROI | 现金指标 | 第36周现金投资回报率 | % |
| w_cash_roi37_rate | 现金37周ROI | 现金指标 | 第37周现金投资回报率 | % |
| w_cash_roi38_rate | 现金38周ROI | 现金指标 | 第38周现金投资回报率 | % |
| w_cash_roi39_rate | 现金39周ROI | 现金指标 | 第39周现金投资回报率 | % |
| w_cash_roi40_rate | 现金40周ROI | 现金指标 | 第40周现金投资回报率 | % |
| w_cash_roi41_rate | 现金41周ROI | 现金指标 | 第41周现金投资回报率 | % |
| w_cash_roi42_rate | 现金42周ROI | 现金指标 | 第42周现金投资回报率 | % |
| w_cash_roi43_rate | 现金43周ROI | 现金指标 | 第43周现金投资回报率 | % |
| w_cash_roi44_rate | 现金44周ROI | 现金指标 | 第44周现金投资回报率 | % |
| w_cash_roi45_rate | 现金45周ROI | 现金指标 | 第45周现金投资回报率 | % |
| w_cash_roi46_rate | 现金46周ROI | 现金指标 | 第46周现金投资回报率 | % |
| w_cash_roi47_rate | 现金47周ROI | 现金指标 | 第47周现金投资回报率 | % |
| w_cash_roi48_rate | 现金48周ROI | 现金指标 | 第48周现金投资回报率 | % |
| w_cash_roi49_rate | 现金49周ROI | 现金指标 | 第49周现金投资回报率 | % |
| w_cash_roi50_rate | 现金50周ROI | 现金指标 | 第50周现金投资回报率 | % |
| w_cash_roi51_rate | 现金51周ROI | 现金指标 | 第51周现金投资回报率 | % |
| w_cash_roi52_rate | 现金52周ROI | 现金指标 | 第52周现金投资回报率 | % |

### 5.3 ROI月报指标

#### 5.3.1 拉新指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| composite_act_cnt | 激活设备数 | 拉新指标 | 混合归因下的激活设备总数 | 个 |
| composite_reg_cnt | 注册数 | 拉新指标 | 混合归因下的注册用户总数 | 个 |
| cost_amount | 消耗 | 拉新指标 | 广告投放总消耗 | 元 |
| rebate_cost_amount | 折后消耗 | 拉新指标 | 折后广告投放总消耗 | 元 |
| composite_start_total_pay_amount | 累计付费金额 | 拉新指标 | 累计用户付费金额总和 | 元 |
| composite_start_total_roi_rate | 累计ROI | 拉新指标 | 累计投资回报率 | % |

#### 5.3.2 月ROI指标（M1-M36月ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| m_roi1_rate | 首月ROI | 拉新指标 | 第1月投资回报率 | % |
| m_roi2_rate | 2月ROI | 拉新指标 | 第2月投资回报率 | % |
| m_roi3_rate | 3月ROI | 拉新指标 | 第3月投资回报率 | % |
| m_roi4_rate | 4月ROI | 拉新指标 | 第4月投资回报率 | % |
| m_roi5_rate | 5月ROI | 拉新指标 | 第5月投资回报率 | % |
| m_roi6_rate | 6月ROI | 拉新指标 | 第6月投资回报率 | % |
| m_roi7_rate | 7月ROI | 拉新指标 | 第7月投资回报率 | % |
| m_roi8_rate | 8月ROI | 拉新指标 | 第8月投资回报率 | % |
| m_roi9_rate | 9月ROI | 拉新指标 | 第9月投资回报率 | % |
| m_roi10_rate | 10月ROI | 拉新指标 | 第10月投资回报率 | % |
| m_roi11_rate | 11月ROI | 拉新指标 | 第11月投资回报率 | % |
| m_roi12_rate | 12月ROI | 拉新指标 | 第12月投资回报率 | % |
| m_roi13_rate | 13月ROI | 拉新指标 | 第13月投资回报率 | % |
| m_roi14_rate | 14月ROI | 拉新指标 | 第14月投资回报率 | % |
| m_roi15_rate | 15月ROI | 拉新指标 | 第15月投资回报率 | % |
| m_roi16_rate | 16月ROI | 拉新指标 | 第16月投资回报率 | % |
| m_roi17_rate | 17月ROI | 拉新指标 | 第17月投资回报率 | % |
| m_roi18_rate | 18月ROI | 拉新指标 | 第18月投资回报率 | % |
| m_roi19_rate | 19月ROI | 拉新指标 | 第19月投资回报率 | % |
| m_roi20_rate | 20月ROI | 拉新指标 | 第20月投资回报率 | % |
| m_roi21_rate | 21月ROI | 拉新指标 | 第21月投资回报率 | % |
| m_roi22_rate | 22月ROI | 拉新指标 | 第22月投资回报率 | % |
| m_roi23_rate | 23月ROI | 拉新指标 | 第23月投资回报率 | % |
| m_roi24_rate | 24月ROI | 拉新指标 | 第24月投资回报率 | % |
| m_roi25_rate | 25月ROI | 拉新指标 | 第25月投资回报率 | % |
| m_roi26_rate | 26月ROI | 拉新指标 | 第26月投资回报率 | % |
| m_roi27_rate | 27月ROI | 拉新指标 | 第27月投资回报率 | % |
| m_roi28_rate | 28月ROI | 拉新指标 | 第28月投资回报率 | % |
| m_roi29_rate | 29月ROI | 拉新指标 | 第29月投资回报率 | % |
| m_roi30_rate | 30月ROI | 拉新指标 | 第30月投资回报率 | % |
| m_roi31_rate | 31月ROI | 拉新指标 | 第31月投资回报率 | % |
| m_roi32_rate | 32月ROI | 拉新指标 | 第32月投资回报率 | % |
| m_roi33_rate | 33月ROI | 拉新指标 | 第33月投资回报率 | % |
| m_roi34_rate | 34月ROI | 拉新指标 | 第34月投资回报率 | % |
| m_roi35_rate | 35月ROI | 拉新指标 | 第35月投资回报率 | % |
| m_roi36_rate | 36月ROI | 拉新指标 | 第36月投资回报率 | % |

#### 5.3.3 现金指标

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| cash_cost_amount | 现金消耗 | 现金指标 | 现金投放消耗 | 元 |
| rebate_cash_cost_amount | 现金折后消耗 | 现金指标 | 折后现金投放消耗 | 元 |
| composite_start_total_roi_cash_rate | 现金累计ROI | 现金指标 | 现金累计投资回报率 | % |

#### 5.3.4 月现金ROI指标（M1-M36月现金ROI）

| 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 |
|-------------|-----------|----------|------|------|
| m_cash_roi1_rate | 现金首月ROI | 现金指标 | 第1月现金投资回报率 | % |
| m_cash_roi2_rate | 现金2月ROI | 现金指标 | 第2月现金投资回报率 | % |
| m_cash_roi3_rate | 现金3月ROI | 现金指标 | 第3月现金投资回报率 | % |
| m_cash_roi4_rate | 现金4月ROI | 现金指标 | 第4月现金投资回报率 | % |
| m_cash_roi5_rate | 现金5月ROI | 现金指标 | 第5月现金投资回报率 | % |
| m_cash_roi6_rate | 现金6月ROI | 现金指标 | 第6月现金投资回报率 | % |
| m_cash_roi7_rate | 现金7月ROI | 现金指标 | 第7月现金投资回报率 | % |
| m_cash_roi8_rate | 现金8月ROI | 现金指标 | 第8月现金投资回报率 | % |
| m_cash_roi9_rate | 现金9月ROI | 现金指标 | 第9月现金投资回报率 | % |
| m_cash_roi10_rate | 现金10月ROI | 现金指标 | 第10月现金投资回报率 | % |
| m_cash_roi11_rate | 现金11月ROI | 现金指标 | 第11月现金投资回报率 | % |
| m_cash_roi12_rate | 现金12月ROI | 现金指标 | 第12月现金投资回报率 | % |
| m_cash_roi13_rate | 现金13月ROI | 现金指标 | 第13月现金投资回报率 | % |
| m_cash_roi14_rate | 现金14月ROI | 现金指标 | 第14月现金投资回报率 | % |
| m_cash_roi15_rate | 现金15月ROI | 现金指标 | 第15月现金投资回报率 | % |
| m_cash_roi16_rate | 现金16月ROI | 现金指标 | 第16月现金投资回报率 | % |
| m_cash_roi17_rate | 现金17月ROI | 现金指标 | 第17月现金投资回报率 | % |
| m_cash_roi18_rate | 现金18月ROI | 现金指标 | 第18月现金投资回报率 | % |
| m_cash_roi19_rate | 现金19月ROI | 现金指标 | 第19月现金投资回报率 | % |
| m_cash_roi20_rate | 现金20月ROI | 现金指标 | 第20月现金投资回报率 | % |
| m_cash_roi21_rate | 现金21月ROI | 现金指标 | 第21月现金投资回报率 | % |
| m_cash_roi22_rate | 现金22月ROI | 现金指标 | 第22月现金投资回报率 | % |
| m_cash_roi23_rate | 现金23月ROI | 现金指标 | 第23月现金投资回报率 | % |
| m_cash_roi24_rate | 现金24月ROI | 现金指标 | 第24月现金投资回报率 | % |
| m_cash_roi25_rate | 现金25月ROI | 现金指标 | 第25月现金投资回报率 | % |
| m_cash_roi26_rate | 现金26月ROI | 现金指标 | 第26月现金投资回报率 | % |
| m_cash_roi27_rate | 现金27月ROI | 现金指标 | 第27月现金投资回报率 | % |
| m_cash_roi28_rate | 现金28月ROI | 现金指标 | 第28月现金投资回报率 | % |
| m_cash_roi29_rate | 现金29月ROI | 现金指标 | 第29月现金投资回报率 | % |
| m_cash_roi30_rate | 现金30月ROI | 现金指标 | 第30月现金投资回报率 | % |
| m_cash_roi31_rate | 现金31月ROI | 现金指标 | 第31月现金投资回报率 | % |
| m_cash_roi32_rate | 现金32月ROI | 现金指标 | 第32月现金投资回报率 | % |
| m_cash_roi33_rate | 现金33月ROI | 现金指标 | 第33月现金投资回报率 | % |
| m_cash_roi34_rate | 现金34月ROI | 现金指标 | 第34月现金投资回报率 | % |
| m_cash_roi35_rate | 现金35月ROI | 现金指标 | 第35月现金投资回报率 | % |
| m_cash_roi36_rate | 现金36月ROI | 现金指标 | 第36月现金投资回报率 | % |

### 5.4 指标使用说明

#### 5.4.1 ROI计算公式

- ROI = (累计付费金额 / 投放消耗) × 100%
- 现金ROI = (累计付费金额 / 现金消耗) × 100%
- 区分普通消耗和现金消耗，可以更准确地评估真实的现金回报

#### 5.4.2 ROI类型差异

| ROI类型 | 参数值 | 说明 |
|---------|--------|------|
| 区间ROI | section | 按固定时间区间（D1、D7、D30等）计算ROI，用于快速评估短期回本能力 |
| 累计ROI | total | 计算从注册开始到指定日期的累计ROI，用于评估长期投资回报 |

#### 5.4.3 ROI窗口选择建议

| 时间区间 | ROI窗口 | 业务场景 | 关注重点 |
|----------|----------|----------|----------|
| 短期ROI | D1-D7 | 评估初期回本能力 | 首日ROI、7日ROI |
| 中期ROI | D14-D30（W2-W4） | 评估中期盈利能力 | 14日ROI、30日ROI、4周ROI |
| 长期ROI | D60-D180（W9-W26） | 评估长期盈利能力 | 60日ROI、180日ROI、26周ROI |
| 超长期ROI | D210-D360（W30-W52、M7-M12） | 评估年度战略 | 360日ROI、52周ROI、12月ROI |

#### 5.4.4 维度字段使用建议
1. 日期（dt）：按日聚合，用于趋势分析
2. 媒体（mediaid）：对比不同广告平台的ROI表现，优化投放策略
3. 应用类型（appPackageType）：对比不同应用类型的ROI表现
4. 团队（teamids）：团队间ROI对比，评估团队运营效果

---

## 六、注意事项

### 6.1 权限与认证
- 需使用内部授权的API Token进行访问
- Token有效期根据公司安全策略，过期需重新申请

### 6.2 数据时效性
- 更新频率：20分钟
- 数据延迟：当日数据在T+1凌晨2点后完整可用
- 实时数据：包含当日实时数据

### 6.3 限制与约束
- 单次查询时间范围最长支持90天
- 单次返回数据最多支持1000条记录
- 并发请求限制：同一应用每秒最多10次请求
- 维度组合限制：最多支持2个维度同时分组

### 6.4 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查参数格式、必填项是否完整 |
| 401 | 未授权 | Token无效或已过期，需重新获取 |
| 403 | 权限不足 | 无该应用的数据访问权限 |
| 429 | 请求超频 | 降低请求频率，避免超过并发限制 |
| 500 | 服务器错误 | 联系技术支持 |

---

## 七、最佳实践

### 7.1 查询优化建议
1. 合理设置时间范围：避免一次性查询过长时间范围，建议单次不超过30天
2. 使用维度筛选：通过mediaId等参数缩小数据范围，提高查询效率
3. 分页查询：大数据量时使用分页参数，避免超时

### 7.2 数据使用建议
1. 优先查看首日ROI：首日ROI是评估广告初期表现的核心指标，建议重点关注
2. 对比不同ROI类型：通过切换 dataType 对比区间ROI和累计ROI，全面评估回本能力
3. 关注现金ROI：现金ROI更准确地反映真实现金回报，建议结合普通ROI一起分析
4. 按维度细分分析：通过 subGroup 参数按媒体、团队等维度细分，找出表现优异和需优化的渠道
5. 关注长期ROI：长期ROI（D180-D360、W26-W52、M7-M12）更能反映产品的真实盈利能力

### 7.3 监控与告警
- 建议设置ROI异常告警（如首日ROI低于阈值时触发）
- 定期对比不同媒体渠道的ROI表现，优化投放策略
- 监控现金ROI与普通ROI的差异，评估优惠券等激励政策的效果
- 定期校验数据口径，确保与内部BI系统一致

---

## 附录：参数速查表

| 用途 | 参数组合 |
|------|----------|
| 日报ROI查询 | appId + start + end + dataType + dateType=DAY |
| 区间ROI查询 | appId + start + end + dataType=section + dateType=DAY |
| 累计ROI查询 | appId + start + end + dataType=total + dateType=DAY |
| 按媒体细分 | appId + start + end + dataType + dateType + subGroup=mediaid |
| 按团队细分 | appId + start + end + dataType + dateType + subGroup=teamids |
| 周报ROI查询 | appId + start + end + dataType + dateType=NATURAL_WEEK |
| 月报ROI查询 | appId + start + end + dataType + dateType=NATURAL_MONTH |

---


文档版本：V2.1 更新日期：2026-04-01 维护方：数据部团队', 1, 12, '广告-ROI报表', '2026-03-25 22:12:09', '2026-04-01 15:37:04');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'get_ad_retention_report', '# BI报表MCP工具 - 广告留存接口说明  **文档版本：V1.2** **更新日期：2026-03-26** **维护方：数据部团队**  ---  ## 一、基本信息  | 项目 | 说明 | |------|------| | 接口名称 | 项目留存指标表-混合归因 | | Tool名称 | get_ad_retention_report | | 描述 | 广告项目留存指标报表，围绕新增、设备留存、首日付费留存等口径提供D2~D180等窗口留存指标，支持项目、媒体、活动、素材维度分析 | | 业务领域 | 广告投放 | | 版本号 | V1.2（内部版本） | | 更新频率 | 20分钟 | | 默认时间范围 | last_7_days | | 最早可用日期 | 2025-01-01 | | 最晚可用日期 | 可查当日数据 | | 数据范围 | 仅限广告业务数据，包含市场推广、智投分包推广、其它 |  ---  ### 1.1 归因口径说明  #### 混合归因定义 混合归因是指采用多种归因方式混合计算来衡量广告效果，包括： - **包体归因**：根据应用包体信息进行归因 - **点击归因**：根据点击行为进行归因 - **媒体自归因**：媒体平台自身提供的归因数据 - **其他归因方式**：根据业务需求支持的其他归因维度  #### 平台归因口径  | 平台类型 | 归因口径 | |----------|----------| | iOS | 按点击归因统计 | | Android | 按包体归因统计 | | HARMONY | 按包体归因统计 |  ### 1.2 数据更新说明  - **更新频率**：20分钟 - **数据范围限制**：仅包含广告业务数据，不包含以下数据： - ❌ 联运渠道非广告数据 - ❌ 未在智投登记的非广告包数据  ---  ## 二、核心功能  ### 2.1 时间粒度获取（dateType）  | 粒度类型 | 参数值 | 说明 | start/end格式要求 | |----------|--------|------|-------------------| | 日报 | DAY | 按自然日聚合数据，每日一条记录 | yyyy-MM-dd，如 2026-03-13 ~ 2026-03-26 | | 周报 | NATURAL_WEEK | 按自然周（周一至周日）聚合数据 | 日期范围需包含完整周 | | 月报 | NATURAL_MONTH | 按自然月聚合数据 | 日期范围需包含完整月 |  ### 2.2 留存类型（dataType）  | 留存类型 | 参数值 | 说明 | |----------|--------|------| | 新增设备留存 | DEVICE_RETENTION | 以新增设备数为基数计算的留存指标 | | 注册用户留存 | REG_RETENTION | 以注册用户数为基数计算的留存指标 | | 首日付费账号留存 | PAY_D1_RETENTION | 以首日付费账号数为基数计算的留存指标 |  ### 2.3 维度切换  支持以下分析维度的切换： - **应用类型**：按应用类型分组（安卓、iOS、微信小游戏、抖音小游戏等） - **媒体**：按投放媒体渠道分组 - **团队**：按投放团队分组 - **应用类型+团队**：交叉维度分组 - **应用类型+媒体**：交叉维度分组  ---  ## 三、参数列表  | 参数ID | 参数名称 | 描述 | 排序 | 是否必填 | 格式/示例 | |--------|---------|------|------|---------|----------| | appId | 游戏应用ID | 指定查询的游戏应用标识，数字类型字符串 | 0 | 是 | "123456789" | | start | 开始日期 | 查询起始日期，格式 yyyy-MM-dd | 1 | 是 | "2026-03-16" | | end | 结束日期 | 查询结束日期，格式 yyyy-MM-dd | 2 | 是 | "2026-03-26" | | dataType | 留存类型 | 留存类型：新增设备留存、注册用户留存、首日付费账号留存 | 3 | 是 | DEVICE_RETENTION / REG_RETENTION / PAY_D1_RETENTION | | dateType | 报表类型 | 报表类型：日报、周报、月报 | 4 | 是 | DAY / NATURAL_WEEK / NATURAL_MONTH | | appPackageType | 应用类型 | 应用类型（安卓、IOS、微信小游戏、抖音小游戏等） | 5 | 否 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" | | mediaId | 媒体ID | 媒体ID过滤，数字类型，多个媒体用逗号分割 | 6 | 否 | "10001,10002" 或 10001,10002 | | organic | 是否包含自然量 | 是否包含自然量：是(1)、否(0) | 7 | 否 | 1 (包含) / 0 (不包含) | | teamids | 团队ID | 团队ID过滤，数字类型，多个媒体用逗号分割，可先尝试通过 list_team 接口获取实际code | 8 | 否 | "team001" | | subGroup | 报表类型 | 报表类型：应用类型(app_package_type)、媒体(media_id)、团队(team_ids)、应用类型+团队(DAY)、应用类型+媒体(NATUR... | 9 | 否 | appPackageType / mediaid / teamids / appPackageType,teamids / appPackageType,mediaid |  ---  ## 四、可用维度（返回字段中的分组维度）  | 维度字段名称 | 描述 | 值示例 | |-------------|------|--------| | dt | 数据日期 | "2026-03-26" | | app_id | 游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId | "123456789" | | appPackageType | 应用类型 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" | | mediaid | 媒体ID筛选，可先尝试通过 list_media 接口获取实际code | "10001" (巨量引擎) / "10002" (腾讯广告) | | teamids | 团队ID过滤，数字类型，多个媒体用逗号分割，可先尝试通过 list_team 接口获取实际code | "team001" |  ---  ## 五、可用指标（返回字段中的业务指标）  ### 5.1 拉新指标  #### 5.1.1 新增指标  | 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 | |-------------|-----------|----------|------|------| | composite_incr_cnt | 总新增数 | 拉新指标 | 混合归因下的新增用户总数 | 个 |  #### 5.1.2 留存率指标（D2-D360）  | 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 | |-------------|-----------|----------|------|------| | composite_retention_d2_rate | 次留率 | 拉新指标 | 第2天留存率 | % | | composite_retention_d3_rate | 3日留存率 | 拉新指标 | 第3天留存率 | % | | composite_retention_d4_rate | 4日留存率 | 拉新指标 | 第4天留存率 | % | | composite_retention_d5_rate | 5日留存率 | 拉新指标 | 第5天留存率 | % | | composite_retention_d6_rate | 6日留存率 | 拉新指标 | 第6天留存率 | % | | composite_retention_d7_rate | 7日留存率 | 拉新指标 | 第7天留存率 | % | | composite_retention_d8_rate | 8日留存率 | 拉新指标 | 第8天留存率 | % | | composite_retention_d9_rate | 9日留存率 | 拉新指标 | 第9天留存率 | % | | composite_retention_d10_rate | 10日留存率 | 拉新指标 | 第10天留存率 | % | | composite_retention_d11_rate | 11日留存率 | 拉新指标 | 第11天留存率 | % | | composite_retention_d12_rate | 12日留存率 | 拉新指标 | 第12天留存率 | % | | composite_retention_d13_rate | 13日留存率 | 拉新指标 | 第13天留存率 | % | | composite_retention_d14_rate | 14日留存率 | 拉新指标 | 第14天留存率 | % | | composite_retention_d15_rate | 15日留存率 | 拉新指标 | 第15天留存率 | % | | composite_retention_d16_rate | 16日留存率 | 拉新指标 | 第16天留存率 | % | | composite_retention_d17_rate | 17日留存率 | 拉新指标 | 第17天留存率 | % | | composite_retention_d18_rate | 18日留存率 | 拉新指标 | 第18天留存率 | % | | composite_retention_d19_rate | 19日留存率 | 拉新指标 | 第19天留存率 | % | | composite_retention_d20_rate | 20日留存率 | 拉新指标 | 第20天留存率 | % | | composite_retention_d21_rate | 21日留存率 | 拉新指标 | 第21天留存率 | % | | composite_retention_d22_rate | 22日留存率 | 拉新指标 | 第22天留存率 | % | | composite_retention_d23_rate | 23日留存率 | 拉新指标 | 第23天留存率 | % | | composite_retention_d24_rate | 24日留存率 | 拉新指标 | 第24天留存率 | % | | composite_retention_d25_rate | 25日留存率 | 拉新指标 | 第25天留存率 | % | | composite_retention_d26_rate | 26日留存率 | 拉新指标 | 第26天留存率 | % | | composite_retention_d27_rate | 27日留存率 | 拉新指标 | 第27天留存率 | % | | composite_retention_d28_rate | 28日留存率 | 拉新指标 | 第28天留存率 | % | | composite_retention_d29_rate | 29日留存率 | 拉新指标 | 第29天留存率 | % | | composite_retention_d30_rate | 30日留存率 | 拉新指标 | 第30天留存率 | % | | composite_retention_d45_rate | 45日留存率 | 拉新指标 | 第45天留存率 | % | | composite_retention_d60_rate | 60日留存率 | 拉新指标 | 第60天留存率 | % | | composite_retention_d75_rate | 75日留存率 | 拉新指标 | 第75天留存率 | % | | composite_retention_d90_rate | 90日留存率 | 拉新指标 | 第90天留存率 | % | | composite_retention_d120_rate | 120日留存率 | 拉新指标 | 第120天留存率 | % | | composite_retention_d150_rate | 150日留存率 | 拉新指标 | 第150天留存率 | % | | composite_retention_d180_rate | 180日留存率 | 拉新指标 | 第180天留存率 | % | | composite_retention_d210_rate | 210日留存率 | 拉新指标 | 第210天留存率 | % | | composite_retention_d240_rate | 240日留存率 | 拉新指标 | 第240天留存率 | % | | composite_retention_d270_rate | 270日留存率 | 拉新指标 | 第270天留存率 | % | | composite_retention_d300_rate | 300日留存率 | 拉新指标 | 第300天留存率 | % | | composite_retention_d330_rate | 330日留存率 | 拉新指标 | 第330天留存率 | % | | composite_retention_d360_rate | 360日留存率 | 拉新指标 | 第360天留存率 | % |  #### 5.1.3 留存数指标（D2-D360）  | 指标字段名称 | 指标中文名 | 指标分类 | 说明 | 单位 | |-------------|-----------|----------|------|------| | composite_retention_d2_cnt | 2日留存数 | 拉新指标 | 第2天留存用户数 | 个 | | composite_retention_d3_cnt | 3日留存数 | 拉新指标 | 第3天留存用户数 | 个 | | composite_retention_d4_cnt | 4日留存数 | 拉新指标 | 第4天留存用户数 | 个 | | composite_retention_d5_cnt | 5日留存数 | 拉新指标 | 第5天留存用户数 | 个 | | composite_retention_d6_cnt | 6日留存数 | 拉新指标 | 第6天留存用户数 | 个 | | composite_retention_d7_cnt | 7日留存数 | 拉新指标 | 第7天留存用户数 | 个 | | composite_retention_d8_cnt | 8日留存数 | 拉新指标 | 第8天留存用户数 | 个 | | composite_retention_d9_cnt | 9日留存数 | 拉新指标 | 第9天留存用户数 | 个 | | composite_retention_d10_cnt | 10日留存数 | 拉新指标 | 第10天留存用户数 | 个 | | composite_retention_d11_cnt | 11日留存数 | 拉新指标 | 第11天留存用户数 | 个 | | composite_retention_d12_cnt | 12日留存数 | 拉新指标 | 第12天留存用户数 | 个 | | composite_retention_d13_cnt | 13日留存数 | 拉新指标 | 第13天留存用户数 | 个 | | composite_retention_d14_cnt | 14日留存数 | 拉新指标 | 第14天留存用户数 | 个 | | composite_retention_d15_cnt | 15日留存数 | 拉新指标 | 第15天留存用户数 | 个 | | composite_retention_d16_cnt | 16日留存数 | 拉新指标 | 第16天留存用户数 | 个 | | composite_retention_d17_cnt | 17日留存数 | 拉新指标 | 第17天留存用户数 | 个 | | composite_retention_d18_cnt | 18日留存数 | 拉新指标 | 第18天留存用户数 | 个 | | composite_retention_d19_cnt | 19日留存数 | 拉新指标 | 第19天留存用户数 | 个 | | composite_retention_d20_cnt | 20日留存数 | 拉新指标 | 第20天留存用户数 | 个 | | composite_retention_d21_cnt | 21日留存数 | 拉新指标 | 第21天留存用户数 | 个 | | composite_retention_d22_cnt | 22日留存数 | 拉新指标 | 第22天留存用户数 | 个 | | composite_retention_d23_cnt | 23日留存数 | 拉新指标 | 第23天留存用户数 | 个 | | composite_retention_d24_cnt | 24日留存数 | 拉新指标 | 第24天留存用户数 | 个 | | composite_retention_d25_cnt | 25日留存数 | 拉新指标 | 第25天留存用户数 | 个 | | composite_retention_d26_cnt | 26日留存数 | 拉新指标 | 第26天留存用户数 | 个 | | composite_retention_d27_cnt | 27日留存数 | 拉新指标 | 第27天留存用户数 | 个 | | composite_retention_d28_cnt | 28日留存数 | 拉新指标 | 第28天留存用户数 | 个 | | composite_retention_d29_cnt | 29日留存数 | 拉新指标 | 第29天留存用户数 | 个 | | composite_retention_d30_cnt | 30日留存数 | 拉新指标 | 第30天留存用户数 | 个 | | composite_retention_d45_cnt | 45日留存数 | 拉新指标 | 第45天留存用户数 | 个 | | composite_retention_d60_cnt | 60日留存数 | 拉新指标 | 第60天留存用户数 | 个 | | composite_retention_d75_cnt | 75日留存数 | 拉新指标 | 第75天留存用户数 | 个 | | composite_retention_d90_cnt | 90日留存数 | 拉新指标 | 第90天留存用户数 | 个 | | composite_retention_d120_cnt | 120日留存数 | 拉新指标 | 第120天留存用户数 | 个 | | composite_retention_d150_cnt | 150日留存数 | 拉新指标 | 第150天留存用户数 | 个 | | composite_retention_d180_cnt | 180日留存数 | 拉新指标 | 第180天留存用户数 | 个 | | composite_retention_d210_cnt | 210日留存数 | 拉新指标 | 第210天留存用户数 | 个 | | composite_retention_d240_cnt | 240日留存数 | 拉新指标 | 第240天留存用户数 | 个 | | composite_retention_d270_cnt | 270日留存数 | 拉新指标 | 第270天留存用户数 | 个 | | composite_retention_d300_cnt | 300日留存数 | 拉新指标 | 第300天留存用户数 | 个 | | composite_retention_d330_cnt | 330日留存数 | 拉新指标 | 第330天留存用户数 | 个 | | composite_retention_d360_cnt | 360日留存数 | 拉新指标 | 第360天留存用户数 | 个 |  ### 5.2 基础指标与维度字段  | 维度字段名称 | 指标中文名 | 指标分类 | 说明 | 示例 | |-------------|-----------|----------|------|------| | dt | 日期 | 拉新指标 | 数据日期 | "2026-03-26" | | mediaid | 媒体 | 拉新指标 | 投放媒体ID | "10001" | | appPackageType | 应用类型 | 拉新指标 | 应用平台类型 | "ANDROID" / "IOS" / "HARMONY" / "ALIPAY" / "DOUYIN" / "KUAISHOU" / "BILIBILI" / "WEB" / "PC" | | teamids | 所属团队 | 基础指标 | 团队ID | "team001" |  ### 5.3 指标使用说明  #### 5.3.1 留存率计算公式 - **留存率 = 留存数 / 总新增数 × 100%** - 根据不同的 dataType 计算基数： - DEVICE_RETENTION：新增设备数 - REG_RETENTION：注册用户数 - PAY_D1_RETENTION：首日付费账号数  #### 5.3.2 留存类型差异  | 留存类型 | 参数值 | 计算基数 | 业务含义 | |----------|--------|----------|----------| | 新增设备留存 | DEVICE_RETENTION | 激活设备数 | 从设备级别衡量用户留存情况 | | 注册用户留存 | REG_RETENTION | 注册用户数 | 从用户账号级别衡量留存情况 | | 首日付费账号留存 | PAY_D1_RETENTION | 首日付费账号数 | 衡量付费用户的长期留存和LTV |  #### 5.3.3 留存窗口选择建议  | 时间区间 | 留存窗口 | 业务场景 | 关注重点 | |----------|----------|----------|----------| | 短期留存 | D2-D7 | 产品初期体验优化 | 用户引导、新手流程、核心玩法 | | 中期留存 | D14-D60 | 内容迭代与功能完善 | 核心玩法深度、社交互动、活动运营 | | 长期留存 | D90-D180 | 产品生命周期管理 | 长期用户价值、版本迭代策略 | | 超长期留存 | D210-D360 | 年度战略规划 | 品牌忠诚度、市场竞争力 |  #### 5.3.4 维度字段使用建议 1. **日期（dt）**：按日聚合，用于趋势分析 2. **媒体（mediaid）**：对比不同广告平台的留存表现，优化投放策略 3. **应用类型（appPackageType）**：对比不同应用类型的留存表现 4. **团队（teamids）**：团队间留存对比，评估团队运营效果  ---  ## 六、使用示例  ### 6.1 获取日报留存数据（新增设备留存）  **请求示例：** ```http GET /api/mcp/v1/report/retention?appId=123456789&start=2026-03-16&end=2026-03-26&dataType=DEVICE_RETENTION&dateType=DAY Headers: Authorization: Bearer {your_token} Content-Type: application/json ```  **参数说明：** - appId=123456789：查询应用ID为123456789的数据 - start=2026-03-16 & end=2026-03-26：查询2026-03-16至2026-03-26共11天的数据 - dataType=DEVICE_RETENTION：查询新增设备留存 - dateType=DAY：获取日报数据 - appPackageType=ANDROID：只查询Android端数据  ### 6.2 获取周报留存数据（注册用户留存）  **请求示例：** ```http GET /api/mcp/v1/report/retention?appId=123456789&start=2026-03-01&end=2026-03-31&dataType=REG_RETENTION&dateType=NATURAL_WEEK Headers: Authorization: Bearer {your_token} Content-Type: application/json ```  **参数说明：** - dataType=REG_RETENTION：查询注册用户留存 - dateType=NATURAL_WEEK：获取周报数据  ### 6.3 获取月报留存数据（首日付费账号留存）  **请求示例：** ```http GET /api/mcp/v1/report/retention?appId=123456789&start=2026-01-01&end=2026-03-31&dataType=PAY_D1_RETENTION&dateType=NATURAL_MONTH Headers: Authorization: Bearer {your_token} Content-Type: application/json ```  **参数说明：** - dataType=PAY_D1_RETENTION：查询首日付费账号留存 - dateType=NATURAL_MONTH：获取月报数据  ### 6.4 按媒体维度细分  **请求示例：** ```http GET /api/mcp/v1/report/retention?appId=123456789&start=2026-03-16&end=2026-03-26&dataType=DEVICE_RETENTION&dateType=DAY&subGroup=media_id&mediaId=1001,1002 Headers: Authorization: Bearer {your_token} Content-Type: application/json ```  **参数说明：** - subGroup=mediaid：按媒体维度细分 - mediaId=10001,10002：筛选媒体ID为10001和10002的数据  ### 6.5 按活动维度筛选  **请求示例：** ```http GET /api/mcp/v1/report/retention?appId=123456789&start=2026-03-16&end=2026-03-26&dataType=DEVICE_RETENTION&dateType=DAY&attrCampaignName=活动A Headers: Authorization: Bearer {your_token} Content-Type: application/json ```  **参数说明：** - attrCampaignName=活动A：筛选监测活动名称为"活动A"的数据  ---  ## 七、返回数据示例  ### 7.1 留存数据返回示例  ```json { "code": 0, "message": "success", "data": [ { "dt": "2026-03-16", "app_id": "123456789", "app_package_type": "正式包", "media_id": "1001", "os_type": "ANDROID", "retention_type": "设备留存", "composite_incr_cnt": 1000, "retention_d2_cnt": 600, "retention_d2_rate": "60.00%", "retention_d3_cnt": 550, "retention_d3_rate": "55.00%", "retention_d7_cnt": 400, "retention_d7_rate": "40.00%", "retention_d14_cnt": 300, "retention_d14_rate": "30.00%", "retention_d30_cnt": 200, "retention_d30_rate": "20.00%", "retention_d60_cnt": 150, "retention_d60_rate": "15.00%", "retention_d90_cnt": 100, "retention_d90_rate": "10.00%", "retention_d120_cnt": 80, "retention_d120_rate": "8.00%", "retention_d150_cnt": 60, "retention_d150_rate": "6.00%", "retention_d180_cnt": 50, "retention_d180_rate": "5.00%" } // ... 其他日期数据 ] } ```  ### 7.2 字段说明  | 字段 | 类型 | 说明 | |------|------|------| | code | Integer | 响应状态码，0表示成功 | | message | String | 响应消息 | | data | Array | 按时间粒度的明细数据列表 | | data[ ].dt | String | 数据日期（yyyy-MM-dd） | | data[ ].retention_type | String | 留存类型 |  ---  ## 八、注意事项  ### 8.1 权限与认证 - 需使用内部授权的API Token进行访问 - Token有效期根据公司安全策略，过期需重新申请  ### 8.2 数据时效性 - **更新频率**：20分钟 - **数据延迟**：当日数据在T+1凌晨2点后完整可用 - **实时数据**：包含当日实时数据  ### 8.3 限制与约束 - 单次查询时间范围最长支持90天 - 单次返回数据最多支持1000条记录 - 并发请求限制：同一应用每秒最多10次请求 - 维度组合限制：最多支持2个维度同时分组  ### 8.4 常见错误码  | 错误码 | 说明 | 解决方案 | |--------|------|----------| | 400 | 参数错误 | 检查参数格式、必填项是否完整 | | 401 | 未授权 | Token无效或已过期，需重新获取 | | 403 | 权限不足 | 无该应用的数据访问权限 | | 429 | 请求超频 | 降低请求频率，避免超过并发限制 | | 500 | 服务器错误 | 联系技术支持 |  ---  ## 九、最佳实践  ### 9.1 查询优化建议 1. **合理设置时间范围**：避免一次性查询过长时间范围，建议单次不超过30天 2. **使用维度筛选**：通过mediaId等参数缩小数据范围，提高查询效率 3. **分页查询**：大数据量时使用分页参数，避免超时  ### 9.2 数据使用建议 1. **优先查看留存率**：留存率是衡量产品健康度的核心指标，建议重点关注D7、D30、D90留存 2. **对比不同留存类型**：通过切换 dataType 对比设备留存、用户留存、付费用户留存，全面评估产品表现 3. **按维度细分分析**：通过 subGroup 参数按媒体、团队等维度细分，找出表现优异和需优化的渠道 4. **关注长期留存**：长期留存（D90-D180）更能反映产品的真实用户粘性  ### 9.3 监控与告警 - 建议设置留存率异常告警（如D7留存率低于阈值时触发） - 定期对比不同媒体渠道的留存表现，优化投放策略 - 监控付费用户留存，重点关注高价值用户的长期留存情况 - 定期校验数据口径，确保与内部BI系统一致  ---  ## 附录：参数速查表  | 用途 | 参数组合 | |------|----------| | 日报留存查询 | appId + start + end + dataType + dateType=DAY | | 新增设备留存 | appId + start + end + dataType=DEVICE_RETENTION + dateType=DAY | | 注册用户留存 | appId + start + end + dataType=REG_RETENTION + dateType=DAY | | 首日付费账号留存 | appId + start + end + dataType=PAY_D1_RETENTION + dateType=DAY | | 按媒体细分 | appId + start + end + dataType + dateType + subGroup=mediaid | | 按团队细分 | appId + start + end + dataType + dateType + subGroup=team_ids | | 周报留存查询 | appId + start + end + dataType + dateType=NATURAL_WEEK | | 月报留存查询 | appId + start + end + dataType + dateType=NATURAL_MONTH |  ---  **文档版本：V1.2** **更新日期：2026-03-26** **维护方：数据部团队**', 1, 14, '广告-留存分析', '2026-03-25 22:12:09', '2026-04-01 16:20:06');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.AiadService#get_current_time', 'get_current_time', '获取当前真实时间（用于回答今天日期、当前时间等问题）', 1, 20, '元数据-获取系统时间', '2026-03-25 22:12:09', '2026-03-26 19:11:09');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdAppsTool#tool', 'list_apps', '# 项目维度表（list_apps）使用说明

> **版本**：V2.1 | **Tool名称**：`list_apps` | **更新频率**：实时

---

## 一、接口基本信息

| 项目 | 说明 |
|------|------|
| 接口名称 | 项目维度表 |
| Tool名称 | list_apps |
| 描述 | 获取平台的项目列表，返回所有可用的项目信息，包含appId、appName等字段，支持精确匹配和模糊匹配 |
| 业务领域 | 广告业务域、游戏运营域、数据分析域、其他所有查询场景的前置接口 |
| 版本号 | V2.1 |
| 更新频率 | 实时 |
| 数据范围 | 包含所有拥有权限的项目，支持手游、页游、H5游戏、端游、主机游戏等多种类型 |

---

## 二、接口定位

### 2.1 核心作用

**项目维度表是前置接口**，用于获取用户拥有权限的项目列表。

**关键特性**：其他所有报表接口都需要先调用此接口获取正确的 `appId`，才能进行后续的数据查询。

### 2.2 服务范围

服务于所有查询场景：
- **广告业务域**：广告投放、数据分析、效果监控
- **游戏运营域**：游戏数据查询、用户行为分析、运营指标监控
- **数据分析域**：各类报表查询、数据挖掘、趋势分析
- **其他场景**：所有需要项目信息作为前置条件的查询

---

## 三、术语说明

| 术语 | 说明 |
|------|------|
| **项目** | 系统内部主数据，统一称呼（包含手游、页游、H5游戏等所有类型） |
| **游戏** | 用户的业务用语，指代"游戏类项目"，在用户场景下等同于"项目" |
| **应用** | 技术用语，指代具体的App，与"项目"同义 |
| **appId** | 项目ID，唯一标识一个项目 |
| **appName** | 项目名称 |

> **注意**：在系统内部统一使用"项目"作为主术语，但在与用户交互时，可以理解"游戏"即为"项目"。

---

## 四、返回字段说明

### 4.1 核心业务字段

| 字段名称 | 类型 | 必填 | 说明 | 示例 |
|---------|------|------|------|------|
| **appId** | varchar(32) | 是 | 应用ID（项目ID），唯一标识一个应用 | "10100002" |
| **appName** | varchar(512) | 是 | 应用名称（游戏/项目名称），可能是全称或简称 | "三国杀OL"、"西游"、"X2game-日本" |
| **appRegion** | varchar(32) | 否 | 应用投放地区 | "MAINLAND"（中国大陆）、"OVERSEAS"（海外） |
| **thirdPartAppTypes** | varchar(1024) | 否 | 第三方平台应用类型，支持多种类型，用于类型筛选 | "手游"、"页游"、"H5游戏"、"手游,页游,H5游戏" |
| **mfAppId** | varchar(256) | 否 | 魔方AppId，内部主档应用ID | "205_695,205_205,205_204,205_203,205_217" |
| **spMultiTeam** | tinyint(4) | 否 | 是否支持多团队：1是，0否 | 1 / 0 |

### 4.2 字段取值说明

**appRegion（地区）字段取值**

| 取值 | 说明 |
|------|------|
| MAINLAND | 中国大陆 |
| OVERSEAS | 海外地区 |

**thirdPartAppTypes（项目类型）字段常见取值**

| 取值 | 说明 |
|------|------|
| 手游 | 手机游戏 |
| 页游 | 网页游戏 |
| H5游戏 | HTML5游戏 |
| 端游 | PC端游戏 |
| 主机游戏 | 主机平台游戏 |

---

## 五、查询规则与匹配策略

### 5.1 核心原则

**匹配优先级**（按顺序执行）：

1. ✅ **第一优先级：精确匹配（100%匹配）** → 直接返回结果
2. ✅ **第二优先级：模糊匹配** → 必须返回列表让用户确认
3. ❌ **绝对禁止**：补全、猜测意图、联想和推荐

### 5.2 匹配规则详解

#### 第一优先级：精确匹配

**规则**：用户输入的名称与 `appName` 字段完全一致（不区分大小写）

**示例**：
- 用户输入 "三国杀OL" → 精确匹配 → 返回 appId="10100002"
- 用户输入 "X2game-日本" → 精确匹配 → 返回 appId="10700027"
- 用户输入 "里世界-海外全球" → 精确匹配 → 返回 appId="10200071"

#### 第二优先级：模糊匹配

**规则**：用户输入的关键词在 `appName` 或 `app_alias` 中出现

**重要限制**：
- 模糊匹配不管找到1个还是多个候选，**必须返回给用户确认**
- 模糊匹配都失败，也需要返回友好性提示

**示例**：
- 用户输入 "三国" → 模糊匹配 appName 包含"三国" → 返回候选列表让用户确认
- 用户输入 "X2game" → 模糊匹配 appName 或 app_alias 包含"X2game" → 返回候选列表让用户确认
- 用户输入 "里世界" → 模糊匹配 appName 包含"里世界" → 返回候选列表让用户确认

### 5.3 歧义处理规则

**核心原则**：多匹配结果时必须停止流程，返回候选列表

**场景1：有多个相似项目**

**示例**：
- 项目列表：["三国志", "三国志1", "三国志2"]
- 用户输入："三国志"

**处理规则**：
1. 精确匹配失败（没有完全匹配"三国志"的项目）
2. 模糊匹配 → 找到3个候选：["三国志", "三国志1", "三国志2"]
3. **必须返回候选列表让用户确认**

**返回示例**：
```json
{
  "code": 0,
  "message": "ambiguous_match",
  "data": [
    {
      "appId": "100001",
      "appName": "三国志",
      "matchType": "fuzzy",
      "matchScore": 0.9
    },
    {
      "appId": "100002",
      "appName": "三国志1",
      "matchType": "fuzzy",
      "matchScore": 0.85
    },
    {
      "appId": "100003",
      "appName": "三国志2",
      "matchType": "fuzzy",
      "matchScore": 0.85
    }
  ],
  "message": "输入''三国志''匹配到多个应用，请选择：1.三国志 2.三国志1 3.三国志2"
}
```

**场景2：只有一个相似项目（非高频别名）**

**示例**：
- 项目列表：["三国志2"]
- 用户输入："三国志"

**处理规则**：
1. 精确匹配失败（没有完全匹配"三国志"的项目）
2. 模糊匹配 → 找到1个候选：["三国志2"]
3. **必须返回候选列表让用户确认**
4. 原因：用户可能要"三国志"，但没有"三国志"的权限，只能返回"三国志2"让用户确认

**场景3：精确匹配成功**

**示例**：
- 项目列表：["三国杀OL"]
- 用户输入："三国杀OL"

**处理规则**：
1. 精确匹配成功 → 返回 appId="10100002"
2. 直接返回结果，无需确认

**返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "appId": "10100002",
    "appName": "三国杀OL",
    "appRegion": "MAINLAND",
    "thirdPartAppTypes": "手游,页游,H5游戏",
    "spMultiTeam": 1,
    "matchType": "exact"
  }
}
```

### 5.4 特殊场景：公司内部简称

**场景描述**：公司内部都叫"指间山海"，用户输入"指间"，其他项目也没有相似的。

**处理规则**：
- 执行模糊匹配 → 只找到"指间山海"一个候选
- 可以直接作为查询结果返回
- **必须标注 matchType="fuzzy"，并提供 matchNote 说明**

**返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "appId": "10300001",
    "appName": "指间山海",
    "appRegion": "MAINLAND",
    "matchType": "fuzzy",
    "matchNote": "输入''指间''匹配到唯一项目''指间山海''"
  }
}
```

---

## 六、查询场景与处理策略

### 6.1 单个查询场景

**场景1：用户输入完整应用名称**

**用户输入**："三国杀OL"

**处理流程**：
1. 执行精确匹配 → 找到 appId="10100002"
2. 返回结果

**场景2：用户输入高频别名**

**用户输入**："指间"

**处理流程**：
1. 精确匹配失败
2. 执行模糊匹配 → 找到唯一候选"指间山海"
3. 判断为高频别名 → 直接返回，标注 matchType="fuzzy"

**场景3：用户输入关键词匹配到多个应用**

**用户输入**："海外"

**处理流程**：
1. 精确匹配失败
2. 执行模糊匹配 → 找到多个应用：
   - appId="10700027"，appName="X2game-日本"
   - appId="10200071"，appName="里世界-海外全球"
   - appId="10200466"，appName="脱敏4"（appRegion="OVERSEAS"）
   - appId="10200445"，appName="脱敏5"（appRegion="OVERSEAS"）
3. 必须返回候选列表让用户确认

**返回示例**：
```json
{
  "code": 0,
  "message": "ambiguous_match",
  "data": [
    {
      "appId": "10700027",
      "appName": "X2game-日本",
      "appRegion": "OVERSEAS",
      "matchType": "fuzzy",
      "matchScore": 0.9
    },
    {
      "appId": "10200071",
      "appName": "里世界-海外全球",
      "appRegion": "OVERSEAS",
      "matchType": "fuzzy",
      "matchScore": 0.8
    },
    {
      "appId": "10200466",
      "appName": "脱敏4",
      "appRegion": "OVERSEAS",
      "matchType": "fuzzy",
      "matchScore": 0.7
    },
    {
      "appId": "10200445",
      "appName": "脱敏5",
      "appRegion": "OVERSEAS",
      "matchType": "fuzzy",
      "matchScore": 0.7
    }
  ],
  "message": "输入''海外''匹配到多个应用，请选择：1.X2game-日本 2.里世界-海外全球 3.脱敏4 4.脱敏5"
}
```

### 6.2 多个查询场景

**场景1：用户输入多个应用名称（用逗号或空格分隔）**

**用户输入**："三国杀OL, X2game-日本"

**处理流程**：
1. 解析输入 → ["三国杀OL", "X2game-日本"]
2. 对每个应用执行匹配流程
3. 返回所有匹配成功的应用

**返回示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "appId": "10100002",
      "appName": "三国杀OL",
      "matchType": "exact"
    },
    {
      "appId": "10700027",
      "appName": "X2game-日本",
      "matchType": "exact"
    }
  ]
}
```

---

## 七、查不到应用场景

### 7.1 场景1：用户输入不存在的关键词

**用户输入**："不存在的游戏"

**处理流程**：
1. 精确匹配失败
2. 模糊匹配失败
3. 必须返回友好性提示

**返回示例**：
```json
{
  "code": 404,
  "message": "app_not_found",
  "data": {
    "userInput": "不存在的游戏",
    "suggestions": [
      "三国杀OL",
      "X2game-日本",
      "里世界-海外全球"
    ],
    "hint": "请尝试使用完整的应用名称、别名或查看应用列表"
  }
}
```

### 7.2 场景2：用户输入太模糊（如"项目"、"游戏"等通用词）

**用户输入**："项目"

**处理流程**：
1. 精确匹配失败
2. 模糊匹配返回大量候选（假设有100+个应用包含"项目"）
3. 必须返回提示信息和分页候选列表

**返回示例**：
```json
{
  "code": 0,
  "message": "too_many_matches",
  "data": {
    "totalMatches": 156,
    "page": 1,
    "pageSize": 10,
    "candidates": [
      {
        "appId": "10100002",
        "appName": "三国杀OL",
        "matchScore": 0.6
      },
      {
        "appId": "10200001",
        "appName": "西游-H5",
        "matchScore": 0.5
      }
      // ... 更多候选
    ]
  },
  "message": "输入''项目''匹配到156个应用，请输入更具体的应用名称或从以下候选中选择"
}
```

---

## 八、AI友好性机制

### 8.1 上下文理解策略

**策略1：对话历史记忆**

记录用户最近查询过的应用，下次查询时优先返回：

```
# 用户先查询"三国杀OL"
# 后续输入"它"、"那个游戏"、"刚才那个"
# 优先返回"三国杀OL"
```

**策略2：地区偏好记忆**

记录用户偏好查询的地区，下次模糊匹配时优先返回该地区的应用：

```
# 用户经常查询"OVERSEAS"地区的游戏
# 用户输入"X2game"
# 优先返回 appRegion="OVERSEAS" 的应用
```

### 8.2 确认机制优先级

**规则**：
- 多匹配结果时必须停止流程，返回候选列表
- 等待用户选择后才继续
- 禁止默认选择第一个项目
- 禁止猜测用户意图

---

## 九、使用示例

### 9.1 广告业务域查询示例

**示例1：查询某项目的广告投放数据**

**场景**：用户需要查询"三国杀OL"项目的广告投放数据

**对话流程**：
```
用户: 查询三国杀OL的广告投放数据

系统处理:
步骤1: 调用 list_apps 接口
步骤2: 执行精确匹配
  - 输入: "三国杀OL"
  - 匹配: appId="10100002", appName="三国杀OL"
步骤3: 返回项目信息
  - appId: "10100002"
  - appName: "三国杀OL"
  - appRegion: "MAINLAND"
  - thirdPartAppTypes: "手游,页游,H5游戏"
步骤4: 使用 appId 查询广告投放数据

返回给用户:
"已为您找到项目''三国杀OL'' (ID: 10100002)，正在查询其广告投放数据..."
```

**示例2：查询海外项目的广告ROI数据**

**场景**：用户需要查询海外游戏项目的ROI数据

**对话流程**：
```
用户: 查询海外游戏的广告ROI数据

系统处理:
步骤1: 调用 list_apps 接口
步骤2: 执行模糊匹配
  - 输入: "海外"
  - 匹配: 找到多个 appRegion="OVERSEAS" 的项目
步骤3: 返回候选列表
  - X2game-日本 (appId: 10700027)
  - 里世界-海外全球 (appId: 10200071)
  - 脱敏4 (appId: 10200466)
步骤4: 提示用户确认

返回给用户:
"找到以下海外项目，请选择要查询的项目：
1. X2game-日本
2. 里世界-海外全球
3. 脱敏4

请回复序号"
```

**示例3：查询项目A和项目B的对比数据**

**场景**：用户需要对比多个项目的运营指标

**对话流程**：
```
用户: 查询项目A和项目B的日活对比数据

系统处理:
步骤1: 解析输入 → ["项目A", "项目B"]
步骤2: 调用 list_apps 接口
步骤3: 分别匹配每个项目
  - "项目A" → appId="20001", appName="项目A"
  - "项目B" → appId="20002", appName="项目B"
步骤4: 返回两个项目的信息
步骤5: 查询两个项目的对比数据

返回给用户:
"已为您找到项目：
1. 项目A (ID: 20001)
2. 项目B (ID: 20002)

正在查询两个项目的日活对比数据..."
```

**示例4：使用高频别名查询**

**场景**：用户使用公司内部简称"指间"查询

**对话流程**：
```
用户: 查询指间的消耗数据

系统处理:
步骤1: 调用 list_apps 接口
步骤2: 执行精确匹配
  - 输入: "指间"
  - 匹配: 精确匹配失败（没有叫"指间"的项目）
步骤3: 执行模糊匹配
  - 输入: "指间"
  - 匹配: 找到唯一候选"指间山海"
步骤4: 判断为高频别名
  - "指间"是公司内部对"指间山海"的通用简称
  - 其他项目没有相似名称
步骤5: 直接返回结果，标注 matchType="fuzzy"

返回给用户:
"已为您找到项目''指间山海'' (ID: 10300001)，正在查询其消耗数据..."
```

---

## 十、查询注意事项

1. **尽量使用完整的应用名称**：避免使用过于模糊的关键词
2. **注意歧义情况**：当匹配到多个应用时，必须返回候选列表让用户确认
3. **支持别名查询**：用户可以使用别名来指代应用，提高使用便利性
4. **大小写不敏感**：所有匹配都不区分大小写
', 1, 21, '元数据-项目维度表', '2026-03-25 22:12:09', '2026-03-27 22:18:45');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.MfChannelTool#tool', 'list_channel', '指定游戏获取运营渠道列表，用于下游报表查询', 1, 22, '元数据-获取渠道表', '2026-03-25 23:03:19', '2026-03-30 13:18:11');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.MfSubChannelTool#tool', 'list_cpsid', ' 1、指定游戏获取分包列表，用于下游报表查询 ', 1, 23, '元数据-获取分包', '2026-03-25 22:12:09', '2026-03-30 13:18:21');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.MfOsTypeTool#tool', 'list_ostype', '指定游戏获取运营终端列表，用于下游报表查询', 1, 24, '元数据-获取终端表', '2026-03-25 22:12:09', '2026-03-30 13:18:26');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.MfCountryTool#tool', 'list_country', '指定游戏获取运营地区列表，用于下游报表查询', 1, 25, '元数据-获取国家表', '2026-03-26 11:31:34', '2026-03-30 13:18:33');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdMediaTool#tool', 'list_media', '# MCP报表工具 - 媒体维度表接口使用说明

## 一、基本信息

| 项目 | 说明 |
|------|------|
| **接口名称** | 媒体维度表 |
| **Tool名称** | `list_media` |
| **描述** | 媒体名与媒体ID的映射关系，获取拥有权限的媒体列表，返回媒体ID、媒体名称、以及支持报表查询开始时间 |
| **业务领域** | 广告投放，游戏运营 |
| **版本号** | V1.2（内部版本） |
| **更新频率** | 20分钟 |
| **默认时间范围** | last_7_days |
| **最早可用日期** | 2025-01-01 |
| **最晚可用日期** | 可查当日数据 |
| **数据范围** | **包含所有媒体类型数据**，包括广告(AD)、市场(MKT)、ASO、自定义(CUSTOM)等全渠道媒体 |

### 1.1 重要说明：不同报表的数据范围

| 报表类型 | 支持的媒体类型 | 默认包含自然量 | 说明 |
|---------|--------------|--------------|------|
| **日周月报** | **仅广告(AD)媒体** | **否**（需显式指定） | 只能查询promotion_source=AD的媒体，自然量需通过media_id=99999显式查询 |
| **ROI报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |
| **留存报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |
| **小时报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |

---

## 二、媒体列表

### 2.1 国内主流广告媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10001** | 巨量广告 | AD | MAINLAND | COMMON | 巨量、头条、今日头条、巨量引擎、抖音广告、抖音、字节跳动、抖音平台 |
| **10002** | 腾讯广告 | AD | MAINLAND | COMMON | 腾讯、腾讯社交广告、微信广告、微信、QQ广告、QQ、广点通 |
| **10003** | 快手广告 | AD | MAINLAND | COMMON | 快手、快手信息流、快手商业 |
| **10004** | 百度搜索 | AD | MAINLAND | SEARCH | 百度、百度推广、百度搜索推广、百度SEM |
| **10005** | 百度信息流 | AD | MAINLAND | COMMON | 百度信息流、百度APP、百度FEED、百度信息流广告 |
| **10006** | 爱奇艺广告 | AD | MAINLAND | COMMON | 爱奇艺 |
| **10007** | B站广告 | AD | MAINLAND | COMMON | B站、哔哩哔哩、bilibili、B站信息流 |
| **10008** | UC头条 | AD | MAINLAND | COMMON | UC、UC头条、UC信息流 |
| **10009** | 神马搜索 | AD | MAINLAND | SEARCH | 神马、神马搜索 |
| **10010** | 超级粉丝通 | AD | MAINLAND | COMMON | 超级粉丝通、微博广告、微博粉丝通 |
| **10011** | 虎牙广告 | AD | MAINLAND | COMMON | 虎牙 |
| **10012** | Oppo广告 | AD | MAINLAND | HARDCORE | Oppo、Oppo商店、欧珀、Oppo应用商店 |
| **10013** | 华为商店广告 | AD | MAINLAND | HARDCORE | 华为、华为应用市场、华为商店、华为应用商店 |
| **10014** | Vivo广告 | AD | MAINLAND | HARDCORE | Vivo、Vivo商店、Vivo应用商店 |
| **10015** | 小米广告 | AD | MAINLAND | HARDCORE | 小米、小米应用商店、小米商店、小米应用市场 |
| **10016** | 苹果广告 | AD | MAINLAND | SEARCH | Apple Search Ads、苹果搜索、ASA、苹果搜索广告 |
| **10017** | Sigmob | AD | MAINLAND | COMMON | Sigmob |
| **10018** | Unity广告 | AD | MAINLAND | COMMON | Unity、Unity Ads |
| **10019** | TapTap广告 | AD | MAINLAND | COMMON | TapTap、TapTap广告 |
| **10020** | 斗鱼广告 | AD | MAINLAND | COMMON | 斗鱼 |
| **10021** | 知乎广告 | AD | MAINLAND | COMMON | 知乎 |
| **10022** | 网易有道 | AD | MAINLAND | COMMON | 网易有道 |
| **10023** | 网易云音乐 | AD | MAINLAND | COMMON | 网易云音乐、网易云 |
| **10024** | 支付宝广告 | AD | MAINLAND | COMMON | 支付宝 |
| **10025** | 优酷广告 | AD | MAINLAND | COMMON | 优酷 |
| **10104** | 陌陌原生广告平台 | AD | MAINLAND | COMMON | 陌陌 |
| **10105** | 汽车之家 | AD | MAINLAND | COMMON | 汽车之家 |
| **10107** | 搜狐 | AD | MAINLAND | COMMON | 搜狐 |
| **10108** | 趣头条 | AD | MAINLAND | COMMON | 趣头条 |
| **10114** | 东方头条 | AD | MAINLAND | COMMON | 东方头条 |
| **10115** | 新浪扶翼 | AD | MAINLAND | COMMON | 新浪扶翼、新浪 |
| **10120** | 极光精准广告 | AD | MAINLAND | COMMON | 极光 |
| **10121** | 金山游戏广告 | AD | MAINLAND | COMMON | 金山 |
| **10122** | 广告花火 | AD | MAINLAND | COMMON | 花火 |
| **10140** | 小红书 | AD | MAINLAND | COMMON | 小红书 |
| **10141** | 广告星图 | AD | MAINLAND | COMMON | 星图、抖音星图 |
| **10142** | 广告聚星 | AD | MAINLAND | COMMON | 聚星、快手聚星 |
| **10146** | 搜狗搜索 | AD | MAINLAND | SEARCH | 搜狗、搜狗搜索 |
| **10147** | 百度品专 | AD | MAINLAND | SEARCH | 百度品专 |
| **10148** | 巨量云游戏 | AD | MAINLAND | COMMON | 巨量云游戏 |
| **10149** | soul | AD | MAINLAND | COMMON | SOUL、Soul |
| **10163** | 腾讯互选 | AD | MAINLAND | COMMON | 腾讯互选 |

### 2.2 海外主流广告媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **20001** | Facebook | AD | OVERSEAS | COMMON | 脸书、FB、Facebook Ads |
| **20002** | Tiktok | AD | OVERSEAS | COMMON | 国际版抖音、TikTok Ads、TikTok广告 |
| **20003** | Google | AD | OVERSEAS | COMMON | 谷歌、Google Ads、谷歌广告 |

### 2.3 市场推广媒体（promotion_source=MKT）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10030** | 市场星图 | MKT | MAINLAND | MARKET | 市场星图 |
| **10031** | 抖音游戏 | MKT | MAINLAND | MARKET | 抖音游戏、抖音游戏推广 |
| **10032** | 市场聚星 | MKT | MAINLAND | MARKET | 市场聚星 |
| **10138** | 飞火 | MKT | MAINLAND | MARKET | 飞火 |
| **10143** | 市场花火 | MKT | MAINLAND | MARKET | 市场花火 |
| **10144** | 市场星图结算类 | MKT | MAINLAND | MARKET | 市场星图结算类 |

### 2.4 ASO优化服务媒体（promotion_source=UNKNOWN）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10029** | 七麦ASO | UNKNOWN | MAINLAND | ASO | 七麦、七麦ASO、七麦推广 |
| **10123** | imoney | UNKNOWN | MAINLAND | ASO | imoney |
| **10124** | 寸之金 | UNKNOWN | MAINLAND | ASO | 寸之金 |
| **10125** | 聚点ASO | UNKNOWN | MAINLAND | ASO | 聚点ASO |
| **10126** | 叁特 | UNKNOWN | MAINLAND | ASO | 叁特 |
| **10127** | 内涵ASO | UNKNOWN | MAINLAND | ASO | 内涵ASO |
| **10129** | 云测ASO | UNKNOWN | MAINLAND | ASO | 云测ASO、Testin |
| **10136** | 蝉大师ASO | AD | MAINLAND | ASO | 蝉大师、蝉大师ASO |
| **10150** | 试客ASO | UNKNOWN | MAINLAND | ASO | 试客ASO |

### 2.5 DSP广告平台媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10036** | 优源 | AD | MAINLAND | DSP | 优源 |
| **10037** | 一栗 | AD | MAINLAND | DSP | 一栗 |
| **10038** | 点点ASO | AD | MAINLAND | DSP | 点点ASO |
| **10039** | Inmobi | AD | MAINLAND | DSP | Inmobi |
| **10040** | 懒鱼 | AD | MAINLAND | DSP | 懒鱼 |
| **10041** | 熊猫试玩 | AD | MAINLAND | DSP | 熊猫试玩 |
| **10042** | 扬京 | AD | MAINLAND | DSP | 扬京 |
| **10043** | 脉络时代 | AD | MAINLAND | DSP | 脉络时代 |
| **10044** | 棉花糖 | AD | MAINLAND | DSP | 棉花糖 |
| **10045** | Vungle | AD | MAINLAND | DSP | Vungle |
| **10046** | 有米 | AD | MAINLAND | DSP | 有米、有米广告 |
| **10047** | AppLovin | AD | MAINLAND | DSP | AppLovin |
| **10048** | 聚告 | AD | MAINLAND | DSP | 聚告 |
| **10049** | 舜飞DSP | AD | MAINLAND | DSP | 舜飞DSP、舜飞 |
| **10050** | Lingkmedia | AD | MAINLAND | DSP | Lingkmedia |
| **10051** | 新数DSP | AD | MAINLAND | DSP | 新数DSP |
| **10052** | 射手 | AD | MAINLAND | DSP | 射手 |
| **10053** | 济南九神 | AD | MAINLAND | DSP | 济南九神 |
| **10054** | 中旭 | AD | MAINLAND | DSP | 中旭 |
| **10055** | 迈腾 | AD | MAINLAND | DSP | 迈腾 |
| **10056** | mediaMob | AD | MAINLAND | DSP | mediaMob |
| **10057** | AdBright | AD | MAINLAND | DSP | AdBright |
| **10058** | 氪金 | AD | MAINLAND | DSP | 氪金 |
| **10059** | 旺脉 | AD | MAINLAND | DSP | 旺脉 |
| **10060** | Yeahmobi | AD | MAINLAND | DSP | Yeahmobi |
| **10061** | wifi万能钥匙 | AD | MAINLAND | COMMON | wifi万能钥匙、WiFi万能钥匙 |
| **10062** | adpotato | AD | MAINLAND | DSP | adpotato |
| **10063** | 仁玺 | AD | MAINLAND | DSP | 仁玺 |
| **10064** | coinads | AD | MAINLAND | DSP | coinads |
| **10065** | 畅思 | AD | MAINLAND | DSP | 畅思 |
| **10066** | 点点CPA | AD | MAINLAND | DSP | 点点CPA |
| **10067** | 卓塔 | AD | MAINLAND | DSP | 卓塔 |
| **10068** | Adcolony | AD | MAINLAND | DSP | Adcolony |
| **10069** | Mintegral | AD | MAINLAND | DSP | Mintegral |
| **10070** | 微博WAX | AD | MAINLAND | COMMON | 微博WAX |
| **10071** | Pingme | AD | MAINLAND | DSP | Pingme |
| **10072** | 懂球帝 | AD | MAINLAND | COMMON | 懂球帝 |
| **10073** | 畅迈 | AD | MAINLAND | DSP | 畅迈 |
| **10074** | 纵驰信息 | AD | MAINLAND | DSP | 纵驰信息 |
| **10075** | 伟创 | AD | MAINLAND | DSP | 伟创 |
| **10076** | 银橙 | AD | MAINLAND | DSP | 银橙 |
| **10077** | 非凡DSP | AD | MAINLAND | DSP | 非凡DSP |
| **10078** | 兔迪 | AD | MAINLAND | DSP | 兔迪 |
| **10079** | 京盟世纪 | AD | MAINLAND | DSP | 京盟世纪 |
| **10080** | 飞扬 | AD | MAINLAND | DSP | 飞扬 |
| **10081** | 多盟 | AD | MAINLAND | DSP | 多盟 |
| **10082** | 聚点互动 | AD | MAINLAND | DSP | 聚点互动 |
| **10083** | PLUSADS | AD | MAINLAND | DSP | PLUSADS |
| **10084** | 天资 | AD | MAINLAND | DSP | 天资 |
| **10085** | appcoach | AD | MAINLAND | DSP | appcoach |
| **10086** | 微传播 | AD | MAINLAND | DSP | 微传播 |
| **10087** | global | AD | MAINLAND | DSP | global |
| **10088** | 掌游天下 | AD | MAINLAND | DSP | 掌游天下 |
| **10089** | 联动卓越 | AD | MAINLAND | DSP | 联动卓越 |
| **10090** | Xmob | AD | MAINLAND | DSP | Xmob |
| **10091** | 苍鹿 | AD | MAINLAND | DSP | 苍鹿 |
| **10092** | mobvista | AD | MAINLAND | DSP | mobvista |
| **10093** | 安尚 | AD | MAINLAND | DSP | 安尚 |
| **10094** | 旺翔 | AD | MAINLAND | DSP | 旺翔 |
| **10095** | 乐游 | AD | MAINLAND | DSP | 乐游 |
| **10096** | 千易 | AD | MAINLAND | DSP | 千易 |
| **10097** | 点锐 | AD | MAINLAND | DSP | 点锐 |
| **10098** | goldentraffic | AD | MAINLAND | DSP | goldentraffic |
| **10099** | 七麦 | AD | MAINLAND | DSP | 七麦 |
| **10100** | 龙域之星 | AD | MAINLAND | DSP | 龙域之星 |
| **10101** | 脚印 | AD | MAINLAND | DSP | 脚印 |
| **10102** | 蓝蛙 | AD | MAINLAND | DSP | 蓝蛙 |
| **10103** | Novad | AD | MAINLAND | DSP | Novad |
| **10109** | 科大讯飞 | AD | MAINLAND | DSP | 科大讯飞 |
| **10110** | 巨鲨 | AD | MAINLAND | DSP | 巨鲨 |
| **10111** | glispa | AD | MAINLAND | DSP | glispa |
| **10112** | 玄籍 | AD | MAINLAND | DSP | 玄籍 |
| **10113** | cobelab | AD | MAINLAND | DSP | cobelab |
| **10116** | 美图 | AD | MAINLAND | DSP | 美图 |
| **10117** | 艾凯伯思 | AD | MAINLAND | DSP | 艾凯伯思 |
| **10118** | 分享未央 | AD | MAINLAND | DSP | 分享未央 |
| **10119** | 游卡长尾 | AD | MAINLAND | DSP | 游卡长尾 |
| **10128** | 360搜索 | AD | MAINLAND | SEARCH | 360搜索、360 |
| **10135** | 星广联投 | AD | MAINLAND | COMMON | 星广联投 |
| **10137** | 掌上互动 | AD | MAINLAND | DSP | 掌上互动 |
| **10139** | 好游快爆 | AD | MAINLAND | COMMON | 好游快爆 |
| **10145** | 轩沐 | AD | MAINLAND | DSP | 轩沐 |
| **10151** | 起点互动 | AD | MAINLAND | DSP | 起点互动 |
| **10152** | 开瑞 | AD | MAINLAND | DSP | 开瑞 |
| **10153** | mobring | AD | MAINLAND | DSP | mobring |
| **10154** | 水毅云 | AD | MAINLAND | DSP | 水毅云 |
| **10155** | 优思 | AD | MAINLAND | DSP | 优思 |
| **10156** | 汇川 | AD | MAINLAND | DSP | 汇川 |
| **10157** | 麦萌 | AD | MAINLAND | DSP | 麦萌 |
| **10158** | Neomobi | AD | MAINLAND | DSP | Neomobi |
| **10159** | 电视直通车 | AD | MAINLAND | DSP | 电视直通车 |
| **10160** | 战旗 | AD | MAINLAND | DSP | 战旗 |
| **10162** | 华为鲸鸿广告 | AD | MAINLAND | HARDCORE | 华为鲸鸿、华为鲸鸿广告 |

### 2.6 自定义媒体（promotion_source=CUSTOM）

| media_id | media_name | promotion_source | region | media_ad_type | 说明 |
|---------|-----------|-----------------|--------|--------------|------|
| **30002** | 测试 | OP | CUSTOM | OTHER | 测试媒体 |
| **30004** | test | AD | CUSTOM | OTHER | 测试媒体 |
| **30008** | 33 | AD | CUSTOM | OTHER | 测试媒体 |
| **30009** | 其他 | UNKNOWN | CUSTOM | OTHER | 其他媒体 |
| **30010** | 123 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30012** | 社区 | OP | CUSTOM | OTHER | 社区媒体 |
| **30013** | 12312 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30014** | TapTap运营 | OP | CUSTOM | OTHER | TapTap运营 |
| **30016** | 好游快爆运营 | OP | CUSTOM | OTHER | 好游快爆运营 |
| **30017** | TapTap运营 | OP | CUSTOM | OTHER | TapTap运营 |
| **30018** | test_new_custom_media_0314 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30019** | 官网运营 | OP | CUSTOM | OTHER | 官网运营 |
| **30020** | 官网 | OP | CUSTOM | OTHER | 官网 |
| **30022** | 自定义1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30023** | 自定义2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30025** | 自定义媒体1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30026** | 自定义媒体2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30027** | 自定义1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30028** | 自定义2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30029** | mumuPC合作 | OP | CUSTOM | OTHER | mumuPC合作 |
| **30030** | 雷电PC合作 | OP | CUSTOM | OTHER | 雷电PC合作 |
| **30031** | 官方社区 | OP | CUSTOM | OTHER | 官方社区 |
| **30032** | test_0514 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30034** | B站 | MKT | CUSTOM | OTHER | B站 |
| **30035** | 夺帅三测投放 | OP | CUSTOM | OTHER | 夺帅三测投放 |
| **30037** | test2 | AD | CUSTOM | OTHER | 测试媒体 |
| **30038** | 自定义跳转 | AD | CUSTOM | OTHER | 自定义跳转 |
| **30039** | 市场（官包） | MKT | CUSTOM | OTHER | 市场（官包） |
| **30040** | UC开屏 | AD | CUSTOM | OTHER | UC开屏 |
| **30041** | 抖音（官方） | OP | CUSTOM | OTHER | 抖音（官方） |
| **30042** | 夺帅731付费测运营投放 | OP | CUSTOM | OTHER | 夺帅731付费测运营投放 |
| **30043** | 抖音 | MKT | CUSTOM | OTHER | 抖音 |
| **30044** | 社群专用 | OP | CUSTOM | OTHER | 社群专用 |
| **30045** | QA测试 | OP | CUSTOM | OTHER | QA测试 |
| **30046** | PC百度 | AD | CUSTOM | OTHER | PC百度 |
| **30047** | 百度搜索 | AD | CUSTOM | OTHER | 百度搜索 |
| **30048** | 夺帅公测运营投放 | OP | CUSTOM | OTHER | 夺帅公测运营投放 |
| **30049** | hykb | OP | CUSTOM | OTHER | hykb |
| **30050** | 公司内测 | OP | CUSTOM | OTHER | 公司内测 |
| **30051** | 用户首测 | OP | CUSTOM | OTHER | 用户首测 |
| **30052** | Q群 | OP | CUSTOM | OTHER | Q群 |
| **30053** | 主播专用 | UNKNOWN | CUSTOM | OTHER | 主播专用 |
| **30054** | 老用户 | UNKNOWN | CUSTOM | OTHER | 老用户 |
| **30056** | B站社媒 | OP | CUSTOM | OTHER | B站社媒 |
| **30057** | 先锋测试服 | OP | CUSTOM | OTHER | 先锋测试服 |

### 2.7 特殊媒体

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 | 说明 |
|---------|-----------|-----------------|--------|--------------|---------|------|
| **99999** | 自然量 | UNKNOWN | MAINLAND | OTHER | 自然量、非广告用户 | 非广告带来的自然用户 |

---

## 三、媒体名称匹配规则

### 3.1 匹配优先级

#### 1. 精确匹配优先
- **规则**：用户输入的名称与媒体名称完全一致时，直接返回该媒体
- **示例**：
  - 用户说"巨量广告" → 直接匹配 media_id=10001
  - 用户说"腾讯广告" → 直接匹配 media_id=10002
  - 用户说"Facebook" → 直接匹配 media_id=20001

#### 2. 别名匹配
- **规则**：如果没有精确匹配，尝试匹配常用别名
- **示例**：
  - 用户说"巨量" → 匹配 media_id=10001 "巨量广告"
  - 用户说"头条" → 匹配 media_id=10001 "巨量广告"
  - 用户说"抖音广告" → 匹配 media_id=10001 "巨量广告"
  - 用户说"微信广告" → 匹配 media_id=10002 "腾讯广告"
  - 用户说"FB" → 匹配 media_id=20001 "Facebook"

#### 3. 模糊匹配
- **规则**：如果没有精确匹配和别名匹配，则进行模糊匹配
- **示例**：
  - 用户说"百度" → 可匹配 media_id=10004 "百度搜索"、media_id=10005 "百度信息流"
  - 用户说"华为" → 匹配 media_id=10013 "华为商店广告" 或 media_id=10162 "华为鲸鸿广告"
  - 用户说"B站" → 可匹配："B站广告"(10007)、"B站"(30034)、"B站社媒"(30056)

#### 4. 歧义检测与确认
- **规则**：当用户输入可能匹配多个媒体时，返回候选列表让用户确认
- **示例**：
  - 用户说"百度" → 可能匹配："百度搜索"(10004)、"百度信息流"(10005)、"百度品专"(10147)
  - 用户说"B站" → 可能匹配："B站广告"(10007)、"B站"(30034)、"B站社媒"(30056)

---

## 四、推荐使用方式

### 4.1 单个媒体查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 巨量广告 | `{"field": "media_id", "operator": "eq", "value": "10001"}` | 精确匹配巨量广告 |
| 头条 | `{"field": "media_id", "operator": "eq", "value": "10001"}` | 通过别名匹配巨量广告 |
| 腾讯广告 | `{"field": "media_id", "operator": "eq", "value": "10002"}` | 精确匹配腾讯广告 |
| 微信广告 | `{"field": "media_id", "operator": "eq", "value": "10002"}` | 通过别名匹配腾讯广告 |
| Facebook | `{"field": "media_id", "operator": "eq", "value": "20001"}` | 精确匹配Facebook |
| 自然量 | `{"field": "media_id", "operator": "eq", "value": "99999"}` | 查询自然量数据 |

### 4.2 多个媒体查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 头条和腾讯 | `{"field": "media_id", "operator": "in", "value": "10001,10002"}` | 查询巨量广告和腾讯广告 |
| 国内主流媒体 | `{"field": "media_id", "operator": "in", "value": "10001,10002,10003,10004,10007"}` | 查询国内五大主流媒体 |
| 海外媒体 | `{"field": "media_id", "operator": "in", "value": "20001,20002,20003"}` | 查询三大海外媒体 |

### 4.3 按媒体类型查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 硬核媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "HARDCORE"}` | 查询所有手机厂商媒体 |
| 搜索媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "SEARCH"}` | 查询所有搜索类媒体 |
| DSP平台 | `{"field": "media_ad_type", "operator": "eq", "value": "DSP"}` | 查询所有DSP广告平台 |
| ASO媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "ASO"}` | 查询所有ASO优化服务 |

---

## 五、媒体类型说明

### 5.1 media_ad_type 类型说明

| 类型 | 说明 | 包含媒体示例 |
|------|------|------------|
| **COMMON** | 通用信息流媒体 | 巨量广告、腾讯广告、快手广告、B站广告、小红书等约50+个媒体 |
| **SEARCH** | 搜索广告媒体 | 百度搜索、苹果广告、360搜索、搜狗搜索、百度品专等约10+个媒体 |
| **HARDCORE** | 硬核媒体（手机厂商） | Oppo广告、华为商店广告、Vivo广告、小米广告、华为鲸鸿广告等约8+个媒体 |
| **ASO** | ASO优化服务 | 七麦ASO、蝉大师ASO、寸之金、聚点ASO等约10+个媒体 |
| **MARKET** | 市场推广渠道 | 市场星图、抖音游戏、市场聚星、飞火等约10+个媒体 |
| **DSP** | DSP广告平台 | 优源、一栗、Inmobi、AppLovin、有米等约80+个媒体 |
| **OTHER** | 其他类型媒体 | 自然量、官网、测试媒体、自定义媒体等约30+个媒体 |

### 5.2 promotion_source 推广类型说明

| 类型 | 说明 | 适用报表 |
|------|------|---------|
| **AD** | 广告投放渠道 | 所有报表（ROI、留存、小时报表、日周月报） |
| **MKT** | 市场推广渠道 | ROI、留存、小时报表（不支持日周月报） |
| **UNKNOWN** | 未知类型（ASO、自然量等） | ROI、留存、小时报表（日周月报仅支持自然量99999） |
| **OP** | 运营渠道 | ROI、留存、小时报表（不支持日周月报） |
| **CUSTOM** | 自定义渠道 | ROI、留存、小时报表（不支持日周月报） |

### 5.3 region 地区说明

| 类型 | 说明 |
|------|------|
| **MAINLAND** | 中国大陆 |
| **OVERSEAS** | 海外地区 |
| **CUSTOM** | 自定义地区 |

---

## 六、注意事项

### 6.1 权限与认证
- 需使用内部授权的API Token进行访问
- Token有效期根据公司安全策略，过期需重新申请
- 不同Token可能有不同的媒体访问权限

### 6.2 数据时效性
- **更新频率**：20分钟
- **数据延迟**：媒体配置变更后，最多延迟20分钟生效

### 6.3 媒体名称匹配注意事项
1. **优先使用精确匹配**：尽可能使用完整的媒体名称
2. **注意歧义情况**：当用户输入可能匹配多个媒体时，必须返回候选列表让用户确认
3. **支持别名输入**：用户可以使用常用别名来指代媒体，提高使用便利性
4. **特殊值处理**："自然量"、"全部媒体"等特殊值需要特别处理

### 6.4 不同报表的媒体范围
**重要提示**：不同报表支持查询的媒体类型不同
- **日周月报**：只能查询promotion_source=AD的媒体，如需查询自然量需显式指定media_id=99999
- **ROI报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）
- **留存报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）
- **小时报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）

### 6.5 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 0 | 成功 | - |
| 400 | 参数错误 | 检查参数格式、必填项是否完整 |
| 401 | 未授权 | Token无效或已过期，需重新获取 |
| 403 | 权限不足 | 无该媒体的数据访问权限 |
| 404 | 媒体未找到 | 检查媒体名称是否正确，或查看完整的媒体列表 |
| 429 | 请求超频 | 降低请求频率，避免超过并发限制 |
| 500 | 服务器错误 | 联系技术支持 |

---

*文档版本：V1.2*
*更新日期：2026-03-26*
*维护方：数据平台团队*
', 1, 26, '元数据-广告媒体表', '2026-03-25 23:03:19', '2026-03-30 13:18:44');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.mf.MfMediaTool#tool', 'list_oversea_media', '指定海外游戏广告媒体信息，用于下游查询', 1, 26, '元数据-获取媒体列表', '2026-03-25 22:12:09', '2026-03-27 19:59:00');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AppPackageTypeTool#tool', 'list_app_package_type', '指定国内游戏广告应用类型信息，用于下游查询', 1, 26, '元数据-获取应用类型列表', '2026-03-25 22:12:09', '2026-03-27 19:59:00');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.AppsTool#tool', 'list_all_app', '# list_all_apps（项目维度表）

供 **MCP 工具 `list_all_apps` 的 description / 使用说明** 引用：说明返回值形态、字段含义，以及如何用结果解析 **`appId`** 并调用其它工具。

---

## 作用

- 返回当前令牌**有权访问**的项目列表，作为所有需 **`appId`** 的查询的**前置步骤**。
- **`appId` 必须来自本工具结果**（见下文的「对象 key」），不得编造。

---

## 返回形态

- **成功**：一个 **JSON 对象**（不是数组）。**每个 key 即一个项目的 `appId`**（字符串，如 `"10100042"`）；value 为该项目的属性对象。
- **失败或无权限**：可能为**纯文本提示**（非 JSON），按文案处理。

未赋值字段常为 **`null`**，且序列化时可能**省略**该键，勿假定键一定存在。

---
---
## value 内字段（蛇形命名）

| 字段 | 类型说明 | 含义                                           |
|------|----------|----------------------------------------------|
| `project_name` | string | 项目名称（用于展示与名称匹配）                              |
| `revenue_type` | string | 收入模式（项目平台）                                   |
| `distribution_region` | number | 发行区域：**1 国内，2 海外**（魔方）                       |
| `time_zone` | number | 时区（魔方）                                       |
| `currency` | string | 货币（魔方）                                       |
| `project_status` | number | 项目状态（魔方）, 1 开启，2 关闭                          |
| `launch_time` | string | 上线时间，多为 `yyyy-MM-dd`                         |
| `department_id` / `department_name` | number / string | 项目部                                          |
| `studio_id` / `studio_name` | number / string | 工作室                                          |
| `device_type` | string | 终端类型（项目平台）                                   |
| `cluster_location` | string | 集群：`sh`（上海）/ `hz`（杭州），由魔方集群版本映射；无则可能为 `null` |
| `is_enable_ad` | string | `"0"` 否 / `"1"` 是（智投是否登记）                    |
| `app_alias` | string[] | 别名列表（智投），用于辅助匹配                              |
| `booking_time` / `open_beta_time` | string | 预约 / 公开测试时间（智投）                              |
| `data_start_date` | string | 数据起始日，**固定 `2025-01-01`**（其它工具日期下界常与此对齐）     |
| `sp_multi_team` | string | `"0"` 单团队 / `"1"` 多团队（智投）；未知则可能为 `null`      |

---

## 如何取 `appId`

1. 遍历返回对象的 **每个 key**，即为合法 **`appId`**。
2. 按用户说的游戏名：对 **key → value** 做匹配——优先 **`project_name` 精确匹配**（建议不区分大小写），其次 **`app_alias`** 或 `project_name` **包含**关键词（模糊）。
3. **多个候选**：必须让用户确认后再用其中一个 **key** 作为 `appId`；**禁止**默认选第一项。
4. **零候选**：说明未命中，可请用户换称呼或从列表中选。

区分国内/海外时，可用 **`distribution_region`**（1/2）辅助筛选或说明。

---

## 调用其它工具时

- 后续工具参数里的 **`appId`** 使用本列表中的 **对象 key**（字符串），与 value 内字段无关（value 内**没有**单独的 project_id 字段）。

---

## 简短示例

```json
{
  "10100002": {
    "project_name": "三国杀OL",
    "distribution_region": 1,
    "data_start_date": "2025-01-01",
    "app_alias": ["手杀"],
    "cluster_location": "sh",
    "is_enable_ad": "1"
  }
}
```

→ 用户指定「三国杀OL」时，应使用 **`appId` = `"10100002"`**。
', 1, 26, '元数据-游戏列表', '2026-03-25 22:12:09', '2026-04-02 18:14:26');
INSERT INTO mcp_tool_config (tool_key, tool_name, description, enabled, sort_order, remark, created_at, updated_at) VALUES ('org.dobest.ai.tool.ad.AdTeamTool#tool', 'list_team', '# MCP报表工具 - 团队表接口使用说明

## 一、基本信息

| 项目 | 说明 |
|------|------|
| **接口名称** | 团队表 |
| **Tool名称** | `list_team` |
| **描述** | 团队名与团队ID的映射关系，获取拥有权限的团队列表，返回团队ID、团队名称、以及支持报表查询开始时间 |
| **业务领域** | 广告投放 |
| **版本号** | V1.2（内部版本） |
| **更新频率** | 20分钟 |
| **默认时间范围** | last_7_days |
| **最早可用日期** | 2025-01-01 |
| **最晚可用日期** | 可查当日数据 |
| **数据范围** | **仅限广告业务数据**，不包含市场推广、运营推广、ASO媒体数据 |

---

## 二、常见团队列表

| team_ids | 团队名称 | 常用别名 |
|----------|---------|---------|
| 1 | 上海发行项目部 | 上海投放、上海 |
| 2 | 广告投放一部（杭州） | 杭州投放、杭州、杭州投放一部 |
| 209 | 广州发行二部 | 广州投放二部、广州二部 |
| 221 | 广州发行一部 | 广州投放、广州投放一部、广州一部 |
| 244 | 创新部 | - |
| 247 | 飞涛 | - |
| 248 | 市场部 | - |

### 2.1 团队别名映射说明

在实际使用中，用户经常使用以下别名来指代团队：

| 用户输入 | 匹配的团队ID | 团队全称 | 匹配类型 |
|---------|------------|---------|---------|
| 上海投放、上海 | 1 | 上海发行项目部 | 精确匹配 |
| 杭州投放、杭州、杭州投放一部 | 2 | 广告投放一部（杭州） | 精确匹配/模糊匹配 |
| 广州投放、广州投放一部、广州一部 | 221 | 广州发行一部 | 精确匹配/模糊匹配 |
| 广州二部、广州投放二部 | 209 | 广州发行二部 | 精确匹配/模糊匹配 |
| 所有投放 | MAINLAND | 所有投放团队 | 特殊值 |

---

## 三、团队名称匹配规则

### 3.1 匹配优先级

#### 1. 精确匹配优先
- **规则**：用户输入的名称与团队名称完全一致时，直接返回该团队
- **示例**：
  - 用户说"杭州" → 优先匹配 team_ids=2 的"广告投放一部（杭州）"
  - 用户说"上海发行项目部" → 直接匹配 team_ids=1
  - 用户说"广州发行一部" → 直接匹配 team_ids=221

#### 2. 模糊匹配
- **规则**：如果没有精确匹配，则进行模糊匹配，查找包含用户输入关键词的团队
- **示例**：
  - 用户说"杭州" → 如果没有精确匹配，可匹配 team_ids=2 的"广告投放一部（杭州）"
  - 用户说"广州" → 可匹配 team_ids=221 的"广州发行一部" 或 team_ids=209 的"广州发行二部"
  - 用户说"投放" → 可匹配所有包含"投放"的团队

#### 3. 歧义检测与确认
- **规则**：当用户输入可能匹配多个团队时，返回候选列表让用户确认
- **示例**：
  - 用户说"一部" → 可能匹配："广州发行一部"、"上海发行项目部"
  - 用户说"广州" → 可能匹配："广州发行一部"、"广州发行二部"
  - 用户说"投放" → 可能匹配："广告投放一部"、"广州发行一部"等

### 3.2 匹配算法伪代码

```python
def match_team(user_input):
    # 1. 精确匹配
    for team in teams:
        if user_input == team.name or user_input in team.aliases:
            return team.id

    # 2. 模糊匹配
    candidates = []
    for team in teams:
        if user_input in team.name or any(user_input in alias for alias in team.aliases):
            candidates.append(team)

    # 3. 歧义检测
    if len(candidates) == 0:
        return None
    elif len(candidates) == 1:
        return candidates[0].id
    else:
        # 返回候选列表让用户确认
        return candidates
```

---

## 四、推荐使用方式

### 4.1 单个团队查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 上海投放 | `{"field": "team_ids", "operator": "eq", "value": "1"}` | 精确匹配上海发行项目部 |
| 杭州投放 | `{"field": "team_ids", "operator": "eq", "value": "2"}` | 精确匹配广告投放一部（杭州） |
| 广州投放 | `{"field": "team_ids", "operator": "eq", "value": "221"}` | 精确匹配广州发行一部 |

### 4.2 多个团队查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 广州二部和杭州一部 | `{"field": "team_ids", "operator": "in", "value": "209,2"}` | 查询广州发行二部和广告投放一部 |
| 上海和广州 | `{"field": "team_ids", "operator": "in", "value": "1,221,209"}` | 查询上海和广州的所有发行团队 |
| 所有投放 | `{"field": "team_ids", "operator": "eq", "value": "MAINLAND"}` | 查询所有投放团队 |

### 4.3 特殊场景处理

#### 场景1：用户输入不精确的团队名称
- **用户输入**："杭州投放"
- **处理逻辑**：
  1. 尝试精确匹配：查找团队名称为"杭州投放"的团队 → 失败
  2. 尝试模糊匹配：查找包含"杭州"和"投放"的团队 → 匹配到 team_ids=2 "广告投放一部（杭州）"
  3. 返回结果：team_ids=2

#### 场景2：用户输入可能有歧义
- **用户输入**："一部"
- **处理逻辑**：
  1. 尝试精确匹配：查找团队名称为"一部"的团队 → 失败
  2. 尝试模糊匹配：查找包含"一部"的团队 → 匹配到多个团队：
     - team_ids=1 "上海发行项目部"
     - team_ids=221 "广州发行一部"
  3. 返回候选列表：让用户确认具体选择哪个团队

#### 场景3：用户输入特殊值
- **用户输入**："所有投放"、"全部"、"全部团队"
- **处理逻辑**：
  1. 识别为特殊值
  2. 返回所有投放团队：使用 `MAINLAND` 或 `*`

---

## 五、团队名称映射配置

### 5.1 团队映射表

```json
{
  "teams": [
    {
      "team_id": 1,
      "name": "上海发行项目部",
      "aliases": ["上海投放", "上海"],
      "keywords": ["上海", "发行", "项目"],
      "priority": 1
    },
    {
      "team_id": 2,
      "name": "广告投放一部（杭州）",
      "aliases": ["杭州投放", "杭州", "杭州投放一部"],
      "keywords": ["杭州", "广告", "投放", "一部"],
      "priority": 2
    },
    {
      "team_id": 209,
      "name": "广州发行二部",
      "aliases": ["广州投放二部", "广州二部"],
      "keywords": ["广州", "发行", "二部"],
      "priority": 3
    },
    {
      "team_id": 221,
      "name": "广州发行一部",
      "aliases": ["广州投放", "广州投放一部", "广州一部"],
      "keywords": ["广州", "发行", "一部"],
      "priority": 3
    },
    {
      "team_id": 244,
      "name": "创新部",
      "aliases": [],
      "keywords": ["创新"],
      "priority": 4
    },
    {
      "team_id": 247,
      "name": "飞涛",
      "aliases": [],
      "keywords": ["飞涛"],
      "priority": 4
    },
    {
      "team_id": 248,
      "name": "市场部",
      "aliases": [],
      "keywords": ["市场"],
      "priority": 4
    }
  ]
}
```

### 5.2 优先级说明

- **priority=1**：优先级最高，精确匹配时优先返回
- **priority=2**：优先级次之，模糊匹配时优先返回
- **priority=3**：优先级中等
- **priority=4**：优先级最低

---

## 六、使用示例

### 6.1 获取所有团队列表

**请求示例：**
```http
GET /api/mcp/v1/teams/list

Headers:
  Authorization: Bearer {your_token}
  Content-Type: application/json
```

**返回示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "team_ids": "1",
      "team_name": "上海发行项目部",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "2",
      "team_name": "广告投放一部（杭州）",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "209",
      "team_name": "广州发行二部",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "221",
      "team_name": "广州发行一部",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "244",
      "team_name": "创新部",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "247",
      "team_name": "飞涛",
      "query_start_date": "2025-01-01"
    },
    {
      "team_ids": "248",
      "team_name": "市场部",
      "query_start_date": "2025-01-01"
    }
  ]
}
```

### 6.2 根据团队名称查询团队ID

**请求示例：**
```http
GET /api/mcp/v1/teams/match?name=杭州投放

Headers:
  Authorization: Bearer {your_token}
  Content-Type: application/json
```

**返回示例（精确匹配）：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "team_ids": "2",
    "team_name": "广告投放一部（杭州）",
    "query_start_date": "2025-01-01",
    "match_type": "exact"
  }
}
```

**返回示例（模糊匹配）：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "team_ids": "2",
    "team_name": "广告投放一部（杭州）",
    "query_start_date": "2025-01-01",
    "match_type": "fuzzy",
    "matched_aliases": ["杭州投放", "杭州"]
  }
}
```

**返回示例（歧义匹配）：**
```json
{
  "code": 0,
  "message": "ambiguous_match",
  "data": [
    {
      "team_ids": "1",
      "team_name": "上海发行项目部",
      "match_score": 0.5
    },
    {
      "team_ids": "221",
      "team_name": "广州发行一部",
      "match_score": 0.5
    }
  ],
  "message": "输入''一部''匹配到多个团队，请选择：1.上海发行项目部 2.广州发行一部"
}
```

**返回示例（无匹配）：**
```json
{
  "code": 404,
  "message": "team_not_found",
  "data": null,
  "message": "未找到匹配的团队''XXX''，请检查输入"
}
```

---

## 七、字段说明

### 7.1 返回字段说明

| 字段名称 | 类型 | 说明 | 示例 |
|---------|------|------|------|
| **code** | Integer | 响应状态码，0表示成功 | 0 |
| **message** | String | 响应消息 | "success" / "ambiguous_match" / "team_not_found" |
| **data** | Object/Array | 返回数据，可能为单个团队对象或团队数组 | 见下方示例 |

### 7.2 团队对象字段

| 字段名称 | 类型 | 说明 | 示例 |
|---------|------|------|------|
| **team_ids** | String | 团队ID，数字类型字符串 | "1" / "2" / "209" |
| **team_name** | String | 团队名称 | "上海发行项目部" |
| **query_start_date** | String | 支持报表查询的开始时间 | "2025-01-01" |
| **match_type** | String | 匹配类型（仅在匹配接口中返回）<br>- "exact"：精确匹配<br>- "fuzzy"：模糊匹配 | "exact" / "fuzzy" |
| **matched_aliases** | Array | 匹配到的别名列表（仅在模糊匹配时返回） | ["杭州投放", "杭州"] |
| **match_score** | Float | 匹配分数（仅在歧义匹配时返回） | 0.5 |

---

## 八、注意事项

### 8.1 权限与认证
- 需使用内部授权的API Token进行访问
- Token有效期根据公司安全策略，过期需重新申请
- 不同Token可能有不同的团队访问权限

### 8.2 数据时效性
- **更新频率**：20分钟
- **数据延迟**：团队配置变更后，最多延迟20分钟生效

### 8.3 团队名称匹配注意事项
1. **优先使用精确匹配**：尽可能使用完整的团队名称
2. **注意歧义情况**：当用户输入可能匹配多个团队时，必须返回候选列表让用户确认
3. **支持别名输入**：用户可以使用常用别名来指代团队，提高使用便利性
4. **特殊值处理**："所有投放"、"全部"等特殊值需要特别处理

### 8.4 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 0 | 成功 | - |
| 400 | 参数错误 | 检查参数格式、必填项是否完整 |
| 401 | 未授权 | Token无效或已过期，需重新获取 |
| 403 | 权限不足 | 无该团队的数据访问权限 |
| 404 | 团队未找到 | 检查团队名称是否正确，或查看完整的团队列表 |
| 429 | 请求超频 | 降低请求频率，避免超过并发限制 |
| 500 | 服务器错误 | 联系技术支持 |

---

## 九、最佳实践

### 9.1 团队名称匹配建议

1. **缓存团队列表**：在客户端缓存团队列表，减少重复查询
2. **实时匹配**：在用户输入时实时提供匹配建议，提升用户体验
3. **歧义提示**：当匹配到多个团队时，主动提示用户选择具体团队
4. **默认值处理**：当用户不指定团队时，默认查询所有团队或使用用户常用的团队

### 9.2 错误处理建议

1. **友好提示**：当团队未找到时，提示用户查看完整的团队列表
2. **模糊建议**：当精确匹配失败时，提供模糊匹配的建议列表
3. **智能纠错**：当用户输入的团队名称有拼写错误时，提供纠错建议

### 9.3 使用场景示例

#### 场景1：用户查询数据报表
- **用户输入**："杭州投放"
- **系统处理**：
  1. 匹配团队ID：team_ids=2
  2. 构建查询：`{"field": "team_ids", "operator": "eq", "value": "2"}`
  3. 返回杭州投放团队的数据报表

#### 场景2：用户查询多个团队数据
- **用户输入**："广州二部和杭州一部"
- **系统处理**：
  1. 匹配团队ID：team_ids=209, 2
  2. 构建查询：`{"field": "team_ids", "operator": "in", "value": "209,2"}`
  3. 返回两个团队的数据报表

#### 场景3：用户查询所有投放数据
- **用户输入**："所有投放"或"全部"
- **系统处理**：
  1. 识别为特殊值
  2. 构建查询：`{"field": "team_ids", "operator": "eq", "value": "MAINLAND"}`
  3. 返回所有投放团队的数据报表

---

## 附录：团队名称快速参考

### A.1 常用团队ID速查表

| 用户常用输入 | 团队ID | 团队全称 | Filter配置 |
|-------------|--------|---------|-----------|
| 上海投放、上海 | 1 | 上海发行项目部 | `{"field": "team_ids", "operator": "eq", "value": "1"}` |
| 杭州投放、杭州、杭州投放一部 | 2 | 广告投放一部（杭州） | `{"field": "team_ids", "operator": "eq", "value": "2"}` |
| 广州投放、广州投放一部、广州一部 | 221 | 广州发行一部 | `{"field": "team_ids", "operator": "eq", "value": "221"}` |
| 广州二部、广州投放二部 | 209 | 广州发行二部 | `{"field": "team_ids", "operator": "eq", "value": "209"}` |
| 所有投放、全部、全部团队 | MAINLAND | 所有投放团队 | `{"field": "team_ids", "operator": "eq", "value": "MAINLAND"}` |

### A.2 歧义提示模板

当匹配到多个团队时，使用以下模板提示用户：

```
您的输入"XXX"匹配到多个团队，请选择：
1. 上海发行项目部 (ID: 1)
2. 广告投放一部（杭州） (ID: 2)
3. 广州发行一部 (ID: 221)
...
请回复团队编号或更具体的团队名称
```

### A.3 无匹配提示模板

当未找到匹配的团队时，使用以下模板提示用户：

```
未找到匹配的团队"XXX"，请尝试：
1. 使用完整的团队名称
2. 查看所有可用团队列表：[团队列表]
3. 使用常用别名：[常用别名列表]
```

---

*文档版本：V1.2*
*更新日期：2026-03-26*
*维护方：数据平台团队*
', 1, 27, '元数据-广告团队表', '2026-03-25 23:03:19', '2026-03-30 13:18:50');

-- ---------- mcp_tool_parameter ----------
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'dateType', 'timeGranularity', '统计周期，决定数据聚合的时间粒度。
可选值：日报(DAY)、周报(NATURAL_WEEK)、月报(NATURAL_MONTH)
默认日报。', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'mediaId', 'mediaId', '媒体ID筛选，可先尝试通过 list_media 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'organic', 'organic', '是否包含自然量：是(1)、否(0) 如果要筛选自然量数据，该字段需要是1 结合 筛选字段筛选. ', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'subGroup', 'groupBy', '数据聚合维度：应用类型(app_package_type)、媒体(media_id)、团队(team_ids)、应用类型+团队(app_package_type,team_ids)、应用类型+媒体(app_package_type,media_id)、团队+媒体(media_id,team_ids)', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'appPackageType', 'appPackageType', '应用类型筛选，可先尝试通过 list_app_package_type 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdDayReportTool#tool', 'teamIds', 'teamIds', '团队ID筛选，可先尝试通过 list_team 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据。小时报表startDate和endDate需要是同一天', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。小时报表startDate和endDate需要是同一天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'timeType', 'timeType', '指定小时/日报表类型，小时报表默认传小时，即timeType=HOURLY。 默认会返回这天的全部小时数据', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'baseTimeType', 'baseTimeType', '指定时间视角类型，用于区分广告小时报表按时段看数据还是按天累计看数据。支持 EVENT_TIME、REGISTER_TIME。EVENT_TIME 表示按天累计口径，查看截至某小时的当日累计表现，该口径数据本身已按截止时段累计汇总，适合分析当天整体表现，如非用户明确要求，返回结果不要额外累计，否则是二次累计或合计了。REGISTER_TIME 表示按时段口径，查看某个时段新增用户在今天的转化情况，适合分析各时段新用户质量；当用户询问某时段数据时优先使用该口径。按天累计口径下，注册转化指标如首日付费、有效、创角按对应事件发生时间统计，激活转化指标如首日注册设备数按注册时间汇总到小时粒度。按时段口径下，激活转化指标按激活时间归属时段，注册转化指标按注册时间归属时段，仅统计该时段新增用户的转化。返回结果时最好注明使用的口径。', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'subGroup', 'subGroup', '细分类型，填 media_id 时按媒体细分，若看细分维度整天合计数据，则同时传 viewCriteria=CURRENT_SUMMARY ；若查看细分维度某小时数据，则同时传dh=相应小时，不传viewCriteria', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'viewCriteria', 'viewCriteria', '视角，subGroup 有值时且按细分维度查询整天合计数据时，传固定值 CURRENT_SUMMARY，意思是查看整天汇总数据', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'dh', 'dh', '小时，格式 ''2026-03-16 03:00''，只有当 subGroup=media_id 且查看细分维度指定小时数据 时必传，其他场景下不要传', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'appPackageType', 'appPackageType', '应用类型筛选，可先尝试通过 list_app_package_type 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'mediaId', 'mediaId', '媒体ID筛选，可先尝试通过 list_media 接口获取实际code', 9, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdHourReportTool#tool', 'teamIds', 'teamIds', '团队ID过滤，数字类型，多个媒体用逗号分割，可先尝试通过 list_team 接口获取实际code', 10, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdOsTypeTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'dataType', 'dataType', '留存类型：新增设备留存(DEVICE_RETENTION)、注册用户留存(REG_RETENTION)、首日付费账号留存(PAY_D1_RETENTION)', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'dateType', 'dateType', '报表类型：日报(DAY)、周报(NATURAL_WEEK)、月报(NATURAL_MONTH)', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'appPackageType', 'appPackageType', '应用类型筛选，可先尝试通过 list_app_package_type 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'teamIds', 'teamIds', '团队ID过滤，数字类型，多个媒体用逗号分割，可先尝试通过 list_team 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'mediaId', 'mediaId', '媒体ID筛选，可先尝试通过 list_media 接口获取实际code', 11, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'organic', 'organic', '是否包含自然量：是(1)、否(0)，如果要筛选自然量数据，该字段需要是1 结合 筛选字段筛选. ', 12, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRetentionReportTool#tool', 'subGroup', 'subGroup', '报表类型：应用类型(app_package_type)、媒体(media_id)、团队(team_ids)、应用类型+团队(app_package_type,team_ids)、应用类型+媒体(app_package_type,media_id)、团队+媒体(media_id,team_ids)', 13, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'dataType', 'dataType', 'ROI类型：区间ROI(section)、累计ROI(total)', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'dateType', 'dateType', '报表类型：日报(DAY)、周报(NATURAL_WEEK)、月报(NATURAL_MONTH)', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'appPackageType', 'appPackageType', '应用类型筛选，可先尝试通过 list_app_package_type 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'teamIds', 'teamIds', '团队ID过滤，数字类型，多个媒体用逗号分割，可先尝试通过 list_team 接口获取实际code', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'mediaId', 'mediaId', '媒体ID筛选，可先尝试通过 list_media 接口获取实际code', 11, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'organic', 'organic', '是否包含自然量：是(1)、否(0).如果要筛选自然量数据，该字段需要是1 结合 筛选字段筛选. ', 12, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdRoiReportTool#tool', 'subGroup', 'subGroup', '报表类型：应用类型(app_package_type)、媒体(media_id)、团队(team_ids)、应用类型+团队(app_package_type,team_ids)、应用类型+媒体(app_package_type,media_id)、团队+媒体(media_id,team_ids)', 13, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AdTeamTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.ad.AppPackageTypeTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportDayTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportMonthTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportSummaryTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportSummaryTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportSummaryTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportSummaryTool#tool', 'dataSwitch', 'dataSwitch', '报表类型：日报/周报/月报', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.adreport.AdReportWeekTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'group', 'groupBy', '数据聚合维度，可选值：''日期'' /''终端'' / ''媒体'' / ''地区''', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionDayTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'group', 'groupBy', '数据聚合维度，可选值：''日期'' /''终端'' / ''媒体'' / ''地区''', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionMonthTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'group', 'groupBy', '数据聚合维度，可选值：''日期'' /''终端'' / ''媒体'' / ''地区''', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.retention.AdOverseaRetentionWeekTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiDayTool#tool', 'dataSwitch', 'metricType', '核心指标类型，决定返回的指标是 ROI 还是 ARPU。
可选值：
• ROI – 投资回报率（Return on Investment）
• ARPU – 每用户平均收入（Average Revenue Per User）
默认值：ROI', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'dataSwitch', 'metricType', '核心指标类型，决定返回的指标是 ROI 还是 ARPU。
可选值：
• ROI – 投资回报率（Return on Investment）
• ARPU – 每用户平均收入（Average Revenue Per User）
默认值：ROI', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiMonthTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''媒体'' / ''地区''', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'dataSwitch', 'metricType', '核心指标类型，决定返回的指标是 ROI 还是 ARPU。
可选值：
• ROI – 投资回报率（Return on Investment）
• ARPU – 每用户平均收入（Average Revenue Per User）
默认值：ROI', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ad.roi.AdOverseaRoiWeekTool#tool', 'media', 'media', '媒体ID筛选，可先尝试通过 list_oversea_media 接口获取实际code', 0, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''地区''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 4, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.DayReportTool#tool', 'dataType', 'userType', '用户口径，决定返回的指标集，不传入时返回所有口径的指标。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 账户 – 按账户口径统计，返回账户相关指标（如新增账户数、活跃账户数等）
• 设备 – 按设备口径统计，返回设备相关指标（如新增设备数、活跃设备数等）
• 角色– 按角色口径统计，返回角色相关指标（如新增角色数、活跃角色数等）
默认值：账号

当list_apps返回type为hz时：
不支持传入', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''地区''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 4, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.MonthReportTool#tool', 'dataType', 'userType', '用户口径，决定返回的指标集，不传入时返回所有口径的指标。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 账户 – 按账户口径统计，返回账户相关指标（如新增账户数、活跃账户数等）
• 设备 – 按设备口径统计，返回设备相关指标（如新增设备数、活跃设备数等）
• 角色– 按角色口径统计，返回角色相关指标（如新增角色数、活跃角色数等）
默认值：账号

当list_apps返回type为hz时：
不支持传入', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.SummaryReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.SummaryReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.SummaryReportTool#tool', 'dateType', 'timeGranularity', '统计周期，决定数据聚合的时间粒度。
可选值：日报/周报/月报
默认日报。', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.SummaryReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''地区''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 4, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.day.WeekReportTool#tool', 'dataType', 'userType', '用户口径，决定返回的指标集，不传入时返回所有口径的指标。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 账户 – 按账户口径统计，返回账户相关指标（如新增账户数、活跃账户数等）
• 设备 – 按设备口径统计，返回设备相关指标（如新增设备数、活跃设备数等）
• 角色– 按角色口径统计，返回角色相关指标（如新增角色数、活跃角色数等）
默认值：账号

当list_apps返回type为hz时：
不支持传入', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 app_id', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定统计指标所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增LTV
• 回流LTV
默认值：新增LTV

当list_apps返回type为hz时：
可选值：
• 新增账号
• 首次付费用户
• 有效新用户
默认值：新增账号

不传时按对应游戏的默认值处理。', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVDayTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包'' ', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定统计指标所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增LTV
• 回流LTV
默认值：新增LTV

当list_apps返回type为hz时：
可选值：
• 新增账号
• 首次付费用户
• 有效新用户
默认值：新增账号

不传时按对应游戏的默认值处理。', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVMonthTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定统计指标所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增LTV
• 回流LTV
默认值：新增LTV

当list_apps返回type为hz时：
可选值：
• 新增账号
• 首次付费用户
• 有效新用户
默认值：新增账号

不传时按对应游戏的默认值处理。', 4, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'area', 'country', '地区筛选，仅在list_apps返回的游戏type为sh时才允许使用该参数，其他游戏不支持此筛选条件。
传入值时，需使用地区代码（非中文名称），请通过 list_country 接口获取有效的地区 code。
不传或传空表示不进行地区筛选', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.ltv.LTVWeekTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.MfChannelTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.MfCountryTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.MfMediaTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.MfOsTypeTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.MfSubChannelTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'group', 'groupBy', '细分维度：可选值 ''日期'' / ''终端'' / ''渠道'' / ''分包''三者之一，默认传''日期''', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentDayTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'group', 'groupBy', '细分维度：可选值 ''日期'' / ''终端'' / ''渠道'' / ''分包''三者之一，默认传''日期''', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentMonthTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'group', 'groupBy', '细分维度：可选值 ''日期'' / ''终端'' / ''渠道'' / ''分包''三者之一，默认传''日期''', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.pay.PaymentWeekTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.PaymentDistributionTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.PaymentDistributionTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.PaymentDistributionTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.PaymentDistributionTool#tool', 'dataSwitch', 'distributionType', '分布维度，决定数据按何种维度分组展示。
可选值：
• 用户类型分布（如新增账号、活跃账号等）
• 充值阶梯分布（按充值金额分段统计）', 3, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code，仅在list_apps返回的游戏type为hz时才允许使用该参数', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionDayTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定留存指标计算所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
默认值：新增留存

当list_apps返回type为hz时：
可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存
默认值：新设备新账号留存

不传时按对应游戏的默认值处理。', 8, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code，仅在list_apps返回的游戏type为hz时才允许使用该参数', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionMonthTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定留存指标计算所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
默认值：新增留存

当list_apps返回type为hz时：
可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存
默认值：新设备新账号留存

不传时按对应游戏的默认值处理。', 8, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionTool#tool', 'dataSwitch', 'dataSwitch', '留存类型：新设备新账号留存、新设备留存、新增账号留存、创角留存、有效新用户留存、回流留存、回流留存、首次付费留存 ，默认传: 新设备新账号留存', 8, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'appId', 'appId', '游戏应用ID，数字类型字符串，请先调用 list_apps 获取正确的 appId', 0, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'start', 'startDate', '查询开始日期，格式 yyyy-MM-dd，包含该日数据', 1, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'end', 'endDate', '查询结束日期，格式 yyyy-MM-dd，包含该日数据。与 startDate 间隔不超过90天', 2, 1, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'subGroup', 'groupBy', '数据聚合维度，可选值：''终端'' / ''渠道'' / ''分包''', 3, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'channel', 'channel', '渠道ID筛选，如查询渠道为中文，可先尝试通过 list_channel 接口获取实际code', 5, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'cpsid', 'cpsid', '分包ID筛选，如查询分包为中文，可先尝试通过 list_cpsid 接口获取实际code', 6, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'osType', 'osType', '终端类型筛选，可先尝试通过 list_ostype 接口获取实际code，仅在list_apps返回的游戏type为hz时才允许使用该参数', 7, 0, 0);
INSERT INTO mcp_tool_parameter (tool_key, schema_property, param_name, description, sort_order, is_required, deleted) VALUES ('org.dobest.ai.tool.mf.retention.RetentionWeekTool#tool', 'dataSwitch', 'userSegment', '用户群体筛选，用于指定留存指标计算所针对的用户类型。
取值规则：根据 appId 不同，可选值及默认值有所区别。

当list_apps返回type为sh时：
可选值：
• 新增留存
• 首日付费留存
• 新增有效留存
• 回流留存
默认值：新增留存

当list_apps返回type为hz时：
可选值：
• 新设备新账号留存
• 新设备留存
• 新增账号留存
• 创角留存
• 有效新用户留存
• 回流留存
• 首次付费留存
默认值：新设备新账号留存

不传时按对应游戏的默认值处理。', 8, 1, 0);
