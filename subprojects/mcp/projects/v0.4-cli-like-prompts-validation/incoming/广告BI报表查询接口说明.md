基本信息
属性
说明
接口名称
报表查询
请求方式
POST
请求路径
/v2/report/auto/{reportIds}
接口描述
获取报表V3查询SQL并执行查询
版本
3.1.3
权限要求
1 应用权限校验
2 用户权限

请求参数
Header 参数 (Head Parameters)
X-App-Id : 获取查询项目ID
Authorization：用户认证信息，获取用户团队、角色信息（网关层解析，setting服务组装用户信息，不走网关调用需要设置User_id相关的请求头）
路径参数 (Path Parameters)
参数名
类型
必填
说明
reportIds
String
是
报表ID，支持多个报表ID
请求体参数 (Request Body)
Content-Type: application/json
参数名
类型
必填
说明
start
String
否
开始时间
end
String
否
结束时间
subGroup
String
否
细分字段
timeType
String
否
时间分组类型
dataType
String
否
数据类型（根据报表定义）
filterField
Map\<String, String\>
否
筛选字段，根据page接口中的Filter按实际情况添加
page
Long
否
页码
size
Long
否
每页数量
order
String
否
排序方式
cmpStart
String
否
对比开始时间
cmpEnd
String
否
对比结束时间
viewCriteria
String
否
视图条件
routeKey
String
否
自定义配置路由
请求示例
{
    "isDevide": "0",
    "filterField": {
        "metric_definition_type": "COMMON,RESERVE_COMPOSITE",
        "promotion_source": "AD"
    },
    "start": "2026-01-05",
    "end": "2026-04-09",
    "timeType": "NATURAL_WEEK",
    "routeKey": "page-5_NATURAL_WEEK_5"
}

