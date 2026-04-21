# 核心事件

- 行数：158
- 列数：5

|核心事件名称|字段名称|描述|是否必需|备注|
|---|---|---|---|---|
|106 - 支付流程 PayFlow|type|GSSdk.analytics.track()，type = "9"|必填|HYL:游戏侧在支付流程中，按支付漏斗需求通过SDK上报|
||event|= "106"，HYL:游戏侧在支付流程中，按支付漏斗需求通过SDK上报|必填||
||extra||||
||step_version|步骤版本号，游戏自定义的步骤列表版本号||打包参数设置，年月日8位，如：20250121|
||step_id|步骤ID，>>点击查看：步骤列表<<|必填|前端上报：201、302、401、502、601|
||step_name|步骤名称，>>点击查看：步骤名称<<|必填||
||result|步骤结果，0：成功，其他：失败(错误码)|必填|默认成功|
||result_msg|结果信息，错误原因返回||直接转发接口返回错误信息|
||channel_order_id|充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】||不发送，未获取|
||order_id|中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】||不发送，未获取|
||game_order_id|游戏内订单号，按游戏内逻辑生成的支付订单号|必填|仅：502、601步骤上报（之前未生成）|
||product_ID|支付内容产品标识|必填|= Pay.product_id|
||product_name|支付内容产品名称|必填|= Pay.goods_link  => Goods.name / Vip.name|
||pay_channel|充值渠道，对应支付成功【发货通知：payWay】||不发送，未获取|
||recharge_channel|支付方式，对应支付成功【发货通知：rechargeType】||不发送，未获取|
||currency|支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）|必填|= Pay.money_type|
||currency_unit|支付货币单位：0=legalUnit=元单位，1=cent=分单位|必填|= "1"|
||amount|支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元|必填|int，= Pay.money_amount|
||||||
||||||
|221 - 支付流程 PayFlow|event_id|核心事件ID = "221"，HYL:游戏侧在支付流程中，按支付漏斗需求上报|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "支付流程"||该字段已精简不上报，仅作标记|
||step_version|步骤版本号，游戏自定义的步骤列表版本号||打包参数设置，年月日8位，如：20250121|
||step_id|步骤ID，>>点击查看：步骤列表<<|必填|后端上报：402、501、1302/2702、1402/2802、1501/2901|
||step_name|步骤名称，>>点击查看：步骤名称<<|必填||
||result|步骤结果，0：成功，其他：失败(错误码)|必填|默认成功|
||result_msg|结果信息，错误原因返回||直接转发接口返回错误信息|
||channel_order_id|充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】|必填|402、501步骤不发送（未获取）|
||order_id|中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】|必填|402、501步骤不发送（未获取）|
||game_order_id|游戏内订单号，按游戏内逻辑生成的支付订单号|必填|402步骤不发送（未生成）|
||product_ID|支付内容产品标识|必填|= Pay.product_id，1302/2702可以使用【发货通知：productId】|
||product_name|支付内容产品名称|必填|= Pay.goods_link  => Goods.name / Vip.name，1302/2702可以使用【发货通知：productName】|
||pay_channel|充值渠道，对应支付成功【发货通知：payWay】|必填|402、501步骤不发送（未获取）|
||recharge_channel|支付方式，对应支付成功【发货通知：rechargeType】|必填|402、501步骤不发送（未获取）|
||currency|支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）|必填|= Pay.money_type，1302/2702可以使用【发货通知：currency】|
||currency_unit|支付货币单位：0=legalUnit=元单位，1=cent=分单位|必填|= "1"|
||amount|支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元|必填|int，= Pay.money_amount，1302/2702可以使用【发货通知：orderAmount】|
||||||
||||||
|107 - 前置事件 PreEvent|type|GSSdk.analytics.track()，type = "1"|必填|HYL:游戏侧启动登录加载流程中，按自定义step通过SDK进行上报|
||extra||||
||stepId|步骤ID，>>点击查看：步骤列表<<|必填||
||stepName|步骤名称，>>点击查看：步骤名称<<|必填||
||||||
||||||
|108 - 新手引导 TutorialStep|type|GSSdk.analytics.track()，type = "2"|必填|HYL:游戏侧新手引导流程中，按自定义step通过SDK将进行上报|
||extra||||
||stepId|步骤ID，游戏内引导步骤编号|必填|= TutorialStep.id|
||stepName|步骤名称，游戏内引导步骤名称|必填|= TutorialStep.name|
||||||
||||||
|110 - 激励视频 AdVideo|type|GSSdk.analytics.track()，type = "9"|必填|HYL:参照【支付流程】，在激励视频业务中的流程通过SDK上报|
||event|= "110"，HYL:参照【支付流程】，在激励视频业务中的流程通过SDK上报|必填||
||extra||||
||step_version|步骤版本号，游戏自定义的步骤列表版本号||打包参数设置，年月日8位，如：20250121|
||step_id|步骤ID，>>点击查看：步骤列表<<|必填|前端上报：10201、10302、20102|
||step_name|步骤名称，>>点击查看：步骤名称<<|必填||
||result|步骤结果，0：成功，其他：失败(错误码)|必填|默认成功|
||result_msg|结果信息，错误原因返回||直接转发接口返回错误信息|
||ad_sid|游戏侧激励视频流水号，参照支付订单号生成|必填|20102步骤发送（之前未生成）|
||reward_target|激励视频对应奖励目标，参照支付商品标识，>>点击查看：奖励目标<<|必填||
||||||
||||||
|223 - 激励视频 AdVideo|event_id|核心事件ID = "223"，HYL:参照【支付流程】，在激励视频业务中的流程上报|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "激励视频"||该字段已精简不上报，仅作标记|
||step_version|步骤版本号，游戏自定义的步骤列表版本号||打包参数设置，年月日8位，如：20250121|
||step_id|步骤ID，>>点击查看：步骤列表<<|必填|后端上报：10501、20302|
||step_name|步骤名称，>>点击查看：步骤名称<<|必填||
||result|步骤结果，0：成功，其他：失败(错误码)|必填|默认成功|
||result_msg|结果信息，错误原因返回||直接转发接口返回错误信息|
||ad_sid|游戏侧激励视频流水号，参照支付订单号生成|必填||
||reward_target|激励视频对应奖励目标，参照支付商品标识，>>点击查看：奖励目标<<|必填||
||||||
||||||
|215 - 账号验签 GameLoginSign|event_id|核心事件ID = "215"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报|必填||
||start_time|数据发生时间(13位时间戳)|必填||
||event_name|= "账号验签"||该字段已精简不上报，仅作标记|

> 注：Markdown 仅保留前 80 行预览；完整数据见同名 CSV。