响应参数
响应结构
参数名
类型
说明
code
Integer
响应状态码
msg
String
响应消息
data
AutoReportResp
响应数据
AutoReportResp 结构
参数名
类型
说明
reportDetails
Map\<Long, ReportResp\>
报表详情，Key为报表ID
ReportResp 结构
参数名
类型
说明
reportName
String
报表名称
pageId
Long
页面ID
reportSchema
ReportSchemaResp
报表Schema配置
columnConfig
List\<RptColumnConfigDTO\>
列配置信息
customConfig
ReportCustomConfigResp
自定义分组配置
tableContent
List\<Map\<String, Object\>\>
数据内容
missTableContent
List\<Map\<String, Object\>\>
补充的数据内容
tableSummary
Map\<String, Object\>
汇总行数据
page
PageInfo
分页信息
cmpTableSummary
Map\<String, Object\>
对比汇总行数据
cmpTableContent
List\<Map\<String, Object\>\>
对比数据内容
missCmpTableContent
List\<Map\<String, Object\>\>
补充的对比数据内容
sqlDetail
Map\<String, String\>
SQL详情
响应示例
{
    "code": 200,
    "msgTitle": "获取报表V3查询SQL",
    "msgTitleDetail": "",
    "msg": "OK",
    "requestId": "1afec76f1b9b6649e5d0b2d92a6a45fe",
    "data": {
        "reportDetails": {
            "5": {
                "reportName": "日周月报",
                "reportSchema": {
                    "reportName": "日周月报",
                    "defaultOrderField": [
                        {
                            "columnKey": "dt",
                            "orderType": "desc",
                            "sortPriority": 1
                        },
                        {
                            "columnKey": "rebate_cost_amount",
                            "orderType": "desc",
                            "sortPriority": 3
                        }
                    ],
                    "backendPage": true
                },
                "columnConfig": [
                    {
                        "columnName": "日期",
                        "columnKey": "dt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "fixedField": true,
                            "sortPriority": 1,
                            "sortMethod": "string",
                            "hidden": false,
                            "sortOrder": "descend",
                            "width": 130,
                            "tooltip": "包含今日数据",
                            "align": "left"
                        },
                        "colDataType": "date",
                        "columnType": "DIM"
                    },
                    {
                        "columnName": "消耗",
                        "columnKey": "cost_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "width": 120,
                            "tooltip": "消耗",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "折后消耗",
                        "columnKey": "rebate_cost_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "sortPriority": 3,
                            "sortMethod": "number",
                            "sortOrder": "descend",
                            "width": 120,
                            "tooltip": "折后消耗=消耗/(1+折扣)；折扣信息来自代理商合同信息，目的是为了对比各媒体的广告数据效果",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "激活数",
                        "columnKey": "composite_act_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "新设备数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "激活成本",
                        "columnKey": "composite_act_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "折后消耗/新设备数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日注册设备数",
                        "columnKey": "composite_reg_d1_new_device_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "当日激活当日注册",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "新设备老账号占比",
                        "columnKey": "composite_act_old_user_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "当日激活但登录了老账号的设备数/激活数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "注册设备成本",
                        "columnKey": "composite_reg_d1_new_device_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "该时段的折后消耗/该时段的首日注册设备数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "注册数",
                        "columnKey": "composite_reg_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "该时段的注册账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日注册率",
                        "columnKey": "composite_reg_d1_new_device_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "首日注册设备数/激活数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "注册成本",
                        "columnKey": "composite_reg_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "折后消耗/注册账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "创角账号数",
                        "columnKey": "composite_create_role_d1_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "首日创角账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "创角率",
                        "columnKey": "composite_create_role_d1_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "首日创角账号数/该时段的注册账号数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "创角成本",
                        "columnKey": "composite_create_role_d1_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "该时段的折后消耗/该时段的首日创角账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "有效数",
                        "columnKey": "composite_effective_d1_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "今天达到有效条件的账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "有效率",
                        "columnKey": "composite_effective_d1_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "有效账号数/该时段的注册账号数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "有效成本",
                        "columnKey": "composite_effective_d1_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "该时段的折后消耗/该时段的有效账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日付费账号数",
                        "columnKey": "composite_pay_d1_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "首日付费的账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日付费率",
                        "columnKey": "composite_pay_d1_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "首日付费的账号数/该时段的注册账号数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日付费金额数",
                        "columnKey": "composite_pay_d1_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "注册首日付费的金额",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日付费成本",
                        "columnKey": "composite_pay_d1_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "折后消耗/首日付费账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日ROI",
                        "columnKey": "composite_d1_roi_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "首日付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首周ROI",
                        "columnKey": "w_roi1_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": false,
                            "tooltip": "首周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首月ROI",
                        "columnKey": "composite_roi_m1_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "按月查看时，每个月的全部广告激活在当月的付费金额/当月的折后消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "2周ROI",
                        "columnKey": "w_roi2_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "2周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "3周ROI",
                        "columnKey": "w_roi3_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "3周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "4周ROI",
                        "columnKey": "w_roi4_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "4周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "5周ROI",
                        "columnKey": "w_roi5_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "5周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "6周ROI",
                        "columnKey": "w_roi6_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "6周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "7周ROI",
                        "columnKey": "w_roi7_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "tooltip": "7周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "8周ROI",
                        "columnKey": "w_roi8_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "8周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "9周ROI",
                        "columnKey": "w_roi9_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "9周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "10周ROI",
                        "columnKey": "w_roi10_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "10周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "11周ROI",
                        "columnKey": "w_roi11_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "11周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "12周ROI",
                        "columnKey": "w_roi12_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "12周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "13周ROI",
                        "columnKey": "w_roi13_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "13周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "tag": {
                            "type": "METRIC_CONTANT_RT",
                            "targetKey": "dt",
                            "target": [
                                "2026-01-12~2026-01-18"
                            ]
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "14周ROI",
                        "columnKey": "w_roi14_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "14周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "tag": {
                            "type": "METRIC_CONTANT_RT",
                            "targetKey": "dt",
                            "target": [
                                "2026-01-05~2026-01-11"
                            ]
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "15周ROI",
                        "columnKey": "w_roi15_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "15周付费金额/消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "累计付费数",
                        "columnKey": "composite_start_total_pay_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "所查看日期的消耗，在指定日期范围的累计付费账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "累计付费金额",
                        "columnKey": "composite_start_total_pay_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "所查看日期的消耗，在指定日期范围的累计付费金额",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首月付费金额",
                        "columnKey": "composite_pay_m1_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "按月查看时，每个月的全部广告激活在当月的累计付费金额",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日ARPU",
                        "columnKey": "composite_arpu_d1_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "当前时段的首日付费金额/当前时段的注册账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "首日ARPPU",
                        "columnKey": "composite_arppu_d1_amount",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "首日付费金额/首日付费数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "次留数",
                        "columnKey": "composite_retention_d2_cnt",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "注册账号在次日登录的账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "次留率",
                        "columnKey": "composite_retention_d2_rate",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": "true",
                            "tooltip": "次留数/注册账号数",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "次留成本",
                        "columnKey": "composite_retention_d2_cost",
                        "nameGroup": "拉新指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "消耗/次留数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "启动设备数",
                        "columnKey": "composite_active_device_cnt",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "广告当日活跃用户启动事件的设备数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "登录账号数",
                        "columnKey": "composite_login_user_cnt",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "广告当日活跃用户登录事件的账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "付费数",
                        "columnKey": "composite_pay_cnt",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "广告当日活跃用户付费事件的账号数",
                            "format": {
                                "use_group": true,
                                "dot": 0,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "总付费金额（广告流水）",
                        "columnKey": "composite_pay_amount",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "广告当日活跃用户产生的总付费金额",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "活跃ARPU",
                        "columnKey": "composite_arpu_amount",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "总付费金额（广告流水）/登录账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "活跃ARPPU",
                        "columnKey": "composite_arppu_amount",
                        "nameGroup": "活跃指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "总付费金额（广告流水）/付费账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金消耗",
                        "columnKey": "cash_cost_amount",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "广告消耗-赠款消耗，数据次日8:00更新，不包含手动上传的现金消耗，因此可能会出现比现金折后消耗小的情况",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            },
                            "version": "3.12.6"
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金折后消耗",
                        "columnKey": "rebate_cash_cost_amount",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "（广告消耗-赠款消耗） /（1+代理商返点），数据来源智投（次日8点更新，另可勾选查看折后消耗指标）",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金激活成本",
                        "columnKey": "composite_act_cash_cost",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "现金折后消耗 / 激活数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金注册成本",
                        "columnKey": "composite_reg_cash_cost",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "现金折后消耗 / 注册账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金创角成本",
                        "columnKey": "composite_create_role_d1_cash_cost",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "现金折后消耗 / 创角账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金有效成本",
                        "columnKey": "composite_effective_d1_cash_cost",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "现金折后消耗 / 有效账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金首日付费成本",
                        "columnKey": "composite_pay_d1_cash_cost",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "现金折后消耗 / 首日付费账号数",
                            "format": {
                                "use_group": true,
                                "dot": 2,
                                "type": "decimal"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金首日ROI",
                        "columnKey": "composite_d1_roi_cash_rate",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "首日付费金额 / 现金折后消耗",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    },
                    {
                        "columnName": "现金累计ROI",
                        "columnKey": "composite_start_total_roi_cash_rate",
                        "nameGroup": "现金指标",
                        "styleConfig": {
                            "hidden": true,
                            "tooltip": "累计付费金额 / 现金折后消耗 ",
                            "format": {
                                "dot": 2,
                                "type": "percent"
                            }
                        },
                        "colDataType": "String",
                        "columnType": "METRIC"
                    }
                ],
                "customConfig": {
                    "routeKey": "page-5_NATURAL_WEEK_5",
                    "currentGroup": "可添加列",
                    "defaultGroup": "可添加列",
                    "globalConfig": {},
                    "columnConfigGroups": [
                        {
                            "groupName": "可添加列",
                            "columnConfigs": [
                                {
                                    "columnKey": "dt",
                                    "styleConfig": {
                                        "hidden": false,
                                        "index": 0
                                    }
                                },
                                {
                                    "columnKey": "cost_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 1
                                    }
                                },
                                {
                                    "columnKey": "rebate_cost_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 2
                                    }
                                },
                                {
                                    "columnKey": "composite_act_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 3
                                    }
                                },
                                {
                                    "columnKey": "composite_act_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 4
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_d1_new_device_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 5
                                    }
                                },
                                {
                                    "columnKey": "composite_act_old_user_rate",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_d1_new_device_rate",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 6
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_d1_new_device_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 8
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 9
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 10
                                    }
                                },
                                {
                                    "columnKey": "composite_create_role_d1_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 11
                                    }
                                },
                                {
                                    "columnKey": "composite_create_role_d1_rate",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 12
                                    }
                                },
                                {
                                    "columnKey": "composite_create_role_d1_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 13
                                    }
                                },
                                {
                                    "columnKey": "composite_effective_d1_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 14
                                    }
                                },
                                {
                                    "columnKey": "composite_effective_d1_rate",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 15
                                    }
                                },
                                {
                                    "columnKey": "composite_effective_d1_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 16
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_d1_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 17
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_d1_rate",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 18
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_d1_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 19
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_d1_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 20
                                    }
                                },
                                {
                                    "columnKey": "composite_d1_roi_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi1_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "composite_roi_m1_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi2_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi3_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi4_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi5_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi6_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi7_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi8_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi9_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi10_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi11_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi12_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi13_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi14_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "w_roi15_rate",
                                    "styleConfig": {
                                        "hidden": false
                                    }
                                },
                                {
                                    "columnKey": "composite_start_total_pay_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 22
                                    }
                                },
                                {
                                    "columnKey": "composite_start_total_pay_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 23
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_m1_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 24
                                    }
                                },
                                {
                                    "columnKey": "composite_arpu_d1_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 26
                                    }
                                },
                                {
                                    "columnKey": "composite_arppu_d1_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 27
                                    }
                                },
                                {
                                    "columnKey": "composite_retention_d2_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 28
                                    }
                                },
                                {
                                    "columnKey": "composite_retention_d2_rate",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 29
                                    }
                                },
                                {
                                    "columnKey": "composite_retention_d2_cost",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 30
                                    }
                                },
                                {
                                    "columnKey": "composite_active_device_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 31
                                    }
                                },
                                {
                                    "columnKey": "composite_login_user_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 32
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_cnt",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 33
                                    }
                                },
                                {
                                    "columnKey": "cash_cost_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 34
                                    }
                                },
                                {
                                    "columnKey": "rebate_cash_cost_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 35
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 36
                                    }
                                },
                                {
                                    "columnKey": "composite_arpu_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 37
                                    }
                                },
                                {
                                    "columnKey": "composite_arppu_amount",
                                    "styleConfig": {
                                        "hidden": true,
                                        "index": 38
                                    }
                                },
                                {
                                    "columnKey": "composite_act_cash_cost",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_reg_cash_cost",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_create_role_d1_cash_cost",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_effective_d1_cash_cost",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_pay_d1_cash_cost",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_d1_roi_cash_rate",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                },
                                {
                                    "columnKey": "composite_start_total_roi_cash_rate",
                                    "styleConfig": {
                                        "hidden": true
                                    }
                                }
                            ]
                        }
                    ]
                },
                "tableContent": [
                    {
                        "composite_effective_d1_rate": 0,
                        "composite_reg_cost": 0,
                        "roi16_rate": 0,
                        "w_roi2_rate": 0,
                        "roi5_pay_amount": 0,
                        "composite_create_role_d1_cash_cost": 0,
                        "m_roi7_pay_amount": 0,
                        "consuming_composite_pay_d1_cnt": 0,
                        "roi28_pay_amount": 0,
                        "m_roi12_rate": 0,
                        "composite_d1_roi_rate": 0,
                        "m_roi7_rate": 0,
                        "roi18_pay_amount": 0,
                        "roi5_rate": 0,
                        "loading_conversion_cost": 0,
                        "consuming_downloader_cnt": 0,
                        "w_roi5_pay_amount": 0,
                        "w_roi12_pay_amount": 0,
                        "composite_pay_amount": 0,
                        "composite_start_total_pay_amount": 0,
                        "m_roi5_rate": 0,
                        "roi3_rate": 0,
                        "roi12_pay_amount": 0,
                        "roi22_pay_amount": 0,
                        "m_roi8_pay_amount": 0,
                        "m_roi3_rate": 0,
                        "w_roi8_cost_amount": 0,
                        "w_roi4_rate": 0,
                        "w_roi7_cost_amount": 0,
                        "w_roi11_pay_amount": 0,
                        "w_roi6_cost_amount": 0,
                        "w_roi3_cost_amount": 0,
                        "w_roi5_cost_amount": 0,
                        "roi21_rate": 0,
                        "composite_retention_d2_rate": 0,
                        "w_roi4_cost_amount": 0,
                        "w_roi11_rate": 0,
                        "composite_reg_cash_cost": 0,
                        "bootstrapper_act_cost": 0,
                        "w_roi1_cost_amount": 0,
                        "downloader_cnt": 0,
                        "w_roi2_cost_amount": 0,
                        "roi28_rate": 0,
                        "roi7_rate": 0,
                        "roi18_rate": 0,
                        "m_roi10_rate": 0,
                        "consuming_ago1_composite_start_total_pay_amount": 0,
                        "m_roi6_pay_amount": 0,
                        "downloader_act_cost": 0,
                        "w_roi13_pay_amount": 0,
                        "m_roi12_pay_amount": 0,
                        "consuming_composite_reg_cnt": 0,
                        "roi12_rate": 0,
                        "m_roi9_rate": 0,
                        "consuming_composite_reg_d1_new_device_cnt": 0,
                        "loading_change_cnt": 0,
                        "w_roi15_cost_amount": null,
                        "composite_pay_d1_rate": 0,
                        "composite_retention_d2_cnt": 0,
                        "composite_pay_m1_amount": 0,
                        "roi25_rate": 0,
                        "consuming_composite_effective_d1_cnt": 0,
                        "bootstrapper_cnt": 0,
                        "w_roi7_rate": 0,
                        "w_roi11_cost_amount": 0,
                        "roi11_rate": 0,
                        "dt": "2026-01-12~2026-01-18",
                        "roi10_rate": 0,
                        "w_roi14_rate": null,
                        "roi19_cost_amount": 0,
                        "w_roi13_cost_amount": 0,
                        "roi17_cost_amount": 0,
                        "roi14_pay_amount": 0,
                        "roi22_cost_amount": 0,
                        "roi26_cost_amount": 0,
                        "roi11_cost_amount": 0,
                        "roi15_cost_amount": 0,
                        "composite_start_total_pay_cnt": 0,
                        "m_roi3_pay_amount": 0,
                        "m_roi2_rate": 0,
                        "roi24_cost_amount": 0,
                        "roi21_pay_amount": 0,
                        "roi13_cost_amount": 0,
                        "roi27_rate": 0,
                        "consuming_ago1_composite_act_cnt": 1,
                        "w_roi9_cost_amount": 0,
                        "w_roi12_rate": 0,
                        "roi20_cost_amount": 0,
                        "roi4_pay_amount": 0,
                        "roi29_pay_amount": 0,
                        "roi30_rate": 0,
                        "consuming_composite_retention_d2_cnt": 0,
                        "w_roi6_pay_amount": 0,
                        "m_roi8_cost_amount": 0,
                        "composite_effective_d1_cnt": 0,
                        "roi23_pay_amount": 0,
                        "composite_roi_m1_rate": 0,
                        "composite_pay_d1_cnt": 0,
                        "roi6_pay_amount": 0,
                        "roi9_cost_amount": 0,
                        "m_roi11_cost_amount": 0,
                        "composite_pay_d1_amount": 0,
                        "consuming_composite_pay_m1_amount": 0,
                        "roi5_cost_amount": 0,
                        "w_roi6_rate": 0,
                        "composite_act_cnt": 1,
                        "roi26_rate": 0,
                        "roi7_cost_amount": 0,
                        "roi27_pay_amount": 0,
                        "w_roi2_pay_amount": 0,
                        "composite_reg_d1_new_device_cost": 0,
                        "w_roi4_pay_amount": 0,
                        "w_roi13_rate": 0,
                        "composite_create_role_d1_cost": 0,
                        "composite_pay_d1_cash_cost": 0,
                        "roi20_rate": 0,
                        "roi3_cost_amount": 0,
                        "roi8_pay_amount": 0,
                        "roi16_pay_amount": 0,
                        "m_roi6_rate": 0,
                        "consuming_loading_change_cnt": 0,
                        "rebate_cash_cost_amount": 0,
                        "roi6_rate": 0,
                        "roi25_pay_amount": 0,
                        "w_roi15_pay_amount": null,
                        "consuming_ago1_composite_create_role_d1_cnt": 0,
                        "roi15_pay_amount": 0,
                        "composite_effective_d1_cost": 0,
                        "w_roi1_rate": 0,
                        "m_roi4_pay_amount": 0,
                        "roi17_rate": 0,
                        "roi2_pay_amount": 0,
                        "composite_pay_cnt": 0,
                        "rebate_cost_amount": 0,
                        "m_roi10_pay_amount": 0,
                        "m_roi8_rate": 0,
                        "composite_arppu_d1_amount": 0,
                        "w_roi8_pay_amount": 0,
                        "m_roi2_cost_amount": 0,
                        "m_roi3_cost_amount": 0,
                        "loading_conversion_rate": 0,
                        "cost_amount": 0,
                        "m_roi6_cost_amount": 0,
                        "m_roi11_rate": 0,
                        "m_roi5_cost_amount": 0,
                        "m_roi4_cost_amount": 0,
                        "roi30_cost_amount": 0,
                        "composite_act_cash_cost": 0,
                        "composite_retention_d2_cost": 0,
                        "m_roi11_pay_amount": 0,
                        "roi22_rate": 0,
                        "team_ids": "未知",
                        "consuming_ago1_composite_pay_d1_amount": 0,
                        "bootstrapper_act_rate": 0,
                        "m_roi5_pay_amount": 0,
                        "consuming_composite_pay_d1_amount": 0,
                        "w_roi9_pay_amount": 0,
                        "composite_arpu_amount": 0,
                        "w_roi5_rate": 0,
                        "composite_create_role_d1_cnt": 0,
                        "roi29_cost_amount": 0,
                        "roi20_pay_amount": 0,
                        "roi10_pay_amount": 0,
                        "roi30_pay_amount": 0,
                        "roi27_cost_amount": 0,
                        "consuming_ago1_composite_effective_d1_cnt": 0,
                        "roi28_cost_amount": 0,
                        "roi4_rate": 0,
                        "roi15_rate": 0,
                        "composite_act_old_user_cnt": 0,
                        "composite_arpu_d1_amount": 0,
                        "cash_cost_amount": 0,
                        "composite_retention_reg_cnt": 0,
                        "w_roi14_pay_amount": null,
                        "downloader_act_rate": 0,
                        "loading_open_cnt": 0,
                        "consuming_composite_create_role_d1_cnt": 0,
                        "consuming_composite_act_cnt": 1,
                        "composite_pay_d1_cost": 0,
                        "w_roi10_cost_amount": 0,
                        "composite_start_total_roi_cash_rate": 0,
                        "w_roi8_rate": 0,
                        "w_roi12_cost_amount": 0,
                        "w_roi1_pay_amount": 0,
                        "roi18_cost_amount": 0,
                        "w_roi14_cost_amount": null,
                        "roi25_cost_amount": 0,
                        "roi3_pay_amount": 0,
                        "roi14_cost_amount": 0,
                        "roi16_cost_amount": 0,
                        "m_roi12_cost_amount": 0,
                        "roi11_pay_amount": 0,
                        "m_roi9_pay_amount": 0,
                        "roi12_cost_amount": 0,
                        "roi23_cost_amount": 0,
                        "roi24_rate": 0,
                        "consuming_ago1_composite_reg_cnt": 0,
                        "composite_arppu_amount": 0,
                        "w_roi15_rate": null,
                        "composite_reg_d1_new_device_cnt": 0,
                        "roi21_cost_amount": 0,
                        "w_roi10_pay_amount": 0,
                        "composite_effective_d1_cash_cost": 0,
                        "roi10_cost_amount": 0,
                        "m_roi2_pay_amount": 0,
                        "w_roi7_pay_amount": 0,
                        "consuming_bootstrapper_cnt": 0,
                        "w_roi3_pay_amount": 0,
                        "consuming_ago1_composite_pay_d1_cnt": 0,
                        "m_roi9_cost_amount": 0,
                        "roi19_pay_amount": 0,
                        "roi14_rate": 0,
                        "m_roi7_cost_amount": 0,
                        "roi19_rate": 0,
                        "composite_active_device_cnt": 5,
                        "roi9_rate": 0,
                        "roi13_pay_amount": 0,
                        "roi9_pay_amount": 0,
                        "m_roi4_rate": 0,
                        "retention_rebate_cost_amount": 0,
                        "roi2_rate": 0,
                        "roi13_rate": 0,
                        "composite_act_cost": 0,
                        "m_roi10_cost_amount": 0,
                        "roi8_rate": 0,
                        "composite_reg_cnt": 0,
                        "roi4_cost_amount": 0,
                        "w_roi3_rate": 0,
                        "roi24_pay_amount": 0,
                        "w_roi9_rate": 0,
                        "w_roi10_rate": 0,
                        "roi8_cost_amount": 0,
                        "roi17_pay_amount": 0,
                        "roi29_rate": 0,
                        "roi6_cost_amount": 0,
                        "roi7_pay_amount": 0,
                        "composite_create_role_d1_rate": 0,
                        "composite_login_user_cnt": 0,
                        "loading_peop_cnt": 0,
                        "composite_d1_roi_cash_rate": 0,
                        "composite_reg_d1_new_device_rate": 0,
                        "roi26_pay_amount": 0,
                        "roi23_rate": 0,
                        "roi2_cost_amount": 0,
                        "composite_act_old_user_rate": 0
                    },
                    {
                        "composite_effective_d1_rate": 0,
                        "composite_reg_cost": 0,
                        "roi16_rate": 0,
                        "w_roi2_rate": 0,
                        "roi5_pay_amount": 0,
                        "composite_create_role_d1_cash_cost": 0,
                        "m_roi7_pay_amount": 0,
                        "consuming_composite_pay_d1_cnt": 0,
                        "roi28_pay_amount": 0,
                        "m_roi12_rate": 0,
                        "composite_d1_roi_rate": 0,
                        "m_roi7_rate": 0,
                        "roi18_pay_amount": 0,
                        "roi5_rate": 0,
                        "loading_conversion_cost": 0,
                        "consuming_downloader_cnt": 0,
                        "w_roi5_pay_amount": 0,
                        "w_roi12_pay_amount": 0,
                        "composite_pay_amount": 0,
                        "composite_start_total_pay_amount": 0,
                        "m_roi5_rate": 0,
                        "roi3_rate": 0,
                        "roi12_pay_amount": 0,
                        "roi22_pay_amount": 0,
                        "m_roi8_pay_amount": 0,
                        "m_roi3_rate": 0,
                        "w_roi8_cost_amount": 0,
                        "w_roi4_rate": 0,
                        "w_roi7_cost_amount": 0,
                        "w_roi11_pay_amount": 0,
                        "w_roi6_cost_amount": 0,
                        "w_roi3_cost_amount": 0,
                        "w_roi5_cost_amount": 0,
                        "roi21_rate": 0,
                        "composite_retention_d2_rate": 0,
                        "w_roi4_cost_amount": 0,
                        "w_roi11_rate": 0,
                        "composite_reg_cash_cost": 0,
                        "bootstrapper_act_cost": 0,
                        "w_roi1_cost_amount": 0,
                        "downloader_cnt": 0,
                        "w_roi2_cost_amount": 0,
                        "roi28_rate": 0,
                        "roi7_rate": 0,
                        "roi18_rate": 0,
                        "m_roi10_rate": 0,
                        "consuming_ago1_composite_start_total_pay_amount": 0,
                        "m_roi6_pay_amount": 0,
                        "downloader_act_cost": 0,
                        "w_roi13_pay_amount": 0,
                        "m_roi12_pay_amount": 0,
                        "consuming_composite_reg_cnt": 0,
                        "roi12_rate": 0,
                        "m_roi9_rate": 0,
                        "consuming_composite_reg_d1_new_device_cnt": 0,
                        "loading_change_cnt": 0,
                        "w_roi15_cost_amount": null,
                        "composite_pay_d1_rate": 0,
                        "composite_retention_d2_cnt": 0,
                        "composite_pay_m1_amount": 0,
                        "roi25_rate": 0,
                        "consuming_composite_effective_d1_cnt": 0,
                        "bootstrapper_cnt": 0,
                        "w_roi7_rate": 0,
                        "w_roi11_cost_amount": 0,
                        "roi11_rate": 0,
                        "dt": "2026-01-05~2026-01-11",
                        "roi10_rate": 0,
                        "w_roi14_rate": 0,
                        "roi19_cost_amount": 0,
                        "w_roi13_cost_amount": 0,
                        "roi17_cost_amount": 0,
                        "roi14_pay_amount": 0,
                        "roi22_cost_amount": 0,
                        "roi26_cost_amount": 0,
                        "roi11_cost_amount": 0,
                        "roi15_cost_amount": 0,
                        "composite_start_total_pay_cnt": 0,
                        "m_roi3_pay_amount": 0,
                        "m_roi2_rate": 0,
                        "roi24_cost_amount": 0,
                        "roi21_pay_amount": 0,
                        "roi13_cost_amount": 0,
                        "roi27_rate": 0,
                        "consuming_ago1_composite_act_cnt": 2,
                        "w_roi9_cost_amount": 0,
                        "w_roi12_rate": 0,
                        "roi20_cost_amount": 0,
                        "roi4_pay_amount": 0,
                        "roi29_pay_amount": 0,
                        "roi30_rate": 0,
                        "consuming_composite_retention_d2_cnt": 0,
                        "w_roi6_pay_amount": 0,
                        "m_roi8_cost_amount": 0,
                        "composite_effective_d1_cnt": 0,
                        "roi23_pay_amount": 0,
                        "composite_roi_m1_rate": 0,
                        "composite_pay_d1_cnt": 0,
                        "roi6_pay_amount": 0,
                        "roi9_cost_amount": 0,
                        "m_roi11_cost_amount": 0,
                        "composite_pay_d1_amount": 0,
                        "consuming_composite_pay_m1_amount": 0,
                        "roi5_cost_amount": 0,
                        "w_roi6_rate": 0,
                        "composite_act_cnt": 2,
                        "roi26_rate": 0,
                        "roi7_cost_amount": 0,
                        "roi27_pay_amount": 0,
                        "w_roi2_pay_amount": 0,
                        "composite_reg_d1_new_device_cost": 0,
                        "w_roi4_pay_amount": 0,
                        "w_roi13_rate": 0,
                        "composite_create_role_d1_cost": 0,
                        "composite_pay_d1_cash_cost": 0,
                        "roi20_rate": 0,
                        "roi3_cost_amount": 0,
                        "roi8_pay_amount": 0,
                        "roi16_pay_amount": 0,
                        "m_roi6_rate": 0,
                        "consuming_loading_change_cnt": 0,
                        "rebate_cash_cost_amount": 0,
                        "roi6_rate": 0,
                        "roi25_pay_amount": 0,
                        "w_roi15_pay_amount": null,
                        "consuming_ago1_composite_create_role_d1_cnt": 0,
                        "roi15_pay_amount": 0,
                        "composite_effective_d1_cost": 0,
                        "w_roi1_rate": 0,
                        "m_roi4_pay_amount": 0,
                        "roi17_rate": 0,
                        "roi2_pay_amount": 0,
                        "composite_pay_cnt": 0,
                        "rebate_cost_amount": 0,
                        "m_roi10_pay_amount": 0,
                        "m_roi8_rate": 0,
                        "composite_arppu_d1_amount": 0,
                        "w_roi8_pay_amount": 0,
                        "m_roi2_cost_amount": 0,
                        "m_roi3_cost_amount": 0,
                        "loading_conversion_rate": 0,
                        "cost_amount": 0,
                        "m_roi6_cost_amount": 0,
                        "m_roi11_rate": 0,
                        "m_roi5_cost_amount": 0,
                        "m_roi4_cost_amount": 0,
                        "roi30_cost_amount": 0,
                        "composite_act_cash_cost": 0,
                        "composite_retention_d2_cost": 0,
                        "m_roi11_pay_amount": 0,
                        "roi22_rate": 0,
                        "team_ids": "未知",
                        "consuming_ago1_composite_pay_d1_amount": 0,
                        "bootstrapper_act_rate": 0,
                        "m_roi5_pay_amount": 0,
                        "consuming_composite_pay_d1_amount": 0,
                        "w_roi9_pay_amount": 0,
                        "composite_arpu_amount": 0,
                        "w_roi5_rate": 0,
                        "composite_create_role_d1_cnt": 0,
                        "roi29_cost_amount": 0,
                        "roi20_pay_amount": 0,
                        "roi10_pay_amount": 0,
                        "roi30_pay_amount": 0,
                        "roi27_cost_amount": 0,
                        "consuming_ago1_composite_effective_d1_cnt": 0,
                        "roi28_cost_amount": 0,
                        "roi4_rate": 0,
                        "roi15_rate": 0,
                        "composite_act_old_user_cnt": 0,
                        "composite_arpu_d1_amount": 0,
                        "cash_cost_amount": 0,
                        "composite_retention_reg_cnt": 0,
                        "w_roi14_pay_amount": 0,
                        "downloader_act_rate": 0,
                        "loading_open_cnt": 0,
                        "consuming_composite_create_role_d1_cnt": 0,
                        "consuming_composite_act_cnt": 2,
                        "composite_pay_d1_cost": 0,
                        "w_roi10_cost_amount": 0,
                        "composite_start_total_roi_cash_rate": 0,
                        "w_roi8_rate": 0,
                        "w_roi12_cost_amount": 0,
                        "w_roi1_pay_amount": 0,
                        "roi18_cost_amount": 0,
                        "w_roi14_cost_amount": 0,
                        "roi25_cost_amount": 0,
                        "roi3_pay_amount": 0,
                        "roi14_cost_amount": 0,
                        "roi16_cost_amount": 0,
                        "m_roi12_cost_amount": 0,
                        "roi11_pay_amount": 0,
                        "m_roi9_pay_amount": 0,
                        "roi12_cost_amount": 0,
                        "roi23_cost_amount": 0,
                        "roi24_rate": 0,
                        "consuming_ago1_composite_reg_cnt": 0,
                        "composite_arppu_amount": 0,
                        "w_roi15_rate": null,
                        "composite_reg_d1_new_device_cnt": 0,
                        "roi21_cost_amount": 0,
                        "w_roi10_pay_amount": 0,
                        "composite_effective_d1_cash_cost": 0,
                        "roi10_cost_amount": 0,
                        "m_roi2_pay_amount": 0,
                        "w_roi7_pay_amount": 0,
                        "consuming_bootstrapper_cnt": 0,
                        "w_roi3_pay_amount": 0,
                        "consuming_ago1_composite_pay_d1_cnt": 0,
                        "m_roi9_cost_amount": 0,
                        "roi19_pay_amount": 0,
                        "roi14_rate": 0,
                        "m_roi7_cost_amount": 0,
                        "roi19_rate": 0,
                        "composite_active_device_cnt": 6,
                        "roi9_rate": 0,
                        "roi13_pay_amount": 0,
                        "roi9_pay_amount": 0,
                        "m_roi4_rate": 0,
                        "retention_rebate_cost_amount": 0,
                        "roi2_rate": 0,
                        "roi13_rate": 0,
                        "composite_act_cost": 0,
                        "m_roi10_cost_amount": 0,
                        "roi8_rate": 0,
                        "composite_reg_cnt": 0,
                        "roi4_cost_amount": 0,
                        "w_roi3_rate": 0,
                        "roi24_pay_amount": 0,
                        "w_roi9_rate": 0,
                        "w_roi10_rate": 0,
                        "roi8_cost_amount": 0,
                        "roi17_pay_amount": 0,
                        "roi29_rate": 0,
                        "roi6_cost_amount": 0,
                        "roi7_pay_amount": 0,
                        "composite_create_role_d1_rate": 0,
                        "composite_login_user_cnt": 2,
                        "loading_peop_cnt": 0,
                        "composite_d1_roi_cash_rate": 0,
                        "composite_reg_d1_new_device_rate": 0,
                        "roi26_pay_amount": 0,
                        "roi23_rate": 0,
                        "roi2_cost_amount": 0,
                        "composite_act_old_user_rate": 0
                    }
                ],
                "missTableContent": [
                    {
                        "promotion_source": "",
                        "dt": "2026-04-06~2026-04-12",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-03-30~2026-04-05",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-03-23~2026-03-29",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-03-16~2026-03-22",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-03-09~2026-03-15",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-03-02~2026-03-08",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-02-23~2026-03-01",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-02-16~2026-02-22",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-02-09~2026-02-15",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-02-02~2026-02-08",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-01-26~2026-02-01",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    },
                    {
                        "promotion_source": "",
                        "dt": "2026-01-19~2026-01-25",
                        "media_id": "",
                        "app_package_type": "",
                        "app_id": "",
                        "os_type": ""
                    }
                ],
                "tableSummary": {
                    "composite_effective_d1_rate": 0,
                    "composite_reg_cost": 0,
                    "roi16_rate": 0,
                    "w_roi2_rate": 0,
                    "roi5_pay_amount": 0,
                    "composite_create_role_d1_cash_cost": 0,
                    "m_roi7_pay_amount": 0,
                    "consuming_composite_pay_d1_cnt": 0,
                    "roi28_pay_amount": 0,
                    "m_roi12_rate": 0,
                    "composite_d1_roi_rate": 0,
                    "m_roi7_rate": 0,
                    "roi18_pay_amount": 0,
                    "roi5_rate": 0,
                    "loading_conversion_cost": 0,
                    "consuming_downloader_cnt": 0,
                    "w_roi5_pay_amount": 0,
                    "w_roi12_pay_amount": 0,
                    "composite_pay_amount": 0,
                    "composite_start_total_pay_amount": 0,
                    "m_roi5_rate": 0,
                    "roi3_rate": 0,
                    "roi12_pay_amount": 0,
                    "roi22_pay_amount": 0,
                    "m_roi8_pay_amount": 0,
                    "m_roi3_rate": 0,
                    "w_roi8_cost_amount": 0,
                    "w_roi4_rate": 0,
                    "w_roi7_cost_amount": 0,
                    "w_roi11_pay_amount": 0,
                    "w_roi6_cost_amount": 0,
                    "w_roi3_cost_amount": 0,
                    "w_roi5_cost_amount": 0,
                    "roi21_rate": 0,
                    "composite_retention_d2_rate": 0,
                    "w_roi4_cost_amount": 0,
                    "w_roi11_rate": 0,
                    "composite_reg_cash_cost": 0,
                    "bootstrapper_act_cost": 0,
                    "w_roi1_cost_amount": 0,
                    "downloader_cnt": 0,
                    "w_roi2_cost_amount": 0,
                    "roi28_rate": 0,
                    "roi7_rate": 0,
                    "roi18_rate": 0,
                    "m_roi10_rate": 0,
                    "consuming_ago1_composite_start_total_pay_amount": 0,
                    "m_roi6_pay_amount": 0,
                    "downloader_act_cost": 0,
                    "w_roi13_pay_amount": 0,
                    "m_roi12_pay_amount": 0,
                    "consuming_composite_reg_cnt": 0,
                    "roi12_rate": 0,
                    "m_roi9_rate": 0,
                    "consuming_composite_reg_d1_new_device_cnt": 0,
                    "loading_change_cnt": 0,
                    "w_roi15_cost_amount": null,
                    "composite_pay_d1_rate": 0,
                    "composite_retention_d2_cnt": 0,
                    "composite_pay_m1_amount": 0,
                    "roi25_rate": 0,
                    "dh": "总合计/平均",
                    "consuming_composite_effective_d1_cnt": 0,
                    "bootstrapper_cnt": 0,
                    "w_roi7_rate": 0,
                    "w_roi11_cost_amount": 0,
                    "roi11_rate": 0,
                    "dt": "总合计/平均",
                    "roi10_rate": 0,
                    "w_roi14_rate": 0,
                    "roi19_cost_amount": 0,
                    "w_roi13_cost_amount": 0,
                    "roi17_cost_amount": 0,
                    "roi14_pay_amount": 0,
                    "roi22_cost_amount": 0,
                    "roi26_cost_amount": 0,
                    "roi11_cost_amount": 0,
                    "roi15_cost_amount": 0,
                    "composite_start_total_pay_cnt": 0,
                    "m_roi3_pay_amount": 0,
                    "m_roi2_rate": 0,
                    "roi24_cost_amount": 0,
                    "roi21_pay_amount": 0,
                    "roi13_cost_amount": 0,
                    "roi27_rate": 0,
                    "consuming_ago1_composite_act_cnt": 3,
                    "w_roi9_cost_amount": 0,
                    "w_roi12_rate": 0,
                    "roi20_cost_amount": 0,
                    "roi4_pay_amount": 0,
                    "roi29_pay_amount": 0,
                    "roi30_rate": 0,
                    "consuming_composite_retention_d2_cnt": 0,
                    "w_roi6_pay_amount": 0,
                    "m_roi8_cost_amount": 0,
                    "composite_effective_d1_cnt": 0,
                    "roi23_pay_amount": 0,
                    "composite_roi_m1_rate": 0,
                    "composite_pay_d1_cnt": 0,
                    "roi6_pay_amount": 0,
                    "roi9_cost_amount": 0,
                    "m_roi11_cost_amount": 0,
                    "composite_pay_d1_amount": 0,
                    "consuming_composite_pay_m1_amount": 0,
                    "roi5_cost_amount": 0,
                    "w_roi6_rate": 0,
                    "composite_act_cnt": 3,
                    "roi26_rate": 0,
                    "roi7_cost_amount": 0,
                    "roi27_pay_amount": 0,
                    "w_roi2_pay_amount": 0,
                    "composite_reg_d1_new_device_cost": 0,
                    "w_roi4_pay_amount": 0,
                    "w_roi13_rate": 0,
                    "composite_create_role_d1_cost": 0,
                    "composite_pay_d1_cash_cost": 0,
                    "roi20_rate": 0,
                    "roi3_cost_amount": 0,
                    "roi8_pay_amount": 0,
                    "roi16_pay_amount": 0,
                    "m_roi6_rate": 0,
                    "consuming_loading_change_cnt": 0,
                    "rebate_cash_cost_amount": 0,
                    "roi6_rate": 0,
                    "roi25_pay_amount": 0,
                    "w_roi15_pay_amount": null,
                    "consuming_ago1_composite_create_role_d1_cnt": 0,
                    "roi15_pay_amount": 0,
                    "composite_effective_d1_cost": 0,
                    "w_roi1_rate": 0,
                    "m_roi4_pay_amount": 0,
                    "roi17_rate": 0,
                    "roi2_pay_amount": 0,
                    "composite_pay_cnt": "-",
                    "rebate_cost_amount": 0,
                    "m_roi10_pay_amount": 0,
                    "m_roi8_rate": 0,
                    "composite_arppu_d1_amount": 0,
                    "w_roi8_pay_amount": 0,
                    "m_roi2_cost_amount": 0,
                    "m_roi3_cost_amount": 0,
                    "loading_conversion_rate": 0,
                    "cost_amount": 0,
                    "m_roi6_cost_amount": 0,
                    "m_roi11_rate": 0,
                    "m_roi5_cost_amount": 0,
                    "m_roi4_cost_amount": 0,
                    "roi30_cost_amount": 0,
                    "composite_act_cash_cost": 0,
                    "composite_retention_d2_cost": 0,
                    "m_roi11_pay_amount": 0,
                    "roi22_rate": 0,
                    "consuming_ago1_composite_pay_d1_amount": 0,
                    "bootstrapper_act_rate": 0,
                    "m_roi5_pay_amount": 0,
                    "consuming_composite_pay_d1_amount": 0,
                    "w_roi9_pay_amount": 0,
                    "composite_arpu_amount": "-",
                    "w_roi5_rate": 0,
                    "composite_create_role_d1_cnt": 0,
                    "roi29_cost_amount": 0,
                    "roi20_pay_amount": 0,
                    "roi10_pay_amount": 0,
                    "roi30_pay_amount": 0,
                    "roi27_cost_amount": 0,
                    "consuming_ago1_composite_effective_d1_cnt": 0,
                    "roi28_cost_amount": 0,
                    "roi4_rate": 0,
                    "roi15_rate": 0,
                    "composite_act_old_user_cnt": 0,
                    "composite_arpu_d1_amount": 0,
                    "cash_cost_amount": 0,
                    "composite_retention_reg_cnt": 0,
                    "w_roi14_pay_amount": 0,
                    "downloader_act_rate": 0,
                    "loading_open_cnt": 0,
                    "consuming_composite_create_role_d1_cnt": 0,
                    "consuming_composite_act_cnt": 3,
                    "composite_pay_d1_cost": 0,
                    "w_roi10_cost_amount": 0,
                    "composite_start_total_roi_cash_rate": 0,
                    "w_roi8_rate": 0,
                    "w_roi12_cost_amount": 0,
                    "w_roi1_pay_amount": 0,
                    "roi18_cost_amount": 0,
                    "w_roi14_cost_amount": 0,
                    "roi25_cost_amount": 0,
                    "roi3_pay_amount": 0,
                    "roi14_cost_amount": 0,
                    "roi16_cost_amount": 0,
                    "m_roi12_cost_amount": 0,
                    "roi11_pay_amount": 0,
                    "m_roi9_pay_amount": 0,
                    "roi12_cost_amount": 0,
                    "roi23_cost_amount": 0,
                    "roi24_rate": 0,
                    "consuming_ago1_composite_reg_cnt": 0,
                    "composite_arppu_amount": "-",
                    "w_roi15_rate": null,
                    "composite_reg_d1_new_device_cnt": 0,
                    "roi21_cost_amount": 0,
                    "w_roi10_pay_amount": 0,
                    "composite_effective_d1_cash_cost": 0,
                    "roi10_cost_amount": 0,
                    "m_roi2_pay_amount": 0,
                    "w_roi7_pay_amount": 0,
                    "consuming_bootstrapper_cnt": 0,
                    "w_roi3_pay_amount": 0,
                    "consuming_ago1_composite_pay_d1_cnt": 0,
                    "m_roi9_cost_amount": 0,
                    "roi19_pay_amount": 0,
                    "roi14_rate": 0,
                    "m_roi7_cost_amount": 0,
                    "roi19_rate": 0,
                    "composite_active_device_cnt": "-",
                    "roi9_rate": 0,
                    "roi13_pay_amount": 0,
                    "roi9_pay_amount": 0,
                    "m_roi4_rate": 0,
                    "retention_rebate_cost_amount": 0,
                    "roi2_rate": 0,
                    "roi13_rate": 0,
                    "composite_act_cost": 0,
                    "m_roi10_cost_amount": 0,
                    "roi8_rate": 0,
                    "composite_reg_cnt": 0,
                    "roi4_cost_amount": 0,
                    "w_roi3_rate": 0,
                    "roi24_pay_amount": 0,
                    "w_roi9_rate": 0,
                    "w_roi10_rate": 0,
                    "roi8_cost_amount": 0,
                    "roi17_pay_amount": 0,
                    "roi29_rate": 0,
                    "roi6_cost_amount": 0,
                    "roi7_pay_amount": 0,
                    "composite_create_role_d1_rate": 0,
                    "composite_login_user_cnt": "-",
                    "loading_peop_cnt": 0,
                    "composite_d1_roi_cash_rate": 0,
                    "composite_reg_d1_new_device_rate": 0,
                    "roi26_pay_amount": 0,
                    "roi23_rate": 0,
                    "roi2_cost_amount": 0,
                    "composite_act_old_user_rate": 0
                },
                "cmpTableContent": [],
                "missCmpTableContent": [],
                "sqlDetail": {
                    "detail": "SET @start_date='2026-01-05',@end_date='2026-04-12',@is_devide='0',@date_type='NATURAL_WEEK',@query_model='detail';SELECT    dt, \ncost_amount, rebate_cost_amount, composite_act_cnt, composite_reg_cnt, composite_create_role_d1_cnt, composite_effective_d1_cnt, composite_start_total_pay_cnt, composite_start_total_pay_amount, composite_pay_d1_cnt, composite_pay_d1_amount, composite_reg_d1_new_device_cnt, composite_retention_d2_cnt, composite_active_device_cnt, composite_login_user_cnt, composite_pay_cnt, composite_pay_amount, composite_pay_m1_amount, composite_act_old_user_cnt, composite_retention_reg_cnt, retention_rebate_cost_amount, consuming_composite_act_cnt, consuming_composite_reg_cnt, consuming_composite_create_role_d1_cnt, consuming_composite_effective_d1_cnt, consuming_composite_pay_d1_cnt, consuming_composite_retention_d2_cnt, consuming_composite_reg_d1_new_device_cnt, consuming_composite_pay_d1_amount, consuming_composite_pay_m1_amount, rebate_cash_cost_amount, consuming_ago1_composite_act_cnt, consuming_ago1_composite_reg_cnt, consuming_ago1_composite_create_role_d1_cnt, consuming_ago1_composite_effective_d1_cnt, consuming_ago1_composite_pay_d1_cnt, consuming_ago1_composite_start_total_pay_amount, consuming_ago1_composite_pay_d1_amount, cash_cost_amount, loading_open_cnt, loading_peop_cnt, loading_change_cnt, downloader_cnt, bootstrapper_cnt, consuming_loading_change_cnt, consuming_downloader_cnt, consuming_bootstrapper_cnt, roi2_cost_amount, roi3_cost_amount, roi4_cost_amount, roi5_cost_amount, roi6_cost_amount, roi7_cost_amount, roi8_cost_amount, roi9_cost_amount, roi10_cost_amount, roi11_cost_amount, roi12_cost_amount, roi13_cost_amount, roi14_cost_amount, roi15_cost_amount, roi16_cost_amount, roi17_cost_amount, roi18_cost_amount, roi19_cost_amount, roi20_cost_amount, roi21_cost_amount, roi22_cost_amount, roi23_cost_amount, roi24_cost_amount, roi25_cost_amount, roi26_cost_amount, roi27_cost_amount, roi28_cost_amount, roi29_cost_amount, roi30_cost_amount, w_roi1_cost_amount, w_roi2_cost_amount, w_roi3_cost_amount, w_roi4_cost_amount, w_roi5_cost_amount, w_roi6_cost_amount, w_roi7_cost_amount, w_roi8_cost_amount, w_roi9_cost_amount, w_roi10_cost_amount, w_roi11_cost_amount, w_roi12_cost_amount, w_roi13_cost_amount, w_roi14_cost_amount, w_roi15_cost_amount, m_roi2_cost_amount, m_roi3_cost_amount, m_roi4_cost_amount, m_roi5_cost_amount, m_roi6_cost_amount, m_roi7_cost_amount, m_roi8_cost_amount, m_roi9_cost_amount, m_roi10_cost_amount, m_roi11_cost_amount, m_roi12_cost_amount, roi2_pay_amount, roi3_pay_amount, roi4_pay_amount, roi5_pay_amount, roi6_pay_amount, roi7_pay_amount, roi8_pay_amount, roi9_pay_amount, roi10_pay_amount, roi11_pay_amount, roi12_pay_amount, roi13_pay_amount, roi14_pay_amount, roi15_pay_amount, roi16_pay_amount, roi17_pay_amount, roi18_pay_amount, roi19_pay_amount, roi20_pay_amount, roi21_pay_amount, roi22_pay_amount, roi23_pay_amount, roi24_pay_amount, roi25_pay_amount, roi26_pay_amount, roi27_pay_amount, roi28_pay_amount, roi29_pay_amount, roi30_pay_amount, w_roi1_pay_amount, w_roi2_pay_amount, w_roi3_pay_amount, w_roi4_pay_amount, w_roi5_pay_amount, w_roi6_pay_amount, w_roi7_pay_amount, w_roi8_pay_amount, w_roi9_pay_amount, w_roi10_pay_amount, w_roi11_pay_amount, w_roi12_pay_amount, w_roi13_pay_amount, w_roi14_pay_amount, w_roi15_pay_amount, m_roi2_pay_amount, m_roi3_pay_amount, m_roi4_pay_amount, m_roi5_pay_amount, m_roi6_pay_amount, m_roi7_pay_amount, m_roi8_pay_amount, m_roi9_pay_amount, m_roi10_pay_amount, m_roi11_pay_amount, m_roi12_pay_amount,\n    \n    composite_create_role_d1_cnt / composite_reg_cnt AS composite_create_role_d1_rate, \n    composite_effective_d1_cnt / composite_reg_cnt AS composite_effective_d1_rate, \n    rebate_cost_amount / consuming_composite_act_cnt AS composite_act_cost, \n    rebate_cost_amount / consuming_composite_reg_cnt AS composite_reg_cost, \n    w_roi1_pay_amount / w_roi1_cost_amount AS w_roi1_rate, \n    w_roi2_pay_amount / w_roi2_cost_amount AS w_roi2_rate, \n    w_roi3_pay_amount / w_roi3_cost_amount AS w_roi3_rate, \n    w_roi4_pay_amount / w_roi4_cost_amount AS w_roi4_rate, \n    w_roi5_pay_amount / w_roi5_cost_amount AS w_roi5_rate, \n    w_roi6_pay_amount / w_roi6_cost_amount AS w_roi6_rate, \n    w_roi7_pay_amount / w_roi7_cost_amount AS w_roi7_rate, \n    w_roi8_pay_amount / w_roi8_cost_amount AS w_roi8_rate, \n    w_roi9_pay_amount / w_roi9_cost_amount AS w_roi9_rate, \n    w_roi10_pay_amount / w_roi10_cost_amount AS w_roi10_rate, \n    w_roi11_pay_amount / w_roi11_cost_amount AS w_roi11_rate, \n    w_roi12_pay_amount / w_roi12_cost_amount AS w_roi12_rate, \n    w_roi13_pay_amount / w_roi13_cost_amount AS w_roi13_rate, \n    w_roi14_pay_amount / w_roi14_cost_amount AS w_roi14_rate, \n    w_roi15_pay_amount / w_roi15_cost_amount AS w_roi15_rate, \n    m_roi2_pay_amount / m_roi2_cost_amount AS m_roi2_rate, \n    m_roi3_pay_amount / m_roi3_cost_amount AS m_roi3_rate, \n    m_roi4_pay_amount / m_roi4_cost_amount AS m_roi4_rate, \n    m_roi5_pay_amount / m_roi5_cost_amount AS m_roi5_rate, \n    m_roi6_pay_amount / m_roi6_cost_amount AS m_roi6_rate, \n    m_roi7_pay_amount / m_roi7_cost_amount AS m_roi7_rate, \n    m_roi8_pay_amount / m_roi8_cost_amount AS m_roi8_rate, \n    m_roi9_pay_amount / m_roi9_cost_amount AS m_roi9_rate, \n    m_roi10_pay_amount / m_roi10_cost_amount AS m_roi10_rate, \n    m_roi11_pay_amount / m_roi11_cost_amount AS m_roi11_rate, \n    m_roi12_pay_amount / m_roi12_cost_amount AS m_roi12_rate, \n    roi2_pay_amount / roi2_cost_amount AS roi2_rate, \n    roi3_pay_amount / roi3_cost_amount AS roi3_rate, \n    roi4_pay_amount / roi4_cost_amount AS roi4_rate, \n    roi5_pay_amount / roi5_cost_amount AS roi5_rate, \n    roi6_pay_amount / roi6_cost_amount AS roi6_rate, \n    roi7_pay_amount / roi7_cost_amount AS roi7_rate, \n    roi8_pay_amount / roi8_cost_amount AS roi8_rate, \n    roi9_pay_amount / roi9_cost_amount AS roi9_rate, \n    roi10_pay_amount / roi10_cost_amount AS roi10_rate, \n    roi11_pay_amount / roi11_cost_amount AS roi11_rate, \n    roi12_pay_amount / roi12_cost_amount AS roi12_rate, \n    roi13_pay_amount / roi13_cost_amount AS roi13_rate, \n    roi14_pay_amount / roi14_cost_amount AS roi14_rate, \n    roi15_pay_amount / roi15_cost_amount AS roi15_rate, \n    roi16_pay_amount / roi16_cost_amount AS roi16_rate, \n    roi17_pay_amount / roi17_cost_amount AS roi17_rate, \n    roi18_pay_amount / roi18_cost_amount AS roi18_rate, \n    roi19_pay_amount / roi19_cost_amount AS roi19_rate, \n    roi20_pay_amount / roi20_cost_amount AS roi20_rate, \n    roi21_pay_amount / roi21_cost_amount AS roi21_rate, \n    roi22_pay_amount / roi22_cost_amount AS roi22_rate, \n    roi23_pay_amount / roi23_cost_amount AS roi23_rate, \n    roi24_pay_amount / roi24_cost_amount AS roi24_rate, \n    roi25_pay_amount / roi25_cost_amount AS roi25_rate, \n    roi26_pay_amount / roi26_cost_amount AS roi26_rate, \n    roi27_pay_amount / roi27_cost_amount AS roi27_rate, \n    roi28_pay_amount / roi28_cost_amount AS roi28_rate, \n    roi29_pay_amount / roi29_cost_amount AS roi29_rate, \n    roi30_pay_amount / roi30_cost_amount AS roi30_rate, \n    composite_pay_d1_cnt/composite_reg_cnt AS composite_pay_d1_rate, \n    rebate_cost_amount / consuming_composite_pay_d1_cnt AS composite_pay_d1_cost, \n    composite_pay_d1_amount / composite_pay_d1_cnt AS composite_arppu_d1_amount, \n    IFNULL(rebate_cost_amount  / consuming_composite_effective_d1_cnt, 0) AS composite_effective_d1_cost, \n    retention_rebate_cost_amount/consuming_composite_retention_d2_cnt AS composite_retention_d2_cost, \n    composite_retention_d2_cnt/composite_retention_reg_cnt AS composite_retention_d2_rate, \n    composite_pay_d1_amount/composite_reg_cnt AS composite_arpu_d1_amount, \n    composite_reg_d1_new_device_cnt/composite_act_cnt AS composite_reg_d1_new_device_rate, \n    composite_act_old_user_cnt/composite_act_cnt AS composite_act_old_user_rate, \n    rebate_cost_amount/consuming_composite_reg_d1_new_device_cnt AS composite_reg_d1_new_device_cost, \n    rebate_cost_amount/consuming_composite_create_role_d1_cnt AS composite_create_role_d1_cost, \n    composite_pay_amount/composite_login_user_cnt AS composite_arpu_amount, \n    composite_pay_amount/composite_pay_cnt AS composite_arppu_amount, \n    consuming_composite_pay_m1_amount/rebate_cost_amount AS composite_roi_m1_rate, \n    consuming_composite_pay_d1_amount/rebate_cost_amount AS composite_d1_roi_rate, \n    rebate_cash_cost_amount/consuming_ago1_composite_act_cnt AS composite_act_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_reg_cnt AS composite_reg_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_create_role_d1_cnt AS composite_create_role_d1_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_effective_d1_cnt AS composite_effective_d1_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_pay_d1_cnt AS composite_pay_d1_cash_cost, \n    consuming_ago1_composite_pay_d1_amount/rebate_cash_cost_amount AS composite_d1_roi_cash_rate, \n    consuming_ago1_composite_start_total_pay_amount/rebate_cash_cost_amount AS composite_start_total_roi_cash_rate, \n    loading_change_cnt/loading_peop_cnt AS loading_conversion_rate, \n    rebate_cost_amount/consuming_loading_change_cnt AS loading_conversion_cost, \n    downloader_cnt/loading_change_cnt AS downloader_act_rate, \n    rebate_cost_amount/consuming_downloader_cnt AS downloader_act_cost, \n    bootstrapper_cnt/downloader_cnt AS bootstrapper_act_rate, \n    rebate_cost_amount/consuming_bootstrapper_cnt AS bootstrapper_act_cost\nFROM (\n    SELECT    \n    concat(to_date(date_trunc('week',dt)),'~',to_date(date_add(date_trunc('week',dt),6))) AS dt, \n\n    SUM(cost_amount) AS cost_amount, \n    SUM(rebate_cost_amount) AS rebate_cost_amount, \n    SUM(composite_act_cnt) AS composite_act_cnt, \n    SUM(composite_reg_cnt) AS composite_reg_cnt, \n    SUM(composite_create_role_d1_cnt) AS composite_create_role_d1_cnt, \n    SUM(composite_effective_d1_cnt) AS composite_effective_d1_cnt, \n    SUM(composite_start_total_pay_cnt) AS composite_start_total_pay_cnt, \n    SUM(composite_start_total_pay_amount) AS composite_start_total_pay_amount, \n    SUM(composite_pay_d1_cnt) AS composite_pay_d1_cnt, \n    SUM(composite_pay_d1_amount) AS composite_pay_d1_amount, \n    SUM(composite_reg_d1_new_device_cnt) AS composite_reg_d1_new_device_cnt, \n    SUM(composite_retention_d2_cnt) AS composite_retention_d2_cnt, \n    SUM(composite_active_device_cnt) AS composite_active_device_cnt, \n    SUM(composite_login_user_cnt) AS composite_login_user_cnt, \n    SUM(composite_pay_cnt) AS composite_pay_cnt, \n    SUM(composite_pay_amount) AS composite_pay_amount, \n    SUM(composite_pay_m1_amount) AS composite_pay_m1_amount, \n    SUM(composite_act_old_user_cnt) AS composite_act_old_user_cnt, \n    SUM(composite_retention_reg_cnt) AS composite_retention_reg_cnt, \n    SUM(retention_rebate_cost_amount) AS retention_rebate_cost_amount, \n    SUM(consuming_composite_act_cnt) AS consuming_composite_act_cnt, \n    SUM(consuming_composite_reg_cnt) AS consuming_composite_reg_cnt, \n    SUM(consuming_composite_create_role_d1_cnt) AS consuming_composite_create_role_d1_cnt, \n    SUM(consuming_composite_effective_d1_cnt) AS consuming_composite_effective_d1_cnt, \n    SUM(consuming_composite_pay_d1_cnt) AS consuming_composite_pay_d1_cnt, \n    SUM(consuming_composite_retention_d2_cnt) AS consuming_composite_retention_d2_cnt, \n    SUM(consuming_composite_reg_d1_new_device_cnt) AS consuming_composite_reg_d1_new_device_cnt, \n    SUM(consuming_composite_pay_d1_amount) AS consuming_composite_pay_d1_amount, \n    SUM(consuming_composite_pay_m1_amount) AS consuming_composite_pay_m1_amount, \n    SUM(rebate_cash_cost_amount) AS rebate_cash_cost_amount, \n    SUM(consuming_ago1_composite_act_cnt) AS consuming_ago1_composite_act_cnt, \n    SUM(consuming_ago1_composite_reg_cnt) AS consuming_ago1_composite_reg_cnt, \n    SUM(consuming_ago1_composite_create_role_d1_cnt) AS consuming_ago1_composite_create_role_d1_cnt, \n    SUM(consuming_ago1_composite_effective_d1_cnt) AS consuming_ago1_composite_effective_d1_cnt, \n    SUM(consuming_ago1_composite_pay_d1_cnt) AS consuming_ago1_composite_pay_d1_cnt, \n    SUM(consuming_ago1_composite_start_total_pay_amount) AS consuming_ago1_composite_start_total_pay_amount, \n    SUM(consuming_ago1_composite_pay_d1_amount) AS consuming_ago1_composite_pay_d1_amount, \n    SUM(cash_cost_amount) AS cash_cost_amount, \n    SUM(loading_open_cnt) AS loading_open_cnt, \n    SUM(loading_peop_cnt) AS loading_peop_cnt, \n    SUM(loading_change_cnt) AS loading_change_cnt, \n    SUM(downloader_cnt) AS downloader_cnt, \n    SUM(bootstrapper_cnt) AS bootstrapper_cnt, \n    SUM(consuming_loading_change_cnt) AS consuming_loading_change_cnt, \n    SUM(consuming_downloader_cnt) AS consuming_downloader_cnt, \n    SUM(consuming_bootstrapper_cnt) AS consuming_bootstrapper_cnt, \n    SUM(roi2_cost_amount) AS roi2_cost_amount, \n    SUM(roi3_cost_amount) AS roi3_cost_amount, \n    SUM(roi4_cost_amount) AS roi4_cost_amount, \n    SUM(roi5_cost_amount) AS roi5_cost_amount, \n    SUM(roi6_cost_amount) AS roi6_cost_amount, \n    SUM(roi7_cost_amount) AS roi7_cost_amount, \n    SUM(roi8_cost_amount) AS roi8_cost_amount, \n    SUM(roi9_cost_amount) AS roi9_cost_amount, \n    SUM(roi10_cost_amount) AS roi10_cost_amount, \n    SUM(roi11_cost_amount) AS roi11_cost_amount, \n    SUM(roi12_cost_amount) AS roi12_cost_amount, \n    SUM(roi13_cost_amount) AS roi13_cost_amount, \n    SUM(roi14_cost_amount) AS roi14_cost_amount, \n    SUM(roi15_cost_amount) AS roi15_cost_amount, \n    SUM(roi16_cost_amount) AS roi16_cost_amount, \n    SUM(roi17_cost_amount) AS roi17_cost_amount, \n    SUM(roi18_cost_amount) AS roi18_cost_amount, \n    SUM(roi19_cost_amount) AS roi19_cost_amount, \n    SUM(roi20_cost_amount) AS roi20_cost_amount, \n    SUM(roi21_cost_amount) AS roi21_cost_amount, \n    SUM(roi22_cost_amount) AS roi22_cost_amount, \n    SUM(roi23_cost_amount) AS roi23_cost_amount, \n    SUM(roi24_cost_amount) AS roi24_cost_amount, \n    SUM(roi25_cost_amount) AS roi25_cost_amount, \n    SUM(roi26_cost_amount) AS roi26_cost_amount, \n    SUM(roi27_cost_amount) AS roi27_cost_amount, \n    SUM(roi28_cost_amount) AS roi28_cost_amount, \n    SUM(roi29_cost_amount) AS roi29_cost_amount, \n    SUM(roi30_cost_amount) AS roi30_cost_amount, \n    SUM(w_roi1_cost_amount) AS w_roi1_cost_amount, \n    SUM(w_roi2_cost_amount) AS w_roi2_cost_amount, \n    SUM(w_roi3_cost_amount) AS w_roi3_cost_amount, \n    SUM(w_roi4_cost_amount) AS w_roi4_cost_amount, \n    SUM(w_roi5_cost_amount) AS w_roi5_cost_amount, \n    SUM(w_roi6_cost_amount) AS w_roi6_cost_amount, \n    SUM(w_roi7_cost_amount) AS w_roi7_cost_amount, \n    SUM(w_roi8_cost_amount) AS w_roi8_cost_amount, \n    SUM(w_roi9_cost_amount) AS w_roi9_cost_amount, \n    SUM(w_roi10_cost_amount) AS w_roi10_cost_amount, \n    SUM(w_roi11_cost_amount) AS w_roi11_cost_amount, \n    SUM(w_roi12_cost_amount) AS w_roi12_cost_amount, \n    SUM(w_roi13_cost_amount) AS w_roi13_cost_amount, \n    SUM(w_roi14_cost_amount) AS w_roi14_cost_amount, \n    SUM(w_roi15_cost_amount) AS w_roi15_cost_amount, \n    SUM(m_roi2_cost_amount) AS m_roi2_cost_amount, \n    SUM(m_roi3_cost_amount) AS m_roi3_cost_amount, \n    SUM(m_roi4_cost_amount) AS m_roi4_cost_amount, \n    SUM(m_roi5_cost_amount) AS m_roi5_cost_amount, \n    SUM(m_roi6_cost_amount) AS m_roi6_cost_amount, \n    SUM(m_roi7_cost_amount) AS m_roi7_cost_amount, \n    SUM(m_roi8_cost_amount) AS m_roi8_cost_amount, \n    SUM(m_roi9_cost_amount) AS m_roi9_cost_amount, \n    SUM(m_roi10_cost_amount) AS m_roi10_cost_amount, \n    SUM(m_roi11_cost_amount) AS m_roi11_cost_amount, \n    SUM(m_roi12_cost_amount) AS m_roi12_cost_amount, \n    SUM(roi2_pay_amount) AS roi2_pay_amount, \n    SUM(roi3_pay_amount) AS roi3_pay_amount, \n    SUM(roi4_pay_amount) AS roi4_pay_amount, \n    SUM(roi5_pay_amount) AS roi5_pay_amount, \n    SUM(roi6_pay_amount) AS roi6_pay_amount, \n    SUM(roi7_pay_amount) AS roi7_pay_amount, \n    SUM(roi8_pay_amount) AS roi8_pay_amount, \n    SUM(roi9_pay_amount) AS roi9_pay_amount, \n    SUM(roi10_pay_amount) AS roi10_pay_amount, \n    SUM(roi11_pay_amount) AS roi11_pay_amount, \n    SUM(roi12_pay_amount) AS roi12_pay_amount, \n    SUM(roi13_pay_amount) AS roi13_pay_amount, \n    SUM(roi14_pay_amount) AS roi14_pay_amount, \n    SUM(roi15_pay_amount) AS roi15_pay_amount, \n    SUM(roi16_pay_amount) AS roi16_pay_amount, \n    SUM(roi17_pay_amount) AS roi17_pay_amount, \n    SUM(roi18_pay_amount) AS roi18_pay_amount, \n    SUM(roi19_pay_amount) AS roi19_pay_amount, \n    SUM(roi20_pay_amount) AS roi20_pay_amount, \n    SUM(roi21_pay_amount) AS roi21_pay_amount, \n    SUM(roi22_pay_amount) AS roi22_pay_amount, \n    SUM(roi23_pay_amount) AS roi23_pay_amount, \n    SUM(roi24_pay_amount) AS roi24_pay_amount, \n    SUM(roi25_pay_amount) AS roi25_pay_amount, \n    SUM(roi26_pay_amount) AS roi26_pay_amount, \n    SUM(roi27_pay_amount) AS roi27_pay_amount, \n    SUM(roi28_pay_amount) AS roi28_pay_amount, \n    SUM(roi29_pay_amount) AS roi29_pay_amount, \n    SUM(roi30_pay_amount) AS roi30_pay_amount, \n    SUM(w_roi1_pay_amount) AS w_roi1_pay_amount, \n    SUM(w_roi2_pay_amount) AS w_roi2_pay_amount, \n    SUM(w_roi3_pay_amount) AS w_roi3_pay_amount, \n    SUM(w_roi4_pay_amount) AS w_roi4_pay_amount, \n    SUM(w_roi5_pay_amount) AS w_roi5_pay_amount, \n    SUM(w_roi6_pay_amount) AS w_roi6_pay_amount, \n    SUM(w_roi7_pay_amount) AS w_roi7_pay_amount, \n    SUM(w_roi8_pay_amount) AS w_roi8_pay_amount, \n    SUM(w_roi9_pay_amount) AS w_roi9_pay_amount, \n    SUM(w_roi10_pay_amount) AS w_roi10_pay_amount, \n    SUM(w_roi11_pay_amount) AS w_roi11_pay_amount, \n    SUM(w_roi12_pay_amount) AS w_roi12_pay_amount, \n    SUM(w_roi13_pay_amount) AS w_roi13_pay_amount, \n    SUM(w_roi14_pay_amount) AS w_roi14_pay_amount, \n    SUM(w_roi15_pay_amount) AS w_roi15_pay_amount, \n    SUM(m_roi2_pay_amount) AS m_roi2_pay_amount, \n    SUM(m_roi3_pay_amount) AS m_roi3_pay_amount, \n    SUM(m_roi4_pay_amount) AS m_roi4_pay_amount, \n    SUM(m_roi5_pay_amount) AS m_roi5_pay_amount, \n    SUM(m_roi6_pay_amount) AS m_roi6_pay_amount, \n    SUM(m_roi7_pay_amount) AS m_roi7_pay_amount, \n    SUM(m_roi8_pay_amount) AS m_roi8_pay_amount, \n    SUM(m_roi9_pay_amount) AS m_roi9_pay_amount, \n    SUM(m_roi10_pay_amount) AS m_roi10_pay_amount, \n    SUM(m_roi11_pay_amount) AS m_roi11_pay_amount, \n    SUM(m_roi12_pay_amount) AS m_roi12_pay_amount\nFROM \n    ( \nSELECT    \n    dt AS dt, \n\n    app_id AS app_id, \n    media_id AS media_id, \n    app_package_type AS app_package_type, \n    promotion_source AS promotion_source, \n    os_type AS os_type, \n    team_ids AS team_ids, \n\n    cost_amount AS cost_amount, \n    rebate_cost_amount AS rebate_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) ) AS composite_act_cnt, \n    composite_reg_cnt AS composite_reg_cnt, \n    composite_create_role_d1_cnt AS composite_create_role_d1_cnt, \n    composite_effective_d1_cnt AS composite_effective_d1_cnt, \n    composite_start_total_pay_cnt AS composite_start_total_pay_cnt, \n    composite_start_total_pay_amount AS composite_start_total_pay_amount, \n    composite_pay_d1_cnt AS composite_pay_d1_cnt, \n    composite_pay_d1_amount AS composite_pay_d1_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) ) AS composite_reg_d1_new_device_cnt, \n    composite_retention_d2_cnt AS composite_retention_d2_cnt, \n    composite_active_device_cnt AS composite_active_device_cnt, \n    composite_login_user_cnt AS composite_login_user_cnt, \n    composite_pay_cnt AS composite_pay_cnt, \n    composite_pay_amount AS composite_pay_amount, \n    composite_pay_m1_amount AS composite_pay_m1_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', 0, composite_act_old_user_cnt) AS composite_act_old_user_cnt, \n    composite_retention_reg_cnt AS composite_retention_reg_cnt, \n    retention_rebate_cost_amount AS retention_rebate_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_composite_reg_cnt,  ifnull( (case app_package_type when 'WEB' then consuming_composite_reg_cnt else consuming_composite_act_cnt end ), 0) ) AS consuming_composite_act_cnt, \n    consuming_composite_reg_cnt AS consuming_composite_reg_cnt, \n    consuming_composite_create_role_d1_cnt AS consuming_composite_create_role_d1_cnt, \n    consuming_composite_effective_d1_cnt AS consuming_composite_effective_d1_cnt, \n    consuming_composite_pay_d1_cnt AS consuming_composite_pay_d1_cnt, \n    consuming_composite_retention_d2_cnt AS consuming_composite_retention_d2_cnt, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then consuming_composite_reg_cnt  else consuming_composite_reg_d1_new_device_cnt  end ), 0) ) AS consuming_composite_reg_d1_new_device_cnt, \n    consuming_composite_pay_d1_amount AS consuming_composite_pay_d1_amount, \n    consuming_composite_pay_m1_amount AS consuming_composite_pay_m1_amount, \n    rebate_cash_cost_amount AS rebate_cash_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_ago1_composite_reg_cnt,  ifnull( (case app_package_type when 'WEB' then consuming_ago1_composite_reg_cnt else consuming_ago1_composite_act_cnt end ), 0) ) AS consuming_ago1_composite_act_cnt, \n    consuming_ago1_composite_reg_cnt AS consuming_ago1_composite_reg_cnt, \n    consuming_ago1_composite_create_role_d1_cnt AS consuming_ago1_composite_create_role_d1_cnt, \n    consuming_ago1_composite_effective_d1_cnt AS consuming_ago1_composite_effective_d1_cnt, \n    consuming_ago1_composite_pay_d1_cnt AS consuming_ago1_composite_pay_d1_cnt, \n    consuming_ago1_composite_start_total_pay_amount AS consuming_ago1_composite_start_total_pay_amount, \n    consuming_ago1_composite_pay_d1_amount AS consuming_ago1_composite_pay_d1_amount, \n    cash_cost_amount AS cash_cost_amount, \n    loading_open_cnt AS loading_open_cnt, \n    loading_peop_cnt AS loading_peop_cnt, \n    loading_change_cnt AS loading_change_cnt, \n    downloader_cnt AS downloader_cnt, \n    bootstrapper_cnt AS bootstrapper_cnt, \n    consuming_loading_change_cnt AS consuming_loading_change_cnt, \n    consuming_downloader_cnt AS consuming_downloader_cnt, \n    consuming_bootstrapper_cnt AS consuming_bootstrapper_cnt, \n    roi2_cost_amount AS roi2_cost_amount, \n    roi3_cost_amount AS roi3_cost_amount, \n    roi4_cost_amount AS roi4_cost_amount, \n    roi5_cost_amount AS roi5_cost_amount, \n    roi6_cost_amount AS roi6_cost_amount, \n    roi7_cost_amount AS roi7_cost_amount, \n    roi8_cost_amount AS roi8_cost_amount, \n    roi9_cost_amount AS roi9_cost_amount, \n    roi10_cost_amount AS roi10_cost_amount, \n    roi11_cost_amount AS roi11_cost_amount, \n    roi12_cost_amount AS roi12_cost_amount, \n    roi13_cost_amount AS roi13_cost_amount, \n    roi14_cost_amount AS roi14_cost_amount, \n    roi15_cost_amount AS roi15_cost_amount, \n    roi16_cost_amount AS roi16_cost_amount, \n    roi17_cost_amount AS roi17_cost_amount, \n    roi18_cost_amount AS roi18_cost_amount, \n    roi19_cost_amount AS roi19_cost_amount, \n    roi20_cost_amount AS roi20_cost_amount, \n    roi21_cost_amount AS roi21_cost_amount, \n    roi22_cost_amount AS roi22_cost_amount, \n    roi23_cost_amount AS roi23_cost_amount, \n    roi24_cost_amount AS roi24_cost_amount, \n    roi25_cost_amount AS roi25_cost_amount, \n    roi26_cost_amount AS roi26_cost_amount, \n    roi27_cost_amount AS roi27_cost_amount, \n    roi28_cost_amount AS roi28_cost_amount, \n    roi29_cost_amount AS roi29_cost_amount, \n    roi30_cost_amount AS roi30_cost_amount, \n    w_roi1_cost_amount AS w_roi1_cost_amount, \n    w_roi2_cost_amount AS w_roi2_cost_amount, \n    w_roi3_cost_amount AS w_roi3_cost_amount, \n    w_roi4_cost_amount AS w_roi4_cost_amount, \n    w_roi5_cost_amount AS w_roi5_cost_amount, \n    w_roi6_cost_amount AS w_roi6_cost_amount, \n    w_roi7_cost_amount AS w_roi7_cost_amount, \n    w_roi8_cost_amount AS w_roi8_cost_amount, \n    w_roi9_cost_amount AS w_roi9_cost_amount, \n    w_roi10_cost_amount AS w_roi10_cost_amount, \n    w_roi11_cost_amount AS w_roi11_cost_amount, \n    w_roi12_cost_amount AS w_roi12_cost_amount, \n    w_roi13_cost_amount AS w_roi13_cost_amount, \n    w_roi14_cost_amount AS w_roi14_cost_amount, \n    w_roi15_cost_amount AS w_roi15_cost_amount, \n    m_roi2_cost_amount AS m_roi2_cost_amount, \n    m_roi3_cost_amount AS m_roi3_cost_amount, \n    m_roi4_cost_amount AS m_roi4_cost_amount, \n    m_roi5_cost_amount AS m_roi5_cost_amount, \n    m_roi6_cost_amount AS m_roi6_cost_amount, \n    m_roi7_cost_amount AS m_roi7_cost_amount, \n    m_roi8_cost_amount AS m_roi8_cost_amount, \n    m_roi9_cost_amount AS m_roi9_cost_amount, \n    m_roi10_cost_amount AS m_roi10_cost_amount, \n    m_roi11_cost_amount AS m_roi11_cost_amount, \n    m_roi12_cost_amount AS m_roi12_cost_amount, \n    roi2_pay_amount AS roi2_pay_amount, \n    roi3_pay_amount AS roi3_pay_amount, \n    roi4_pay_amount AS roi4_pay_amount, \n    roi5_pay_amount AS roi5_pay_amount, \n    roi6_pay_amount AS roi6_pay_amount, \n    roi7_pay_amount AS roi7_pay_amount, \n    roi8_pay_amount AS roi8_pay_amount, \n    roi9_pay_amount AS roi9_pay_amount, \n    roi10_pay_amount AS roi10_pay_amount, \n    roi11_pay_amount AS roi11_pay_amount, \n    roi12_pay_amount AS roi12_pay_amount, \n    roi13_pay_amount AS roi13_pay_amount, \n    roi14_pay_amount AS roi14_pay_amount, \n    roi15_pay_amount AS roi15_pay_amount, \n    roi16_pay_amount AS roi16_pay_amount, \n    roi17_pay_amount AS roi17_pay_amount, \n    roi18_pay_amount AS roi18_pay_amount, \n    roi19_pay_amount AS roi19_pay_amount, \n    roi20_pay_amount AS roi20_pay_amount, \n    roi21_pay_amount AS roi21_pay_amount, \n    roi22_pay_amount AS roi22_pay_amount, \n    roi23_pay_amount AS roi23_pay_amount, \n    roi24_pay_amount AS roi24_pay_amount, \n    roi25_pay_amount AS roi25_pay_amount, \n    roi26_pay_amount AS roi26_pay_amount, \n    roi27_pay_amount AS roi27_pay_amount, \n    roi28_pay_amount AS roi28_pay_amount, \n    roi29_pay_amount AS roi29_pay_amount, \n    roi30_pay_amount AS roi30_pay_amount, \n    w_roi1_pay_amount AS w_roi1_pay_amount, \n    w_roi2_pay_amount AS w_roi2_pay_amount, \n    w_roi3_pay_amount AS w_roi3_pay_amount, \n    w_roi4_pay_amount AS w_roi4_pay_amount, \n    w_roi5_pay_amount AS w_roi5_pay_amount, \n    w_roi6_pay_amount AS w_roi6_pay_amount, \n    w_roi7_pay_amount AS w_roi7_pay_amount, \n    w_roi8_pay_amount AS w_roi8_pay_amount, \n    w_roi9_pay_amount AS w_roi9_pay_amount, \n    w_roi10_pay_amount AS w_roi10_pay_amount, \n    w_roi11_pay_amount AS w_roi11_pay_amount, \n    w_roi12_pay_amount AS w_roi12_pay_amount, \n    w_roi13_pay_amount AS w_roi13_pay_amount, \n    w_roi14_pay_amount AS w_roi14_pay_amount, \n    w_roi15_pay_amount AS w_roi15_pay_amount, \n    m_roi2_pay_amount AS m_roi2_pay_amount, \n    m_roi3_pay_amount AS m_roi3_pay_amount, \n    m_roi4_pay_amount AS m_roi4_pay_amount, \n    m_roi5_pay_amount AS m_roi5_pay_amount, \n    m_roi6_pay_amount AS m_roi6_pay_amount, \n    m_roi7_pay_amount AS m_roi7_pay_amount, \n    m_roi8_pay_amount AS m_roi8_pay_amount, \n    m_roi9_pay_amount AS m_roi9_pay_amount, \n    m_roi10_pay_amount AS m_roi10_pay_amount, \n    m_roi11_pay_amount AS m_roi11_pay_amount, \n    m_roi12_pay_amount AS m_roi12_pay_amount\nFROM \n    ad_ads.v_ads_ad_composite_dr_kpi_d\nWHERE ((((cost_amount) is not null and (cost_amount) != 0 )) OR (((rebate_cost_amount) is not null and (rebate_cost_amount) != 0 )) OR (((loading_open_cnt) is not null and (loading_open_cnt) != 0 )) OR (((loading_peop_cnt) is not null and (loading_peop_cnt) != 0 )) OR (((loading_change_cnt) is not null and (loading_change_cnt) != 0 )) OR (((downloader_cnt) is not null and (downloader_cnt) != 0 )) OR (((bootstrapper_cnt) is not null and (bootstrapper_cnt) != 0 )) OR (((if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) )) is not null and (if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) )) != 0 )) OR (((if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) )) is not null and (if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) )) != 0 )) OR (((composite_reg_cnt) is not null and (composite_reg_cnt) != 0 )) OR (((composite_create_role_d1_cnt) is not null and (composite_create_role_d1_cnt) != 0 )) OR (((composite_effective_d1_cnt) is not null and (composite_effective_d1_cnt) != 0 )) OR (((composite_pay_d1_cnt) is not null and (composite_pay_d1_cnt) != 0 )) OR (((composite_pay_d1_amount) is not null and (composite_pay_d1_amount) != 0 )) OR (((composite_start_total_pay_cnt) is not null and (composite_start_total_pay_cnt) != 0 )) OR (((composite_start_total_pay_amount) is not null and (composite_start_total_pay_amount) != 0 )) OR (((composite_pay_m1_amount) is not null and (composite_pay_m1_amount) != 0 )) OR (((composite_retention_d2_cnt) is not null and (composite_retention_d2_cnt) != 0 )) OR (((composite_active_device_cnt) is not null and (composite_active_device_cnt) != 0 )) OR (((composite_login_user_cnt) is not null and (composite_login_user_cnt) != 0 )) OR (((composite_pay_cnt) is not null and (composite_pay_cnt) != 0 )) OR (((composite_pay_amount) is not null and (composite_pay_amount) != 0 )) OR (((cash_cost_amount) is not null and (cash_cost_amount) != 0 )) OR (((rebate_cash_cost_amount) is not null and (rebate_cash_cost_amount) != 0 ))) and (promotion_source) IN ('AD') and (app_id) IN ('10100080') and (metric_definition_type) IN ('COMMON','RESERVE_COMPOSITE') and dt >= '2026-01-05' and dt <= '2026-04-12'\n ) t1\nGROUP BY     \n    concat(to_date(date_trunc('week',dt)),'~',to_date(date_add(date_trunc('week',dt),6)))) tt1\nORDER BY dt desc,rebate_cost_amount desc",
                    "summmary": "SET @start_date='2026-01-05',@end_date='2026-04-12',@is_devide='0',@date_type='NATURAL_WEEK',@query_model='summary';SELECT    cost_amount, rebate_cost_amount, composite_act_cnt, composite_reg_cnt, composite_create_role_d1_cnt, composite_effective_d1_cnt, composite_start_total_pay_cnt, composite_start_total_pay_amount, composite_pay_d1_cnt, composite_pay_d1_amount, composite_reg_d1_new_device_cnt, composite_retention_d2_cnt, composite_active_device_cnt, composite_login_user_cnt, composite_pay_cnt, composite_pay_amount, composite_pay_m1_amount, composite_act_old_user_cnt, composite_retention_reg_cnt, retention_rebate_cost_amount, consuming_composite_act_cnt, consuming_composite_reg_cnt, consuming_composite_create_role_d1_cnt, consuming_composite_effective_d1_cnt, consuming_composite_pay_d1_cnt, consuming_composite_retention_d2_cnt, consuming_composite_reg_d1_new_device_cnt, consuming_composite_pay_d1_amount, consuming_composite_pay_m1_amount, rebate_cash_cost_amount, consuming_ago1_composite_act_cnt, consuming_ago1_composite_reg_cnt, consuming_ago1_composite_create_role_d1_cnt, consuming_ago1_composite_effective_d1_cnt, consuming_ago1_composite_pay_d1_cnt, consuming_ago1_composite_start_total_pay_amount, consuming_ago1_composite_pay_d1_amount, cash_cost_amount, loading_open_cnt, loading_peop_cnt, loading_change_cnt, downloader_cnt, bootstrapper_cnt, consuming_loading_change_cnt, consuming_downloader_cnt, consuming_bootstrapper_cnt, roi2_cost_amount, roi3_cost_amount, roi4_cost_amount, roi5_cost_amount, roi6_cost_amount, roi7_cost_amount, roi8_cost_amount, roi9_cost_amount, roi10_cost_amount, roi11_cost_amount, roi12_cost_amount, roi13_cost_amount, roi14_cost_amount, roi15_cost_amount, roi16_cost_amount, roi17_cost_amount, roi18_cost_amount, roi19_cost_amount, roi20_cost_amount, roi21_cost_amount, roi22_cost_amount, roi23_cost_amount, roi24_cost_amount, roi25_cost_amount, roi26_cost_amount, roi27_cost_amount, roi28_cost_amount, roi29_cost_amount, roi30_cost_amount, w_roi1_cost_amount, w_roi2_cost_amount, w_roi3_cost_amount, w_roi4_cost_amount, w_roi5_cost_amount, w_roi6_cost_amount, w_roi7_cost_amount, w_roi8_cost_amount, w_roi9_cost_amount, w_roi10_cost_amount, w_roi11_cost_amount, w_roi12_cost_amount, w_roi13_cost_amount, w_roi14_cost_amount, w_roi15_cost_amount, m_roi2_cost_amount, m_roi3_cost_amount, m_roi4_cost_amount, m_roi5_cost_amount, m_roi6_cost_amount, m_roi7_cost_amount, m_roi8_cost_amount, m_roi9_cost_amount, m_roi10_cost_amount, m_roi11_cost_amount, m_roi12_cost_amount, roi2_pay_amount, roi3_pay_amount, roi4_pay_amount, roi5_pay_amount, roi6_pay_amount, roi7_pay_amount, roi8_pay_amount, roi9_pay_amount, roi10_pay_amount, roi11_pay_amount, roi12_pay_amount, roi13_pay_amount, roi14_pay_amount, roi15_pay_amount, roi16_pay_amount, roi17_pay_amount, roi18_pay_amount, roi19_pay_amount, roi20_pay_amount, roi21_pay_amount, roi22_pay_amount, roi23_pay_amount, roi24_pay_amount, roi25_pay_amount, roi26_pay_amount, roi27_pay_amount, roi28_pay_amount, roi29_pay_amount, roi30_pay_amount, w_roi1_pay_amount, w_roi2_pay_amount, w_roi3_pay_amount, w_roi4_pay_amount, w_roi5_pay_amount, w_roi6_pay_amount, w_roi7_pay_amount, w_roi8_pay_amount, w_roi9_pay_amount, w_roi10_pay_amount, w_roi11_pay_amount, w_roi12_pay_amount, w_roi13_pay_amount, w_roi14_pay_amount, w_roi15_pay_amount, m_roi2_pay_amount, m_roi3_pay_amount, m_roi4_pay_amount, m_roi5_pay_amount, m_roi6_pay_amount, m_roi7_pay_amount, m_roi8_pay_amount, m_roi9_pay_amount, m_roi10_pay_amount, m_roi11_pay_amount, m_roi12_pay_amount, \n\n    composite_create_role_d1_cnt / composite_reg_cnt AS composite_create_role_d1_rate, \n    composite_effective_d1_cnt / composite_reg_cnt AS composite_effective_d1_rate, \n    rebate_cost_amount / consuming_composite_act_cnt AS composite_act_cost, \n    rebate_cost_amount / consuming_composite_reg_cnt AS composite_reg_cost, \n    w_roi1_pay_amount / w_roi1_cost_amount AS w_roi1_rate, \n    w_roi2_pay_amount / w_roi2_cost_amount AS w_roi2_rate, \n    w_roi3_pay_amount / w_roi3_cost_amount AS w_roi3_rate, \n    w_roi4_pay_amount / w_roi4_cost_amount AS w_roi4_rate, \n    w_roi5_pay_amount / w_roi5_cost_amount AS w_roi5_rate, \n    w_roi6_pay_amount / w_roi6_cost_amount AS w_roi6_rate, \n    w_roi7_pay_amount / w_roi7_cost_amount AS w_roi7_rate, \n    w_roi8_pay_amount / w_roi8_cost_amount AS w_roi8_rate, \n    w_roi9_pay_amount / w_roi9_cost_amount AS w_roi9_rate, \n    w_roi10_pay_amount / w_roi10_cost_amount AS w_roi10_rate, \n    w_roi11_pay_amount / w_roi11_cost_amount AS w_roi11_rate, \n    w_roi12_pay_amount / w_roi12_cost_amount AS w_roi12_rate, \n    w_roi13_pay_amount / w_roi13_cost_amount AS w_roi13_rate, \n    w_roi14_pay_amount / w_roi14_cost_amount AS w_roi14_rate, \n    w_roi15_pay_amount / w_roi15_cost_amount AS w_roi15_rate, \n    m_roi2_pay_amount / m_roi2_cost_amount AS m_roi2_rate, \n    m_roi3_pay_amount / m_roi3_cost_amount AS m_roi3_rate, \n    m_roi4_pay_amount / m_roi4_cost_amount AS m_roi4_rate, \n    m_roi5_pay_amount / m_roi5_cost_amount AS m_roi5_rate, \n    m_roi6_pay_amount / m_roi6_cost_amount AS m_roi6_rate, \n    m_roi7_pay_amount / m_roi7_cost_amount AS m_roi7_rate, \n    m_roi8_pay_amount / m_roi8_cost_amount AS m_roi8_rate, \n    m_roi9_pay_amount / m_roi9_cost_amount AS m_roi9_rate, \n    m_roi10_pay_amount / m_roi10_cost_amount AS m_roi10_rate, \n    m_roi11_pay_amount / m_roi11_cost_amount AS m_roi11_rate, \n    m_roi12_pay_amount / m_roi12_cost_amount AS m_roi12_rate, \n    roi2_pay_amount / roi2_cost_amount AS roi2_rate, \n    roi3_pay_amount / roi3_cost_amount AS roi3_rate, \n    roi4_pay_amount / roi4_cost_amount AS roi4_rate, \n    roi5_pay_amount / roi5_cost_amount AS roi5_rate, \n    roi6_pay_amount / roi6_cost_amount AS roi6_rate, \n    roi7_pay_amount / roi7_cost_amount AS roi7_rate, \n    roi8_pay_amount / roi8_cost_amount AS roi8_rate, \n    roi9_pay_amount / roi9_cost_amount AS roi9_rate, \n    roi10_pay_amount / roi10_cost_amount AS roi10_rate, \n    roi11_pay_amount / roi11_cost_amount AS roi11_rate, \n    roi12_pay_amount / roi12_cost_amount AS roi12_rate, \n    roi13_pay_amount / roi13_cost_amount AS roi13_rate, \n    roi14_pay_amount / roi14_cost_amount AS roi14_rate, \n    roi15_pay_amount / roi15_cost_amount AS roi15_rate, \n    roi16_pay_amount / roi16_cost_amount AS roi16_rate, \n    roi17_pay_amount / roi17_cost_amount AS roi17_rate, \n    roi18_pay_amount / roi18_cost_amount AS roi18_rate, \n    roi19_pay_amount / roi19_cost_amount AS roi19_rate, \n    roi20_pay_amount / roi20_cost_amount AS roi20_rate, \n    roi21_pay_amount / roi21_cost_amount AS roi21_rate, \n    roi22_pay_amount / roi22_cost_amount AS roi22_rate, \n    roi23_pay_amount / roi23_cost_amount AS roi23_rate, \n    roi24_pay_amount / roi24_cost_amount AS roi24_rate, \n    roi25_pay_amount / roi25_cost_amount AS roi25_rate, \n    roi26_pay_amount / roi26_cost_amount AS roi26_rate, \n    roi27_pay_amount / roi27_cost_amount AS roi27_rate, \n    roi28_pay_amount / roi28_cost_amount AS roi28_rate, \n    roi29_pay_amount / roi29_cost_amount AS roi29_rate, \n    roi30_pay_amount / roi30_cost_amount AS roi30_rate, \n    composite_pay_d1_cnt/composite_reg_cnt AS composite_pay_d1_rate, \n    rebate_cost_amount / consuming_composite_pay_d1_cnt AS composite_pay_d1_cost, \n    composite_pay_d1_amount / composite_pay_d1_cnt AS composite_arppu_d1_amount, \n    IFNULL(rebate_cost_amount  / consuming_composite_effective_d1_cnt, 0) AS composite_effective_d1_cost, \n    retention_rebate_cost_amount/consuming_composite_retention_d2_cnt AS composite_retention_d2_cost, \n    composite_retention_d2_cnt/composite_retention_reg_cnt AS composite_retention_d2_rate, \n    composite_pay_d1_amount/composite_reg_cnt AS composite_arpu_d1_amount, \n    composite_reg_d1_new_device_cnt/composite_act_cnt AS composite_reg_d1_new_device_rate, \n    composite_act_old_user_cnt/composite_act_cnt AS composite_act_old_user_rate, \n    rebate_cost_amount/consuming_composite_reg_d1_new_device_cnt AS composite_reg_d1_new_device_cost, \n    rebate_cost_amount/consuming_composite_create_role_d1_cnt AS composite_create_role_d1_cost, \n    composite_pay_amount/composite_login_user_cnt AS composite_arpu_amount, \n    composite_pay_amount/composite_pay_cnt AS composite_arppu_amount, \n    consuming_composite_pay_m1_amount/rebate_cost_amount AS composite_roi_m1_rate, \n    consuming_composite_pay_d1_amount/rebate_cost_amount AS composite_d1_roi_rate, \n    rebate_cash_cost_amount/consuming_ago1_composite_act_cnt AS composite_act_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_reg_cnt AS composite_reg_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_create_role_d1_cnt AS composite_create_role_d1_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_effective_d1_cnt AS composite_effective_d1_cash_cost, \n    rebate_cash_cost_amount/consuming_ago1_composite_pay_d1_cnt AS composite_pay_d1_cash_cost, \n    consuming_ago1_composite_pay_d1_amount/rebate_cash_cost_amount AS composite_d1_roi_cash_rate, \n    consuming_ago1_composite_start_total_pay_amount/rebate_cash_cost_amount AS composite_start_total_roi_cash_rate, \n    loading_change_cnt/loading_peop_cnt AS loading_conversion_rate, \n    rebate_cost_amount/consuming_loading_change_cnt AS loading_conversion_cost, \n    downloader_cnt/loading_change_cnt AS downloader_act_rate, \n    rebate_cost_amount/consuming_downloader_cnt AS downloader_act_cost, \n    bootstrapper_cnt/downloader_cnt AS bootstrapper_act_rate, \n    rebate_cost_amount/consuming_bootstrapper_cnt AS bootstrapper_act_cost\nFROM (\n    SELECT    \n    SUM(cost_amount) AS cost_amount, \n    SUM(rebate_cost_amount) AS rebate_cost_amount, \n    SUM(composite_act_cnt) AS composite_act_cnt, \n    SUM(composite_reg_cnt) AS composite_reg_cnt, \n    SUM(composite_create_role_d1_cnt) AS composite_create_role_d1_cnt, \n    SUM(composite_effective_d1_cnt) AS composite_effective_d1_cnt, \n    SUM(composite_start_total_pay_cnt) AS composite_start_total_pay_cnt, \n    SUM(composite_start_total_pay_amount) AS composite_start_total_pay_amount, \n    SUM(composite_pay_d1_cnt) AS composite_pay_d1_cnt, \n    SUM(composite_pay_d1_amount) AS composite_pay_d1_amount, \n    SUM(composite_reg_d1_new_device_cnt) AS composite_reg_d1_new_device_cnt, \n    SUM(composite_retention_d2_cnt) AS composite_retention_d2_cnt, \n    SUM(composite_active_device_cnt) AS composite_active_device_cnt, \n    SUM(composite_login_user_cnt) AS composite_login_user_cnt, \n    SUM(composite_pay_cnt) AS composite_pay_cnt, \n    SUM(composite_pay_amount) AS composite_pay_amount, \n    SUM(composite_pay_m1_amount) AS composite_pay_m1_amount, \n    SUM(composite_act_old_user_cnt) AS composite_act_old_user_cnt, \n    SUM(composite_retention_reg_cnt) AS composite_retention_reg_cnt, \n    SUM(retention_rebate_cost_amount) AS retention_rebate_cost_amount, \n    SUM(consuming_composite_act_cnt) AS consuming_composite_act_cnt, \n    SUM(consuming_composite_reg_cnt) AS consuming_composite_reg_cnt, \n    SUM(consuming_composite_create_role_d1_cnt) AS consuming_composite_create_role_d1_cnt, \n    SUM(consuming_composite_effective_d1_cnt) AS consuming_composite_effective_d1_cnt, \n    SUM(consuming_composite_pay_d1_cnt) AS consuming_composite_pay_d1_cnt, \n    SUM(consuming_composite_retention_d2_cnt) AS consuming_composite_retention_d2_cnt, \n    SUM(consuming_composite_reg_d1_new_device_cnt) AS consuming_composite_reg_d1_new_device_cnt, \n    SUM(consuming_composite_pay_d1_amount) AS consuming_composite_pay_d1_amount, \n    SUM(consuming_composite_pay_m1_amount) AS consuming_composite_pay_m1_amount, \n    SUM(rebate_cash_cost_amount) AS rebate_cash_cost_amount, \n    SUM(consuming_ago1_composite_act_cnt) AS consuming_ago1_composite_act_cnt, \n    SUM(consuming_ago1_composite_reg_cnt) AS consuming_ago1_composite_reg_cnt, \n    SUM(consuming_ago1_composite_create_role_d1_cnt) AS consuming_ago1_composite_create_role_d1_cnt, \n    SUM(consuming_ago1_composite_effective_d1_cnt) AS consuming_ago1_composite_effective_d1_cnt, \n    SUM(consuming_ago1_composite_pay_d1_cnt) AS consuming_ago1_composite_pay_d1_cnt, \n    SUM(consuming_ago1_composite_start_total_pay_amount) AS consuming_ago1_composite_start_total_pay_amount, \n    SUM(consuming_ago1_composite_pay_d1_amount) AS consuming_ago1_composite_pay_d1_amount, \n    SUM(cash_cost_amount) AS cash_cost_amount, \n    SUM(loading_open_cnt) AS loading_open_cnt, \n    SUM(loading_peop_cnt) AS loading_peop_cnt, \n    SUM(loading_change_cnt) AS loading_change_cnt, \n    SUM(downloader_cnt) AS downloader_cnt, \n    SUM(bootstrapper_cnt) AS bootstrapper_cnt, \n    SUM(consuming_loading_change_cnt) AS consuming_loading_change_cnt, \n    SUM(consuming_downloader_cnt) AS consuming_downloader_cnt, \n    SUM(consuming_bootstrapper_cnt) AS consuming_bootstrapper_cnt, \n    SUM(roi2_cost_amount) AS roi2_cost_amount, \n    SUM(roi3_cost_amount) AS roi3_cost_amount, \n    SUM(roi4_cost_amount) AS roi4_cost_amount, \n    SUM(roi5_cost_amount) AS roi5_cost_amount, \n    SUM(roi6_cost_amount) AS roi6_cost_amount, \n    SUM(roi7_cost_amount) AS roi7_cost_amount, \n    SUM(roi8_cost_amount) AS roi8_cost_amount, \n    SUM(roi9_cost_amount) AS roi9_cost_amount, \n    SUM(roi10_cost_amount) AS roi10_cost_amount, \n    SUM(roi11_cost_amount) AS roi11_cost_amount, \n    SUM(roi12_cost_amount) AS roi12_cost_amount, \n    SUM(roi13_cost_amount) AS roi13_cost_amount, \n    SUM(roi14_cost_amount) AS roi14_cost_amount, \n    SUM(roi15_cost_amount) AS roi15_cost_amount, \n    SUM(roi16_cost_amount) AS roi16_cost_amount, \n    SUM(roi17_cost_amount) AS roi17_cost_amount, \n    SUM(roi18_cost_amount) AS roi18_cost_amount, \n    SUM(roi19_cost_amount) AS roi19_cost_amount, \n    SUM(roi20_cost_amount) AS roi20_cost_amount, \n    SUM(roi21_cost_amount) AS roi21_cost_amount, \n    SUM(roi22_cost_amount) AS roi22_cost_amount, \n    SUM(roi23_cost_amount) AS roi23_cost_amount, \n    SUM(roi24_cost_amount) AS roi24_cost_amount, \n    SUM(roi25_cost_amount) AS roi25_cost_amount, \n    SUM(roi26_cost_amount) AS roi26_cost_amount, \n    SUM(roi27_cost_amount) AS roi27_cost_amount, \n    SUM(roi28_cost_amount) AS roi28_cost_amount, \n    SUM(roi29_cost_amount) AS roi29_cost_amount, \n    SUM(roi30_cost_amount) AS roi30_cost_amount, \n    SUM(w_roi1_cost_amount) AS w_roi1_cost_amount, \n    SUM(w_roi2_cost_amount) AS w_roi2_cost_amount, \n    SUM(w_roi3_cost_amount) AS w_roi3_cost_amount, \n    SUM(w_roi4_cost_amount) AS w_roi4_cost_amount, \n    SUM(w_roi5_cost_amount) AS w_roi5_cost_amount, \n    SUM(w_roi6_cost_amount) AS w_roi6_cost_amount, \n    SUM(w_roi7_cost_amount) AS w_roi7_cost_amount, \n    SUM(w_roi8_cost_amount) AS w_roi8_cost_amount, \n    SUM(w_roi9_cost_amount) AS w_roi9_cost_amount, \n    SUM(w_roi10_cost_amount) AS w_roi10_cost_amount, \n    SUM(w_roi11_cost_amount) AS w_roi11_cost_amount, \n    SUM(w_roi12_cost_amount) AS w_roi12_cost_amount, \n    SUM(w_roi13_cost_amount) AS w_roi13_cost_amount, \n    SUM(w_roi14_cost_amount) AS w_roi14_cost_amount, \n    SUM(w_roi15_cost_amount) AS w_roi15_cost_amount, \n    SUM(m_roi2_cost_amount) AS m_roi2_cost_amount, \n    SUM(m_roi3_cost_amount) AS m_roi3_cost_amount, \n    SUM(m_roi4_cost_amount) AS m_roi4_cost_amount, \n    SUM(m_roi5_cost_amount) AS m_roi5_cost_amount, \n    SUM(m_roi6_cost_amount) AS m_roi6_cost_amount, \n    SUM(m_roi7_cost_amount) AS m_roi7_cost_amount, \n    SUM(m_roi8_cost_amount) AS m_roi8_cost_amount, \n    SUM(m_roi9_cost_amount) AS m_roi9_cost_amount, \n    SUM(m_roi10_cost_amount) AS m_roi10_cost_amount, \n    SUM(m_roi11_cost_amount) AS m_roi11_cost_amount, \n    SUM(m_roi12_cost_amount) AS m_roi12_cost_amount, \n    SUM(roi2_pay_amount) AS roi2_pay_amount, \n    SUM(roi3_pay_amount) AS roi3_pay_amount, \n    SUM(roi4_pay_amount) AS roi4_pay_amount, \n    SUM(roi5_pay_amount) AS roi5_pay_amount, \n    SUM(roi6_pay_amount) AS roi6_pay_amount, \n    SUM(roi7_pay_amount) AS roi7_pay_amount, \n    SUM(roi8_pay_amount) AS roi8_pay_amount, \n    SUM(roi9_pay_amount) AS roi9_pay_amount, \n    SUM(roi10_pay_amount) AS roi10_pay_amount, \n    SUM(roi11_pay_amount) AS roi11_pay_amount, \n    SUM(roi12_pay_amount) AS roi12_pay_amount, \n    SUM(roi13_pay_amount) AS roi13_pay_amount, \n    SUM(roi14_pay_amount) AS roi14_pay_amount, \n    SUM(roi15_pay_amount) AS roi15_pay_amount, \n    SUM(roi16_pay_amount) AS roi16_pay_amount, \n    SUM(roi17_pay_amount) AS roi17_pay_amount, \n    SUM(roi18_pay_amount) AS roi18_pay_amount, \n    SUM(roi19_pay_amount) AS roi19_pay_amount, \n    SUM(roi20_pay_amount) AS roi20_pay_amount, \n    SUM(roi21_pay_amount) AS roi21_pay_amount, \n    SUM(roi22_pay_amount) AS roi22_pay_amount, \n    SUM(roi23_pay_amount) AS roi23_pay_amount, \n    SUM(roi24_pay_amount) AS roi24_pay_amount, \n    SUM(roi25_pay_amount) AS roi25_pay_amount, \n    SUM(roi26_pay_amount) AS roi26_pay_amount, \n    SUM(roi27_pay_amount) AS roi27_pay_amount, \n    SUM(roi28_pay_amount) AS roi28_pay_amount, \n    SUM(roi29_pay_amount) AS roi29_pay_amount, \n    SUM(roi30_pay_amount) AS roi30_pay_amount, \n    SUM(w_roi1_pay_amount) AS w_roi1_pay_amount, \n    SUM(w_roi2_pay_amount) AS w_roi2_pay_amount, \n    SUM(w_roi3_pay_amount) AS w_roi3_pay_amount, \n    SUM(w_roi4_pay_amount) AS w_roi4_pay_amount, \n    SUM(w_roi5_pay_amount) AS w_roi5_pay_amount, \n    SUM(w_roi6_pay_amount) AS w_roi6_pay_amount, \n    SUM(w_roi7_pay_amount) AS w_roi7_pay_amount, \n    SUM(w_roi8_pay_amount) AS w_roi8_pay_amount, \n    SUM(w_roi9_pay_amount) AS w_roi9_pay_amount, \n    SUM(w_roi10_pay_amount) AS w_roi10_pay_amount, \n    SUM(w_roi11_pay_amount) AS w_roi11_pay_amount, \n    SUM(w_roi12_pay_amount) AS w_roi12_pay_amount, \n    SUM(w_roi13_pay_amount) AS w_roi13_pay_amount, \n    SUM(w_roi14_pay_amount) AS w_roi14_pay_amount, \n    SUM(w_roi15_pay_amount) AS w_roi15_pay_amount, \n    SUM(m_roi2_pay_amount) AS m_roi2_pay_amount, \n    SUM(m_roi3_pay_amount) AS m_roi3_pay_amount, \n    SUM(m_roi4_pay_amount) AS m_roi4_pay_amount, \n    SUM(m_roi5_pay_amount) AS m_roi5_pay_amount, \n    SUM(m_roi6_pay_amount) AS m_roi6_pay_amount, \n    SUM(m_roi7_pay_amount) AS m_roi7_pay_amount, \n    SUM(m_roi8_pay_amount) AS m_roi8_pay_amount, \n    SUM(m_roi9_pay_amount) AS m_roi9_pay_amount, \n    SUM(m_roi10_pay_amount) AS m_roi10_pay_amount, \n    SUM(m_roi11_pay_amount) AS m_roi11_pay_amount, \n    SUM(m_roi12_pay_amount) AS m_roi12_pay_amount\nFROM \n    ( \nSELECT    \n    dt AS dt, \n\n    app_id AS app_id, \n    media_id AS media_id, \n    app_package_type AS app_package_type, \n    promotion_source AS promotion_source, \n    os_type AS os_type, \n    team_ids AS team_ids, \n\n    cost_amount AS cost_amount, \n    rebate_cost_amount AS rebate_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) ) AS composite_act_cnt, \n    composite_reg_cnt AS composite_reg_cnt, \n    composite_create_role_d1_cnt AS composite_create_role_d1_cnt, \n    composite_effective_d1_cnt AS composite_effective_d1_cnt, \n    composite_start_total_pay_cnt AS composite_start_total_pay_cnt, \n    composite_start_total_pay_amount AS composite_start_total_pay_amount, \n    composite_pay_d1_cnt AS composite_pay_d1_cnt, \n    composite_pay_d1_amount AS composite_pay_d1_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) ) AS composite_reg_d1_new_device_cnt, \n    composite_retention_d2_cnt AS composite_retention_d2_cnt, \n    composite_active_device_cnt AS composite_active_device_cnt, \n    composite_login_user_cnt AS composite_login_user_cnt, \n    composite_pay_cnt AS composite_pay_cnt, \n    composite_pay_amount AS composite_pay_amount, \n    composite_pay_m1_amount AS composite_pay_m1_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', 0, composite_act_old_user_cnt) AS composite_act_old_user_cnt, \n    composite_retention_reg_cnt AS composite_retention_reg_cnt, \n    retention_rebate_cost_amount AS retention_rebate_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_composite_reg_cnt,  ifnull( (case app_package_type when 'WEB' then consuming_composite_reg_cnt else consuming_composite_act_cnt end ), 0) ) AS consuming_composite_act_cnt, \n    consuming_composite_reg_cnt AS consuming_composite_reg_cnt, \n    consuming_composite_create_role_d1_cnt AS consuming_composite_create_role_d1_cnt, \n    consuming_composite_effective_d1_cnt AS consuming_composite_effective_d1_cnt, \n    consuming_composite_pay_d1_cnt AS consuming_composite_pay_d1_cnt, \n    consuming_composite_retention_d2_cnt AS consuming_composite_retention_d2_cnt, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then consuming_composite_reg_cnt  else consuming_composite_reg_d1_new_device_cnt  end ), 0) ) AS consuming_composite_reg_d1_new_device_cnt, \n    consuming_composite_pay_d1_amount AS consuming_composite_pay_d1_amount, \n    consuming_composite_pay_m1_amount AS consuming_composite_pay_m1_amount, \n    rebate_cash_cost_amount AS rebate_cash_cost_amount, \n    if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', consuming_ago1_composite_reg_cnt,  ifnull( (case app_package_type when 'WEB' then consuming_ago1_composite_reg_cnt else consuming_ago1_composite_act_cnt end ), 0) ) AS consuming_ago1_composite_act_cnt, \n    consuming_ago1_composite_reg_cnt AS consuming_ago1_composite_reg_cnt, \n    consuming_ago1_composite_create_role_d1_cnt AS consuming_ago1_composite_create_role_d1_cnt, \n    consuming_ago1_composite_effective_d1_cnt AS consuming_ago1_composite_effective_d1_cnt, \n    consuming_ago1_composite_pay_d1_cnt AS consuming_ago1_composite_pay_d1_cnt, \n    consuming_ago1_composite_start_total_pay_amount AS consuming_ago1_composite_start_total_pay_amount, \n    consuming_ago1_composite_pay_d1_amount AS consuming_ago1_composite_pay_d1_amount, \n    cash_cost_amount AS cash_cost_amount, \n    loading_open_cnt AS loading_open_cnt, \n    loading_peop_cnt AS loading_peop_cnt, \n    loading_change_cnt AS loading_change_cnt, \n    downloader_cnt AS downloader_cnt, \n    bootstrapper_cnt AS bootstrapper_cnt, \n    consuming_loading_change_cnt AS consuming_loading_change_cnt, \n    consuming_downloader_cnt AS consuming_downloader_cnt, \n    consuming_bootstrapper_cnt AS consuming_bootstrapper_cnt, \n    roi2_cost_amount AS roi2_cost_amount, \n    roi3_cost_amount AS roi3_cost_amount, \n    roi4_cost_amount AS roi4_cost_amount, \n    roi5_cost_amount AS roi5_cost_amount, \n    roi6_cost_amount AS roi6_cost_amount, \n    roi7_cost_amount AS roi7_cost_amount, \n    roi8_cost_amount AS roi8_cost_amount, \n    roi9_cost_amount AS roi9_cost_amount, \n    roi10_cost_amount AS roi10_cost_amount, \n    roi11_cost_amount AS roi11_cost_amount, \n    roi12_cost_amount AS roi12_cost_amount, \n    roi13_cost_amount AS roi13_cost_amount, \n    roi14_cost_amount AS roi14_cost_amount, \n    roi15_cost_amount AS roi15_cost_amount, \n    roi16_cost_amount AS roi16_cost_amount, \n    roi17_cost_amount AS roi17_cost_amount, \n    roi18_cost_amount AS roi18_cost_amount, \n    roi19_cost_amount AS roi19_cost_amount, \n    roi20_cost_amount AS roi20_cost_amount, \n    roi21_cost_amount AS roi21_cost_amount, \n    roi22_cost_amount AS roi22_cost_amount, \n    roi23_cost_amount AS roi23_cost_amount, \n    roi24_cost_amount AS roi24_cost_amount, \n    roi25_cost_amount AS roi25_cost_amount, \n    roi26_cost_amount AS roi26_cost_amount, \n    roi27_cost_amount AS roi27_cost_amount, \n    roi28_cost_amount AS roi28_cost_amount, \n    roi29_cost_amount AS roi29_cost_amount, \n    roi30_cost_amount AS roi30_cost_amount, \n    w_roi1_cost_amount AS w_roi1_cost_amount, \n    w_roi2_cost_amount AS w_roi2_cost_amount, \n    w_roi3_cost_amount AS w_roi3_cost_amount, \n    w_roi4_cost_amount AS w_roi4_cost_amount, \n    w_roi5_cost_amount AS w_roi5_cost_amount, \n    w_roi6_cost_amount AS w_roi6_cost_amount, \n    w_roi7_cost_amount AS w_roi7_cost_amount, \n    w_roi8_cost_amount AS w_roi8_cost_amount, \n    w_roi9_cost_amount AS w_roi9_cost_amount, \n    w_roi10_cost_amount AS w_roi10_cost_amount, \n    w_roi11_cost_amount AS w_roi11_cost_amount, \n    w_roi12_cost_amount AS w_roi12_cost_amount, \n    w_roi13_cost_amount AS w_roi13_cost_amount, \n    w_roi14_cost_amount AS w_roi14_cost_amount, \n    w_roi15_cost_amount AS w_roi15_cost_amount, \n    m_roi2_cost_amount AS m_roi2_cost_amount, \n    m_roi3_cost_amount AS m_roi3_cost_amount, \n    m_roi4_cost_amount AS m_roi4_cost_amount, \n    m_roi5_cost_amount AS m_roi5_cost_amount, \n    m_roi6_cost_amount AS m_roi6_cost_amount, \n    m_roi7_cost_amount AS m_roi7_cost_amount, \n    m_roi8_cost_amount AS m_roi8_cost_amount, \n    m_roi9_cost_amount AS m_roi9_cost_amount, \n    m_roi10_cost_amount AS m_roi10_cost_amount, \n    m_roi11_cost_amount AS m_roi11_cost_amount, \n    m_roi12_cost_amount AS m_roi12_cost_amount, \n    roi2_pay_amount AS roi2_pay_amount, \n    roi3_pay_amount AS roi3_pay_amount, \n    roi4_pay_amount AS roi4_pay_amount, \n    roi5_pay_amount AS roi5_pay_amount, \n    roi6_pay_amount AS roi6_pay_amount, \n    roi7_pay_amount AS roi7_pay_amount, \n    roi8_pay_amount AS roi8_pay_amount, \n    roi9_pay_amount AS roi9_pay_amount, \n    roi10_pay_amount AS roi10_pay_amount, \n    roi11_pay_amount AS roi11_pay_amount, \n    roi12_pay_amount AS roi12_pay_amount, \n    roi13_pay_amount AS roi13_pay_amount, \n    roi14_pay_amount AS roi14_pay_amount, \n    roi15_pay_amount AS roi15_pay_amount, \n    roi16_pay_amount AS roi16_pay_amount, \n    roi17_pay_amount AS roi17_pay_amount, \n    roi18_pay_amount AS roi18_pay_amount, \n    roi19_pay_amount AS roi19_pay_amount, \n    roi20_pay_amount AS roi20_pay_amount, \n    roi21_pay_amount AS roi21_pay_amount, \n    roi22_pay_amount AS roi22_pay_amount, \n    roi23_pay_amount AS roi23_pay_amount, \n    roi24_pay_amount AS roi24_pay_amount, \n    roi25_pay_amount AS roi25_pay_amount, \n    roi26_pay_amount AS roi26_pay_amount, \n    roi27_pay_amount AS roi27_pay_amount, \n    roi28_pay_amount AS roi28_pay_amount, \n    roi29_pay_amount AS roi29_pay_amount, \n    roi30_pay_amount AS roi30_pay_amount, \n    w_roi1_pay_amount AS w_roi1_pay_amount, \n    w_roi2_pay_amount AS w_roi2_pay_amount, \n    w_roi3_pay_amount AS w_roi3_pay_amount, \n    w_roi4_pay_amount AS w_roi4_pay_amount, \n    w_roi5_pay_amount AS w_roi5_pay_amount, \n    w_roi6_pay_amount AS w_roi6_pay_amount, \n    w_roi7_pay_amount AS w_roi7_pay_amount, \n    w_roi8_pay_amount AS w_roi8_pay_amount, \n    w_roi9_pay_amount AS w_roi9_pay_amount, \n    w_roi10_pay_amount AS w_roi10_pay_amount, \n    w_roi11_pay_amount AS w_roi11_pay_amount, \n    w_roi12_pay_amount AS w_roi12_pay_amount, \n    w_roi13_pay_amount AS w_roi13_pay_amount, \n    w_roi14_pay_amount AS w_roi14_pay_amount, \n    w_roi15_pay_amount AS w_roi15_pay_amount, \n    m_roi2_pay_amount AS m_roi2_pay_amount, \n    m_roi3_pay_amount AS m_roi3_pay_amount, \n    m_roi4_pay_amount AS m_roi4_pay_amount, \n    m_roi5_pay_amount AS m_roi5_pay_amount, \n    m_roi6_pay_amount AS m_roi6_pay_amount, \n    m_roi7_pay_amount AS m_roi7_pay_amount, \n    m_roi8_pay_amount AS m_roi8_pay_amount, \n    m_roi9_pay_amount AS m_roi9_pay_amount, \n    m_roi10_pay_amount AS m_roi10_pay_amount, \n    m_roi11_pay_amount AS m_roi11_pay_amount, \n    m_roi12_pay_amount AS m_roi12_pay_amount\nFROM \n    ad_ads.v_ads_ad_composite_dr_kpi_d\nWHERE ((((cost_amount) is not null and (cost_amount) != 0 )) OR (((rebate_cost_amount) is not null and (rebate_cost_amount) != 0 )) OR (((loading_open_cnt) is not null and (loading_open_cnt) != 0 )) OR (((loading_peop_cnt) is not null and (loading_peop_cnt) != 0 )) OR (((loading_change_cnt) is not null and (loading_change_cnt) != 0 )) OR (((downloader_cnt) is not null and (downloader_cnt) != 0 )) OR (((bootstrapper_cnt) is not null and (bootstrapper_cnt) != 0 )) OR (((if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) )) is not null and (if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_act_cnt end ), 0) )) != 0 )) OR (((if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) )) is not null and (if(app_id = '40100007' and dt < '2025-11-28' and dt >= '2025-10-23', composite_reg_cnt, ifnull( (case app_package_type when 'WEB' then composite_reg_cnt else composite_reg_d1_new_device_cnt end ), 0) )) != 0 )) OR (((composite_reg_cnt) is not null and (composite_reg_cnt) != 0 )) OR (((composite_create_role_d1_cnt) is not null and (composite_create_role_d1_cnt) != 0 )) OR (((composite_effective_d1_cnt) is not null and (composite_effective_d1_cnt) != 0 )) OR (((composite_pay_d1_cnt) is not null and (composite_pay_d1_cnt) != 0 )) OR (((composite_pay_d1_amount) is not null and (composite_pay_d1_amount) != 0 )) OR (((composite_start_total_pay_cnt) is not null and (composite_start_total_pay_cnt) != 0 )) OR (((composite_start_total_pay_amount) is not null and (composite_start_total_pay_amount) != 0 )) OR (((composite_pay_m1_amount) is not null and (composite_pay_m1_amount) != 0 )) OR (((composite_retention_d2_cnt) is not null and (composite_retention_d2_cnt) != 0 )) OR (((composite_active_device_cnt) is not null and (composite_active_device_cnt) != 0 )) OR (((composite_login_user_cnt) is not null and (composite_login_user_cnt) != 0 )) OR (((composite_pay_cnt) is not null and (composite_pay_cnt) != 0 )) OR (((composite_pay_amount) is not null and (composite_pay_amount) != 0 )) OR (((cash_cost_amount) is not null and (cash_cost_amount) != 0 )) OR (((rebate_cash_cost_amount) is not null and (rebate_cash_cost_amount) != 0 ))) and (promotion_source) IN ('AD') and (app_id) IN ('10100080') and (metric_definition_type) IN ('COMMON','RESERVE_COMPOSITE') and dt >= '2026-01-05' and dt <= '2026-04-12'\n ) t1) tt1",
                    "count": ""
                }
            }
        }
    }
}

错误码
错误码
说明
200
成功
400
请求参数错误
401
未授权
403
无权限访问
500
服务器内部错误

调用示例
cURL
curl 'https://pre-aitd.dobest.cn/api/aiad-setting/v2/report/auto/5' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json;charset=UTF-8' 
  -H 'X-App-Id: 10100080' \
  -d '{"isDevide":"0","filterField":{"metric_definition_type":"COMMON,RESERVE_COMPOSITE","promotion_source":"AD"},"start":"2026-01-05","end":"2026-04-09","timeType":"NATURAL_WEEK","routeKey":"page-5_NATURAL_WEEK_5"}'

